import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { renderer } from './renderer'

// Type definition for Cloudflare bindings
type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS for API routes
app.use('/api/*', cors())

app.use(renderer)

// Homepage
app.get('/', (c) => {
  return c.render(
    <div>
      <h1>Welcome to webapp</h1>
      <p>データ永続化対応アプリケーション</p>
      <div style="margin-top: 20px;">
        <h2>API Endpoints:</h2>
        <ul>
          <li><a href="/api/users">GET /api/users</a> - ユーザー一覧</li>
          <li><a href="/api/posts">GET /api/posts</a> - 投稿一覧</li>
          <li>POST /api/users - ユーザー作成</li>
          <li>POST /api/posts - 投稿作成</li>
        </ul>
      </div>
    </div>
  )
})

// API: Get all users
app.get('/api/users', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT id, email, name, created_at, updated_at FROM users ORDER BY created_at DESC'
    ).all()
    return c.json({ success: true, users: results })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// API: Create a new user
app.post('/api/users', async (c) => {
  try {
    const { email, name } = await c.req.json()
    
    if (!email || !name) {
      return c.json({ success: false, error: 'Email and name are required' }, 400)
    }

    const result = await c.env.DB.prepare(
      'INSERT INTO users (email, name) VALUES (?, ?)'
    ).bind(email, name).run()

    return c.json({ 
      success: true, 
      user: { 
        id: result.meta.last_row_id, 
        email, 
        name 
      } 
    }, 201)
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// API: Get all posts with user information
app.get('/api/posts', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT 
        p.id, 
        p.title, 
        p.content, 
        p.created_at,
        p.updated_at,
        u.name as author_name,
        u.email as author_email
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `).all()
    return c.json({ success: true, posts: results })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// API: Create a new post
app.post('/api/posts', async (c) => {
  try {
    const { title, content, user_id } = await c.req.json()
    
    if (!title || !user_id) {
      return c.json({ success: false, error: 'Title and user_id are required' }, 400)
    }

    const result = await c.env.DB.prepare(
      'INSERT INTO posts (title, content, user_id) VALUES (?, ?, ?)'
    ).bind(title, content || '', user_id).run()

    return c.json({ 
      success: true, 
      post: { 
        id: result.meta.last_row_id, 
        title, 
        content,
        user_id
      } 
    }, 201)
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

export default app
