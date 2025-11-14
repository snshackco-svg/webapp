import { Hono } from 'hono';
import { analyzeCSVData } from '../ai-helper';

type Bindings = {
  DB: D1Database;
};

const campaigns = new Hono<{ Bindings: Bindings }>();

// 企画分析一覧取得
campaigns.get('/', async (c) => {
  try {
    const clientId = c.req.query('client_id');
    
    let query = 'SELECT * FROM campaign_analyses ORDER BY created_at DESC';
    let params: any[] = [];
    
    if (clientId) {
      query = 'SELECT * FROM campaign_analyses WHERE client_id = ? ORDER BY created_at DESC';
      params = [clientId];
    }

    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, analyses: results });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// 企画分析詳細取得
campaigns.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const analysis = await c.env.DB.prepare('SELECT * FROM campaign_analyses WHERE id = ?')
      .bind(id)
      .first();

    if (!analysis) {
      return c.json({ success: false, error: 'Analysis not found' }, 404);
    }

    // 企画案を取得
    const { results: ideas } = await c.env.DB.prepare('SELECT * FROM campaign_ideas WHERE analysis_id = ?')
      .bind(id)
      .all();

    return c.json({
      success: true,
      analysis: {
        ...analysis,
        report: analysis.report ? JSON.parse(analysis.report as string) : null,
      },
      ideas,
    });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// 企画自動生成（CSV解析）
campaigns.post('/analyze', async (c) => {
  try {
    const data = await c.req.json();
    const {
      client_id,
      analysis_period_start,
      analysis_period_end,
      kgi,
      kpi,
      csv_data,
    } = data;

    if (!client_id || !kgi || !kpi || !csv_data) {
      return c.json({ success: false, error: 'Required fields missing' }, 400);
    }

    // クライアント情報取得
    const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ?')
      .bind(client_id)
      .first();

    if (!client) {
      return c.json({ success: false, error: 'Client not found' }, 404);
    }

    const profile = await c.env.DB.prepare('SELECT * FROM client_profiles WHERE client_id = ?')
      .bind(client_id)
      .first();

    // CSV解析とレポート生成
    const { report, ideas } = analyzeCSVData(
      csv_data,
      kgi,
      kpi,
      profile
    );

    // 分析結果を保存
    const analysisResult = await c.env.DB.prepare(`
      INSERT INTO campaign_analyses (client_id, analysis_period_start, analysis_period_end, kgi, kpi, csv_data, report)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      client_id,
      analysis_period_start || null,
      analysis_period_end || null,
      kgi,
      JSON.stringify(kpi),
      JSON.stringify(csv_data),
      JSON.stringify(report)
    ).run();

    const analysisId = analysisResult.meta.last_row_id;

    // 企画案を保存
    for (const idea of ideas) {
      await c.env.DB.prepare(`
        INSERT INTO campaign_ideas (analysis_id, title, structure, key_points, cta, script_outline, video_purpose)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        analysisId,
        idea.title,
        idea.structure,
        idea.key_points,
        idea.cta,
        idea.script_outline,
        idea.video_purpose
      ).run();
    }

    return c.json({
      success: true,
      analysis_id: analysisId,
      report,
      ideas,
    }, 201);
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// 企画案一覧取得（分析IDから）
campaigns.get('/:id/ideas', async (c) => {
  try {
    const id = c.req.param('id');
    const { results } = await c.env.DB.prepare('SELECT * FROM campaign_ideas WHERE analysis_id = ?')
      .bind(id)
      .all();

    return c.json({ success: true, ideas: results });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// 企画案詳細取得
campaigns.get('/ideas/:ideaId', async (c) => {
  try {
    const ideaId = c.req.param('ideaId');
    const idea = await c.env.DB.prepare('SELECT * FROM campaign_ideas WHERE id = ?')
      .bind(ideaId)
      .first();

    if (!idea) {
      return c.json({ success: false, error: 'Idea not found' }, 404);
    }

    return c.json({ success: true, idea });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// 企画案更新
campaigns.put('/ideas/:ideaId', async (c) => {
  try {
    const ideaId = c.req.param('ideaId');
    const data = await c.req.json();
    const { title, structure, key_points, cta, script_outline, video_purpose } = data;

    await c.env.DB.prepare(`
      UPDATE campaign_ideas 
      SET title = ?, structure = ?, key_points = ?, cta = ?, script_outline = ?, video_purpose = ?
      WHERE id = ?
    `).bind(title, structure, key_points, cta, script_outline, video_purpose, ideaId).run();

    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// 企画案削除
campaigns.delete('/ideas/:ideaId', async (c) => {
  try {
    const ideaId = c.req.param('ideaId');
    await c.env.DB.prepare('DELETE FROM campaign_ideas WHERE id = ?').bind(ideaId).run();
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

export default campaigns;
