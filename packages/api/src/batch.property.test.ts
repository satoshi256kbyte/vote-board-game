/**
 * batch.ts プロパティベーステスト
 *
 * Feature: 33-ai-candidate-generation-batch, Property 2: バッチハンドラーのサービスエラー隔離
 * Feature: 33-ai-candidate-generation-batch, Property 3: バッチ処理の実行順序保証
 *
 * Validates: Requirements 2.1, 2.2, 3.1, 3.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';

// 呼び出し順序を追跡する配列
const callOrder: string[] = [];

// --- モック定義 ---

vi.mock('./lib/dynamodb.js', () => ({
  docClient: {},
  TABLE_NAME: 'test-table',
}));

vi.mock('./lib/dynamodb/repositories/game.js', () => ({
  GameRepository: vi.fn().mockImplementation(() => ({})),
}));
vi.mock('./lib/dynamodb/repositories/candidate.js', () => ({
  CandidateRepository: vi.fn().mockImplementation(() => ({})),
}));
vi.mock('./lib/dynamodb/repositories/commentary.js', () => ({
  CommentaryRepository: vi.fn().mockImplementation(() => ({})),
}));
vi.mock('./lib/dynamodb/repositories/move.js', () => ({
  MoveRepository: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('./services/bedrock/index.js', () => ({
  BedrockClient: { getInstance: vi.fn().mockReturnValue({}) },
  BedrockService: vi.fn().mockImplementation(() => ({})),
  RetryHandler: vi.fn().mockImplementation(() => ({})),
  TokenCounter: vi.fn().mockImplementation(() => ({})),
  loadBedrockConfig: vi.fn().mockReturnValue({ region: 'ap-northeast-1' }),
}));

const mockTallyVotes = vi.fn();
vi.mock('./services/vote-tally/index.js', () => ({
  VoteTallyService: vi.fn().mockImplementation(() => ({
    tallyVotes: mockTallyVotes,
  })),
}));

const mockExecuteAIMoves = vi.fn();
vi.mock('./services/ai-move-executor/index.js', () => ({
  AIMoveExecutor: vi.fn().mockImplementation(() => ({
    executeAIMoves: mockExecuteAIMoves,
  })),
}));

const mockGenerateCandidates = vi.fn();
vi.mock('./services/candidate-generator/index.js', () => ({
  CandidateGenerator: vi.fn().mockImplementation(() => ({
    generateCandidates: mockGenerateCandidates,
  })),
}));

const mockGenerateCommentaries = vi.fn();
vi.mock('./services/commentary-generator/index.js', () => ({
  CommentaryGenerator: vi.fn().mockImplementation(() => ({
    generateCommentaries: mockGenerateCommentaries,
  })),
}));

const SERVICE_NAMES = [
  'tallyVotes',
  'executeAIMoves',
  'generateCandidates',
  'generateCommentaries',
] as const;

const allMocks = () => [
  mockTallyVotes,
  mockExecuteAIMoves,
  mockGenerateCandidates,
  mockGenerateCommentaries,
];

/**
 * 成功/失敗パターンに基づいてモックをセットアップする
 */
function setupMocks(pattern: readonly [boolean, boolean, boolean, boolean]): void {
  const mocks = allMocks();
  pattern.forEach((shouldSucceed, index) => {
    const name = SERVICE_NAMES[index];
    mocks[index].mockImplementation(async () => {
      callOrder.push(name);
      if (!shouldSucceed) {
        throw new Error(`${name} failed`);
      }
      return {
        totalGames: 0,
        successCount: 0,
        failedCount: 0,
        skippedCount: 0,
        results: [],
      };
    });
  });
}

/**
 * 4つのサービスの成功/失敗パターンを表すアービトラリ
 */
const servicePatternArb = fc.tuple(fc.boolean(), fc.boolean(), fc.boolean(), fc.boolean());

describe('batch handler プロパティベーステスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callOrder.length = 0;
  });

  /**
   * Feature: 33-ai-candidate-generation-batch, Property 2: バッチハンドラーのサービスエラー隔離
   *
   * 4つのサービスの成功/失敗パターン（2^4 = 16通り）を生成し、
   * 失敗サービスの後続サービスが全て実行されることを検証
   *
   * Validates: Requirements 2.1, 2.2, 3.2
   */
  it('Property 2: 任意の成功/失敗パターンにおいて、全4サービスが実行される', async () => {
    const { handler } = await import('./batch.js');

    // fc.property で生成したパターンを fc.sample で取得し、各パターンを検証
    const patterns = fc.sample(servicePatternArb, { numRuns: 10 });

    for (const pattern of patterns) {
      vi.clearAllMocks();
      callOrder.length = 0;

      setupMocks(pattern);

      await handler({} as never, {} as never, () => {});

      // 全4サービスが呼び出されたことを検証
      expect(mockTallyVotes).toHaveBeenCalledTimes(1);
      expect(mockExecuteAIMoves).toHaveBeenCalledTimes(1);
      expect(mockGenerateCandidates).toHaveBeenCalledTimes(1);
      expect(mockGenerateCommentaries).toHaveBeenCalledTimes(1);

      // callOrder に全4サービスが含まれることを検証
      expect(callOrder).toHaveLength(4);
      for (const name of SERVICE_NAMES) {
        expect(callOrder).toContain(name);
      }
    }
  });

  /**
   * Feature: 33-ai-candidate-generation-batch, Property 3: バッチ処理の実行順序保証
   *
   * 任意のバッチ実行において、呼び出し順序が
   * VoteTallyService → AIMoveExecutor → CandidateGenerator → CommentaryGenerator
   * であることを検証
   *
   * Validates: Requirements 3.1
   */
  it('Property 3: 任意の成功/失敗パターンにおいて、実行順序が保証される', async () => {
    const { handler } = await import('./batch.js');

    const patterns = fc.sample(servicePatternArb, { numRuns: 10 });

    for (const pattern of patterns) {
      vi.clearAllMocks();
      callOrder.length = 0;

      setupMocks(pattern);

      await handler({} as never, {} as never, () => {});

      // 実行順序が厳密に VoteTallyService → AIMoveExecutor → CandidateGenerator → CommentaryGenerator
      expect(callOrder).toEqual([
        'tallyVotes',
        'executeAIMoves',
        'generateCandidates',
        'generateCommentaries',
      ]);

      // インデックスベースでも順序を検証
      const tallyIdx = callOrder.indexOf('tallyVotes');
      const aiMoveIdx = callOrder.indexOf('executeAIMoves');
      const candidateIdx = callOrder.indexOf('generateCandidates');
      const commentaryIdx = callOrder.indexOf('generateCommentaries');

      expect(tallyIdx).toBeLessThan(aiMoveIdx);
      expect(aiMoveIdx).toBeLessThan(candidateIdx);
      expect(candidateIdx).toBeLessThan(commentaryIdx);
    }
  });
});
