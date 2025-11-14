// SNS運用代行システム - フロントエンドロジック

let currentClients = [];
let currentAnalyses = [];
let currentBlueprints = [];
let currentRevisions = [];

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  // デフォルトでクライアントタブを表示
  switchTab('clients');
  loadClients();

  // フォーム送信イベント
  document.getElementById('campaign-form')?.addEventListener('submit', handleCampaignSubmit);
  document.getElementById('blueprint-form')?.addEventListener('submit', handleBlueprintSubmit);
  document.getElementById('revision-form')?.addEventListener('submit', handleRevisionSubmit);
});

// タブ切り替え
window.switchTab = function(tabName) {
  // すべてのタブコンテンツを非表示
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => {
    el.classList.remove('border-blue-500', 'bg-blue-50', 'text-blue-600');
  });

  // 選択されたタブを表示
  document.getElementById(tabName + '-tab')?.classList.add('active');
  document.querySelector(\`[data-tab="\${tabName}"]\`)?.classList.add('border-blue-500', 'bg-blue-50', 'text-blue-600');

  // データ読み込み
  if (tabName === 'clients') {
    loadClients();
  } else if (tabName === 'campaigns') {
    populateClientSelect('campaign-client');
    loadAnalyses();
  } else if (tabName === 'blueprints') {
    populateClientSelect('blueprint-client');
    loadBlueprints();
  } else if (tabName === 'revisions') {
    populateClientSelect('revision-client');
    loadRevisions();
  }
}

// ======================
// クライアント管理
// ======================
async function loadClients() {
  try {
    const response = await axios.get('/api/clients');
    currentClients = response.data.clients || [];
    displayClients();
  } catch (error) {
    console.error('クライアント取得エラー:', error);
    showNotification('クライアントの取得に失敗しました', 'error');
  }
}

function displayClients() {
  const container = document.getElementById('clients-list');
  if (!container) return;

  if (currentClients.length === 0) {
    container.innerHTML = '<div class="col-span-full text-center py-12 text-gray-500"><i class="fas fa-inbox text-4xl mb-4"></i><p>クライアントがまだ登録されていません</p></div>';
    return;
  }

  container.innerHTML = currentClients.map(client => \`
    <div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
      <div class="flex justify-between items-start mb-4">
        <h3 class="text-xl font-bold text-gray-800">\${escapeHtml(client.name)}</h3>
        <button onclick="editClient(\${client.id})" class="text-blue-600 hover:text-blue-800">
          <i class="fas fa-edit"></i>
        </button>
      </div>
      <div class="space-y-2 text-sm text-gray-600">
        <p><i class="fas fa-industry mr-2 text-gray-400"></i>\${escapeHtml(client.industry || '未設定')}</p>
        <p><i class="fas fa-users mr-2 text-gray-400"></i>\${escapeHtml(client.target_audience || '未設定')}</p>
        \${client.main_color ? \`<div class="flex items-center"><i class="fas fa-palette mr-2 text-gray-400"></i><span class="w-6 h-6 rounded border" style="background-color: \${client.main_color}"></span><span class="ml-2">\${client.main_color}</span></div>\` : ''}
        \${client.tempo ? \`<p><i class="fas fa-tachometer-alt mr-2 text-gray-400"></i>テンポ: \${client.tempo}</p>\` : ''}
      </div>
      <div class="mt-4 pt-4 border-t flex space-x-2">
        <button onclick="viewClientDetail(\${client.id})" class="flex-1 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-100 transition">
          詳細
        </button>
        <button onclick="deleteClient(\${client.id})" class="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-semibold hover:bg-red-100 transition">
          削除
        </button>
      </div>
    </div>
  \`).join('');
}

window.showClientModal = function(clientId = null) {
  const modalHtml = \`
    <div id="client-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-2xl font-bold text-gray-800">
              <i class="fas fa-user-plus mr-2 text-blue-600"></i>
              \${clientId ? 'クライアント編集' : '新規クライアント登録'}
            </h3>
            <button onclick="closeModal()" class="text-gray-500 hover:text-gray-700">
              <i class="fas fa-times text-2xl"></i>
            </button>
          </div>
          <form id="client-form-modal" class="space-y-4">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">クライアント名 *</label>
              <input type="text" id="modal-client-name" class="w-full border border-gray-300 rounded-lg px-4 py-2" required>
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">業種</label>
              <input type="text" id="modal-client-industry" class="w-full border border-gray-300 rounded-lg px-4 py-2">
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">ターゲット情報</label>
              <textarea id="modal-client-target" class="w-full border border-gray-300 rounded-lg px-4 py-2 h-20"></textarea>
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">アカウントURL</label>
              <input type="url" id="modal-client-url" class="w-full border border-gray-300 rounded-lg px-4 py-2">
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">話し方・口調</label>
              <input type="text" id="modal-client-style" class="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="例: 敬語、砕けた、熱血">
            </div>
            <div class="flex space-x-4 pt-4">
              <button type="submit" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold shadow-md transition">
                <i class="fas fa-save mr-2"></i>保存
              </button>
              <button type="button" onclick="closeModal()" class="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-3 rounded-lg font-bold transition">
                キャンセル
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  \`;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  document.getElementById('client-form-modal').addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveClient(clientId);
  });
}

async function saveClient(clientId) {
  const data = {
    name: document.getElementById('modal-client-name').value,
    industry: document.getElementById('modal-client-industry').value,
    target_audience: document.getElementById('modal-client-target').value,
    account_url: document.getElementById('modal-client-url').value,
    speaking_style: document.getElementById('modal-client-style').value,
  };

  try {
    if (clientId) {
      await axios.put(\`/api/clients/\${clientId}\`, data);
      showNotification('クライアント情報を更新しました', 'success');
    } else {
      await axios.post('/api/clients', data);
      showNotification('新しいクライアントを登録しました', 'success');
    }
    closeModal();
    loadClients();
  } catch (error) {
    console.error('保存エラー:', error);
    showNotification('保存に失敗しました', 'error');
  }
}

window.deleteClient = async function(id) {
  if (!confirm('本当にこのクライアントを削除しますか?')) return;

  try {
    await axios.delete(\`/api/clients/\${id}\`);
    showNotification('クライアントを削除しました', 'success');
    loadClients();
  } catch (error) {
    console.error('削除エラー:', error);
    showNotification('削除に失敗しました', 'error');
  }
}

// ======================
// 企画自動生成
// ======================
async function handleCampaignSubmit(e) {
  e.preventDefault();

  const clientId = document.getElementById('campaign-client').value;
  const kgi = document.getElementById('campaign-kgi').value;
  const kpiText = document.getElementById('campaign-kpi').value;
  const csvText = document.getElementById('campaign-csv').value;

  if (!clientId || !kgi || !kpiText || !csvText) {
    showNotification('すべての必須項目を入力してください', 'error');
    return;
  }

  const kpi = kpiText.split(',').map(k => k.trim());
  
  // CSV解析（簡易版）
  let csvData;
  try {
    csvData = JSON.parse(csvText);
  } catch {
    // CSVテキストを簡易的にパース
    csvData = csvText.split('\\n').slice(1).map(line => {
      const parts = line.split(',');
      return {
        date: parts[0] || '',
        post_type: parts[1] || '',
        views: parseInt(parts[2]) || 0,
        likes: parseInt(parts[3]) || 0,
        comments: parseInt(parts[4]) || 0,
        shares: parseInt(parts[5]) || 0,
        saves: parseInt(parts[6]) || 0,
        engagement_rate: parseFloat(parts[7]) || 0,
      };
    }).filter(row => row.views > 0);
  }

  const data = {
    client_id: clientId,
    analysis_period_start: document.getElementById('campaign-start').value,
    analysis_period_end: document.getElementById('campaign-end').value,
    kgi,
    kpi,
    csv_data: csvData,
  };

  try {
    showNotification('企画を生成中...', 'info');
    const response = await axios.post('/api/campaigns/analyze', data);
    displayCampaignResults(response.data);
    showNotification('企画生成が完了しました!', 'success');
  } catch (error) {
    console.error('企画生成エラー:', error);
    showNotification('企画生成に失敗しました', 'error');
  }
}

function displayCampaignResults(data) {
  const container = document.getElementById('campaign-results');
  if (!container) return;

  const report = data.report;
  const ideas = data.ideas || [];

  container.innerHTML = \`
    <div class="space-y-6">
      <!-- レポート -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h3 class="text-xl font-bold text-gray-800 mb-4">
          <i class="fas fa-chart-line mr-2 text-blue-600"></i>分析レポート
        </h3>
        <div class="space-y-4">
          <div>
            <h4 class="font-semibold text-gray-700 mb-2">概要</h4>
            <p class="text-gray-600 whitespace-pre-line">\${escapeHtml(report.overview)}</p>
          </div>
          <div>
            <h4 class="font-semibold text-gray-700 mb-2">勝ちパターン</h4>
            <ul class="list-disc list-inside text-gray-600">
              \${report.winning_patterns.map(p => \`<li>\${escapeHtml(p)}</li>\`).join('')}
            </ul>
          </div>
          <div>
            <h4 class="font-semibold text-gray-700 mb-2">失敗パターン</h4>
            <ul class="list-disc list-inside text-gray-600">
              \${report.failing_patterns.map(p => \`<li>\${escapeHtml(p)}</li>\`).join('')}
            </ul>
          </div>
          <div>
            <h4 class="font-semibold text-gray-700 mb-2">今月の方針</h4>
            <p class="text-gray-600">\${escapeHtml(report.strategy)}</p>
          </div>
          <div>
            <h4 class="font-semibold text-gray-700 mb-2">投稿比率</h4>
            <div class="grid grid-cols-5 gap-2">
              <div class="text-center p-2 bg-red-50 rounded"><span class="block font-bold text-red-600">\${report.posting_ratio.buzz}%</span><span class="text-xs text-gray-600">バズ</span></div>
              <div class="text-center p-2 bg-blue-50 rounded"><span class="block font-bold text-blue-600">\${report.posting_ratio.value}%</span><span class="text-xs text-gray-600">価値</span></div>
              <div class="text-center p-2 bg-purple-50 rounded"><span class="block font-bold text-purple-600">\${report.posting_ratio.story}%</span><span class="text-xs text-gray-600">ストーリー</span></div>
              <div class="text-center p-2 bg-green-50 rounded"><span class="block font-bold text-green-600">\${report.posting_ratio.empathy}%</span><span class="text-xs text-gray-600">共感</span></div>
              <div class="text-center p-2 bg-yellow-50 rounded"><span class="block font-bold text-yellow-600">\${report.posting_ratio.education}%</span><span class="text-xs text-gray-600">教育</span></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 企画案一覧 -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h3 class="text-xl font-bold text-gray-800 mb-4">
          <i class="fas fa-lightbulb mr-2 text-yellow-500"></i>企画案 (\${ideas.length}件)
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          \${ideas.map(idea => \`
            <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
              <div class="flex justify-between items-start mb-2">
                <h4 class="font-bold text-gray-800">\${escapeHtml(idea.title)}</h4>
                <span class="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700">\${escapeHtml(idea.video_purpose)}</span>
              </div>
              <p class="text-sm text-gray-600 mb-2"><strong>構成:</strong> \${escapeHtml(idea.structure)}</p>
              <p class="text-sm text-gray-600 mb-2"><strong>強調ポイント:</strong> \${escapeHtml(idea.key_points)}</p>
              <p class="text-sm text-gray-600"><strong>CTA:</strong> \${escapeHtml(idea.cta)}</p>
            </div>
          \`).join('')}
        </div>
      </div>
    </div>
  \`;
}

// ======================
// 編集設計図生成
// ======================
async function handleBlueprintSubmit(e) {
  e.preventDefault();

  const clientId = document.getElementById('blueprint-client').value;
  const purpose = document.getElementById('blueprint-purpose').value;
  const script = document.getElementById('blueprint-script').value;

  if (!clientId || !purpose || !script) {
    showNotification('すべての項目を入力してください', 'error');
    return;
  }

  const data = {
    client_id: clientId,
    video_purpose: purpose,
    script_full: script,
  };

  try {
    showNotification('編集設計図を生成中...', 'info');
    const response = await axios.post('/api/blueprints/generate', data);
    displayBlueprintResults(response.data);
    showNotification('編集設計図の生成が完了しました!', 'success');
  } catch (error) {
    console.error('生成エラー:', error);
    showNotification('編集設計図の生成に失敗しました', 'error');
  }
}

function displayBlueprintResults(data) {
  const container = document.getElementById('blueprint-results');
  if (!container) return;

  const blueprint = data.blueprint_data;

  container.innerHTML = \`
    <div class="space-y-6">
      <!-- 全体方針 -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h3 class="text-xl font-bold text-gray-800 mb-4">
          <i class="fas fa-cog mr-2 text-purple-600"></i>全体方針
        </h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center p-4 bg-gray-50 rounded-lg">
            <p class="text-sm text-gray-600 mb-1">トーン</p>
            <p class="font-bold text-gray-800">\${escapeHtml(blueprint.overall.tone)}</p>
          </div>
          <div class="text-center p-4 bg-gray-50 rounded-lg">
            <p class="text-sm text-gray-600 mb-1">テンポ</p>
            <p class="font-bold text-gray-800">\${escapeHtml(blueprint.overall.tempo)}</p>
          </div>
          <div class="text-center p-4 bg-gray-50 rounded-lg">
            <p class="text-sm text-gray-600 mb-1">メインカラー</p>
            <div class="flex items-center justify-center">
              <span class="w-8 h-8 rounded border inline-block" style="background-color: \${blueprint.overall.mainColor}"></span>
            </div>
          </div>
          <div class="text-center p-4 bg-gray-50 rounded-lg">
            <p class="text-sm text-gray-600 mb-1">フォント</p>
            <p class="font-bold text-gray-800">\${escapeHtml(blueprint.overall.font)}</p>
          </div>
        </div>
      </div>

      <!-- CapCutスペース -->
      \${blueprint.capcutSpaces && blueprint.capcutSpaces.length > 0 ? \`
        <div class="bg-white rounded-lg shadow-md p-6">
          <h3 class="text-xl font-bold text-gray-800 mb-4">
            <i class="fas fa-link mr-2 text-blue-600"></i>CapCutスペース
          </h3>
          <div class="space-y-2">
            \${blueprint.capcutSpaces.map(space => \`
              <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span class="font-semibold text-gray-700">\${escapeHtml(space.purpose)}</span>
                <a href="\${escapeHtml(space.url)}" target="_blank" class="text-blue-600 hover:text-blue-800 underline">
                  <i class="fas fa-external-link-alt mr-1"></i>開く
                </a>
              </div>
            \`).join('')}
          </div>
        </div>
      \` : ''}

      <!-- カット割り -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h3 class="text-xl font-bold text-gray-800 mb-4">
          <i class="fas fa-film mr-2 text-red-600"></i>カット割り
        </h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-100">
              <tr>
                <th class="px-4 py-2 text-left">時間</th>
                <th class="px-4 py-2 text-left">画角</th>
                <th class="px-4 py-2 text-left">セリフ</th>
              </tr>
            </thead>
            <tbody>
              \${blueprint.cutPlanning.slice(0, 10).map(cut => \`
                <tr class="border-b">
                  <td class="px-4 py-2">\${cut.start}s - \${cut.end}s</td>
                  <td class="px-4 py-2"><span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">\${escapeHtml(cut.shot)}</span></td>
                  <td class="px-4 py-2 text-gray-600">\${escapeHtml(cut.line)}</td>
                </tr>
              \`).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- サムネイル案 -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h3 class="text-xl font-bold text-gray-800 mb-4">
          <i class="fas fa-image mr-2 text-green-600"></i>サムネイル案
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          \${blueprint.thumbnailIdeas.map((thumb, idx) => \`
            <div class="border border-gray-200 rounded-lg p-4">
              <h4 class="font-bold text-gray-800 mb-2">案\${idx + 1}</h4>
              <p class="text-lg font-bold mb-2" style="color: \${thumb.color}">\${escapeHtml(thumb.phrase)}</p>
              <p class="text-sm text-gray-600">レイアウト: \${escapeHtml(thumb.layout)}</p>
            </div>
          \`).join('')}
        </div>
      </div>

      <!-- 編集チェック実行ボタン -->
      <button onclick="runEditReview(\${data.blueprint_id})" class="w-full bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold shadow-md transition">
        <i class="fas fa-check-circle mr-2"></i>編集7箇条チェックを実行
      </button>
    </div>
  \`;
}

window.runEditReview = async function(blueprintId) {
  try {
    showNotification('編集チェック中...', 'info');
    const response = await axios.post(\`/api/blueprints/\${blueprintId}/review\`);
    displayReviewResults(response.data.check_results);
    showNotification('編集チェックが完了しました!', 'success');
  } catch (error) {
    console.error('チェックエラー:', error);
    showNotification('編集チェックに失敗しました', 'error');
  }
}

function displayReviewResults(results) {
  const modalHtml = \`
    <div id="review-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-2xl font-bold text-gray-800">
              <i class="fas fa-check-circle mr-2 text-green-600"></i>編集7箇条チェック結果
            </h3>
            <button onclick="closeModal()" class="text-gray-500 hover:text-gray-700">
              <i class="fas fa-times text-2xl"></i>
            </button>
          </div>
          <div class="space-y-4">
            \${results.checks.map(check => \`
              <div class="border-l-4 p-4 rounded \${check.status === 'red' ? 'border-red-500 bg-red-50' : check.status === 'yellow' ? 'border-yellow-500 bg-yellow-50' : 'border-green-500 bg-green-50'}">
                <div class="flex items-start">
                  <i class="fas fa-\${check.status === 'red' ? 'times-circle' : check.status === 'yellow' ? 'exclamation-circle' : 'check-circle'} text-2xl mr-3 status-\${check.status}"></i>
                  <div>
                    <h4 class="font-bold text-gray-800">\${escapeHtml(check.rule)}</h4>
                    <p class="text-sm text-gray-600 mt-1">\${escapeHtml(check.details)}</p>
                  </div>
                </div>
              </div>
            \`).join('')}
          </div>
          <div class="mt-6 p-4 rounded text-center \${results.overall === 'red' ? 'bg-red-100' : results.overall === 'yellow' ? 'bg-yellow-100' : 'bg-green-100'}">
            <p class="text-lg font-bold status-\${results.overall}">総合判定: \${results.overall === 'red' ? '要修正' : results.overall === 'yellow' ? '要確認' : 'OK'}</p>
          </div>
        </div>
      </div>
    </div>
  \`;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// ======================
// 修正依頼管理
// ======================
async function handleRevisionSubmit(e) {
  e.preventDefault();

  const clientId = document.getElementById('revision-client').value;
  const comment = document.getElementById('revision-comment').value;

  if (!clientId || !comment) {
    showNotification('すべての項目を入力してください', 'error');
    return;
  }

  const data = {
    client_id: clientId,
    original_comment: comment,
  };

  try {
    showNotification('AIで具体化中...', 'info');
    const response = await axios.post('/api/revisions', data);
    displayRevisionResult(response.data);
    showNotification('修正内容を具体化しました!', 'success');
    document.getElementById('revision-comment').value = '';
    loadRevisions();
  } catch (error) {
    console.error('具体化エラー:', error);
    showNotification('具体化に失敗しました', 'error');
  }
}

function displayRevisionResult(data) {
  const modalHtml = \`
    <div id="revision-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-2xl font-bold text-gray-800">
              <i class="fas fa-robot mr-2 text-green-600"></i>AI具体化結果
            </h3>
            <button onclick="closeModal()" class="text-gray-500 hover:text-gray-700">
              <i class="fas fa-times text-2xl"></i>
            </button>
          </div>
          <div class="bg-gray-50 rounded-lg p-4 mb-4">
            <h4 class="font-bold text-gray-700 mb-2">元のコメント</h4>
            <p class="text-gray-600 whitespace-pre-line">\${escapeHtml(data.original_comment || '')}</p>
          </div>
          <div class="bg-green-50 rounded-lg p-4">
            <h4 class="font-bold text-gray-700 mb-2">編集者向け具体的な指示</h4>
            <pre class="text-gray-800 whitespace-pre-wrap font-mono text-sm">\${escapeHtml(data.ai_interpretation)}</pre>
          </div>
        </div>
      </div>
    </div>
  \`;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function loadRevisions() {
  try {
    const response = await axios.get('/api/revisions');
    currentRevisions = response.data.revisions || [];
    displayRevisions();
  } catch (error) {
    console.error('修正依頼取得エラー:', error);
  }
}

function displayRevisions() {
  const container = document.getElementById('revision-results');
  if (!container) return;

  if (currentRevisions.length === 0) {
    container.innerHTML = '<div class="text-center py-12 text-gray-500"><i class="fas fa-inbox text-4xl mb-4"></i><p>修正依頼はまだありません</p></div>';
    return;
  }

  container.innerHTML = \`
    <div class="bg-white rounded-lg shadow-md p-6">
      <h3 class="text-xl font-bold text-gray-800 mb-4">
        <i class="fas fa-list mr-2 text-green-600"></i>修正依頼一覧
      </h3>
      <div class="space-y-4">
        \${currentRevisions.map(rev => \`
          <div class="border border-gray-200 rounded-lg p-4">
            <div class="flex justify-between items-start mb-2">
              <span class="font-bold text-gray-800">\${escapeHtml(rev.client_name || 'クライアント')}</span>
              <span class="text-xs px-2 py-1 rounded \${rev.status === 'completed' ? 'bg-green-100 text-green-700' : rev.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}">\${rev.status}</span>
            </div>
            <p class="text-sm text-gray-600 mb-2"><strong>元のコメント:</strong> \${escapeHtml(rev.original_comment)}</p>
            <details class="text-sm">
              <summary class="cursor-pointer text-blue-600 hover:text-blue-800">具体化された指示を表示</summary>
              <pre class="mt-2 p-3 bg-gray-50 rounded text-xs whitespace-pre-wrap">\${escapeHtml(rev.ai_interpretation)}</pre>
            </details>
          </div>
        \`).join('')}
      </div>
    </div>
  \`;
}

// ======================
// ユーティリティ
// ======================
async function populateClientSelect(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;

  try {
    const response = await axios.get('/api/clients');
    const clients = response.data.clients || [];
    
    select.innerHTML = '<option value="">選択してください</option>' +
      clients.map(c => \`<option value="\${c.id}">\${escapeHtml(c.name)}</option>\`).join('');
  } catch (error) {
    console.error('クライアント取得エラー:', error);
  }
}

window.closeModal = function() {
  document.getElementById('client-modal')?.remove();
  document.getElementById('review-modal')?.remove();
  document.getElementById('revision-modal')?.remove();
}

function showNotification(message, type = 'info') {
  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };

  const notification = document.createElement('div');
  notification.className = \`fixed top-4 right-4 \${colors[type]} text-white px-6 py-4 rounded-lg shadow-lg z-50 transition-opacity\`;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function loadAnalyses() {
  // 企画分析一覧を読み込む（必要に応じて実装）
}

async function loadBlueprints() {
  // 編集設計図一覧を読み込む（必要に応じて実装）
}

window.viewClientDetail = function(id) {
  // クライアント詳細表示（必要に応じて実装）
  alert('クライアント詳細画面は今後実装予定です');
}

window.editClient = function(id) {
  // クライアント編集（必要に応じて実装）
  showClientModal(id);
}
