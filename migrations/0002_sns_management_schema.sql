-- SNS運用代行システム用スキーマ
-- クライアント世界観プロファイル、企画、編集設計図、修正依頼などを管理

-- クライアント基本情報
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  industry TEXT,
  target_audience TEXT,
  reference_url TEXT,
  account_url TEXT,
  speaking_style TEXT, -- 話し方・口調
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- クライアント世界観プロファイル（デザイン・トーン）
CREATE TABLE IF NOT EXISTS client_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  main_color TEXT, -- カラーコード
  sub_color TEXT,
  font_main TEXT, -- 本編用フォント
  font_thumbnail TEXT, -- サムネ用フォント
  font_infographic TEXT, -- 図解用フォント
  telop_style TEXT, -- テロップスタイル
  tempo TEXT, -- 高速/中速/低速
  atmosphere TEXT, -- 高級/清潔感/熱血/ポップ/ナチュラル
  ng_items TEXT, -- NG事項（JSON形式）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- 参考動画
CREATE TABLE IF NOT EXISTS reference_videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  url TEXT NOT NULL,
  notes TEXT, -- メモ
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- CapCutスペース管理
CREATE TABLE IF NOT EXISTS capcut_spaces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  purpose TEXT NOT NULL, -- 本編トーク/図解/サムネ/その他
  url TEXT NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- 企画分析・生成履歴
CREATE TABLE IF NOT EXISTS campaign_analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  analysis_period_start DATE,
  analysis_period_end DATE,
  kgi TEXT, -- KGI目標（JSON形式）
  kpi TEXT, -- KPI指標（JSON形式）
  csv_data TEXT, -- アップロードされたCSVデータ（JSON形式）
  report TEXT, -- 生成されたレポート（JSON形式）
  suggestions TEXT, -- 企画案20本（JSON形式）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- 企画案（campaign_analysesから生成された個別企画）
CREATE TABLE IF NOT EXISTS campaign_ideas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  analysis_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  structure TEXT, -- 構成
  key_points TEXT, -- 強調ポイント
  cta TEXT, -- CTA
  script_outline TEXT, -- 台本骨格
  video_purpose TEXT, -- バズ/価値/ストーリー/共感/教育
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (analysis_id) REFERENCES campaign_analyses(id) ON DELETE CASCADE
);

-- 編集設計図（Edit Blueprint）
CREATE TABLE IF NOT EXISTS edit_blueprints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  campaign_idea_id INTEGER, -- 企画案から生成された場合
  script_full TEXT, -- 台本全文
  video_purpose TEXT NOT NULL, -- バズ/価値/共感/教育/ストーリー
  blueprint_data TEXT NOT NULL, -- 編集設計図データ（JSON形式）
  -- カット割り、テロップ設計、Bロール指示、サムネ案など
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_idea_id) REFERENCES campaign_ideas(id) ON DELETE SET NULL
);

-- 修正依頼管理
CREATE TABLE IF NOT EXISTS revision_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  blueprint_id INTEGER, -- 関連する編集設計図
  original_comment TEXT NOT NULL, -- お客様の元コメント
  ai_interpretation TEXT NOT NULL, -- AIによる具体化結果
  status TEXT DEFAULT 'pending', -- pending/in_progress/completed
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (blueprint_id) REFERENCES edit_blueprints(id) ON DELETE SET NULL
);

-- 編集チェック履歴（編集7箇条）
CREATE TABLE IF NOT EXISTS edit_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  blueprint_id INTEGER NOT NULL,
  check_results TEXT NOT NULL, -- チェック結果（JSON形式）
  -- 7つの項目それぞれの判定（red/yellow/green）
  overall_status TEXT, -- 総合判定
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (blueprint_id) REFERENCES edit_blueprints(id) ON DELETE CASCADE
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_client_profiles_client ON client_profiles(client_id);
CREATE INDEX IF NOT EXISTS idx_reference_videos_client ON reference_videos(client_id);
CREATE INDEX IF NOT EXISTS idx_capcut_spaces_client ON capcut_spaces(client_id);
CREATE INDEX IF NOT EXISTS idx_campaign_analyses_client ON campaign_analyses(client_id);
CREATE INDEX IF NOT EXISTS idx_campaign_ideas_analysis ON campaign_ideas(analysis_id);
CREATE INDEX IF NOT EXISTS idx_edit_blueprints_client ON edit_blueprints(client_id);
CREATE INDEX IF NOT EXISTS idx_revision_requests_client ON revision_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_edit_reviews_blueprint ON edit_reviews(blueprint_id);
