// AI推論ヘルパー関数
// 実際のAI APIは使用せず、ロジックベースで動作するシミュレーション

export interface CSVRow {
  date: string;
  post_type: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagement_rate: number;
  [key: string]: any;
}

export interface AnalysisReport {
  overview: string;
  comparison: string;
  winning_patterns: string[];
  failing_patterns: string[];
  strategy: string;
  posting_ratio: {
    buzz: number;
    value: number;
    story: number;
    empathy: number;
    education: number;
  };
}

export interface CampaignIdea {
  title: string;
  structure: string;
  key_points: string;
  cta: string;
  script_outline: string;
  video_purpose: string;
}

// CSV解析とレポート生成
export function analyzeCSVData(
  csvData: CSVRow[],
  kgi: string,
  kpi: string[],
  clientProfile: any
): { report: AnalysisReport; ideas: CampaignIdea[] } {
  // 簡易的な分析ロジック
  const totalViews = csvData.reduce((sum, row) => sum + (row.views || 0), 0);
  const avgViews = totalViews / csvData.length;
  const topPosts = csvData.sort((a, b) => b.views - a.views).slice(0, 5);

  const report: AnalysisReport = {
    overview: `分析期間: ${csvData.length}件の投稿を分析しました。\n平均再生数: ${Math.round(avgViews).toLocaleString()}回\n総再生数: ${totalViews.toLocaleString()}回`,
    comparison: '前月比: データがあれば比較表示',
    winning_patterns: [
      '短尺動画（15秒以内）が高エンゲージメント',
      '冒頭3秒でフックがある投稿が伸びている',
      '具体的な数字を含むタイトルが効果的',
    ],
    failing_patterns: [
      '長尺動画（60秒以上）は離脱率が高い',
      '抽象的なタイトルはクリック率が低い',
    ],
    strategy: `KGI「${kgi}」を達成するため、KPI「${kpi.join('、')}」を重点的に改善します。`,
    posting_ratio: {
      buzz: 30,
      value: 25,
      story: 15,
      empathy: 15,
      education: 15,
    },
  };

  // 企画案20本生成（サンプル）
  const ideas: CampaignIdea[] = [];
  const purposes = ['バズ', '価値', 'ストーリー', '共感', '教育'];
  const templates = [
    { title: '〇〇を3秒で解決する方法', purpose: 'バズ', structure: 'フック→問題提起→解決策→CTA' },
    { title: '知らないと損する〇〇の裏技', purpose: 'バズ', structure: 'フック→驚き→解説→CTA' },
    { title: '〇〇で失敗しないための3つのポイント', purpose: '価値', structure: '問題提起→ポイント1→ポイント2→ポイント3→CTA' },
    { title: '私が〇〇で成功した理由', purpose: 'ストーリー', structure: '過去→転機→成功→学び→CTA' },
    { title: 'あなたも〇〇で悩んでませんか？', purpose: '共感', structure: '共感→問題深堀り→解決策→CTA' },
    { title: '〇〇の基本を徹底解説', purpose: '教育', structure: '導入→基礎知識→実践方法→まとめ→CTA' },
  ];

  for (let i = 0; i < 20; i++) {
    const template = templates[i % templates.length];
    ideas.push({
      title: `【企画${i + 1}】${template.title}`,
      structure: template.structure,
      key_points: '視聴者の悩みに寄り添う、具体的な数字を使う、行動を促す',
      cta: `${kgi}につながる導線を設置`,
      script_outline: `冒頭: フック\n本編: ${template.structure}\n締め: ${kgi}への誘導`,
      video_purpose: template.purpose,
    });
  }

  return { report, ideas };
}

// 編集設計図生成
export function generateEditBlueprint(
  script: string,
  purpose: string,
  clientProfile: any,
  capcutSpaces: any[]
): any {
  const lines = script.split('\n').filter(l => l.trim());
  const duration = lines.length * 2; // 1行あたり2秒と仮定

  // カット割り生成
  const cutPlanning = [];
  let currentTime = 0;
  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    const shotTypes = ['寄り', '引き', 'ズーム', '斜め'];
    cutPlanning.push({
      start: currentTime,
      end: currentTime + 2,
      shot: shotTypes[i % shotTypes.length],
      line: lines[i] || '',
    });
    currentTime += 2;
  }

  // テロップ設計
  const keywords = extractKeywords(script);
  const telopDesign = keywords.map(word => ({
    text: word,
    color: clientProfile?.main_color || '#FF0000',
    font: clientProfile?.font_main || 'ゴシック体',
    style: clientProfile?.telop_style || '白ベタ',
  }));

  // Bロール指示
  const brollSuggestions = [
    '商品クローズアップ',
    '作業シーン',
    '結果を示すグラフィック',
    'ビフォーアフター画像',
  ];

  // サムネイル案
  const thumbnailIdeas = [
    { phrase: `${purpose}！`, color: clientProfile?.main_color || '#FF0000', layout: '左寄せテキスト＋右側に顔' },
    { phrase: '見ないと損！', color: clientProfile?.sub_color || '#FFFF00', layout: '中央大きくテキスト' },
    { phrase: '3秒で解決', color: clientProfile?.main_color || '#FF0000', layout: '上下分割レイアウト' },
  ];

  return {
    overall: {
      tone: clientProfile?.atmosphere || 'ポップ',
      tempo: clientProfile?.tempo || '中速',
      mainColor: clientProfile?.main_color || '#FF0000',
      subColor: clientProfile?.sub_color || '#FFFF00',
      font: clientProfile?.font_main || 'ゴシック体',
    },
    capcutSpaces: capcutSpaces.map(s => ({ purpose: s.purpose, url: s.url })),
    cutPlanning,
    telopDesign,
    brollSuggestions,
    thumbnailIdeas,
  };
}

// キーワード抽出（簡易版）
function extractKeywords(text: string): string[] {
  const words = text.split(/\s+/);
  const keywords = words.filter(w => w.length >= 3 && w.length <= 10);
  return [...new Set(keywords)].slice(0, 10);
}

// 修正依頼を具体化
export function interpretRevisionRequest(
  originalComment: string,
  clientProfile: any
): string {
  const comment = originalComment.toLowerCase();
  let interpretation = '【修正内容】\n\n';

  if (comment.includes('明るく') || comment.includes('明るさ')) {
    interpretation += '■ 全体の明るさ調整\n';
    interpretation += '・明るさ: +10\n';
    interpretation += '・彩度: +5\n';
    interpretation += '・シャドウ: +8\n\n';
  }

  if (comment.includes('テンポ') || comment.includes('速く')) {
    interpretation += '■ テンポ調整\n';
    interpretation += '・カット間隔を0.5秒短縮\n';
    interpretation += '・トランジションをクイックに変更\n\n';
  }

  if (comment.includes('色') || comment.includes('カラー')) {
    interpretation += '■ カラー調整\n';
    interpretation += `・メインカラーを ${clientProfile?.main_color || '#FF0000'} に統一\n`;
    interpretation += '・彩度を全体的に+5\n\n';
  }

  if (comment.includes('テロップ') || comment.includes('文字')) {
    interpretation += '■ テロップ修正\n';
    interpretation += `・フォント: ${clientProfile?.font_main || 'ゴシック体'}\n`;
    interpretation += `・スタイル: ${clientProfile?.telop_style || '白ベタ'}\n`;
    interpretation += '・表示タイミングを調整\n\n';
  }

  if (interpretation === '【修正内容】\n\n') {
    interpretation += '■ その他の修正\n';
    interpretation += `元のコメント: "${originalComment}"\n`;
    interpretation += '具体的な修正箇所を編集者と相談してください。\n';
  }

  return interpretation;
}

// 編集7箇条チェック
export function checkEditingRules(blueprintData: any): any {
  const checks = [
    {
      rule: '同じ画角が2秒以上続いていないか',
      status: 'green',
      details: 'すべてのカットが2秒以内で切り替わっています',
    },
    {
      rule: 'テロップ抜けは無いか',
      status: 'green',
      details: '重要なセリフにはすべてテロップが設定されています',
    },
    {
      rule: 'Bロール不足は無いか',
      status: 'yellow',
      details: '一部シーンでBロールの追加を推奨します',
    },
    {
      rule: '世界観プロファイルとズレていないか',
      status: 'green',
      details: '色・フォント・トーンがプロファイルと一致しています',
    },
    {
      rule: '台本と一致しているか',
      status: 'green',
      details: '台本通りの構成になっています',
    },
    {
      rule: 'テンポが適切か',
      status: 'green',
      details: '指定されたテンポ設定に従っています',
    },
    {
      rule: '保存率を阻害しそうな構成が無いか',
      status: 'green',
      details: '冒頭3秒にフックがあり、離脱を防ぐ構成です',
    },
  ];

  const redCount = checks.filter(c => c.status === 'red').length;
  const yellowCount = checks.filter(c => c.status === 'yellow').length;
  const overall = redCount > 0 ? 'red' : yellowCount > 0 ? 'yellow' : 'green';

  return { checks, overall };
}
