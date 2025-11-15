// SNS運用代行システム - フロントエンドロジック
console.log('✅ app.js loaded successfully');

let currentClients = [];
let currentAnalyses = [];
let currentBlueprints = [];
let currentRevisions = [];

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ DOMContentLoaded event fired');
  
  // デフォルトでクライアントタブを表示
  switchTab('clients');
  loadClients();

  // フォーム送信イベント
  document.getElementById('campaign-form')?.addEventListener('submit', handleCampaignSubmit);
  document.getElementById('blueprint-form')?.addEventListener('submit', handleBlueprintSubmit);
  document.getElementById('revision-form')?.addEventListener('submit', handleRevisionSubmit);
  
  console.log('✅ Event listeners registered');
  console.log('✅ showClientModal available:', typeof window.showClientModal);
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
  document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('border-blue-500', 'bg-blue-50', 'text-blue-600');

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
  } else if (tabName === 'videos') {
    populateClientSelect('video-client');
    populateClientSelect('youtube-client');
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

  container.innerHTML = currentClients.map(client => `
    <div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
      <div class="flex justify-between items-start mb-4">
        <h3 class="text-xl font-bold text-gray-800">${escapeHtml(client.name)}</h3>
        <button onclick="editClient(${client.id})" class="text-blue-600 hover:text-blue-800">
          <i class="fas fa-edit"></i>
        </button>
      </div>
      <div class="space-y-2 text-sm text-gray-600">
        <p><i class="fas fa-industry mr-2 text-gray-400"></i>${escapeHtml(client.industry || '未設定')}</p>
        <p><i class="fas fa-users mr-2 text-gray-400"></i>${escapeHtml(client.target_audience || '未設定')}</p>
        ${client.main_color ? `<div class="flex items-center"><i class="fas fa-palette mr-2 text-gray-400"></i><span class="w-6 h-6 rounded border" style="background-color: ${client.main_color}"></span><span class="ml-2">${client.main_color}</span></div>` : ''}
        ${client.tempo ? `<p><i class="fas fa-tachometer-alt mr-2 text-gray-400"></i>テンポ: ${client.tempo}</p>` : ''}
      </div>
      <div class="mt-4 pt-4 border-t flex space-x-2">
        <button onclick="viewClientDetail(${client.id})" class="flex-1 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-100 transition">
          詳細
        </button>
        <button onclick="deleteClient(${client.id})" class="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-semibold hover:bg-red-100 transition">
          削除
        </button>
      </div>
    </div>
  `).join('');
}

window.showClientModal = function(clientId = null) {
  console.log('🔵 showClientModal called with clientId:', clientId);
  const modalHtml = `
    <div id="client-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-2xl font-bold text-gray-800">
              <i class="fas fa-user-plus mr-2 text-blue-600"></i>
              ${clientId ? 'クライアント編集' : '新規クライアント登録'}
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
  `;

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
      await axios.put(`/api/clients/${clientId}`, data);
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
    await axios.delete(`/api/clients/${id}`);
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

// CSVファイル読み込み
document.getElementById('campaign-csv-file')?.addEventListener('change', async function(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  try {
    const text = await file.text();
    document.getElementById('campaign-csv').value = text;
    showNotification('CSVファイルを読み込みました', 'success');
  } catch (error) {
    console.error('CSVファイル読み込みエラー:', error);
    showNotification('CSVファイルの読み込みに失敗しました', 'error');
  }
});

// CSVクリア
window.clearCSVFile = function() {
  document.getElementById('campaign-csv-file').value = '';
  document.getElementById('campaign-csv').value = '';
  showNotification('CSVをクリアしました', 'info');
};

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
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    csvData = lines.slice(1).map(line => {
      const parts = line.split(',');
      const row = {
        date: parts[0] || '',
        post_type: parts[1] || '',
        views: parseInt(parts[2]) || 0,
        likes: parseInt(parts[3]) || 0,
        comments: parseInt(parts[4]) || 0,
        shares: parseInt(parts[5]) || 0,
        saves: parseInt(parts[6]) || 0,
        engagement_rate: parseFloat(parts[7]) || 0,
      };
      return row;
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

  container.innerHTML = `
    <div class="space-y-6">
      <!-- レポート -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h3 class="text-xl font-bold text-gray-800 mb-4">
          <i class="fas fa-chart-line mr-2 text-blue-600"></i>分析レポート
        </h3>
        <div class="space-y-4">
          <div>
            <h4 class="font-semibold text-gray-700 mb-2">概要</h4>
            <p class="text-gray-600 whitespace-pre-line">${escapeHtml(report.overview)}</p>
          </div>
          <div>
            <h4 class="font-semibold text-gray-700 mb-2">勝ちパターン</h4>
            <ul class="list-disc list-inside text-gray-600">
              ${report.winning_patterns.map(p => `<li>${escapeHtml(p)}</li>`).join('')}
            </ul>
          </div>
          <div>
            <h4 class="font-semibold text-gray-700 mb-2">失敗パターン</h4>
            <ul class="list-disc list-inside text-gray-600">
              ${report.failing_patterns.map(p => `<li>${escapeHtml(p)}</li>`).join('')}
            </ul>
          </div>
          <div>
            <h4 class="font-semibold text-gray-700 mb-2">今月の方針</h4>
            <p class="text-gray-600">${escapeHtml(report.strategy)}</p>
          </div>
          <div>
            <h4 class="font-semibold text-gray-700 mb-2">投稿比率</h4>
            <div class="grid grid-cols-5 gap-2">
              <div class="text-center p-2 bg-red-50 rounded"><span class="block font-bold text-red-600">${report.posting_ratio.buzz}%</span><span class="text-xs text-gray-600">バズ</span></div>
              <div class="text-center p-2 bg-blue-50 rounded"><span class="block font-bold text-blue-600">${report.posting_ratio.value}%</span><span class="text-xs text-gray-600">価値</span></div>
              <div class="text-center p-2 bg-purple-50 rounded"><span class="block font-bold text-purple-600">${report.posting_ratio.story}%</span><span class="text-xs text-gray-600">ストーリー</span></div>
              <div class="text-center p-2 bg-green-50 rounded"><span class="block font-bold text-green-600">${report.posting_ratio.empathy}%</span><span class="text-xs text-gray-600">共感</span></div>
              <div class="text-center p-2 bg-yellow-50 rounded"><span class="block font-bold text-yellow-600">${report.posting_ratio.education}%</span><span class="text-xs text-gray-600">教育</span></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 企画案一覧 -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h3 class="text-xl font-bold text-gray-800 mb-4">
          <i class="fas fa-lightbulb mr-2 text-yellow-500"></i>企画案 (${ideas.length}件)
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${ideas.map(idea => `
            <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
              <div class="flex justify-between items-start mb-2">
                <h4 class="font-bold text-gray-800">${escapeHtml(idea.title)}</h4>
                <span class="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700">${escapeHtml(idea.video_purpose)}</span>
              </div>
              <p class="text-sm text-gray-600 mb-2"><strong>構成:</strong> ${escapeHtml(idea.structure)}</p>
              <p class="text-sm text-gray-600 mb-2"><strong>強調ポイント:</strong> ${escapeHtml(idea.key_points)}</p>
              <p class="text-sm text-gray-600"><strong>CTA:</strong> ${escapeHtml(idea.cta)}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
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

  container.innerHTML = `
    <div class="space-y-6">
      <!-- 全体方針 -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h3 class="text-xl font-bold text-gray-800 mb-4">
          <i class="fas fa-cog mr-2 text-purple-600"></i>全体方針
        </h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center p-4 bg-gray-50 rounded-lg">
            <p class="text-sm text-gray-600 mb-1">トーン</p>
            <p class="font-bold text-gray-800">${escapeHtml(blueprint.overall.tone)}</p>
          </div>
          <div class="text-center p-4 bg-gray-50 rounded-lg">
            <p class="text-sm text-gray-600 mb-1">テンポ</p>
            <p class="font-bold text-gray-800">${escapeHtml(blueprint.overall.tempo)}</p>
          </div>
          <div class="text-center p-4 bg-gray-50 rounded-lg">
            <p class="text-sm text-gray-600 mb-1">メインカラー</p>
            <div class="flex items-center justify-center">
              <span class="w-8 h-8 rounded border inline-block" style="background-color: ${blueprint.overall.mainColor}"></span>
            </div>
          </div>
          <div class="text-center p-4 bg-gray-50 rounded-lg">
            <p class="text-sm text-gray-600 mb-1">フォント</p>
            <p class="font-bold text-gray-800">${escapeHtml(blueprint.overall.font)}</p>
          </div>
        </div>
      </div>

      <!-- CapCutスペース -->
      ${blueprint.capcutSpaces && blueprint.capcutSpaces.length > 0 ? `
        <div class="bg-white rounded-lg shadow-md p-6">
          <h3 class="text-xl font-bold text-gray-800 mb-4">
            <i class="fas fa-link mr-2 text-blue-600"></i>CapCutスペース
          </h3>
          <div class="space-y-2">
            ${blueprint.capcutSpaces.map(space => `
              <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span class="font-semibold text-gray-700">${escapeHtml(space.purpose)}</span>
                <a href="${escapeHtml(space.url)}" target="_blank" class="text-blue-600 hover:text-blue-800 underline">
                  <i class="fas fa-external-link-alt mr-1"></i>開く
                </a>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

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
              ${blueprint.cutPlanning.slice(0, 10).map(cut => `
                <tr class="border-b">
                  <td class="px-4 py-2">${cut.start}s - ${cut.end}s</td>
                  <td class="px-4 py-2"><span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">${escapeHtml(cut.shot)}</span></td>
                  <td class="px-4 py-2 text-gray-600">${escapeHtml(cut.line)}</td>
                </tr>
              `).join('')}
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
          ${blueprint.thumbnailIdeas.map((thumb, idx) => `
            <div class="border border-gray-200 rounded-lg p-4">
              <h4 class="font-bold text-gray-800 mb-2">案${idx + 1}</h4>
              <p class="text-lg font-bold mb-2" style="color: ${thumb.color}">${escapeHtml(thumb.phrase)}</p>
              <p class="text-sm text-gray-600">レイアウト: ${escapeHtml(thumb.layout)}</p>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 編集チェック実行ボタン -->
      <button onclick="runEditReview(${data.blueprint_id})" class="w-full bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold shadow-md transition">
        <i class="fas fa-check-circle mr-2"></i>編集7箇条チェックを実行
      </button>
    </div>
  `;
}

window.runEditReview = async function(blueprintId) {
  try {
    showNotification('編集チェック中...', 'info');
    const response = await axios.post(`/api/blueprints/${blueprintId}/review`);
    displayReviewResults(response.data.check_results);
    showNotification('編集チェックが完了しました!', 'success');
  } catch (error) {
    console.error('チェックエラー:', error);
    showNotification('編集チェックに失敗しました', 'error');
  }
}

function displayReviewResults(results) {
  const modalHtml = `
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
            ${results.checks.map(check => `
              <div class="border-l-4 p-4 rounded ${check.status === 'red' ? 'border-red-500 bg-red-50' : check.status === 'yellow' ? 'border-yellow-500 bg-yellow-50' : 'border-green-500 bg-green-50'}">
                <div class="flex items-start">
                  <i class="fas fa-${check.status === 'red' ? 'times-circle' : check.status === 'yellow' ? 'exclamation-circle' : 'check-circle'} text-2xl mr-3 status-${check.status}"></i>
                  <div>
                    <h4 class="font-bold text-gray-800">${escapeHtml(check.rule)}</h4>
                    <p class="text-sm text-gray-600 mt-1">${escapeHtml(check.details)}</p>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
          <div class="mt-6 p-4 rounded text-center ${results.overall === 'red' ? 'bg-red-100' : results.overall === 'yellow' ? 'bg-yellow-100' : 'bg-green-100'}">
            <p class="text-lg font-bold status-${results.overall}">総合判定: ${results.overall === 'red' ? '要修正' : results.overall === 'yellow' ? '要確認' : 'OK'}</p>
          </div>
        </div>
      </div>
    </div>
  `;

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
  const modalHtml = `
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
            <p class="text-gray-600 whitespace-pre-line">${escapeHtml(data.original_comment || '')}</p>
          </div>
          <div class="bg-green-50 rounded-lg p-4">
            <h4 class="font-bold text-gray-700 mb-2">編集者向け具体的な指示</h4>
            <pre class="text-gray-800 whitespace-pre-wrap font-mono text-sm">${escapeHtml(data.ai_interpretation)}</pre>
          </div>
        </div>
      </div>
    </div>
  `;

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

  container.innerHTML = `
    <div class="bg-white rounded-lg shadow-md p-6">
      <h3 class="text-xl font-bold text-gray-800 mb-4">
        <i class="fas fa-list mr-2 text-green-600"></i>修正依頼一覧
      </h3>
      <div class="space-y-4">
        ${currentRevisions.map(rev => `
          <div class="border border-gray-200 rounded-lg p-4">
            <div class="flex justify-between items-start mb-2">
              <span class="font-bold text-gray-800">${escapeHtml(rev.client_name || 'クライアント')}</span>
              <span class="text-xs px-2 py-1 rounded ${rev.status === 'completed' ? 'bg-green-100 text-green-700' : rev.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}">${rev.status}</span>
            </div>
            <p class="text-sm text-gray-600 mb-2"><strong>元のコメント:</strong> ${escapeHtml(rev.original_comment)}</p>
            <details class="text-sm">
              <summary class="cursor-pointer text-blue-600 hover:text-blue-800">具体化された指示を表示</summary>
              <pre class="mt-2 p-3 bg-gray-50 rounded text-xs whitespace-pre-wrap">${escapeHtml(rev.ai_interpretation)}</pre>
            </details>
          </div>
        `).join('')}
      </div>
    </div>
  `;
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
      clients.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
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
  notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-4 rounded-lg shadow-lg z-50 transition-opacity`;
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

// ========================================
// 動画学習システム
// ========================================

let currentVideoClient = null;

// 動画アップロードモード切り替え
window.switchVideoUploadMode = function(mode) {
  const fileForm = document.getElementById('video-upload-form');
  const youtubeForm = document.getElementById('youtube-add-form');
  const fileBtn = document.getElementById('upload-mode-file');
  const youtubeBtn = document.getElementById('upload-mode-youtube');
  
  if (mode === 'file') {
    fileForm.classList.remove('hidden');
    youtubeForm.classList.add('hidden');
    fileBtn.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
    fileBtn.classList.remove('text-gray-500');
    youtubeBtn.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
    youtubeBtn.classList.add('text-gray-500');
  } else {
    fileForm.classList.add('hidden');
    youtubeForm.classList.remove('hidden');
    youtubeBtn.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
    youtubeBtn.classList.remove('text-gray-500');
    fileBtn.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
    fileBtn.classList.add('text-gray-500');
  }
}

// 動画アップロードフォーム送信
document.getElementById('video-upload-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const clientId = document.getElementById('video-client').value;
  const title = document.getElementById('video-title').value;
  const fileInput = document.getElementById('video-file');
  const file = fileInput.files[0];
  
  if (!file) {
    alert('動画ファイルを選択してください');
    return;
  }
  
  // パフォーマンス指標
  const views = document.getElementById('video-views').value || 0;
  const likes = document.getElementById('video-likes').value || 0;
  const saves = document.getElementById('video-saves').value || 0;
  const performanceMetrics = JSON.stringify({ views: parseInt(views), likes: parseInt(likes), saves: parseInt(saves) });
  
  // FormDataを作成
  const formData = new FormData();
  formData.append('video', file);
  formData.append('client_id', clientId);
  formData.append('title', title);
  formData.append('performance_metrics', performanceMetrics);
  
  try {
    // ローディング表示
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>アップロード中...';
    submitBtn.disabled = true;
    
    const response = await axios.post('/api/videos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    alert('動画のアップロードが完了しました！\n次にAI解析を実行してください。');
    
    // フォームリセット
    e.target.reset();
    
    // 動画一覧を更新
    loadVideosForClient(clientId);
    
    // 解析を自動実行
    if (confirm('すぐにAI解析を実行しますか？（Gemini API使用）')) {
      await analyzeVideo(response.data.video_id);
    }
    
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  } catch (error) {
    console.error('Upload error:', error);
    alert('アップロードエラー: ' + (error.response?.data?.error || error.message));
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
});

// YouTube動画追加フォーム送信
document.getElementById('youtube-add-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const clientId = document.getElementById('youtube-client').value;
  const youtubeUrl = document.getElementById('youtube-url').value;
  const title = document.getElementById('youtube-title').value;
  
  // パフォーマンス指標
  const views = document.getElementById('youtube-views').value || 0;
  const likes = document.getElementById('youtube-likes').value || 0;
  const saves = document.getElementById('youtube-saves').value || 0;
  const performanceMetrics = { views: parseInt(views), likes: parseInt(likes), saves: parseInt(saves) };
  
  try {
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>追加中...';
    submitBtn.disabled = true;
    
    const response = await axios.post('/api/videos/youtube', {
      client_id: clientId,
      youtube_url: youtubeUrl,
      title: title || undefined,
      performance_metrics: performanceMetrics
    });
    
    alert('YouTube動画を追加しました！\n次にAI解析を実行してください。');
    
    e.target.reset();
    loadVideosForClient(clientId);
    
    // 解析を自動実行
    if (confirm('すぐにAI解析を実行しますか？（Gemini API使用）')) {
      await analyzeVideo(response.data.video_id);
    }
    
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  } catch (error) {
    console.error('YouTube add error:', error);
    alert('追加エラー: ' + (error.response?.data?.error || error.message));
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
});

// クライアント選択時に動画一覧を読み込み
document.getElementById('video-client')?.addEventListener('change', (e) => {
  const clientId = e.target.value;
  if (clientId) {
    currentVideoClient = clientId;
    loadVideosForClient(clientId);
    loadLearningStats(clientId);
  }
});

document.getElementById('youtube-client')?.addEventListener('change', (e) => {
  const clientId = e.target.value;
  if (clientId) {
    currentVideoClient = clientId;
    loadVideosForClient(clientId);
    loadLearningStats(clientId);
  }
});

// 動画一覧読み込み
async function loadVideosForClient(clientId) {
  try {
    const response = await axios.get(`/api/videos/client/${clientId}`);
    const videos = response.data.videos;
    
    const videosList = document.getElementById('videos-list');
    
    if (!videos || videos.length === 0) {
      videosList.innerHTML = '<p class="text-gray-500 text-center py-8">まだ動画が追加されていません</p>';
      return;
    }
    
    videosList.innerHTML = videos.map(video => `
      <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center space-x-2 mb-2">
              <h4 class="font-bold text-gray-800">${video.title}</h4>
              ${video.source_type === 'youtube' 
                ? '<span class="text-xs bg-red-100 text-red-600 px-2 py-1 rounded"><i class="fab fa-youtube mr-1"></i>YouTube</span>'
                : '<span class="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded"><i class="fas fa-cloud mr-1"></i>アップロード</span>'
              }
              ${video.has_analysis 
                ? '<span class="text-xs bg-green-100 text-green-600 px-2 py-1 rounded"><i class="fas fa-check-circle mr-1"></i>解析済み</span>'
                : '<span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"><i class="fas fa-clock mr-1"></i>未解析</span>'
              }
            </div>
            <div class="text-sm text-gray-600 space-y-1">
              <p><i class="fas fa-clock mr-2"></i>尺: ${video.duration_seconds}秒</p>
              <p><i class="fas fa-calendar mr-2"></i>追加日: ${new Date(video.upload_date).toLocaleDateString('ja-JP')}</p>
              ${video.performance_metrics && video.performance_metrics !== '{}' ? `
                <p><i class="fas fa-chart-line mr-2"></i>再生数: ${JSON.parse(video.performance_metrics).views?.toLocaleString() || 0}</p>
              ` : ''}
            </div>
          </div>
          <div class="flex flex-col space-y-2">
            ${!video.has_analysis ? `
              <button onclick="analyzeVideo(${video.id})" class="bg-pink-600 hover:bg-pink-700 text-white text-sm px-4 py-2 rounded-lg transition">
                <i class="fas fa-brain mr-1"></i>AI解析
              </button>
            ` : `
              <button onclick="viewVideoAnalysis(${video.id})" class="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition">
                <i class="fas fa-chart-bar mr-1"></i>解析結果
              </button>
            `}
            <button onclick="deleteVideo(${video.id})" class="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-lg transition">
              <i class="fas fa-trash mr-1"></i>削除
            </button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load videos:', error);
  }
}

// 学習統計読み込み
async function loadLearningStats(clientId) {
  try {
    const response = await axios.get(`/api/videos/stats/${clientId}`);
    const stats = response.data.stats;
    
    if (!stats) {
      document.getElementById('learning-stats').classList.add('hidden');
      return;
    }
    
    document.getElementById('learning-stats').classList.remove('hidden');
    document.getElementById('stats-total-videos').textContent = stats.total_videos_analyzed || 0;
    document.getElementById('stats-cut-frequency').textContent = (stats.avg_cut_frequency || 0).toFixed(1) + '秒';
    document.getElementById('stats-engagement').textContent = Math.round(stats.avg_engagement_score || 0) + '%';
    document.getElementById('stats-total-views').textContent = (stats.total_views || 0).toLocaleString();
  } catch (error) {
    console.error('Failed to load learning stats:', error);
  }
}

// AI解析実行
window.analyzeVideo = async function(videoId) {
  if (!confirm('AI解析を実行しますか？\nGemini API（有料）を使用します。')) {
    return;
  }
  
  try {
    const response = await axios.post(`/api/videos/${videoId}/analyze`, { force: false });
    
    alert('AI解析が完了しました！\n\n解析結果:\n' + 
          `エンゲージメントスコア: ${response.data.analysis.engagement_score}/100\n` +
          `カット間隔: ${response.data.analysis.cut_frequency}秒\n` +
          `トークン使用: ${response.data.analysis.tokens_used}\n` +
          `コスト: $${response.data.analysis.cost_usd.toFixed(4)}`);
    
    // 動画一覧と統計を更新
    loadVideosForClient(currentVideoClient);
    loadLearningStats(currentVideoClient);
  } catch (error) {
    console.error('Analysis error:', error);
    alert('解析エラー: ' + (error.response?.data?.error || error.message));
  }
}

// 解析結果表示
window.viewVideoAnalysis = async function(videoId) {
  try {
    console.log('Fetching analysis for video:', videoId);
    const response = await axios.get(`/api/videos/${videoId}/analysis`);
    console.log('Analysis response:', response.data);
    
    const analysis = response.data.analysis;
    
    if (!analysis) {
      alert('解析データが見つかりませんでした');
      return;
    }
    
    // 解析結果をモーダル表示（簡易版）
    // APIから返されたオブジェクトをそのまま使用（既にパース済み）
    const colorScheme = analysis.color_scheme || {};
    const paceRhythm = analysis.pace_rhythm || {};
    const bgmStyle = analysis.bgm_style || {};
    
    // 詳細な解析結果を表示（raw_analysisから取得）
    const raw = analysis.raw_analysis || {};
    
    let resultText = `【AI解析結果】\n\n`;
    resultText += `動画: ${analysis.video_title || '不明'}\n`;
    resultText += `カット間隔: ${analysis.cut_frequency || 'N/A'}秒\n`;
    resultText += `ペース: ${paceRhythm.pace || 'N/A'}\n`;
    resultText += `色温度: ${colorScheme.temperature || 'N/A'}\n`;
    resultText += `明るさ: ${colorScheme.brightness || 'N/A'}\n`;
    resultText += `BGM: ${bgmStyle.has_bgm ? (bgmStyle.genre || 'あり') : 'なし'}\n\n`;
    
    if (raw.strengths && Array.isArray(raw.strengths) && raw.strengths.length > 0) {
      resultText += `【強み】\n`;
      raw.strengths.forEach(s => resultText += `✓ ${s}\n`);
      resultText += `\n`;
    }
    
    if (raw.weaknesses && Array.isArray(raw.weaknesses) && raw.weaknesses.length > 0) {
      resultText += `【課題】\n`;
      raw.weaknesses.forEach(w => resultText += `△ ${w}\n`);
      resultText += `\n`;
    }
    
    if (raw.recommendations && Array.isArray(raw.recommendations) && raw.recommendations.length > 0) {
      resultText += `【改善提案】\n`;
      raw.recommendations.forEach(r => resultText += `→ ${r}\n`);
      resultText += `\n`;
    }
    
    if (raw.engagementMetrics) {
      resultText += `【エンゲージメント予測】\n`;
      resultText += `視聴維持率: ${raw.engagementMetrics.estimatedRetention || 'N/A'}%\n`;
      resultText += `バズ可能性: ${raw.engagementMetrics.viralPotential || 'N/A'}/100\n\n`;
    }
    
    if (analysis.created_at) {
      resultText += `解析日: ${new Date(analysis.created_at).toLocaleDateString('ja-JP')}`;
    }
    
    console.log('Displaying result text:', resultText);
    alert(resultText);
  } catch (error) {
    console.error('Failed to view analysis:', error);
    console.error('Error details:', error.response?.data);
    alert('解析結果の取得に失敗しました: ' + (error.response?.data?.error || error.message));
  }
}

// 動画削除
window.deleteVideo = async function(videoId) {
  if (!confirm('この動画と解析データを削除しますか？\n学習統計も再計算されます。')) {
    return;
  }
  
  try {
    await axios.delete(`/api/videos/${videoId}`);
    alert('動画を削除しました');
    
    // 動画一覧と統計を更新
    loadVideosForClient(currentVideoClient);
    loadLearningStats(currentVideoClient);
  } catch (error) {
    console.error('Delete error:', error);
    alert('削除エラー: ' + (error.response?.data?.error || error.message));
  }
}

// ======================
// 動画チェック（フィードバック）機能
// ======================

let currentFeedbackClient = null;
let currentCheckVideo = null;
let allFeedbacks = [];

// 動画学習サブタブ切り替え
window.switchVideoSubTab = function(subtab) {
  document.querySelectorAll('.video-subtab-content').forEach(el => el.style.display = 'none');
  document.querySelectorAll('[id^="video-subtab-"]').forEach(btn => {
    btn.classList.remove('text-pink-600', 'border-pink-600');
    btn.classList.add('text-gray-500');
  });
  
  if (subtab === 'learning') {
    document.getElementById('video-learning-subtab').style.display = 'block';
    document.getElementById('video-subtab-learning').classList.add('text-pink-600', 'border-pink-600');
    document.getElementById('video-subtab-learning').classList.remove('text-gray-500');
  } else if (subtab === 'feedback-check') {
    document.getElementById('video-feedback-check-subtab').style.display = 'block';
    document.getElementById('video-subtab-feedback-check').classList.add('text-pink-600', 'border-pink-600');
    document.getElementById('video-subtab-feedback-check').classList.remove('text-gray-500');
    
    // フィードバッククライアントセレクトを初期化
    loadClientsForFeedback();
  }
};

// フィードバックビュー切り替え
window.switchFeedbackView = function(view) {
  document.querySelectorAll('.feedback-view').forEach(el => el.style.display = 'none');
  document.querySelectorAll('[id^="feedback-view-"]').forEach(btn => {
    btn.classList.remove('text-blue-600', 'border-blue-600');
    btn.classList.add('text-gray-500');
  });
  
  if (view === 'register') {
    document.getElementById('feedback-register-view').style.display = 'block';
    document.getElementById('feedback-view-register').classList.add('text-blue-600', 'border-blue-600');
    document.getElementById('feedback-view-register').classList.remove('text-gray-500');
  } else if (view === 'check-results') {
    document.getElementById('feedback-check-results-view').style.display = 'block';
    document.getElementById('feedback-view-check-results').classList.add('text-blue-600', 'border-blue-600');
    document.getElementById('feedback-view-check-results').classList.remove('text-gray-500');
  }
};

// クライアント一覧をフィードバックセレクトに読み込み
async function loadClientsForFeedback() {
  try {
    const response = await axios.get('/api/clients');
    const clients = response.data.clients;
    
    const select = document.getElementById('feedback-client-select');
    select.innerHTML = '<option value="">選択してください</option>';
    
    clients.forEach(client => {
      const option = document.createElement('option');
      option.value = client.id;
      option.textContent = client.name;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Failed to load clients:', error);
  }
}

// クライアント選択時にフィードバック読み込み
window.loadFeedbacksForClient = async function(clientId) {
  if (!clientId) {
    document.getElementById('feedbacks-list').innerHTML = '<p class="text-gray-500 text-center py-8">クライアントを選択してください</p>';
    document.getElementById('check-video-select').innerHTML = '<option value="">選択してください</option>';
    return;
  }
  
  currentFeedbackClient = clientId;
  
  try {
    // フィードバック取得
    const response = await axios.get(`/api/feedbacks?client_id=${clientId}&status=active`);
    allFeedbacks = response.data.feedbacks || [];
    
    renderFeedbacksList(allFeedbacks);
    
    // 動画一覧も取得
    const videosResponse = await axios.get(`/api/videos/client/${clientId}`);
    const videos = videosResponse.data.videos || [];
    
    // フォームの動画セレクトを更新
    const videoSelect = document.getElementById('feedback-video');
    videoSelect.innerHTML = '<option value="">なし</option>';
    videos.forEach(video => {
      const option = document.createElement('option');
      option.value = video.id;
      option.textContent = video.title;
      videoSelect.appendChild(option);
    });
    
    // チェック用動画セレクトも更新
    const checkVideoSelect = document.getElementById('check-video-select');
    checkVideoSelect.innerHTML = '<option value="">選択してください</option>';
    videos.forEach(video => {
      const option = document.createElement('option');
      option.value = video.id;
      option.textContent = `${video.title} ${video.has_analysis ? '(解析済み)' : '(未解析)'}`;
      if (!video.has_analysis) option.disabled = true;
      checkVideoSelect.appendChild(option);
    });
    
  } catch (error) {
    console.error('Failed to load feedbacks:', error);
    showNotification('フィードバックの読み込みに失敗しました', 'error');
  }
};

// フィードバック一覧表示
function renderFeedbacksList(feedbacks) {
  const container = document.getElementById('feedbacks-list');
  
  if (!feedbacks || feedbacks.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-center py-8">登録済みフィードバックがありません</p>';
    return;
  }
  
  container.innerHTML = feedbacks.map(fb => {
    const importanceColor = fb.importance === '高' ? 'red' : fb.importance === '中' ? 'yellow' : 'green';
    return `
      <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="flex items-center space-x-2 mb-2">
              <span class="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">${fb.category}</span>
              <span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">${fb.phase}</span>
              <span class="text-xs bg-${importanceColor}-100 text-${importanceColor}-600 px-2 py-1 rounded font-bold">${fb.importance}</span>
              ${fb.match_count > 0 ? `<span class="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded">マッチ${fb.match_count}回</span>` : ''}
            </div>
            <p class="text-gray-800 mb-2">${fb.feedback_text}</p>
            ${fb.memo ? `<p class="text-sm text-gray-500">メモ: ${fb.memo}</p>` : ''}
            ${fb.video_title ? `<p class="text-xs text-gray-400 mt-1">関連動画: ${fb.video_title}</p>` : ''}
          </div>
          <div class="flex space-x-2">
            <button onclick="editFeedback(${fb.id})" class="text-blue-600 hover:text-blue-800 px-2 py-1">
              <i class="fas fa-edit"></i>
            </button>
            <button onclick="archiveFeedback(${fb.id})" class="text-gray-600 hover:text-gray-800 px-2 py-1">
              <i class="fas fa-archive"></i>
            </button>
            <button onclick="deleteFeedback(${fb.id})" class="text-red-600 hover:text-red-800 px-2 py-1">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// フィルタリング
window.filterFeedbacks = function() {
  const category = document.getElementById('feedback-filter-category').value;
  const importance = document.getElementById('feedback-filter-importance').value;
  
  let filtered = allFeedbacks;
  
  if (category) {
    filtered = filtered.filter(fb => fb.category === category);
  }
  
  if (importance) {
    filtered = filtered.filter(fb => fb.importance === importance);
  }
  
  renderFeedbacksList(filtered);
};

// フィードバック登録フォーム送信
document.getElementById('feedback-form')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  
  if (!currentFeedbackClient) {
    showNotification('クライアントを選択してください', 'error');
    return;
  }
  
  const importance = document.querySelector('input[name="feedback-importance"]:checked')?.value;
  
  const data = {
    client_id: currentFeedbackClient,
    video_id: document.getElementById('feedback-video').value || null,
    feedback_text: document.getElementById('feedback-text').value,
    category: document.getElementById('feedback-category').value,
    phase: document.getElementById('feedback-phase').value,
    importance: importance,
    memo: document.getElementById('feedback-memo').value,
    created_by: 'user'
  };
  
  try {
    showNotification('フィードバックを登録中...', 'info');
    await axios.post('/api/feedbacks', data);
    showNotification('フィードバックを登録しました！', 'success');
    
    // フォームリセット
    document.getElementById('feedback-form').reset();
    document.querySelector('input[name="feedback-importance"][value="中"]').checked = true;
    
    // 一覧再読み込み
    loadFeedbacksForClient(currentFeedbackClient);
  } catch (error) {
    console.error('Failed to create feedback:', error);
    showNotification('登録に失敗しました: ' + (error.response?.data?.error || error.message), 'error');
  }
});

// フィードバック編集
window.editFeedback = async function(feedbackId) {
  // 簡易実装：詳細表示のみ
  try {
    const response = await axios.get(`/api/feedbacks/${feedbackId}`);
    const fb = response.data.feedback;
    
    alert(`フィードバック詳細:\n\nカテゴリ: ${fb.category}\nフェーズ: ${fb.phase}\n重要度: ${fb.importance}\n\n内容:\n${fb.feedback_text}\n\nメモ: ${fb.memo || 'なし'}`);
  } catch (error) {
    console.error('Failed to fetch feedback:', error);
    showNotification('取得に失敗しました', 'error');
  }
};

// フィードバックアーカイブ
window.archiveFeedback = async function(feedbackId) {
  if (!confirm('このフィードバックをアーカイブしますか？\n（自動チェック対象から除外されます）')) {
    return;
  }
  
  try {
    await axios.put(`/api/feedbacks/${feedbackId}`, {
      status: 'archived',
      updated_by: 'user'
    });
    showNotification('アーカイブしました', 'success');
    loadFeedbacksForClient(currentFeedbackClient);
  } catch (error) {
    console.error('Failed to archive feedback:', error);
    showNotification('アーカイブに失敗しました', 'error');
  }
};

// フィードバック削除
window.deleteFeedback = async function(feedbackId) {
  if (!confirm('このフィードバックを削除しますか？')) {
    return;
  }
  
  try {
    await axios.delete(`/api/feedbacks/${feedbackId}`);
    showNotification('削除しました', 'success');
    loadFeedbacksForClient(currentFeedbackClient);
  } catch (error) {
    console.error('Failed to delete feedback:', error);
    showNotification('削除に失敗しました', 'error');
  }
};

// 動画チェック実行
window.runVideoCheck = async function() {
  const videoId = document.getElementById('check-video-select').value;
  
  if (!videoId) {
    showNotification('動画を選択してください', 'error');
    return;
  }
  
  try {
    showNotification('自動チェックを実行中...（Gemini API使用）', 'info');
    const response = await axios.post(`/api/feedbacks/check-video/${videoId}`);
    
    const matches = response.data.matches || [];
    
    // 結果表示
    document.getElementById('check-results-container').style.display = 'block';
    document.getElementById('check-results-summary').innerHTML = `
      <div class="bg-${matches.length > 0 ? 'orange' : 'green'}-50 border-l-4 border-${matches.length > 0 ? 'orange' : 'green'}-500 p-4">
        <p class="font-semibold text-${matches.length > 0 ? 'orange' : 'green'}-900">
          ${matches.length > 0 ? `⚠️ ${matches.length}件の過去指摘と類似する可能性があります` : '✅ 過去指摘との類似は検出されませんでした'}
        </p>
        <p class="text-sm text-${matches.length > 0 ? 'orange' : 'green'}-800 mt-1">
          動画: ${response.data.video_title}
        </p>
      </div>
    `;
    
    if (matches.length > 0) {
      document.getElementById('check-results-list').innerHTML = matches.map(match => {
        const rankClass = `similarity-rank-${match.similarity_rank.toLowerCase()}`;
        const importanceColor = match.importance === '高' ? 'red' : match.importance === '中' ? 'yellow' : 'green';
        
        return `
          <div class="border-2 ${match.similarity_rank === 'A' ? 'border-red-300' : 'border-gray-200'} rounded-lg p-4">
            <div class="flex justify-between items-start mb-2">
              <div class="flex items-center space-x-2">
                <span class="text-sm font-bold px-3 py-1 rounded ${rankClass}">類似度 ${match.similarity_rank} (${(match.similarity_score * 100).toFixed(1)}%)</span>
                <span class="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">${match.category}</span>
                <span class="text-xs bg-${importanceColor}-100 text-${importanceColor}-600 px-2 py-1 rounded font-bold">${match.importance}</span>
              </div>
            </div>
            <p class="text-gray-800 mb-2">${match.feedback_text}</p>
            <p class="text-sm text-gray-600 mb-3">過去マッチ回数: ${match.match_count}回 | 最終指摘: ${new Date(match.last_pointed_at).toLocaleDateString('ja-JP')}</p>
            
            <div class="flex space-x-2">
              <button onclick="judgeMatch(${match.match_id}, 'true_positive')" class="text-sm bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded transition">
                <i class="fas fa-check-circle mr-1"></i>今回も該当
              </button>
              <button onclick="judgeMatch(${match.match_id}, 'false_positive')" class="text-sm bg-green-100 hover:bg-green-200 text-green-700 px-4 py-2 rounded transition">
                <i class="fas fa-times-circle mr-1"></i>今回は問題なし
              </button>
            </div>
          </div>
        `;
      }).join('');
    } else {
      document.getElementById('check-results-list').innerHTML = '<p class="text-gray-500 text-center py-8">問題は検出されませんでした</p>';
    }
    
    showNotification('自動チェックが完了しました', 'success');
  } catch (error) {
    console.error('Failed to check video:', error);
    showNotification('チェックに失敗しました: ' + (error.response?.data?.error || error.message), 'error');
  }
};

// マッチ判定
window.judgeMatch = async function(matchId, judgement) {
  try {
    await axios.put(`/api/feedbacks/matches/${matchId}/judgement`, {
      user_judgement: judgement,
      user_name: 'user',
      user_comment: null
    });
    
    const message = judgement === 'true_positive' ? '再発として記録しました' : '誤検知として記録しました';
    showNotification(message, 'success');
    
    // ボタンを無効化
    event.target.disabled = true;
    event.target.classList.add('opacity-50', 'cursor-not-allowed');
  } catch (error) {
    console.error('Failed to judge match:', error);
    showNotification('判定の記録に失敗しました', 'error');
  }
};

// 動画チェックモード切り替え
window.switchVideoCheckMode = function(mode) {
  // すべてのモードを非表示
  document.getElementById('check-file-input').style.display = 'none';
  document.getElementById('check-gdrive-input').style.display = 'none';
  document.getElementById('check-existing-input').style.display = 'none';
  
  // タブのスタイルをリセット
  document.querySelectorAll('[id^="check-mode-"]').forEach(btn => {
    btn.classList.remove('text-blue-600', 'border-blue-600', 'border-b-2');
    btn.classList.add('text-gray-500');
  });
  
  // 選択されたモードを表示
  if (mode === 'file') {
    document.getElementById('check-file-input').style.display = 'block';
    document.getElementById('check-mode-file').classList.add('text-blue-600', 'border-blue-600', 'border-b-2');
    document.getElementById('check-mode-file').classList.remove('text-gray-500');
  } else if (mode === 'gdrive') {
    document.getElementById('check-gdrive-input').style.display = 'block';
    document.getElementById('check-mode-gdrive').classList.add('text-blue-600', 'border-blue-600', 'border-b-2');
    document.getElementById('check-mode-gdrive').classList.remove('text-gray-500');
  } else if (mode === 'existing') {
    document.getElementById('check-existing-input').style.display = 'block';
    document.getElementById('check-mode-existing').classList.add('text-blue-600', 'border-blue-600', 'border-b-2');
    document.getElementById('check-mode-existing').classList.remove('text-gray-500');
    // 登録済み動画一覧を読み込む
    loadExistingVideosForCheck();
  }
};

// 登録済み動画をチェック用セレクトボックスに読み込む
async function loadExistingVideosForCheck() {
  const clientId = document.getElementById('feedback-client-select').value;
  if (!clientId) {
    showNotification('クライアントを選択してください', 'warning');
    return;
  }
  
  try {
    const response = await axios.get(`/api/videos/client/${clientId}`);
    const select = document.getElementById('check-video-select');
    select.innerHTML = '<option value="">選択してください</option>';
    
    response.data.videos.forEach(video => {
      const option = document.createElement('option');
      option.value = video.id;
      option.textContent = `${video.title} (${video.source === 'youtube' ? 'YouTube' : 'アップロード'})`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Failed to load videos:', error);
    showNotification('動画一覧の取得に失敗しました', 'error');
  }
}

// 動画ファイルをアップロードしてチェック
window.runVideoCheckWithFile = async function() {
  const fileInput = document.getElementById('check-video-file');
  const titleInput = document.getElementById('check-video-title-file');
  const clientId = document.getElementById('feedback-client-select').value;
  
  if (!clientId) {
    showNotification('クライアントを選択してください', 'warning');
    return;
  }
  
  if (!fileInput.files || !fileInput.files[0]) {
    showNotification('動画ファイルを選択してください', 'warning');
    return;
  }
  
  const file = fileInput.files[0];
  const maxSize = 100 * 1024 * 1024; // 100MB
  
  if (file.size > maxSize) {
    showNotification('ファイルサイズが大きすぎます（最大100MB）', 'error');
    return;
  }
  
  try {
    showNotification('動画をアップロード中...', 'info');
    
    // 動画をアップロード
    const formData = new FormData();
    formData.append('video', file);
    formData.append('client_id', clientId);
    formData.append('title', titleInput.value || file.name);
    
    const uploadResponse = await axios.post('/api/videos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    const videoId = uploadResponse.data.video_id;
    showNotification('アップロード完了。AI解析を開始します...', 'info');
    
    // AI解析を実行
    await axios.post(`/api/videos/${videoId}/analyze`);
    showNotification('AI解析完了。フィードバックチェックを実行します...', 'info');
    
    // フィードバックチェックを実行
    await runVideoCheckById(videoId);
    
  } catch (error) {
    console.error('Failed to check video with file:', error);
    const errorMsg = error.response?.data?.error_ja || error.response?.data?.error || error.message;
    showNotification('処理に失敗しました: ' + errorMsg, 'error');
  }
};

// Google Drive URLでチェック
window.runVideoCheckWithGDrive = async function() {
  const urlInput = document.getElementById('check-gdrive-url');
  const titleInput = document.getElementById('check-video-title-gdrive');
  const clientId = document.getElementById('feedback-client-select').value;
  
  if (!clientId) {
    showNotification('クライアントを選択してください', 'warning');
    return;
  }
  
  if (!urlInput.value) {
    showNotification('Google Drive URLを入力してください', 'warning');
    return;
  }
  
  try {
    showNotification('Google Drive動画を処理中...', 'info');
    
    // Google Drive動画を追加（YouTube APIと同じエンドポイントを使用）
    const addResponse = await axios.post('/api/videos/youtube', {
      client_id: parseInt(clientId),
      youtube_url: urlInput.value,
      title: titleInput.value || 'Google Drive動画'
    });
    
    const videoId = addResponse.data.video_id;
    showNotification('動画追加完了。AI解析を開始します...', 'info');
    
    // AI解析を実行
    await axios.post(`/api/videos/${videoId}/analyze`);
    showNotification('AI解析完了。フィードバックチェックを実行します...', 'info');
    
    // フィードバックチェックを実行
    await runVideoCheckById(videoId);
    
  } catch (error) {
    console.error('Failed to check video with Google Drive:', error);
    const errorMsg = error.response?.data?.error_ja || error.response?.data?.error || error.message;
    showNotification('処理に失敗しました: ' + errorMsg, 'error');
  }
};

// 登録済み動画でチェック
window.runVideoCheckWithExisting = async function() {
  const select = document.getElementById('check-video-select');
  const videoId = select.value;
  
  if (!videoId) {
    showNotification('動画を選択してください', 'warning');
    return;
  }
  
  await runVideoCheckById(videoId);
};

// 動画IDでチェック実行（共通関数）
async function runVideoCheckById(videoId) {
  try {
    showNotification('フィードバックチェックを実行中...', 'info');
    
    const response = await axios.post(`/api/feedbacks/check-video/${videoId}`);
    const matches = response.data.matches || [];
    
    // 結果表示エリアを表示
    document.getElementById('check-results-container').style.display = 'block';
    
    // サマリー表示
    document.getElementById('check-results-summary').innerHTML = `
      <div class="bg-blue-50 border-l-4 border-blue-500 p-4">
        <p class="font-semibold text-blue-900">
          <i class="fas fa-info-circle mr-2"></i>
          ${matches.length}件の類似指摘が見つかりました
        </p>
        <p class="text-sm text-${matches.length > 0 ? 'orange' : 'green'}-800 mt-1">
          動画: ${response.data.video_title}
        </p>
      </div>
    `;
    
    if (matches.length > 0) {
      document.getElementById('check-results-list').innerHTML = matches.map(match => {
        const rankClass = `similarity-rank-${match.similarity_rank.toLowerCase()}`;
        const importanceColor = match.importance === '高' ? 'red' : match.importance === '中' ? 'yellow' : 'green';
        
        return `
          <div class="border-2 ${match.similarity_rank === 'A' ? 'border-red-300' : 'border-gray-200'} rounded-lg p-4">
            <div class="flex justify-between items-start mb-2">
              <div class="flex items-center space-x-2">
                <span class="text-sm font-bold px-3 py-1 rounded ${rankClass}">類似度 ${match.similarity_rank} (${(match.similarity_score * 100).toFixed(1)}%)</span>
                <span class="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">${match.category}</span>
                <span class="text-xs bg-${importanceColor}-100 text-${importanceColor}-600 px-2 py-1 rounded font-bold">${match.importance}</span>
              </div>
            </div>
            <p class="text-gray-800 mb-2">${match.feedback_text}</p>
            <p class="text-sm text-gray-600 mb-3">過去マッチ回数: ${match.match_count}回 | 最終指摘: ${new Date(match.last_pointed_at).toLocaleDateString('ja-JP')}</p>
            
            <div class="flex space-x-2">
              <button onclick="judgeMatch(${match.match_id}, 'true_positive')" class="text-sm bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded transition">
                <i class="fas fa-check-circle mr-1"></i>今回も該当
              </button>
              <button onclick="judgeMatch(${match.match_id}, 'false_positive')" class="text-sm bg-green-100 hover:bg-green-200 text-green-700 px-4 py-2 rounded transition">
                <i class="fas fa-times-circle mr-1"></i>今回は問題なし
              </button>
            </div>
          </div>
        `;
      }).join('');
    } else {
      document.getElementById('check-results-list').innerHTML = '<p class="text-gray-500 text-center py-8">問題は検出されませんでした</p>';
    }
    
    showNotification('自動チェックが完了しました', 'success');
  } catch (error) {
    console.error('Failed to check video:', error);
    showNotification('チェックに失敗しました: ' + (error.response?.data?.error || error.message), 'error');
  }
}

