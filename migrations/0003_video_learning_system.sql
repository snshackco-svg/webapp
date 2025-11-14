-- 動画学習システム用スキーマ
-- 実際の動画から学習してクオリティを向上

-- 学習用動画（アップロードまたはYouTube URL）
CREATE TABLE IF NOT EXISTS learning_videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL, -- 'upload' or 'youtube'
  video_url TEXT, -- YouTube URL or R2 URL
  r2_key TEXT, -- Cloudflare R2のキー（アップロードの場合）
  duration_seconds INTEGER,
  upload_date DATE,
  performance_metrics TEXT, -- JSON: views, likes, saves, engagement_rate
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- 動画解析結果
CREATE TABLE IF NOT EXISTS video_analysis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  learning_video_id INTEGER NOT NULL,
  analysis_type TEXT NOT NULL, -- 'full', 'frames', 'audio', 'metadata'
  
  -- カット割り分析
  cut_frequency REAL, -- 平均カット間隔（秒）
  shot_types TEXT, -- JSON配列: ['寄り', '引き', 'ズーム']
  cut_count INTEGER,
  
  -- テロップ分析
  telop_style TEXT, -- JSON: 抽出されたテロップスタイル
  telop_frequency REAL, -- テロップ出現頻度
  telop_colors TEXT, -- JSON: 使用色
  
  -- 色・トーン分析
  dominant_colors TEXT, -- JSON: 主要な色（カラーコード）
  color_temperature TEXT, -- 'warm' or 'cool' or 'neutral'
  brightness_level REAL, -- 0-100
  saturation_level REAL, -- 0-100
  
  -- テンポ・リズム分析
  pace TEXT, -- 'fast', 'medium', 'slow'
  scene_change_tempo TEXT, -- JSON: シーン変更のタイミング
  
  -- BGM・効果音分析
  has_bgm BOOLEAN,
  bgm_genre TEXT,
  sound_effect_usage TEXT, -- JSON: 効果音の使用頻度
  
  -- 構成分析
  structure TEXT, -- JSON: 動画の構成（イントロ、本編、アウトロなど）
  hook_duration INTEGER, -- 冒頭のフック時間（秒）
  cta_position TEXT, -- CTAの位置
  
  -- AI解析の生データ
  ai_raw_response TEXT, -- Gemini APIの完全なレスポンス（JSON）
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (learning_video_id) REFERENCES learning_videos(id) ON DELETE CASCADE
);

-- フレーム抽出データ（重要シーンのサムネイル）
CREATE TABLE IF NOT EXISTS video_frames (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  learning_video_id INTEGER NOT NULL,
  frame_number INTEGER NOT NULL,
  timestamp_seconds REAL NOT NULL,
  frame_type TEXT, -- 'intro', 'hook', 'content', 'cta', 'outro'
  r2_key TEXT, -- Cloudflare R2に保存されたフレーム画像
  description TEXT, -- このフレームの説明
  visual_elements TEXT, -- JSON: 視覚要素（テキスト、人物、オブジェクトなど）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (learning_video_id) REFERENCES learning_videos(id) ON DELETE CASCADE
);

-- 学習データの統計（クライアント全体）
CREATE TABLE IF NOT EXISTS learning_statistics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  
  -- 統計データ
  total_videos_analyzed INTEGER DEFAULT 0,
  average_video_duration REAL,
  
  -- パターン統計
  most_common_pace TEXT, -- 最も多いテンポ
  most_common_shot_types TEXT, -- JSON: 最も多い画角
  average_cut_frequency REAL, -- 平均カット間隔
  
  -- 色・デザイン統計
  brand_colors TEXT, -- JSON: ブランドカラー（頻出色）
  preferred_brightness REAL,
  preferred_saturation REAL,
  
  -- 構成統計
  common_structure TEXT, -- JSON: よく使われる構成
  average_hook_duration REAL,
  
  -- パフォーマンス相関
  high_performance_patterns TEXT, -- JSON: 高パフォーマンス動画の共通点
  low_performance_patterns TEXT, -- JSON: 低パフォーマンス動画の共通点
  
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  UNIQUE(client_id)
);

-- Gemini API使用ログ
CREATE TABLE IF NOT EXISTS gemini_api_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_type TEXT NOT NULL, -- 'video_analysis', 'campaign_generation', 'blueprint_generation'
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  model_used TEXT, -- 'gemini-1.5-pro', 'gemini-1.5-flash', etc.
  success BOOLEAN,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_learning_videos_client ON learning_videos(client_id);
CREATE INDEX IF NOT EXISTS idx_video_analysis_video ON video_analysis(learning_video_id);
CREATE INDEX IF NOT EXISTS idx_video_frames_video ON video_frames(learning_video_id);
CREATE INDEX IF NOT EXISTS idx_learning_statistics_client ON learning_statistics(client_id);
CREATE INDEX IF NOT EXISTS idx_gemini_logs_type ON gemini_api_logs(request_type);
CREATE INDEX IF NOT EXISTS idx_gemini_logs_created ON gemini_api_logs(created_at);
