import { Hono } from 'hono';
import { generateEmbedding, cosineSimilarity, getSimilarityRank, generateVideoCheckText } from '../embedding-helper';

type Bindings = {
  DB: D1Database;
  GEMINI_API_KEY: string;
};

const feedbacks = new Hono<{ Bindings: Bindings }>();

/**
 * GET /api/feedbacks
 * フィードバックテンプレート一覧取得
 */
feedbacks.get('/', async (c) => {
  try {
    const clientId = c.req.query('client_id');
    const status = c.req.query('status'); // active / archived
    const category = c.req.query('category');
    const importance = c.req.query('importance');
    const keyword = c.req.query('keyword');

    let query = 'SELECT ft.*, lv.title as video_title FROM client_feedback_templates ft LEFT JOIN learning_videos lv ON ft.video_id = lv.id WHERE 1=1';
    const params: any[] = [];

    if (clientId) {
      query += ' AND ft.client_id = ?';
      params.push(clientId);
    }

    if (status) {
      query += ' AND ft.status = ?';
      params.push(status);
    }

    if (category) {
      query += ' AND ft.category = ?';
      params.push(category);
    }

    if (importance) {
      query += ' AND ft.importance = ?';
      params.push(importance);
    }

    if (keyword) {
      query += ' AND (ft.feedback_text LIKE ? OR ft.memo LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    query += ' ORDER BY ft.created_at DESC';

    const result = await c.env.DB.prepare(query).bind(...params).all();

    return c.json({
      success: true,
      feedbacks: result.results
    });
  } catch (error) {
    console.error('Failed to fetch feedbacks:', error);
    return c.json({ error: 'Failed to fetch feedbacks', details: String(error) }, 500);
  }
});

/**
 * GET /api/feedbacks/:id
 * フィードバックテンプレート詳細取得
 */
feedbacks.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const feedback = await c.env.DB.prepare(`
      SELECT ft.*, lv.title as video_title 
      FROM client_feedback_templates ft 
      LEFT JOIN learning_videos lv ON ft.video_id = lv.id 
      WHERE ft.id = ?
    `).bind(id).first();

    if (!feedback) {
      return c.json({ error: 'Feedback not found' }, 404);
    }

    return c.json({
      success: true,
      feedback
    });
  } catch (error) {
    console.error('Failed to fetch feedback:', error);
    return c.json({ error: 'Failed to fetch feedback', details: String(error) }, 500);
  }
});

/**
 * POST /api/feedbacks
 * フィードバックテンプレート新規作成（Embedding生成込み）
 */
feedbacks.post('/', async (c) => {
  try {
    const data = await c.req.json();
    const {
      client_id,
      video_id,
      feedback_text,
      category,
      phase,
      importance,
      memo,
      created_by
    } = data;

    // 必須項目チェック
    if (!client_id || !feedback_text || !category || !phase || !importance) {
      return c.json({ error: 'Required fields missing' }, 400);
    }

    // Embedding生成
    let embeddingVector = null;
    try {
      const vector = await generateEmbedding(feedback_text, {
        apiKey: c.env.GEMINI_API_KEY
      });
      embeddingVector = JSON.stringify(vector);
    } catch (embError) {
      console.error('Embedding generation failed:', embError);
      // Embedding失敗してもフィードバックは登録する（後で再生成可能）
    }

    // データベースに保存
    const result = await c.env.DB.prepare(`
      INSERT INTO client_feedback_templates (
        client_id, video_id, feedback_text, category, phase, importance, memo,
        status, embedding_vector, first_pointed_at, last_pointed_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)
    `).bind(
      client_id,
      video_id || null,
      feedback_text,
      category,
      phase,
      importance,
      memo || null,
      embeddingVector,
      created_by || 'system'
    ).run();

    return c.json({
      success: true,
      feedback_id: result.meta.last_row_id,
      has_embedding: !!embeddingVector
    }, 201);
  } catch (error) {
    console.error('Failed to create feedback:', error);
    return c.json({ error: 'Failed to create feedback', details: String(error) }, 500);
  }
});

/**
 * PUT /api/feedbacks/:id
 * フィードバックテンプレート更新
 */
feedbacks.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const data = await c.req.json();
    const {
      feedback_text,
      category,
      phase,
      importance,
      memo,
      status,
      updated_by
    } = data;

    // Embedding再生成（feedback_textが変更された場合）
    let embeddingVector: string | null = null;
    if (feedback_text) {
      try {
        const vector = await generateEmbedding(feedback_text, {
          apiKey: c.env.GEMINI_API_KEY
        });
        embeddingVector = JSON.stringify(vector);
      } catch (embError) {
        console.error('Embedding regeneration failed:', embError);
      }
    }

    // 更新クエリ構築
    const updateFields: string[] = [];
    const params: any[] = [];

    if (feedback_text) {
      updateFields.push('feedback_text = ?');
      params.push(feedback_text);
      if (embeddingVector) {
        updateFields.push('embedding_vector = ?');
        params.push(embeddingVector);
      }
    }
    if (category) {
      updateFields.push('category = ?');
      params.push(category);
    }
    if (phase) {
      updateFields.push('phase = ?');
      params.push(phase);
    }
    if (importance) {
      updateFields.push('importance = ?');
      params.push(importance);
    }
    if (memo !== undefined) {
      updateFields.push('memo = ?');
      params.push(memo);
    }
    if (status) {
      updateFields.push('status = ?');
      params.push(status);
    }
    if (updated_by) {
      updateFields.push('updated_by = ?');
      params.push(updated_by);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    params.push(id);

    await c.env.DB.prepare(`
      UPDATE client_feedback_templates 
      SET ${updateFields.join(', ')} 
      WHERE id = ?
    `).bind(...params).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Failed to update feedback:', error);
    return c.json({ error: 'Failed to update feedback', details: String(error) }, 500);
  }
});

/**
 * DELETE /api/feedbacks/:id
 * フィードバックテンプレート削除
 */
feedbacks.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    await c.env.DB.prepare('DELETE FROM client_feedback_templates WHERE id = ?')
      .bind(id)
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Failed to delete feedback:', error);
    return c.json({ error: 'Failed to delete feedback', details: String(error) }, 500);
  }
});

/**
 * POST /api/feedbacks/check-video/:videoId
 * 動画に対して自動チェックを実行
 */
feedbacks.post('/check-video/:videoId', async (c) => {
  try {
    const videoId = c.req.param('videoId');

    // 動画情報取得
    const video = await c.env.DB.prepare('SELECT * FROM learning_videos WHERE id = ?')
      .bind(videoId)
      .first();

    if (!video) {
      return c.json({ error: 'Video not found' }, 404);
    }

    // 動画解析データ取得
    const analysis = await c.env.DB.prepare('SELECT * FROM video_analysis WHERE learning_video_id = ?')
      .bind(videoId)
      .first();

    if (!analysis) {
      return c.json({ error: 'Video analysis not found. Please analyze the video first.' }, 400);
    }

    // チェック設定取得
    const settings = await c.env.DB.prepare('SELECT * FROM video_check_settings WHERE client_id = ?')
      .bind(video.client_id)
      .first();

    if (!settings || !settings.auto_check_enabled) {
      return c.json({ error: 'Auto check is disabled for this client' }, 400);
    }

    const threshold = settings.similarity_threshold || 0.7;

    // 動画チェック用テキスト生成
    const videoCheckText = generateVideoCheckText(analysis, video);

    // 動画チェック用テキストのEmbedding生成
    const videoEmbedding = await generateEmbedding(videoCheckText, {
      apiKey: c.env.GEMINI_API_KEY
    });

    // 有効なフィードバックテンプレート取得
    const feedbackTemplates = await c.env.DB.prepare(`
      SELECT * FROM client_feedback_templates 
      WHERE client_id = ? AND status = 'active' AND embedding_vector IS NOT NULL
    `).bind(video.client_id).all();

    if (!feedbackTemplates.results || feedbackTemplates.results.length === 0) {
      return c.json({
        success: true,
        message: 'No active feedback templates found',
        matches: []
      });
    }

    // 各フィードバックと類似度計算
    const matches: any[] = [];

    for (const template of feedbackTemplates.results as any[]) {
      const templateEmbedding = JSON.parse(template.embedding_vector);
      const similarity = cosineSimilarity(videoEmbedding, templateEmbedding);

      // 閾値以上の場合のみマッチとして記録
      if (similarity >= threshold) {
        const rank = getSimilarityRank(similarity);

        // マッチ結果をDBに保存
        const matchResult = await c.env.DB.prepare(`
          INSERT INTO video_feedback_matches (
            client_id, new_video_id, feedback_template_id, 
            similarity_score, similarity_rank, match_summary_text, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, 'system')
        `).bind(
          video.client_id,
          videoId,
          template.id,
          similarity,
          rank,
          `${template.category}カテゴリの過去指摘と類似しています: "${template.feedback_text.substring(0, 50)}..."`
        ).run();

        // フィードバックテンプレートのマッチカウント更新
        await c.env.DB.prepare(`
          UPDATE client_feedback_templates 
          SET match_count = match_count + 1, last_pointed_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `).bind(template.id).run();

        matches.push({
          match_id: matchResult.meta.last_row_id,
          template_id: template.id,
          feedback_text: template.feedback_text,
          category: template.category,
          phase: template.phase,
          importance: template.importance,
          similarity_score: similarity,
          similarity_rank: rank,
          match_count: template.match_count + 1,
          first_pointed_at: template.first_pointed_at,
          last_pointed_at: new Date().toISOString()
        });
      }
    }

    // 重要度順・類似度順にソート
    matches.sort((a, b) => {
      const importanceOrder: any = { '高': 3, '中': 2, '低': 1 };
      const impDiff = (importanceOrder[b.importance] || 0) - (importanceOrder[a.importance] || 0);
      if (impDiff !== 0) return impDiff;
      return b.similarity_score - a.similarity_score;
    });

    return c.json({
      success: true,
      video_id: videoId,
      video_title: video.title,
      matches_count: matches.length,
      matches
    });
  } catch (error) {
    console.error('Failed to check video:', error);
    return c.json({ error: 'Failed to check video', details: String(error) }, 500);
  }
});

/**
 * GET /api/feedbacks/matches/:videoId
 * 動画のチェック結果取得
 */
feedbacks.get('/matches/:videoId', async (c) => {
  try {
    const videoId = c.req.param('videoId');

    const matches = await c.env.DB.prepare(`
      SELECT 
        vfm.*,
        ft.feedback_text,
        ft.category,
        ft.phase,
        ft.importance,
        ft.memo,
        ft.match_count,
        ft.first_pointed_at,
        ft.last_pointed_at,
        lv.title as video_title
      FROM video_feedback_matches vfm
      JOIN client_feedback_templates ft ON vfm.feedback_template_id = ft.id
      JOIN learning_videos lv ON vfm.new_video_id = lv.id
      WHERE vfm.new_video_id = ?
      ORDER BY vfm.similarity_score DESC
    `).bind(videoId).all();

    return c.json({
      success: true,
      matches: matches.results
    });
  } catch (error) {
    console.error('Failed to fetch matches:', error);
    return c.json({ error: 'Failed to fetch matches', details: String(error) }, 500);
  }
});

/**
 * PUT /api/feedbacks/matches/:matchId/judgement
 * マッチ結果にユーザー判定を追加
 */
feedbacks.put('/matches/:matchId/judgement', async (c) => {
  try {
    const matchId = c.req.param('matchId');
    const { user_judgement, user_comment, user_name } = await c.req.json();

    // user_judgement: 'true_positive' | 'false_positive'
    if (!['true_positive', 'false_positive'].includes(user_judgement)) {
      return c.json({ error: 'Invalid judgement value' }, 400);
    }

    await c.env.DB.prepare(`
      UPDATE video_feedback_matches 
      SET user_judgement = ?, user_judgement_by = ?, user_judgement_at = CURRENT_TIMESTAMP, user_comment = ?
      WHERE id = ?
    `).bind(user_judgement, user_name || 'unknown', user_comment || null, matchId).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Failed to update judgement:', error);
    return c.json({ error: 'Failed to update judgement', details: String(error) }, 500);
  }
});

/**
 * GET /api/feedbacks/settings/:clientId
 * クライアントのチェック設定取得
 */
feedbacks.get('/settings/:clientId', async (c) => {
  try {
    const clientId = c.req.param('clientId');

    const settings = await c.env.DB.prepare('SELECT * FROM video_check_settings WHERE client_id = ?')
      .bind(clientId)
      .first();

    if (!settings) {
      // デフォルト設定を作成
      await c.env.DB.prepare(`
        INSERT INTO video_check_settings (client_id, similarity_threshold, auto_check_enabled)
        VALUES (?, 0.7, 1)
      `).bind(clientId).run();

      return c.json({
        success: true,
        settings: {
          client_id: clientId,
          similarity_threshold: 0.7,
          auto_check_enabled: 1,
          notify_on_match: 1,
          notify_high_importance_only: 0
        }
      });
    }

    return c.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    return c.json({ error: 'Failed to fetch settings', details: String(error) }, 500);
  }
});

/**
 * PUT /api/feedbacks/settings/:clientId
 * クライアントのチェック設定更新
 */
feedbacks.put('/settings/:clientId', async (c) => {
  try {
    const clientId = c.req.param('clientId');
    const data = await c.req.json();

    await c.env.DB.prepare(`
      UPDATE video_check_settings 
      SET similarity_threshold = ?, auto_check_enabled = ?, 
          notify_on_match = ?, notify_high_importance_only = ?, updated_at = CURRENT_TIMESTAMP
      WHERE client_id = ?
    `).bind(
      data.similarity_threshold ?? 0.7,
      data.auto_check_enabled ?? 1,
      data.notify_on_match ?? 1,
      data.notify_high_importance_only ?? 0,
      clientId
    ).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Failed to update settings:', error);
    return c.json({ error: 'Failed to update settings', details: String(error) }, 500);
  }
});

export default feedbacks;
