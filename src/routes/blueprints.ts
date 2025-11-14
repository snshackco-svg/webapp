import { Hono } from 'hono';
import { generateEditBlueprint, checkEditingRules } from '../ai-helper';

type Bindings = {
  DB: D1Database;
};

const blueprints = new Hono<{ Bindings: Bindings }>();

// 編集設計図一覧取得
blueprints.get('/', async (c) => {
  try {
    const clientId = c.req.query('client_id');
    
    let query = `
      SELECT b.*, c.name as client_name
      FROM edit_blueprints b
      LEFT JOIN clients c ON b.client_id = c.id
      ORDER BY b.created_at DESC
    `;
    let params: any[] = [];
    
    if (clientId) {
      query = `
        SELECT b.*, c.name as client_name
        FROM edit_blueprints b
        LEFT JOIN clients c ON b.client_id = c.id
        WHERE b.client_id = ?
        ORDER BY b.created_at DESC
      `;
      params = [clientId];
    }

    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, blueprints: results });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// 編集設計図詳細取得
blueprints.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const blueprint = await c.env.DB.prepare('SELECT * FROM edit_blueprints WHERE id = ?')
      .bind(id)
      .first();

    if (!blueprint) {
      return c.json({ success: false, error: 'Blueprint not found' }, 404);
    }

    return c.json({
      success: true,
      blueprint: {
        ...blueprint,
        blueprint_data: blueprint.blueprint_data ? JSON.parse(blueprint.blueprint_data as string) : null,
      },
    });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// 編集設計図生成
blueprints.post('/generate', async (c) => {
  try {
    const data = await c.req.json();
    const {
      client_id,
      campaign_idea_id,
      script_full,
      video_purpose,
    } = data;

    if (!client_id || !script_full || !video_purpose) {
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

    const { results: spaces } = await c.env.DB.prepare('SELECT * FROM capcut_spaces WHERE client_id = ?')
      .bind(client_id)
      .all();

    // 編集設計図生成
    const blueprintData = generateEditBlueprint(
      script_full,
      video_purpose,
      profile,
      spaces
    );

    // 保存
    const result = await c.env.DB.prepare(`
      INSERT INTO edit_blueprints (client_id, campaign_idea_id, script_full, video_purpose, blueprint_data)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      client_id,
      campaign_idea_id || null,
      script_full,
      video_purpose,
      JSON.stringify(blueprintData)
    ).run();

    return c.json({
      success: true,
      blueprint_id: result.meta.last_row_id,
      blueprint_data: blueprintData,
    }, 201);
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// 編集設計図更新
blueprints.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const data = await c.req.json();
    const { script_full, video_purpose, blueprint_data } = data;

    await c.env.DB.prepare(`
      UPDATE edit_blueprints 
      SET script_full = ?, video_purpose = ?, blueprint_data = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(script_full, video_purpose, JSON.stringify(blueprint_data), id).run();

    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// 編集設計図削除
blueprints.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM edit_blueprints WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// 編集チェック実行
blueprints.post('/:id/review', async (c) => {
  try {
    const id = c.req.param('id');

    const blueprint = await c.env.DB.prepare('SELECT * FROM edit_blueprints WHERE id = ?')
      .bind(id)
      .first();

    if (!blueprint) {
      return c.json({ success: false, error: 'Blueprint not found' }, 404);
    }

    const blueprintData = blueprint.blueprint_data ? JSON.parse(blueprint.blueprint_data as string) : {};
    
    // 編集7箇条チェック実行
    const checkResults = checkEditingRules(blueprintData);

    // 保存
    const result = await c.env.DB.prepare(`
      INSERT INTO edit_reviews (blueprint_id, check_results, overall_status)
      VALUES (?, ?, ?)
    `).bind(
      id,
      JSON.stringify(checkResults),
      checkResults.overall
    ).run();

    return c.json({
      success: true,
      review_id: result.meta.last_row_id,
      check_results: checkResults,
    }, 201);
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// 編集チェック結果取得
blueprints.get('/:id/reviews', async (c) => {
  try {
    const id = c.req.param('id');
    const { results } = await c.env.DB.prepare('SELECT * FROM edit_reviews WHERE blueprint_id = ? ORDER BY created_at DESC')
      .bind(id)
      .all();

    return c.json({
      success: true,
      reviews: results.map(r => ({
        ...r,
        check_results: r.check_results ? JSON.parse(r.check_results as string) : null,
      })),
    });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

export default blueprints;
