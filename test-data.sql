-- テストデータ投入用SQL
-- 実際にシステムを動作確認するためのサンプルデータ

-- クライアント2件追加
INSERT INTO clients (name, industry, target_audience, account_url, speaking_style) VALUES
  ('美容サロンA', '美容業界', '20-40代女性', 'https://instagram.com/beauty_salon_a', '丁寧な敬語'),
  ('フィットネスジムB', 'フィットネス業界', '20-50代男女', 'https://instagram.com/fitness_gym_b', '励ましの口調');

-- 美容サロンAのプロファイル
INSERT INTO client_profiles (client_id, main_color, sub_color, font_main, font_thumbnail, font_infographic, telop_style, tempo, atmosphere, ng_items) VALUES
  (2, '#FFC0CB', '#FFD700', 'UD新ゴ', '筑紫明朝', 'じゃぽねすく', 'ドロップシャドウ', '中速', '高級感', '["過度な装飾禁止", "派手な色使い禁止"]');

-- フィットネスジムBのプロファイル
INSERT INTO client_profiles (client_id, main_color, sub_color, font_main, font_thumbnail, font_infographic, telop_style, tempo, atmosphere, ng_items) VALUES
  (3, '#FF4500', '#FFD700', 'ゴシック体', 'インパクト', '丸ゴシック', 'アウトライン', '高速', '熱血', '["スローモーション禁止", "静かな音楽禁止"]');

-- CapCutスペース
INSERT INTO capcut_spaces (client_id, purpose, url, notes) VALUES
  (2, '本編トーク用', 'https://capcut.com/space/beauty001', '高級感のあるテンプレート'),
  (2, '図解用', 'https://capcut.com/space/beauty002', 'シンプルな図解用'),
  (2, 'サムネ用', 'https://capcut.com/space/beauty003', 'ピンクベースのサムネ'),
  (3, '本編トーク用', 'https://capcut.com/space/fitness001', '動きのあるテンプレート'),
  (3, '図解用', 'https://capcut.com/space/fitness002', 'データ可視化用'),
  (3, 'サムネ用', 'https://capcut.com/space/fitness003', 'インパクトのあるサムネ');

-- 参考動画
INSERT INTO reference_videos (client_id, url, notes) VALUES
  (2, 'https://youtube.com/watch?v=example1', '理想的なトーン・テンポの参考動画'),
  (2, 'https://youtube.com/watch?v=example2', 'テロップデザインの参考'),
  (3, 'https://youtube.com/watch?v=example3', '熱いトレーニング動画'),
  (3, 'https://youtube.com/watch?v=example4', 'モチベーション系の構成参考');
