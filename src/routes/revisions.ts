import { Hono } from 'hono';
import { interpretRevisionRequest } from '../ai-helper';

type Bindings = {
  DB: D1Database;
};

const revisions = new Hono<{ Bindings: Bindings }>();

// 修正依頼一覧取得
revisions.get('/', async (c) => {
  try {
    const clientId = c.req.query('client_id');
    const status = c.req.query('status');
    
    let query = `
      SELECT r.*, c.name as client_name
      FROM revision_requests r
      LEFT JOIN clients c ON r.client_id = c.id
      ORDER BY r.created_at DESC
    `;
    let params: any[] = [];
    
    if (clientId && status) {
      query = `
        SELECT r.*, c.name as client_name
        FROM revision_requests r
        LEFT JOIN clients c ON r.client_id = c.id
        WHERE r.client_id = ? AND r.status = ?
        ORDER BY r.created_at DESC
      `;
      params = [clientId, status];
    } else if (clientId) {
      query = `
        SELECT r.*, c.name as client_name
        FROM revision_requests r
        LEFT JOIN clients c ON r.client_id = c.id
        WHERE r.client_id = ?
        ORDER BY r.created_at DESC
      `;
      params = [clientId];
    } else if (status) {
      query = `
        SELECT r.*, c.name as client_name
        FROM revision_requests r
        LEFT JOIN clients c ON r.client_id = c.id
        WHERE r.status = ?
        ORDER BY r.created_at DESC
      `;
      params = [status];
    }

    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, revisions: results });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// 修正依頼詳細取得
revisions.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const revision = await c.env.DB.prepare('SELECT * FROM revision_requests WHERE id = ?')
      .bind(id)
      .first();

    if (!revision) {
      return c.json({ success: false, error: 'Revision not found' }, 404);
    }

    return c.json({ success: true, revision });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// 修正依頼作成（AI具体化）
revisions.post('/', async (c) => {
  try {
    const data = await c.req.json();
    const { client_id, blueprint_id, original_comment } = data;

    if (!client_id || !original_comment) {
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

    // AI具体化
    const aiInterpretation = interpretRevisionRequest(original_comment, profile);

    // 保存
    const result = await c.env.DB.prepare(`
      INSERT INTO revision_requests (client_id, blueprint_id, original_comment, ai_interpretation, status)
      VALUES (?, ?, ?, ?, 'pending')
    `).bind(
      client_id,
      blueprint_id || null,
      original_comment,
      aiInterpretation
    ).run();

    return c.json({
      success: true,
      revision_id: result.meta.last_row_id,
      ai_interpretation: aiInterpretation,
    }, 201);
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// 修正依頼ステータス更新
revisions.put('/:id/status', async (c) => {
  try {
    const id = c.req.param('id');
    const { status } = await c.req.json();

    if (!['pending', 'in_progress', 'completed'].includes(status)) {
      return c.json({ success: false, error: 'Invalid status' }, 400);
    }

    await c.env.DB.prepare(`
      UPDATE revision_requests 
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(status, id).run();

    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// 修正依頼更新（AI再解釈）
revisions.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { original_comment } = await c.req.json();

    const revision = await c.env.DB.prepare('SELECT client_id FROM revision_requests WHERE id = ?')
      .bind(id)
      .first();

    if (!revision) {
      return c.json({ success: false, error: 'Revision not found' }, 404);
    }

    const profile = await c.env.DB.prepare('SELECT * FROM client_profiles WHERE client_id = ?')
      .bind(revision.client_id)
      .first();

    // AI再解釈
    const aiInterpretation = interpretRevisionRequest(original_comment, profile);

    await c.env.DB.prepare(`
      UPDATE revision_requests 
      SET original_comment = ?, ai_interpretation = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(original_comment, aiInterpretation, id).run();

    return c.json({
      success: true,
      ai_interpretation: aiInterpretation,
    });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// 修正依頼削除
revisions.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM revision_requests WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

export default revisions;
