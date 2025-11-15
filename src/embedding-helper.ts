/**
 * Gemini Embedding API Helper
 * テキストをベクトル化して類似度検索を可能にする
 */

export interface EmbeddingConfig {
  apiKey: string;
  model?: string; // デフォルト: 'text-embedding-004'
}

/**
 * テキストをEmbeddingベクトルに変換
 * @param text 変換するテキスト
 * @param config Gemini API設定
 * @returns ベクトル配列（768次元など）
 */
export async function generateEmbedding(
  text: string,
  config: EmbeddingConfig
): Promise<number[]> {
  const model = config.model || 'text-embedding-004';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${config.apiKey}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: {
        parts: [{ text }]
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Embedding API Error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.embedding.values;
}

/**
 * 複数のテキストをバッチでEmbedding変換
 * @param texts テキスト配列
 * @param config Gemini API設定
 * @returns ベクトル配列の配列
 */
export async function generateEmbeddingBatch(
  texts: string[],
  config: EmbeddingConfig
): Promise<number[][]> {
  const model = config.model || 'text-embedding-004';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents?key=${config.apiKey}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: texts.map(text => ({
        content: {
          parts: [{ text }]
        }
      }))
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Embedding Batch API Error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.embeddings.map((emb: any) => emb.values);
}

/**
 * コサイン類似度を計算（0〜1、1が最も類似）
 * @param vecA ベクトルA
 * @param vecB ベクトルB
 * @returns 類似度スコア
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * 類似度スコアからランクを算出（A/B/C）
 * @param score 類似度スコア（0〜1）
 * @returns ランク
 */
export function getSimilarityRank(score: number): string {
  if (score >= 0.85) return 'A'; // 非常に類似
  if (score >= 0.70) return 'B'; // やや類似
  if (score >= 0.50) return 'C'; // 若干類似
  return 'D'; // 類似度低
}

/**
 * 動画分析データからチェック用テキストを生成
 * 
 * 動画の特徴を文章化して、フィードバックテンプレートと比較可能にする
 * 
 * @param videoAnalysis 動画解析データ（video_analysisテーブルのデータ）
 * @param videoMetadata 動画メタデータ（learning_videosテーブルのデータ）
 * @returns チェック用テキスト
 */
export function generateVideoCheckText(
  videoAnalysis: any,
  videoMetadata: any
): string {
  const parts: string[] = [];

  // 基本情報
  parts.push(`動画タイトル: ${videoMetadata.title || '不明'}`);
  parts.push(`動画尺: ${videoMetadata.duration_seconds || 0}秒`);

  // 構成分析
  if (videoAnalysis.structure) {
    const structure = typeof videoAnalysis.structure === 'string' 
      ? JSON.parse(videoAnalysis.structure) 
      : videoAnalysis.structure;
    
    if (structure.intro) {
      parts.push(`冒頭フック時間: ${structure.intro.end - structure.intro.start}秒`);
      parts.push(`フック強度: ${structure.intro.hookStrength || '不明'}`);
    }
    
    if (structure.cta) {
      parts.push(`CTA位置: ${videoAnalysis.cta_position || '不明'}`);
    }
  }

  // カット分析
  if (videoAnalysis.cut_frequency) {
    parts.push(`カット間隔: ${videoAnalysis.cut_frequency}秒`);
    parts.push(`テンポ: ${videoAnalysis.pace || '不明'}`);
  }

  // テロップ分析
  if (videoAnalysis.telop_style) {
    const telopStyle = typeof videoAnalysis.telop_style === 'string'
      ? JSON.parse(videoAnalysis.telop_style)
      : videoAnalysis.telop_style;
    parts.push(`テロップスタイル: ${telopStyle.type || '不明'}`);
    parts.push(`テロップフォントサイズ: ${telopStyle.fontSize || '不明'}`);
  }

  // 色味分析
  if (videoAnalysis.color_temperature) {
    parts.push(`色温度: ${videoAnalysis.color_temperature}`);
    parts.push(`明るさレベル: ${videoAnalysis.brightness_level || '不明'}`);
    parts.push(`彩度レベル: ${videoAnalysis.saturation_level || '不明'}`);
  }

  // BGM・音量分析
  if (videoAnalysis.has_bgm !== null) {
    parts.push(`BGM有無: ${videoAnalysis.has_bgm ? 'あり' : 'なし'}`);
    if (videoAnalysis.has_bgm && videoAnalysis.bgm_genre) {
      parts.push(`BGMジャンル: ${videoAnalysis.bgm_genre}`);
    }
  }

  // AI生データから追加情報を抽出
  if (videoAnalysis.ai_raw_response) {
    const rawData = typeof videoAnalysis.ai_raw_response === 'string'
      ? JSON.parse(videoAnalysis.ai_raw_response)
      : videoAnalysis.ai_raw_response;

    // 弱点・改善提案があれば追加
    if (rawData.weaknesses && Array.isArray(rawData.weaknesses)) {
      parts.push('検出された課題: ' + rawData.weaknesses.join(', '));
    }

    // 画角情報
    if (rawData.shotTypes && Array.isArray(rawData.shotTypes)) {
      parts.push('使用画角: ' + rawData.shotTypes.join(', '));
    }
  }

  return parts.join('\n');
}

/**
 * フィードバックテンプレートの重要度に応じた重みを返す
 * @param importance 重要度（高/中/低）
 * @returns 重み係数（0.5〜1.5）
 */
export function getImportanceWeight(importance: string): number {
  switch (importance) {
    case '高': return 1.5;
    case '中': return 1.0;
    case '低': return 0.5;
    default: return 1.0;
  }
}
