import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

const clients = new Hono<{ Bindings: Bindings }>();

// クライアント一覧取得
clients.get('/', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT c.*, cp.main_color, cp.sub_color, cp.tempo, cp.atmosphere
      FROM clients c
      LEFT JOIN client_profiles cp ON c.id = cp.client_id
      ORDER BY c.created_at DESC
    `).all();
    return c.json({ success: true, clients: results });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// クライアント詳細取得
clients.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    // 基本情報
    const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ?')
      .bind(id)
      .first();

    if (!client) {
      return c.json({ success: false, error: 'Client not found' }, 404);
    }

    // プロファイル
    const profile = await c.env.DB.prepare('SELECT * FROM client_profiles WHERE client_id = ?')
      .bind(id)
      .first();

    // 参考動画
    const { results: videos } = await c.env.DB.prepare('SELECT * FROM reference_videos WHERE client_id = ?')
      .bind(id)
      .all();

    // CapCutスペース
    const { results: spaces } = await c.env.DB.prepare('SELECT * FROM capcut_spaces WHERE client_id = ?')
      .bind(id)
      .all();

    return c.json({
      success: true,
      client,
      profile,
      videos,
      spaces,
    });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// クライアント作成
clients.post('/', async (c) => {
  try {
    const data = await c.req.json();
    const { name, industry, target_audience, reference_url, account_url, speaking_style } = data;

    if (!name) {
      return c.json({ success: false, error: 'Name is required' }, 400);
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO clients (name, industry, target_audience, reference_url, account_url, speaking_style)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(name, industry || '', target_audience || '', reference_url || '', account_url || '', speaking_style || '').run();

    return c.json({ success: true, id: result.meta.last_row_id }, 201);
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// クライアント更新
clients.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const data = await c.req.json();
    const { name, industry, target_audience, reference_url, account_url, speaking_style } = data;

    await c.env.DB.prepare(`
      UPDATE clients 
      SET name = ?, industry = ?, target_audience = ?, reference_url = ?, account_url = ?, speaking_style = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(name, industry, target_audience, reference_url, account_url, speaking_style, id).run();

    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// クライアント削除
clients.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM clients WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// プロファイル保存/更新
clients.post('/:id/profile', async (c) => {
  try {
    const id = c.req.param('id');
    const data = await c.req.json();
    const {
      main_color, sub_color, font_main, font_thumbnail, font_infographic,
      telop_style, tempo, atmosphere, ng_items
    } = data;

    // 既存プロファイルをチェック
    const existing = await c.env.DB.prepare('SELECT id FROM client_profiles WHERE client_id = ?')
      .bind(id)
      .first();

    if (existing) {
      // 更新
      await c.env.DB.prepare(`
        UPDATE client_profiles 
        SET main_color = ?, sub_color = ?, font_main = ?, font_thumbnail = ?, font_infographic = ?,
            telop_style = ?, tempo = ?, atmosphere = ?, ng_items = ?, updated_at = CURRENT_TIMESTAMP
        WHERE client_id = ?
      `).bind(main_color, sub_color, font_main, font_thumbnail, font_infographic,
        telop_style, tempo, atmosphere, JSON.stringify(ng_items || []), id).run();
    } else {
      // 新規作成
      await c.env.DB.prepare(`
        INSERT INTO client_profiles (client_id, main_color, sub_color, font_main, font_thumbnail, font_infographic,
                                     telop_style, tempo, atmosphere, ng_items)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(id, main_color, sub_color, font_main, font_thumbnail, font_infographic,
        telop_style, tempo, atmosphere, JSON.stringify(ng_items || [])).run();
    }

    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// 参考動画追加
clients.post('/:id/videos', async (c) => {
  try {
    const id = c.req.param('id');
    const { url, notes } = await c.req.json();

    if (!url) {
      return c.json({ success: false, error: 'URL is required' }, 400);
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO reference_videos (client_id, url, notes)
      VALUES (?, ?, ?)
    `).bind(id, url, notes || '').run();

    return c.json({ success: true, id: result.meta.last_row_id }, 201);
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// 参考動画削除
clients.delete('/:id/videos/:videoId', async (c) => {
  try {
    const videoId = c.req.param('videoId');
    await c.env.DB.prepare('DELETE FROM reference_videos WHERE id = ?').bind(videoId).run();
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// CapCutスペース追加
clients.post('/:id/spaces', async (c) => {
  try {
    const id = c.req.param('id');
    const { purpose, url, notes } = await c.req.json();

    if (!purpose || !url) {
      return c.json({ success: false, error: 'Purpose and URL are required' }, 400);
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO capcut_spaces (client_id, purpose, url, notes)
      VALUES (?, ?, ?, ?)
    `).bind(id, purpose, url, notes || '').run();

    return c.json({ success: true, id: result.meta.last_row_id }, 201);
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// CapCutスペース更新
clients.put('/:id/spaces/:spaceId', async (c) => {
  try {
    const spaceId = c.req.param('spaceId');
    const { purpose, url, notes } = await c.req.json();

    await c.env.DB.prepare(`
      UPDATE capcut_spaces 
      SET purpose = ?, url = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(purpose, url, notes, spaceId).run();

    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// CapCutスペース削除
clients.delete('/:id/spaces/:spaceId', async (c) => {
  try {
    const spaceId = c.req.param('spaceId');
    await c.env.DB.prepare('DELETE FROM capcut_spaces WHERE id = ?').bind(spaceId).run();
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

export default clients;
