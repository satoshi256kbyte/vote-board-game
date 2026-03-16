import type { ScheduledHandler } from 'aws-lambda';
import {
  BedrockClient,
  BedrockService,
  RetryHandler,
  TokenCounter,
  loadBedrockConfig,
} from './services/bedrock/index.js';
import { CandidateGenerator } from './services/candidate-generator/index.js';
import { CommentaryGenerator } from './services/commentary-generator/index.js';
import { AIMoveExecutor } from './services/ai-move-executor/index.js';
import { VoteTallyService } from './services/vote-tally/index.js';
import { GameRepository } from './lib/dynamodb/repositories/game.js';
import { CandidateRepository } from './lib/dynamodb/repositories/candidate.js';
import { CommentaryRepository } from './lib/dynamodb/repositories/commentary.js';
import { MoveRepository } from './lib/dynamodb/repositories/move.js';
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

// AIMoveExecutor の初期化（Lambda実行環境で1度だけ）
const aiMoveExecutor = new AIMoveExecutor(
  bedrockService,
  new GameRepository(),
  new MoveRepository(docClient, TABLE_NAME)
);

// VoteTallyService の初期化（Lambda実行環境で1度だけ）
// Requirements: 7.3
const voteTallyService = new VoteTallyService(
  new GameRepository(),
  new CandidateRepository(docClient, TABLE_NAME),
  new MoveRepository(docClient, TABLE_NAME)
);

// CommentaryGenerator の初期化（Lambda実行環境で1度だけ）
// Requirements: 9.1, 9.2, 9.3
const commentaryGenerator = new CommentaryGenerator(
  bedrockService,
  new GameRepository(),
  new CommentaryRepository(docClient, TABLE_NAME),
  docClient,
  TABLE_NAME
);

/**
 * 日次バッチ処理
 * - 投票集計
 * - 次の一手決定
 * - 次の一手候補のAI生成
 * - 対局解説のAI生成
 */
export const handler: ScheduledHandler = async (event) => {
  console.log('Batch process started', { event });

  try {
    // 投票集計処理
    // Requirements: 7.1, 7.2
    try {
      const voteTallySummary = await voteTallyService.tallyVotes();
      console.log('Vote tally completed', voteTallySummary);
    } catch (voteTallyError) {
      console.error('Vote tally failed', voteTallyError);
      // 後続処理は継続
    }

    // AI手実行処理（投票集計後、候補生成前に実行）
    try {
      const aiMoveSummary = await aiMoveExecutor.executeAIMoves();
      console.log('AI move execution completed', aiMoveSummary);
    } catch (aiMoveError) {
      console.error('AI move execution failed', aiMoveError);
      // 後続処理は継続
    }

    // AI候補生成処理
    // Requirements: 1.1, 8.1, 8.4
    try {
      const candidateSummary = await candidateGenerator.generateCandidates();
      console.log(
        JSON.stringify({
          type: 'BATCH_CANDIDATE_GENERATION_COMPLETED',
          ...candidateSummary,
        })
      );
    } catch (candidateError) {
      console.error(
        JSON.stringify({
          type: 'BATCH_CANDIDATE_GENERATION_FAILED',
          error: candidateError instanceof Error ? candidateError.message : 'Unknown error',
        })
      );
      // 後続処理は継続
    }

    // AI対局解説生成処理（候補生成の後に実行）
    // Requirements: 9.1, 9.2, 9.3, 9.4
    try {
      const commentarySummary = await commentaryGenerator.generateCommentaries();
      console.log('Commentary generation completed', commentarySummary);
    } catch (commentaryError) {
      console.error('Commentary generation failed', commentaryError);
    }
  } catch (error) {
    console.error('Batch process failed', error);
    throw error;
  }
};
