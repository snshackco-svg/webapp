# webapp - データ永続化対応アプリケーション

## プロジェクト概要
- **名前**: webapp
- **目標**: Cloudflare D1データベースを使用したデータ永続化対応のWebアプリケーション
- **主な機能**: 
  - ユーザー管理 (作成・一覧表示)
  - 投稿管理 (作成・一覧表示)
  - データの永続化 (デプロイ時にデータが保持される)

## 実装済み機能
✅ Cloudflare D1データベースの設定
✅ マイグレーションシステム
✅ ユーザーCRUD API
✅ 投稿CRUD API
✅ 開発環境の構築
✅ データ永続化の実装

## URL
- **開発環境**: https://3000-ikelml0m52s4b77smodhy-18e660f9.sandbox.novita.ai
- **本番環境**: デプロイ後に更新されます
- **GitHub**: 設定後に更新されます

## API エンドポイント

### ユーザー関連
- `GET /api/users` - ユーザー一覧を取得
- `POST /api/users` - 新しいユーザーを作成
  ```json
  {
    "email": "user@example.com",
    "name": "User Name"
  }
  ```

### 投稿関連
- `GET /api/posts` - 投稿一覧を取得（投稿者情報付き）
- `POST /api/posts` - 新しい投稿を作成
  ```json
  {
    "title": "Post Title",
    "content": "Post content...",
    "user_id": 1
  }
  ```

### ヘルスチェック
- `GET /api/health` - サーバーの状態を確認

## データアーキテクチャ

### データモデル
1. **Users** (ユーザー)
   - id: 主キー
   - email: メールアドレス (ユニーク)
   - name: 名前
   - created_at, updated_at: タイムスタンプ

2. **Posts** (投稿)
   - id: 主キー
   - title: タイトル
   - content: 内容
   - user_id: 外部キー (Users.id)
   - created_at, updated_at: タイムスタンプ

### ストレージサービス
- **Cloudflare D1**: SQLiteベースのグローバル分散データベース
- **データ永続化**: マイグレーションシステムにより、デプロイ時にスキーマとデータが保持されます

### データフロー
1. クライアント → Hono API → D1 データベース
2. データは D1 に永続化され、再デプロイ後も保持されます
3. ローカル開発では `.wrangler/state/v3/d1` にローカルSQLiteデータベースが作成されます

## データ永続化の仕組み

### 本番環境でのデータ保持
- **マイグレーション**: `migrations/` ディレクトリ内のSQLファイルがスキーマを定義
- **本番デプロイ時**: `npm run db:migrate:prod` でスキーマを本番DBに適用
- **データ保持**: 一度作成されたデータは、再デプロイ後も保持されます
- **スキーマ変更**: 新しいマイグレーションファイルを追加し、本番DBに適用することで安全にスキーマを更新できます

### ローカル開発でのデータ管理
- **リセット**: `npm run db:reset` でローカルDBをクリーンな状態に戻せます
- **シードデータ**: `seed.sql` にテストデータを定義

## 開発環境のセットアップ

### 前提条件
- Node.js (v18以上)
- npm
- PM2 (プリインストール済み)

### ローカル開発の起動手順
```bash
# 1. 依存関係のインストール（初回のみ）
npm install

# 2. プロジェクトをビルド
npm run build

# 3. ローカルD1データベースのマイグレーション
npm run db:migrate:local

# 4. テストデータのシード（オプション）
npm run db:seed

# 5. 開発サーバーの起動
pm2 start ecosystem.config.cjs

# 6. サーバーの確認
curl http://localhost:3000
```

### 便利なコマンド
```bash
# ポート3000のクリーンアップ
npm run clean-port

# データベースのリセット（ローカルのみ）
npm run db:reset

# PM2の状態確認
pm2 list

# PM2のログ確認
pm2 logs webapp --nostream

# PM2のサーバー再起動
npm run clean-port && pm2 restart webapp
```

## 本番環境へのデプロイ

### 1. Cloudflare D1データベースの作成
```bash
# 本番用D1データベースを作成
npx wrangler d1 create webapp-production

# 出力されたdatabase_idをwrangler.jsoncに設定
```

### 2. マイグレーションの適用
```bash
# 本番データベースにスキーマを適用
npm run db:migrate:prod
```

### 3. Cloudflare Pagesへのデプロイ
```bash
# プロジェクトを作成（初回のみ）
npx wrangler pages project create webapp --production-branch main

# デプロイ実行
npm run deploy:prod
```

### 4. 環境変数の設定（必要に応じて）
```bash
# シークレットの追加
npx wrangler pages secret put SECRET_KEY --project-name webapp
```

## 今後の開発推奨事項

### 次のステップ
1. ✅ 開発環境の整備（完了）
2. ✅ データベースの設定（完了）
3. 🔲 本番環境へのデプロイ
4. 🔲 GitHubリポジトリへのプッシュ
5. 🔲 ユーザー認証機能の追加
6. 🔲 フロントエンドUIの改善
7. 🔲 ページネーション機能の追加
8. 🔲 検索機能の追加

### 機能追加の提案
- **認証**: ユーザーログイン/ログアウト機能
- **UI**: TailwindCSSを使用したモダンなインターフェース
- **バリデーション**: 入力データの検証
- **エラーハンドリング**: より詳細なエラーメッセージ
- **ページネーション**: 大量データの効率的な表示
- **検索・フィルター**: データの検索とフィルタリング

## デプロイステータス
- **プラットフォーム**: Cloudflare Pages + D1
- **ステータス**: ✅ 開発環境稼働中 / ⏳ 本番環境準備中
- **技術スタック**: Hono + TypeScript + Cloudflare D1 + Vite
- **最終更新**: 2025-11-14

## ユーザーガイド

### アプリケーションの使い方

1. **ユーザーの作成**
   - POST /api/users にJSON形式でメールアドレスと名前を送信
   - レスポンスで新しいユーザーIDが返されます

2. **投稿の作成**
   - POST /api/posts にタイトル、内容、ユーザーIDを送信
   - 作成した投稿は /api/posts で確認できます

3. **データの確認**
   - /api/users でユーザー一覧を表示
   - /api/posts で投稿一覧を表示（投稿者情報付き）

### データの永続化について
- **重要**: 本番環境にデプロイしたデータは、再デプロイ後も保持されます
- **マイグレーション**: スキーマ変更は新しいマイグレーションファイルを作成して適用します
- **バックアップ**: 重要なデータは定期的にエクスポートすることを推奨します
