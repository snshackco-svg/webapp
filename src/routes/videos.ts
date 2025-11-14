import { Hono } from 'hono'
import type { D1Database, R2Bucket } from '@cloudflare/workers-types'

type Bindings = {
  DB: D1Database
  R2: R2Bucket
  GEMINI_API_KEY: string
  YOUTUBE_API_KEY?: string
}

const videos = new Hono<{ Bindings: Bindings }>()

// ========================================
// YouTube Helper Functions
// ========================================

/**
 * Extract YouTube video ID from URL
 */
function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\?\/]+)/,
    /youtube\.com\/embed\/([^&\?\/]+)/,
    /youtube\.com\/v\/([^&\?\/]+)/
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }
  
  return null
}

/**
 * Fetch YouTube video metadata using YouTube Data API
 */
async function fetchYouTubeMetadata(videoId: string, apiKey: string): Promise<any> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails,statistics&key=${apiKey}`
    )
    
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data.items || data.items.length === 0) {
      throw new Error('Video not found')
    }
    
    const video = data.items[0]
    
    // Parse duration (ISO 8601 format: PT1H2M10S)
    const durationMatch = video.contentDetails.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    const hours = parseInt(durationMatch?.[1] || '0')
    const minutes = parseInt(durationMatch?.[2] || '0')
    const seconds = parseInt(durationMatch?.[3] || '0')
    const durationSeconds = hours * 3600 + minutes * 60 + seconds
    
    return {
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnailUrl: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default.url,
      durationSeconds,
      publishedAt: video.snippet.publishedAt,
      channelTitle: video.snippet.channelTitle,
      statistics: {
        views: parseInt(video.statistics.viewCount || '0'),
        likes: parseInt(video.statistics.likeCount || '0'),
        comments: parseInt(video.statistics.commentCount || '0')
      }
    }
  } catch (error) {
    console.error('Failed to fetch YouTube metadata:', error)
    throw error
  }
}

// ========================================
// Video Upload Routes
// ========================================

/**
 * POST /api/videos/upload
 * Upload video file to Cloudflare R2
 */
videos.post('/upload', async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('video') as File
    const clientId = formData.get('client_id') as string
    const title = formData.get('title') as string
    const performanceMetrics = formData.get('performance_metrics') as string // JSON string
    
    if (!file || !clientId || !title) {
      return c.json({ error: 'Missing required fields: video, client_id, title' }, 400)
    }
    
    // Validate file type
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: 'Invalid file type. Allowed: MP4, MOV, AVI, WebM' }, 400)
    }
    
    // Generate unique R2 key
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(7)
    const extension = file.name.split('.').pop() || 'mp4'
    const r2Key = `videos/${clientId}/${timestamp}-${random}.${extension}`
    
    // Upload to R2
    const arrayBuffer = await file.arrayBuffer()
    await c.env.R2.put(r2Key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type
      }
    })
    
    // Get video duration (estimate from file size if not available)
    const fileSizeInMB = arrayBuffer.byteLength / (1024 * 1024)
    const estimatedDuration = Math.round(fileSizeInMB * 60) // Rough estimate: 1MB ≈ 1 minute
    
    // Save to database
    const result = await c.env.DB.prepare(`
      INSERT INTO learning_videos (
        client_id, title, source_type, r2_key, 
        duration_seconds, performance_metrics, upload_date
      ) VALUES (?, ?, 'upload', ?, ?, ?, datetime('now'))
    `).bind(
      clientId,
      title,
      r2Key,
      estimatedDuration,
      performanceMetrics || '{}'
    ).run()
    
    return c.json({
      success: true,
      video_id: result.meta.last_row_id,
      r2_key: r2Key,
      message: 'Video uploaded successfully. Analysis can be triggered next.'
    })
  } catch (error) {
    console.error('Video upload error:', error)
    return c.json({ error: 'Failed to upload video', details: String(error) }, 500)
  }
})

/**
 * POST /api/videos/youtube
 * Add YouTube video by URL
 */
videos.post('/youtube', async (c) => {
  try {
    const { client_id, youtube_url, title, performance_metrics } = await c.req.json()
    
    if (!client_id || !youtube_url) {
      return c.json({ error: 'Missing required fields: client_id, youtube_url' }, 400)
    }
    
    // Extract video ID
    const videoId = extractYouTubeVideoId(youtube_url)
    if (!videoId) {
      return c.json({ error: 'Invalid YouTube URL' }, 400)
    }
    
    // Fetch metadata from YouTube API (if API key available)
    let metadata: any = null
    let videoTitle = title || 'YouTube Video'
    let durationSeconds = 0
    
    if (c.env.YOUTUBE_API_KEY) {
      try {
        metadata = await fetchYouTubeMetadata(videoId, c.env.YOUTUBE_API_KEY)
        videoTitle = metadata.title
        durationSeconds = metadata.durationSeconds
      } catch (error) {
        console.warn('Failed to fetch YouTube metadata, using provided data:', error)
      }
    }
    
    // Merge performance metrics
    const mergedMetrics = {
      ...(metadata?.statistics || {}),
      ...(performance_metrics || {})
    }
    
    // Save to database
    const result = await c.env.DB.prepare(`
      INSERT INTO learning_videos (
        client_id, title, source_type, video_url, 
        duration_seconds, performance_metrics, upload_date
      ) VALUES (?, ?, 'youtube', ?, ?, ?, datetime('now'))
    `).bind(
      client_id,
      videoTitle,
      youtube_url,
      durationSeconds,
      JSON.stringify(mergedMetrics)
    ).run()
    
    return c.json({
      success: true,
      video_id: result.meta.last_row_id,
      youtube_video_id: videoId,
      metadata,
      message: 'YouTube video added successfully. Analysis can be triggered next.'
    })
  } catch (error) {
    console.error('YouTube video add error:', error)
    return c.json({ error: 'Failed to add YouTube video', details: String(error) }, 500)
  }
})

/**
 * GET /api/videos/client/:clientId
 * Get all learning videos for a client
 */
videos.get('/client/:clientId', async (c) => {
  try {
    const clientId = c.req.param('clientId')
    
    const result = await c.env.DB.prepare(`
      SELECT 
        lv.*,
        CASE 
          WHEN va.id IS NOT NULL THEN 1 
          ELSE 0 
        END as has_analysis
      FROM learning_videos lv
      LEFT JOIN video_analysis va ON lv.id = va.learning_video_id
      WHERE lv.client_id = ?
      ORDER BY lv.upload_date DESC
    `).bind(clientId).all()
    
    return c.json({
      success: true,
      videos: result.results
    })
  } catch (error) {
    console.error('Failed to fetch videos:', error)
    return c.json({ error: 'Failed to fetch videos', details: String(error) }, 500)
  }
})

/**
 * GET /api/videos/:videoId
 * Get video details
 */
videos.get('/:videoId', async (c) => {
  try {
    const videoId = c.req.param('videoId')
    
    const result = await c.env.DB.prepare(`
      SELECT * FROM learning_videos WHERE id = ?
    `).bind(videoId).first()
    
    if (!result) {
      return c.json({ error: 'Video not found' }, 404)
    }
    
    return c.json({
      success: true,
      video: result
    })
  } catch (error) {
    console.error('Failed to fetch video:', error)
    return c.json({ error: 'Failed to fetch video', details: String(error) }, 500)
  }
})

/**
 * DELETE /api/videos/:videoId
 * Delete video and related data
 */
videos.delete('/:videoId', async (c) => {
  try {
    const videoId = c.req.param('videoId')
    
    // Get video info first
    const video = await c.env.DB.prepare(`
      SELECT * FROM learning_videos WHERE id = ?
    `).bind(videoId).first() as any
    
    if (!video) {
      return c.json({ error: 'Video not found' }, 404)
    }
    
    // Delete from R2 if it's an uploaded video
    if (video.source_type === 'upload' && video.r2_key) {
      try {
        await c.env.R2.delete(video.r2_key)
      } catch (error) {
        console.warn('Failed to delete from R2:', error)
      }
    }
    
    // Delete related data (cascading delete)
    await c.env.DB.prepare(`DELETE FROM video_frames WHERE learning_video_id = ?`).bind(videoId).run()
    await c.env.DB.prepare(`DELETE FROM video_analysis WHERE learning_video_id = ?`).bind(videoId).run()
    await c.env.DB.prepare(`DELETE FROM learning_videos WHERE id = ?`).bind(videoId).run()
    
    // Recalculate learning statistics for the client
    await recalculateLearningStats(c.env.DB, video.client_id)
    
    return c.json({
      success: true,
      message: 'Video deleted successfully'
    })
  } catch (error) {
    console.error('Failed to delete video:', error)
    return c.json({ error: 'Failed to delete video', details: String(error) }, 500)
  }
})

// ========================================
// Video Analysis Routes
// ========================================

/**
 * POST /api/videos/:videoId/analyze
 * Trigger Gemini API analysis for video
 */
videos.post('/:videoId/analyze', async (c) => {
  try {
    const videoId = c.req.param('videoId')
    const { force = false } = await c.req.json().catch(() => ({ force: false }))
    
    // Get video info
    const video = await c.env.DB.prepare(`
      SELECT * FROM learning_videos WHERE id = ?
    `).bind(videoId).first() as any
    
    if (!video) {
      return c.json({ error: 'Video not found' }, 404)
    }
    
    // Check if already analyzed
    if (!force) {
      const existing = await c.env.DB.prepare(`
        SELECT id FROM video_analysis WHERE learning_video_id = ?
      `).bind(videoId).first()
      
      if (existing) {
        return c.json({ 
          success: false, 
          message: 'Video already analyzed. Use force=true to re-analyze.' 
        }, 400)
      }
    }
    
    // Get client profile for context
    const clientProfile = await c.env.DB.prepare(`
      SELECT cp.* FROM client_profiles cp
      WHERE cp.client_id = ?
    `).bind(video.client_id).first()
    
    // Import Gemini helper (dynamic import for proper bundling)
    const { analyzeVideoWithGemini } = await import('../gemini-helper')
    
    // Perform analysis with Gemini 2.0 Flash (高速・安定・最適なコスパ)
    const analysisResult = await analyzeVideoWithGemini(
      video,
      clientProfile,
      {
        apiKey: c.env.GEMINI_API_KEY,
        model: 'gemini-2.0-flash', // Gemini 2.0 Flash - 安定モデル
        temperature: 0.4, // 適度な創造性と一貫性のバランス
        maxOutputTokens: 8192 // 詳細な分析のために十分なトークン数
      }
    )
    
    // Save analysis to database (using schema column names)
    const insertResult = await c.env.DB.prepare(`
      INSERT INTO video_analysis (
        learning_video_id, analysis_type, cut_frequency, telop_style,
        dominant_colors, color_temperature, brightness_level, saturation_level,
        pace, scene_change_tempo, has_bgm, bgm_genre, sound_effect_usage,
        structure, hook_duration, cta_position, ai_raw_response
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      videoId,
      'full',
      analysisResult.cut_frequency || 0,
      analysisResult.telop_style || '{}',
      analysisResult.color_scheme || '[]',
      JSON.parse(analysisResult.color_scheme || '{}').temperature || 'neutral',
      JSON.parse(analysisResult.color_scheme || '{}').brightness || 50,
      JSON.parse(analysisResult.color_scheme || '{}').saturation || 50,
      JSON.parse(analysisResult.pace_rhythm || '{}').pace || 'medium',
      JSON.stringify(JSON.parse(analysisResult.pace_rhythm || '{}').scene_changes || []),
      JSON.parse(analysisResult.bgm_style || '{}').has_bgm || false,
      JSON.parse(analysisResult.bgm_style || '{}').genre || '',
      JSON.stringify(JSON.parse(analysisResult.bgm_style || '{}').sound_effects || {}),
      analysisResult.structure_flow || '{}',
      analysisResult.raw_analysis?.hookDuration || 0,
      analysisResult.raw_analysis?.ctaPosition || 'end',
      JSON.stringify(analysisResult.raw_analysis || {})
    ).run()
    
    // Log API usage (using schema column names)
    await c.env.DB.prepare(`
      INSERT INTO gemini_api_logs (
        request_type, model_used, total_tokens, success
      ) VALUES (?, ?, ?, ?)
    `).bind(
      'video_analysis',
      'gemini-1.5-flash',
      analysisResult.tokens_used || 0,
      true
    ).run()
    
    // Recalculate learning statistics
    await recalculateLearningStats(c.env.DB, video.client_id)
    
    return c.json({
      success: true,
      analysis_id: insertResult.meta.last_row_id,
      analysis: analysisResult,
      message: 'Video analysis completed successfully'
    })
  } catch (error) {
    console.error('Video analysis error:', error)
    return c.json({ error: 'Failed to analyze video', details: String(error) }, 500)
  }
})

/**
 * GET /api/videos/:videoId/analysis
 * Get analysis results for a video
 */
videos.get('/:videoId/analysis', async (c) => {
  try {
    const videoId = c.req.param('videoId')
    
    const result = await c.env.DB.prepare(`
      SELECT va.*, lv.title as video_title
      FROM video_analysis va
      JOIN learning_videos lv ON va.learning_video_id = lv.id
      WHERE va.learning_video_id = ?
    `).bind(videoId).first()
    
    if (!result) {
      return c.json({ error: 'Analysis not found' }, 404)
    }
    
    // Parse JSON fields for frontend consumption
    const analysis = {
      ...result,
      telop_style: result.telop_style ? JSON.parse(result.telop_style) : null,
      raw_analysis: result.ai_raw_response ? JSON.parse(result.ai_raw_response) : null
    }
    
    return c.json({
      success: true,
      analysis
    })
  } catch (error) {
    console.error('Failed to fetch analysis:', error)
    return c.json({ error: 'Failed to fetch analysis', details: String(error) }, 500)
  }
})

// ========================================
// Learning Statistics Routes
// ========================================

/**
 * GET /api/videos/stats/:clientId
 * Get learning statistics for a client
 */
videos.get('/stats/:clientId', async (c) => {
  try {
    const clientId = c.req.param('clientId')
    
    const result = await c.env.DB.prepare(`
      SELECT * FROM learning_statistics WHERE client_id = ?
    `).bind(clientId).first()
    
    if (!result) {
      return c.json({ 
        success: true, 
        stats: null,
        message: 'No learning statistics available yet. Upload and analyze videos first.'
      })
    }
    
    return c.json({
      success: true,
      stats: result
    })
  } catch (error) {
    console.error('Failed to fetch statistics:', error)
    return c.json({ error: 'Failed to fetch statistics', details: String(error) }, 500)
  }
})

/**
 * POST /api/videos/stats/:clientId/recalculate
 * Manually recalculate learning statistics
 */
videos.post('/stats/:clientId/recalculate', async (c) => {
  try {
    const clientId = c.req.param('clientId')
    
    await recalculateLearningStats(c.env.DB, clientId)
    
    return c.json({
      success: true,
      message: 'Learning statistics recalculated successfully'
    })
  } catch (error) {
    console.error('Failed to recalculate statistics:', error)
    return c.json({ error: 'Failed to recalculate statistics', details: String(error) }, 500)
  }
})

// ========================================
// Helper Functions
// ========================================

/**
 * Recalculate learning statistics for a client
 */
async function recalculateLearningStats(db: D1Database, clientId: string | number): Promise<void> {
  try {
    // Get all analyzed videos for this client
    const videos = await db.prepare(`
      SELECT 
        lv.id, lv.performance_metrics,
        va.cut_frequency
      FROM learning_videos lv
      JOIN video_analysis va ON lv.id = va.learning_video_id
      WHERE lv.client_id = ?
    `).bind(clientId).all()
    
    if (!videos.results || videos.results.length === 0) {
      // No analyzed videos, delete existing stats
      await db.prepare(`
        DELETE FROM learning_statistics WHERE client_id = ?
      `).bind(clientId).run()
      return
    }
    
    // Calculate aggregated statistics
    const totalVideos = videos.results.length
    let totalViews = 0
    let totalLikes = 0
    let totalSaves = 0
    let avgCutFrequency = 0
    
    for (const video of videos.results as any[]) {
      const metrics = JSON.parse(video.performance_metrics || '{}')
      totalViews += metrics.views || 0
      totalLikes += metrics.likes || 0
      totalSaves += metrics.saves || 0
      avgCutFrequency += video.cut_frequency || 0
    }
    
    avgCutFrequency = avgCutFrequency / totalVideos
    
    // Find best performing video
    const bestVideo = videos.results.reduce((best: any, current: any) => {
      const currentMetrics = JSON.parse(current.performance_metrics || '{}')
      const bestMetrics = JSON.parse(best.performance_metrics || '{}')
      return (currentMetrics.views || 0) > (bestMetrics.views || 0) ? current : best
    }, videos.results[0])
    
    // Upsert statistics (using schema column names)
    await db.prepare(`
      INSERT INTO learning_statistics (
        client_id, total_videos_analyzed, average_cut_frequency,
        last_updated
      ) VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(client_id) DO UPDATE SET
        total_videos_analyzed = excluded.total_videos_analyzed,
        average_cut_frequency = excluded.average_cut_frequency,
        last_updated = datetime('now')
    `).bind(
      clientId,
      totalVideos,
      avgCutFrequency
    ).run()
  } catch (error) {
    console.error('Failed to recalculate learning statistics:', error)
    throw error
  }
}

export default videos
