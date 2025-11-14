import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';
import clients from './routes/clients';
import campaigns from './routes/campaigns';
import blueprints from './routes/blueprints';
import revisions from './routes/revisions';
import videos from './routes/videos';

// Type definition for Cloudflare bindings
type Bindings = {
  DB: D1Database;
  R2: R2Bucket;
  GEMINI_API_KEY: string;
  YOUTUBE_API_KEY?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Enable CORS for API routes
app.use('/api/*', cors());

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }));

// API Routes
app.route('/api/clients', clients);
app.route('/api/campaigns', campaigns);
app.route('/api/blueprints', blueprints);
app.route('/api/revisions', revisions);
app.route('/api/videos', videos);

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Main Application UI
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SNS運用代行 企画〜編集自動化システム</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          .tab-content { display: none; }
          .tab-content.active { display: block; }
          .status-red { color: #ef4444; }
          .status-yellow { color: #f59e0b; }
          .status-green { color: #10b981; }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- ヘッダー -->
        <header class="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
            <div class="container mx-auto px-6 py-4">
                <h1 class="text-3xl font-bold">
                    <i class="fas fa-video mr-2"></i>
                    SNS運用代行 企画〜編集自動化システム
                </h1>
                <p class="text-blue-100 mt-1">企画 → 編集設計 → 修正 → 納品まで一気通貫で効率化</p>
            </div>
        </header>

        <!-- タブナビゲーション -->
        <nav class="bg-white shadow-md sticky top-0 z-50">
            <div class="container mx-auto px-6">
                <div class="flex space-x-1">
                    <button onclick="switchTab('clients')" class="tab-btn px-6 py-4 font-semibold text-gray-700 hover:bg-blue-50 border-b-2 border-transparent hover:border-blue-500 transition" data-tab="clients">
                        <i class="fas fa-users mr-2"></i>クライアント設定
                    </button>
                    <button onclick="switchTab('campaigns')" class="tab-btn px-6 py-4 font-semibold text-gray-700 hover:bg-blue-50 border-b-2 border-transparent hover:border-blue-500 transition" data-tab="campaigns">
                        <i class="fas fa-lightbulb mr-2"></i>企画自動生成
                    </button>
                    <button onclick="switchTab('blueprints')" class="tab-btn px-6 py-4 font-semibold text-gray-700 hover:bg-blue-50 border-b-2 border-transparent hover:border-blue-500 transition" data-tab="blueprints">
                        <i class="fas fa-pencil-ruler mr-2"></i>編集設計図
                    </button>
                    <button onclick="switchTab('revisions')" class="tab-btn px-6 py-4 font-semibold text-gray-700 hover:bg-blue-50 border-b-2 border-transparent hover:border-blue-500 transition" data-tab="revisions">
                        <i class="fas fa-sync-alt mr-2"></i>修正管理
                    </button>
                    <button onclick="switchTab('videos')" class="tab-btn px-6 py-4 font-semibold text-gray-700 hover:bg-blue-50 border-b-2 border-transparent hover:border-blue-500 transition" data-tab="videos">
                        <i class="fas fa-brain mr-2"></i>動画学習
                    </button>
                </div>
            </div>
        </nav>

        <!-- メインコンテンツ -->
        <main class="container mx-auto px-6 py-8">
            <!-- クライアント設定画面 -->
            <div id="clients-tab" class="tab-content active">
                <div class="mb-6 flex justify-between items-center">
                    <h2 class="text-2xl font-bold text-gray-800">
                        <i class="fas fa-users text-blue-600 mr-2"></i>クライアント管理
                    </h2>
                    <button onclick="showClientModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold shadow-md transition">
                        <i class="fas fa-plus mr-2"></i>新規クライアント
                    </button>
                </div>
                <div id="clients-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <!-- クライアントカードがここに表示されます -->
                </div>
            </div>

            <!-- 企画自動生成画面 -->
            <div id="campaigns-tab" class="tab-content">
                <div class="mb-6">
                    <h2 class="text-2xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-lightbulb text-yellow-500 mr-2"></i>企画自動生成
                    </h2>
                    <div class="bg-white rounded-lg shadow-md p-6">
                        <form id="campaign-form" class="space-y-4">
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">クライアント選択</label>
                                <select id="campaign-client" class="w-full border border-gray-300 rounded-lg px-4 py-2" required>
                                    <option value="">選択してください</option>
                                </select>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-semibold text-gray-700 mb-2">分析期間（開始）</label>
                                    <input type="date" id="campaign-start" class="w-full border border-gray-300 rounded-lg px-4 py-2">
                                </div>
                                <div>
                                    <label class="block text-sm font-semibold text-gray-700 mb-2">分析期間（終了）</label>
                                    <input type="date" id="campaign-end" class="w-full border border-gray-300 rounded-lg px-4 py-2">
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">KGI（最終目標）</label>
                                <input type="text" id="campaign-kgi" class="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="例: フォロワー1万人達成" required>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">KPI（複数可、カンマ区切り）</label>
                                <input type="text" id="campaign-kpi" class="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="例: 再生数, 保存率, 投稿数" required>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">CSVデータ（Metricool形式）</label>
                                <textarea id="campaign-csv" class="w-full border border-gray-300 rounded-lg px-4 py-2 h-32" placeholder="CSVデータをペースト、またはJSON形式で入力" required></textarea>
                            </div>
                            <button type="submit" class="bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-3 rounded-lg font-bold shadow-md transition w-full">
                                <i class="fas fa-magic mr-2"></i>企画を自動生成
                            </button>
                        </form>
                    </div>
                </div>
                <div id="campaign-results" class="mt-8">
                    <!-- 分析結果がここに表示されます -->
                </div>
            </div>

            <!-- 編集設計図画面 -->
            <div id="blueprints-tab" class="tab-content">
                <div class="mb-6">
                    <h2 class="text-2xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-pencil-ruler text-purple-600 mr-2"></i>編集設計図生成
                    </h2>
                    <div class="bg-white rounded-lg shadow-md p-6">
                        <form id="blueprint-form" class="space-y-4">
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">クライアント選択</label>
                                <select id="blueprint-client" class="w-full border border-gray-300 rounded-lg px-4 py-2" required>
                                    <option value="">選択してください</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">動画の目的</label>
                                <select id="blueprint-purpose" class="w-full border border-gray-300 rounded-lg px-4 py-2" required>
                                    <option value="バズ">バズ</option>
                                    <option value="価値">価値</option>
                                    <option value="共感">共感</option>
                                    <option value="教育">教育</option>
                                    <option value="ストーリー">ストーリー</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">台本全文</label>
                                <textarea id="blueprint-script" class="w-full border border-gray-300 rounded-lg px-4 py-2 h-48" placeholder="台本を入力してください..." required></textarea>
                            </div>
                            <button type="submit" class="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg font-bold shadow-md transition w-full">
                                <i class="fas fa-cogs mr-2"></i>編集設計図を生成
                            </button>
                        </form>
                    </div>
                </div>
                <div id="blueprint-results" class="mt-8">
                    <!-- 編集設計図がここに表示されます -->
                </div>
            </div>

            <!-- 修正管理画面 -->
            <div id="revisions-tab" class="tab-content">
                <div class="mb-6">
                    <h2 class="text-2xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-sync-alt text-green-600 mr-2"></i>修正依頼管理
                    </h2>
                    <div class="bg-white rounded-lg shadow-md p-6">
                        <form id="revision-form" class="space-y-4">
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">クライアント選択</label>
                                <select id="revision-client" class="w-full border border-gray-300 rounded-lg px-4 py-2" required>
                                    <option value="">選択してください</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">お客様からの修正コメント</label>
                                <textarea id="revision-comment" class="w-full border border-gray-300 rounded-lg px-4 py-2 h-32" placeholder="例: もう少し明るくしてほしい" required></textarea>
                            </div>
                            <button type="submit" class="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold shadow-md transition w-full">
                                <i class="fas fa-robot mr-2"></i>AIで具体化
                            </button>
                        </form>
                    </div>
                </div>
                <div id="revision-results" class="mt-8">
                    <!-- 修正依頼一覧がここに表示されます -->
                </div>
            </div>

            <!-- 動画学習画面 -->
            <div id="videos-tab" class="tab-content">
                <div class="mb-6">
                    <h2 class="text-2xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-brain text-pink-600 mr-2"></i>動画学習システム
                    </h2>
                    <p class="text-gray-600 mb-6">
                        実際に制作した動画をアップロードまたはYouTube URLから追加し、AIが編集スタイルを学習します。
                        <br>学習データは企画生成・編集設計図に自動的に反映されます。
                    </p>
                    
                    <!-- 動画アップロードフォーム -->
                    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
                        <h3 class="text-lg font-bold text-gray-800 mb-4">
                            <i class="fas fa-upload mr-2"></i>動画を追加
                        </h3>
                        
                        <!-- タブ切り替え -->
                        <div class="flex space-x-2 mb-4 border-b">
                            <button onclick="switchVideoUploadMode('file')" id="upload-mode-file" class="px-4 py-2 font-semibold text-blue-600 border-b-2 border-blue-600">
                                <i class="fas fa-file-video mr-2"></i>ファイルアップロード
                            </button>
                            <button onclick="switchVideoUploadMode('youtube')" id="upload-mode-youtube" class="px-4 py-2 font-semibold text-gray-500 hover:text-blue-600">
                                <i class="fab fa-youtube mr-2"></i>YouTube URL
                            </button>
                        </div>
                        
                        <!-- ファイルアップロードフォーム -->
                        <form id="video-upload-form" class="space-y-4">
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">クライアント選択</label>
                                <select id="video-client" class="w-full border border-gray-300 rounded-lg px-4 py-2" required>
                                    <option value="">選択してください</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">動画タイトル</label>
                                <input type="text" id="video-title" class="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="例: 新商品紹介動画" required>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">動画ファイル</label>
                                <input type="file" id="video-file" accept="video/*" class="w-full border border-gray-300 rounded-lg px-4 py-2" required>
                                <p class="text-xs text-gray-500 mt-1">対応形式: MP4, MOV, AVI, WebM</p>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">パフォーマンス指標（任意）</label>
                                <div class="grid grid-cols-3 gap-4">
                                    <div>
                                        <input type="number" id="video-views" class="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="再生数">
                                    </div>
                                    <div>
                                        <input type="number" id="video-likes" class="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="いいね数">
                                    </div>
                                    <div>
                                        <input type="number" id="video-saves" class="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="保存数">
                                    </div>
                                </div>
                            </div>
                            <button type="submit" class="bg-pink-600 hover:bg-pink-700 text-white px-8 py-3 rounded-lg font-bold shadow-md transition w-full">
                                <i class="fas fa-cloud-upload-alt mr-2"></i>アップロード
                            </button>
                        </form>
                        
                        <!-- YouTube URLフォーム -->
                        <form id="youtube-add-form" class="space-y-4 hidden">
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">クライアント選択</label>
                                <select id="youtube-client" class="w-full border border-gray-300 rounded-lg px-4 py-2" required>
                                    <option value="">選択してください</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">YouTube URL</label>
                                <input type="url" id="youtube-url" class="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="https://www.youtube.com/watch?v=..." required>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">動画タイトル（任意）</label>
                                <input type="text" id="youtube-title" class="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="自動取得されます">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">パフォーマンス指標（任意）</label>
                                <div class="grid grid-cols-3 gap-4">
                                    <div>
                                        <input type="number" id="youtube-views" class="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="再生数">
                                    </div>
                                    <div>
                                        <input type="number" id="youtube-likes" class="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="いいね数">
                                    </div>
                                    <div>
                                        <input type="number" id="youtube-saves" class="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="保存数">
                                    </div>
                                </div>
                            </div>
                            <button type="submit" class="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-bold shadow-md transition w-full">
                                <i class="fab fa-youtube mr-2"></i>YouTube動画を追加
                            </button>
                        </form>
                    </div>
                    
                    <!-- 学習統計 -->
                    <div id="learning-stats" class="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg shadow-md p-6 mb-6 hidden">
                        <h3 class="text-lg font-bold text-gray-800 mb-4">
                            <i class="fas fa-chart-bar mr-2"></i>学習統計
                        </h3>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div class="bg-white rounded-lg p-4 shadow-sm">
                                <p class="text-sm text-gray-600">分析済み動画数</p>
                                <p class="text-2xl font-bold text-pink-600" id="stats-total-videos">0</p>
                            </div>
                            <div class="bg-white rounded-lg p-4 shadow-sm">
                                <p class="text-sm text-gray-600">平均カット間隔</p>
                                <p class="text-2xl font-bold text-pink-600" id="stats-cut-frequency">0秒</p>
                            </div>
                            <div class="bg-white rounded-lg p-4 shadow-sm">
                                <p class="text-sm text-gray-600">平均エンゲージメント</p>
                                <p class="text-2xl font-bold text-pink-600" id="stats-engagement">0%</p>
                            </div>
                            <div class="bg-white rounded-lg p-4 shadow-sm">
                                <p class="text-sm text-gray-600">総再生数</p>
                                <p class="text-2xl font-bold text-pink-600" id="stats-total-views">0</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 動画一覧 -->
                    <div class="bg-white rounded-lg shadow-md p-6">
                        <h3 class="text-lg font-bold text-gray-800 mb-4">
                            <i class="fas fa-video mr-2"></i>学習動画一覧
                        </h3>
                        <div id="videos-list" class="space-y-4">
                            <!-- 動画カードがここに表示されます -->
                            <p class="text-gray-500 text-center py-8">クライアントを選択して動画を追加してください</p>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `);
});

export default app;
