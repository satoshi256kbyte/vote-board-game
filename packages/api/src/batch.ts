import type { ScheduledHandler } from 'aws-lambda';
import {
  BedrockClient,
  BedrockService,
  RetryHandler,
  TokenCounter,
  loadBedrockConfig,
} from './services/bedrock/index.js';

// Lambda実行環境で1度だけ初期化（コールドスタート時のみ）
// Requirements: 1.3, 12.3
const config = loadBedrockConfig();
const bedrockClient = BedrockClient.getInstance(config.region);
const retryHandler = new RetryHandler(3, 1000);
const tokenCounter = new TokenCounter();
const bedrockService = new BedrockService(bedrockClient, retryHandler, tokenCounter, config);

/**
 * 日次バッチ処理
 * - 投票集計
 * - 次の一手決定
 * - 次の一手候補のAI生成
 */
export const handler: ScheduledHandler = async (event) => {
  console.log('Batch process started', { event });

  try {
    // TODO: 投票集計処理を実装
    console.log('Vote aggregation completed');

    // TODO: 次の一手決定処理を実装
    console.log('Next move determination completed');

    // AI候補生成処理の例
    // Requirements: 3.1, 3.6, 10.1, 10.2
    console.log('Starting AI candidate generation...');

    const response = await bedrockService.generateText({
      prompt: `あなたはオセロの専門家です。以下の盤面状態から、次の一手の候補を3つ提案してください。

盤面状態: 初期配置（中央に白黒が配置された状態）
現在の手番: 黒

各候補について、以下の情報を含めてください：
1. 手の位置（例: D3）
2. 手の説明（200文字以内）
3. 期待される効果

JSON形式で回答してください。`,
      systemPrompt: 'あなたはオセロの専門家として、初心者にもわかりやすく次の一手を提案します。',
      maxTokens: 1000,
    });

    console.log('AI candidate generation completed', {
      textLength: response.text.length,
      usage: response.usage,
    });

    // 生成されたテキストをログに出力（開発時のみ）
    if (process.env.NODE_ENV === 'development') {
      console.log('Generated candidates:', response.text);
    }
  } catch (error) {
    console.error('Batch process failed', error);
    throw error;
  }
};
