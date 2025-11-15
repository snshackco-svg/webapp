-- 動画チェックシステム（フィードバック蓄積＆自動チェック）

-- フィードバックテンプレート（過去の指摘内容を蓄積）
CREATE TABLE IF NOT EXISTS client_feedback_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  video_id INTEGER, -- 任意：特定の動画に紐づける場合
  
  -- 指摘内容
  feedback_text TEXT NOT NULL, -- 指摘内容テキスト（例：「冒頭3秒のインパクトが弱い」）
  category TEXT NOT NULL, -- カテゴリ（構成/テンポ/テロップ/色味/音量/画角/NGワード/話し方）
  phase TEXT NOT NULL, -- 対象フェーズ（撮影/編集/台本/その他）
  importance TEXT NOT NULL, -- 重要度（高/中/低）
  memo TEXT, -- メモ・補足（任意）
  
  -- ステータス
  status TEXT NOT NULL DEFAULT 'active', -- active（有効）/ archived（アーカイブ）
  
  -- 類似検索用ベクトル（Embedding）
  embedding_vector TEXT, -- JSON形式でベクトルを保存（768次元など）
  
  -- 統計情報
  match_count INTEGER DEFAULT 0, -- このフィードバックが自動チェックでマッチした回数
  first_pointed_at DATETIME, -- 初回指摘日
  last_pointed_at DATETIME, -- 最終指摘日
  
  -- メタ情報
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT, -- 登録者名・ユーザーID
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT,
  
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (video_id) REFERENCES learning_videos(id) ON DELETE SET NULL
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_feedback_client_status ON client_feedback_templates(client_id, status);
CREATE INDEX IF NOT EXISTS idx_feedback_category ON client_feedback_templates(category);
CREATE INDEX IF NOT EXISTS idx_feedback_importance ON client_feedback_templates(importance);

-- 動画フィードバックマッチング結果（自動チェック結果）
CREATE TABLE IF NOT EXISTS video_feedback_matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  new_video_id INTEGER NOT NULL, -- 今回チェック対象の動画ID
  feedback_template_id INTEGER NOT NULL, -- マッチしたフィードバックテンプレート
  
  -- 類似度スコア
  similarity_score REAL NOT NULL, -- 0.0〜1.0（1.0が最も類似）
  similarity_rank TEXT, -- A/B/C（UIでの表示用ランク）
  
  -- マッチ詳細
  match_summary_text TEXT, -- どの部分が怪しいか（例：「冒頭0〜3秒のHookが弱い可能性あり」）
  matched_at_timestamp TEXT, -- 動画内のタイムスタンプ（秒数など）
  
  -- ユーザー判定
  user_judgement TEXT, -- 'true_positive'（再発確認）/ 'false_positive'（誤検知）/ null（未判定）
  user_judgement_by TEXT, -- 判定したユーザー
  user_judgement_at DATETIME, -- 判定日時
  user_comment TEXT, -- ユーザーコメント（判定理由など）
  
  -- メタ情報
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT, -- 自動チェック実行者（通常は'system'）
  
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (new_video_id) REFERENCES learning_videos(id) ON DELETE CASCADE,
  FOREIGN KEY (feedback_template_id) REFERENCES client_feedback_templates(id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_match_video ON video_feedback_matches(new_video_id);
CREATE INDEX IF NOT EXISTS idx_match_client ON video_feedback_matches(client_id);
CREATE INDEX IF NOT EXISTS idx_match_score ON video_feedback_matches(similarity_score DESC);
CREATE INDEX IF NOT EXISTS idx_match_judgement ON video_feedback_matches(user_judgement);

-- 自動チェック設定（クライアントごとの閾値設定）
CREATE TABLE IF NOT EXISTS video_check_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL UNIQUE,
  
  -- 閾値設定
  similarity_threshold REAL DEFAULT 0.7, -- 類似度アラート閾値（0.7以上で通知）
  
  -- 自動チェック有効化フラグ
  auto_check_enabled BOOLEAN DEFAULT 1, -- 0: 無効, 1: 有効
  
  -- 通知設定
  notify_on_match BOOLEAN DEFAULT 1, -- マッチ時に通知するか
  notify_high_importance_only BOOLEAN DEFAULT 0, -- 重要度「高」のみ通知
  
  -- メタ情報
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- デフォルト設定を挿入（既存クライアント用）
INSERT OR IGNORE INTO video_check_settings (client_id, similarity_threshold, auto_check_enabled)
SELECT id, 0.7, 1 FROM clients;
