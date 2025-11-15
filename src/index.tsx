import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';
import clients from './routes/clients';
import campaigns from './routes/campaigns';
import blueprints from './routes/blueprints';
import revisions from './routes/revisions';
import videos from './routes/videos';
import feedbacks from './routes/feedbacks';

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
app.route('/api/feedbacks', feedbacks);

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
          .video-subtab-content { display: none; }
          .video-subtab-content:first-of-type { display: block; }
          .feedback-view { display: none; }
          .feedback-view:first-of-type { display: block; }
          .status-red { color: #ef4444; }
          .status-yellow { color: #f59e0b; }
          .status-green { color: #10b981; }
          .similarity-rank-a { background-color: #fecaca; color: #991b1b; }
          .similarity-rank-b { background-color: #fed7aa; color: #9a3412; }
          .similarity-rank-c { background-color: #fef3c7; color: #92400e; }
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
                                <div class="space-y-2">
                                    <div class="flex items-center space-x-2">
                                        <input type="file" id="campaign-csv-file" accept=".csv" class="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100">
                                        <button type="button" onclick="clearCSVFile()" class="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg text-sm transition">
                                            <i class="fas fa-times mr-1"></i>クリア
                                        </button>
                                    </div>
                                    <textarea id="campaign-csv" class="w-full border border-gray-300 rounded-lg px-4 py-2 h-32" placeholder="CSVファイルを選択、またはCSVデータを直接ペースト" required></textarea>
                                </div>
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
                    
                    <!-- AI解析の説明 -->
                    <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                        <div class="flex items-start">
                            <i class="fas fa-info-circle text-blue-500 mt-1 mr-2"></i>
                            <div>
                                <p class="font-semibold text-blue-900 mb-1">修正管理のAI解析について</p>
                                <p class="text-sm text-blue-800">
                                    この機能は<strong>ルールベース分析</strong>を使用しています。クライアントプロファイル（色・フォント・雰囲気など）と修正コメントのキーワードから、具体的な修正指示を自動生成します。<br>
                                    <span class="text-xs text-blue-700 mt-1 inline-block">※ Gemini APIは使用していません（コスト最適化のため）</span>
                                </p>
                            </div>
                        </div>
                    </div>
                    
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
                                <textarea id="revision-comment" class="w-full border border-gray-300 rounded-lg px-4 py-2 h-32" placeholder="例: もう少し明るくしてほしい、テンポを速くしてほしい、色を調整してほしい" required></textarea>
                                <p class="text-xs text-gray-500 mt-1">
                                    キーワード例: 「明るく」「テンポ」「速く」「色」「カラー」「テロップ」「文字」
                                </p>
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
                    
                    <!-- サブタブナビゲーション -->
                    <div class="flex space-x-2 mb-6 border-b-2">
                        <button onclick="switchVideoSubTab('learning')" id="video-subtab-learning" class="px-6 py-3 font-semibold text-pink-600 border-b-2 border-pink-600">
                            <i class="fas fa-graduation-cap mr-2"></i>動画学習
                        </button>
                        <button onclick="switchVideoSubTab('feedback-check')" id="video-subtab-feedback-check" class="px-6 py-3 font-semibold text-gray-500 hover:text-pink-600">
                            <i class="fas fa-clipboard-check mr-2"></i>動画チェック
                        </button>
                    </div>
                </div>
                
                <!-- 動画学習サブタブ -->
                <div id="video-learning-subtab" class="video-subtab-content">
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
                
                <!-- 動画チェックサブタブ -->
                <div id="video-feedback-check-subtab" class="video-subtab-content" style="display:none;">
                    <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                        <div class="flex items-start">
                            <i class="fas fa-info-circle text-blue-500 mt-1 mr-2"></i>
                            <div>
                                <p class="font-semibold text-blue-900 mb-1">動画チェック機能について</p>
                                <p class="text-sm text-blue-800">
                                    過去にクライアントから指摘された修正内容を蓄積し、新しい動画で<strong>同じ指摘が発生していないか</strong>を自動チェックします。<br>
                                    Gemini Embedding APIを使用してテキストの類似度を判定し、納品前に問題を発見できます。
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- クライアント選択 -->
                    <div class="mb-6">
                        <label class="block text-sm font-semibold text-gray-700 mb-2">対象クライアント</label>
                        <select id="feedback-client-select" class="w-full border border-gray-300 rounded-lg px-4 py-2" onchange="loadFeedbacksForClient(this.value)">
                            <option value="">選択してください</option>
                        </select>
                    </div>
                    
                    <!-- サブタブ切り替え（フィードバック登録 / 自動チェック結果） -->
                    <div class="flex space-x-2 mb-6 border-b">
                        <button onclick="switchFeedbackView('register')" id="feedback-view-register" class="px-4 py-2 font-semibold text-blue-600 border-b-2 border-blue-600">
                            <i class="fas fa-plus-circle mr-2"></i>フィードバック登録
                        </button>
                        <button onclick="switchFeedbackView('check-results')" id="feedback-view-check-results" class="px-4 py-2 font-semibold text-gray-500 hover:text-blue-600">
                            <i class="fas fa-check-circle mr-2"></i>自動チェック結果
                        </button>
                    </div>
                    
                    <!-- フィードバック登録ビュー -->
                    <div id="feedback-register-view" class="feedback-view">
                        <div class="bg-white rounded-lg shadow-md p-6 mb-6">
                            <h3 class="text-lg font-bold text-gray-800 mb-4">
                                <i class="fas fa-clipboard-list mr-2"></i>過去指摘の登録
                            </h3>
                            <form id="feedback-form" class="space-y-4">
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-semibold text-gray-700 mb-2">カテゴリ <span class="text-red-500">*</span></label>
                                        <select id="feedback-category" class="w-full border border-gray-300 rounded-lg px-4 py-2" required>
                                            <option value="">選択してください</option>
                                            <option value="構成">構成</option>
                                            <option value="テンポ">テンポ</option>
                                            <option value="テロップ">テロップ</option>
                                            <option value="色味">色味</option>
                                            <option value="音量">音量</option>
                                            <option value="画角">画角</option>
                                            <option value="NGワード">NGワード</option>
                                            <option value="話し方">話し方</option>
                                            <option value="その他">その他</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-semibold text-gray-700 mb-2">対象フェーズ <span class="text-red-500">*</span></label>
                                        <select id="feedback-phase" class="w-full border border-gray-300 rounded-lg px-4 py-2" required>
                                            <option value="">選択してください</option>
                                            <option value="撮影">撮影</option>
                                            <option value="編集">編集</option>
                                            <option value="台本">台本</option>
                                            <option value="その他">その他</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-sm font-semibold text-gray-700 mb-2">重要度 <span class="text-red-500">*</span></label>
                                    <div class="flex space-x-4">
                                        <label class="flex items-center">
                                            <input type="radio" name="feedback-importance" value="高" class="mr-2" required>
                                            <span class="text-red-600 font-semibold">高</span>
                                        </label>
                                        <label class="flex items-center">
                                            <input type="radio" name="feedback-importance" value="中" class="mr-2" checked>
                                            <span class="text-yellow-600 font-semibold">中</span>
                                        </label>
                                        <label class="flex items-center">
                                            <input type="radio" name="feedback-importance" value="低" class="mr-2">
                                            <span class="text-green-600 font-semibold">低</span>
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-sm font-semibold text-gray-700 mb-2">指摘内容 <span class="text-red-500">*</span></label>
                                    <textarea id="feedback-text" class="w-full border border-gray-300 rounded-lg px-4 py-2 h-24" placeholder="例: 冒頭3秒のインパクトが弱い" required></textarea>
                                    <p class="text-xs text-gray-500 mt-1">具体的に記載してください。この内容がAI類似判定に使用されます。</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-semibold text-gray-700 mb-2">関連動画（任意）</label>
                                    <select id="feedback-video" class="w-full border border-gray-300 rounded-lg px-4 py-2">
                                        <option value="">なし</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-sm font-semibold text-gray-700 mb-2">メモ・補足（任意）</label>
                                    <textarea id="feedback-memo" class="w-full border border-gray-300 rounded-lg px-4 py-2 h-20" placeholder="追加情報があれば記載"></textarea>
                                </div>
                                <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold shadow-md transition w-full">
                                    <i class="fas fa-save mr-2"></i>フィードバックを登録
                                </button>
                            </form>
                        </div>
                        
                        <!-- フィードバック一覧 -->
                        <div class="bg-white rounded-lg shadow-md p-6">
                            <div class="flex justify-between items-center mb-4">
                                <h3 class="text-lg font-bold text-gray-800">
                                    <i class="fas fa-list mr-2"></i>登録済みフィードバック
                                </h3>
                                <div class="flex space-x-2">
                                    <select id="feedback-filter-category" class="border border-gray-300 rounded-lg px-3 py-1 text-sm" onchange="filterFeedbacks()">
                                        <option value="">全カテゴリ</option>
                                        <option value="構成">構成</option>
                                        <option value="テンポ">テンポ</option>
                                        <option value="テロップ">テロップ</option>
                                        <option value="色味">色味</option>
                                        <option value="音量">音量</option>
                                        <option value="画角">画角</option>
                                    </select>
                                    <select id="feedback-filter-importance" class="border border-gray-300 rounded-lg px-3 py-1 text-sm" onchange="filterFeedbacks()">
                                        <option value="">全重要度</option>
                                        <option value="高">高</option>
                                        <option value="中">中</option>
                                        <option value="低">低</option>
                                    </select>
                                </div>
                            </div>
                            <div id="feedbacks-list" class="space-y-3">
                                <p class="text-gray-500 text-center py-8">クライアントを選択してください</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 自動チェック結果ビュー -->
                    <div id="feedback-check-results-view" class="feedback-view" style="display:none;">
                        <div class="bg-white rounded-lg shadow-md p-6 mb-6">
                            <h3 class="text-lg font-bold text-gray-800 mb-4">
                                <i class="fas fa-search mr-2"></i>動画を選択してチェック
                            </h3>
                            
                            <!-- チェック方法切り替えタブ -->
                            <div class="flex space-x-2 mb-4 border-b">
                                <button onclick="switchVideoCheckMode('file')" id="check-mode-file" class="px-4 py-2 font-semibold text-blue-600 border-b-2 border-blue-600">
                                    <i class="fas fa-file-video mr-2"></i>動画ファイル
                                </button>
                                <button onclick="switchVideoCheckMode('gdrive')" id="check-mode-gdrive" class="px-4 py-2 font-semibold text-gray-500 hover:text-blue-600">
                                    <i class="fab fa-google-drive mr-2"></i>Google Drive
                                </button>
                                <button onclick="switchVideoCheckMode('existing')" id="check-mode-existing" class="px-4 py-2 font-semibold text-gray-500 hover:text-blue-600">
                                    <i class="fas fa-database mr-2"></i>登録済み動画
                                </button>
                            </div>
                            
                            <!-- 動画ファイルアップロード -->
                            <div id="check-file-input" class="space-y-4">
                                <div>
                                    <label class="block text-sm font-semibold text-gray-700 mb-2">動画ファイルを選択 <span class="text-red-500">*</span></label>
                                    <input type="file" id="check-video-file" accept="video/mp4,video/mov,video/avi,video/webm" class="w-full border border-gray-300 rounded-lg px-4 py-2">
                                    <p class="text-xs text-gray-500 mt-1">対応形式: MP4, MOV, AVI, WebM（最大100MB）</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-semibold text-gray-700 mb-2">動画タイトル（任意）</label>
                                    <input type="text" id="check-video-title-file" class="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="例: 新規作成動画_202511">
                                </div>
                                <button onclick="runVideoCheckWithFile()" class="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold shadow-md transition w-full">
                                    <i class="fas fa-play-circle mr-2"></i>動画をアップロードしてチェック実行
                                </button>
                            </div>
                            
                            <!-- Google Drive URL入力 -->
                            <div id="check-gdrive-input" class="space-y-4" style="display:none;">
                                <div>
                                    <label class="block text-sm font-semibold text-gray-700 mb-2">Google Drive 共有リンク <span class="text-red-500">*</span></label>
                                    <input type="url" id="check-gdrive-url" class="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="https://drive.google.com/file/d/...">
                                    <p class="text-xs text-gray-500 mt-1">
                                        <i class="fas fa-info-circle mr-1"></i>リンクの共有設定を「リンクを知っている全員」に設定してください
                                    </p>
                                </div>
                                <div>
                                    <label class="block text-sm font-semibold text-gray-700 mb-2">動画タイトル（任意）</label>
                                    <input type="text" id="check-video-title-gdrive" class="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="例: 新規作成動画_202511">
                                </div>
                                <button onclick="runVideoCheckWithGDrive()" class="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold shadow-md transition w-full">
                                    <i class="fas fa-play-circle mr-2"></i>Google Drive動画をチェック実行
                                </button>
                            </div>
                            
                            <!-- 登録済み動画選択 -->
                            <div id="check-existing-input" class="space-y-4" style="display:none;">
                                <div>
                                    <label class="block text-sm font-semibold text-gray-700 mb-2">チェック対象動画</label>
                                    <select id="check-video-select" class="w-full border border-gray-300 rounded-lg px-4 py-2">
                                        <option value="">選択してください</option>
                                    </select>
                                </div>
                                <button onclick="runVideoCheckWithExisting()" class="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold shadow-md transition w-full">
                                    <i class="fas fa-play-circle mr-2"></i>自動チェック実行
                                </button>
                            </div>
                        </div>
                        
                        <!-- チェック結果表示 -->
                        <div id="check-results-container" class="bg-white rounded-lg shadow-md p-6" style="display:none;">
                            <h3 class="text-lg font-bold text-gray-800 mb-4">
                                <i class="fas fa-clipboard-check mr-2"></i>チェック結果
                            </h3>
                            <div id="check-results-summary" class="mb-4">
                                <!-- サマリー表示 -->
                            </div>
                            <div id="check-results-list" class="space-y-3">
                                <!-- 類似マッチ一覧 -->
                            </div>
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
