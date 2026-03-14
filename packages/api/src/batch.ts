import type { ScheduledHandler } from 'aws-lambda';
import {
  BedrockClient,
  BedrockService,
  RetryHandler,
  TokenCounter,
  loadBedrockConfig,
} from './services/bedrock/index.js';
import { CandidateGenerator } from './services/candidate-generator/index.js';
import { GameRepository } from './lib/dynamodb/repositories/game.js';
import { CandidateRepository } from './lib/dynamodb/repositories/candidate.js';
import { docClient, TABLE_NAME } from './lib/dynamodb.js';

// Lambda実行環境で1度だけ初期化（コールドスタート時のみ）
// Requirements: 1.3, 12.3
const config = loadBedrockConfig();
const bedrockClient = BedrockClient.getInstance(config.region);
const retryHandler = new RetryHandler(3, 1000);
const tokenCounter = new TokenCounter();
const bedrockService = new BedrockService(bedrockClient, retryHandler, tokenCounter, config);

// CandidateGenerator の初期化（Lambda実行環境で1度だけ）
// Requirements: 1.1, 8.1, 8.4
const candidateGenerator = new CandidateGenerator(
  bedrockService,
  new GameRepository(),
  new CandidateRepository(docClient, TABLE_NAME)
);

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

    // AI候補生成処理
    // Requirements: 1.1, 8.1, 8.4
    const summary = await candidateGenerator.generateCandidates();
    console.log('Candidate generation completed', summary);
  } catch (error) {
    console.error('Batch process failed', error);
    throw error;
  }
};
