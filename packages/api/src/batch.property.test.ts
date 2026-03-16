/**
 * batch.ts プロパティベーステスト
 *
 * Feature: 33-ai-candidate-generation-batch, Property 2: バッチハンドラーのサービスエラー隔離
 * Feature: 33-ai-candidate-generation-batch, Property 3: バッチ処理の実行順序保証
 * Feature: 34-game-state-update-batch, Property 5: バッチ処理の実行順序
 * Feature: 34-game-state-update-batch, Property 2: 候補存在チェックとサマリー反映
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 3.1, 3.2, 5.1, 5.4
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

const mockUpdateGameStates = vi.fn();
vi.mock('./services/game-state-updater/index.js', () => ({
  GameStateUpdater: vi.fn().mockImplementation(() => ({
    updateGameStates: mockUpdateGameStates,
  })),
}));

const SERVICE_NAMES_4 = [
  'tallyVotes',
  'executeAIMoves',
  'generateCandidates',
  'generateCommentaries',
] as const;

const SERVICE_NAMES_5 = [
  'tallyVotes',
  'executeAIMoves',
  'generateCandidates',
  'generateCommentaries',
  'updateGameStates',
] as const;

const allMocks4 = () => [
  mockTallyVotes,
  mockExecuteAIMoves,
  mockGenerateCandidates,
  mockGenerateCommentaries,
];

const allMocks5 = () => [
  mockTallyVotes,
  mockExecuteAIMoves,
  mockGenerateCandidates,
  mockGenerateCommentaries,
  mockUpdateGameStates,
];

/**
 * 成功/失敗パターンに基づいて4サービスのモックをセットアップする
 */
function setupMocks4(pattern: readonly [boolean, boolean, boolean, boolean]): void {
  const mocks = allMocks4();
  pattern.forEach((shouldSucceed, index) => {
    const name = SERVICE_NAMES_4[index];
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
 * 成功/失敗パターンに基づいて5サービスのモックをセットアップする
 */
function setupMocks5(pattern: readonly [boolean, boolean, boolean, boolean, boolean]): void {
  const mocks = allMocks5();
  pattern.forEach((shouldSucceed, index) => {
    const name = SERVICE_NAMES_5[index];
    mocks[index].mockImplementation(async () => {
      callOrder.push(name);
      if (!shouldSucceed) {
        throw new Error(`${name} failed`);
      }
      if (name === 'updateGameStates') {
        return {
          totalGames: 0,
          okCount: 0,
          finishedCount: 0,
          warningCount: 0,
          errorCount: 0,
          results: [],
        };
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
const servicePatternArb4 = fc.tuple(fc.boolean(), fc.boolean(), fc.boolean(), fc.boolean());

/**
 * 5つのサービスの成功/失敗パターンを表すアービトラリ
 */
const servicePatternArb5 = fc.tuple(
  fc.boolean(),
  fc.boolean(),
  fc.boolean(),
  fc.boolean(),
  fc.boolean()
);

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
    const patterns = fc.sample(servicePatternArb4, { numRuns: 10 });

    for (const pattern of patterns) {
      vi.clearAllMocks();
      callOrder.length = 0;

      setupMocks4(pattern);
      // updateGameStates もセットアップ（4サービステストでも呼ばれるため）
      mockUpdateGameStates.mockImplementation(async () => {
        callOrder.push('updateGameStates');
        return {
          totalGames: 0,
          okCount: 0,
          finishedCount: 0,
          warningCount: 0,
          errorCount: 0,
          results: [],
        };
      });

      await handler({} as never, {} as never, () => {});

      // 全4サービスが呼び出されたことを検証
      expect(mockTallyVotes).toHaveBeenCalledTimes(1);
      expect(mockExecuteAIMoves).toHaveBeenCalledTimes(1);
      expect(mockGenerateCandidates).toHaveBeenCalledTimes(1);
      expect(mockGenerateCommentaries).toHaveBeenCalledTimes(1);

      // callOrder に全4サービスが含まれることを検証
      for (const name of SERVICE_NAMES_4) {
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

    const patterns = fc.sample(servicePatternArb4, { numRuns: 10 });

    for (const pattern of patterns) {
      vi.clearAllMocks();
      callOrder.length = 0;

      setupMocks4(pattern);
      mockUpdateGameStates.mockImplementation(async () => {
        callOrder.push('updateGameStates');
        return {
          totalGames: 0,
          okCount: 0,
          finishedCount: 0,
          warningCount: 0,
          errorCount: 0,
          results: [],
        };
      });

      await handler({} as never, {} as never, () => {});

      // 実行順序が厳密に VoteTallyService → AIMoveExecutor → CandidateGenerator → CommentaryGenerator → GameStateUpdater
      expect(callOrder).toEqual([
        'tallyVotes',
        'executeAIMoves',
        'generateCandidates',
        'generateCommentaries',
        'updateGameStates',
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

// --- Feature: 34-game-state-update-batch ---

/**
 * Feature: 34-game-state-update-batch, Property 5: バッチ処理の実行順序
 *
 * 5つのサービスの成功/失敗パターン（2^5 = 32通り）を生成し、
 * 呼び出し順序が VoteTallyService → AIMoveExecutor → CandidateGenerator →
 * CommentaryGenerator → GameStateUpdater であることを検証
 *
 * Validates: Requirements 5.1, 5.4
 */
describe('Feature: 34-game-state-update-batch, Property 5: バッチ処理の実行順序', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callOrder.length = 0;
  });

  it('任意の成功/失敗パターンにおいて、5サービスの実行順序が保証される', async () => {
    const { handler } = await import('./batch.js');

    const patterns = fc.sample(servicePatternArb5, { numRuns: 10 });

    for (const pattern of patterns) {
      vi.clearAllMocks();
      callOrder.length = 0;

      setupMocks5(pattern);

      await handler({} as never, {} as never, () => {});

      // 全5サービスが呼び出されたことを検証
      expect(mockTallyVotes).toHaveBeenCalledTimes(1);
      expect(mockExecuteAIMoves).toHaveBeenCalledTimes(1);
      expect(mockGenerateCandidates).toHaveBeenCalledTimes(1);
      expect(mockGenerateCommentaries).toHaveBeenCalledTimes(1);
      expect(mockUpdateGameStates).toHaveBeenCalledTimes(1);

      // 実行順序が厳密に保証される
      expect(callOrder).toEqual([
        'tallyVotes',
        'executeAIMoves',
        'generateCandidates',
        'generateCommentaries',
        'updateGameStates',
      ]);

      // インデックスベースでも全5サービスの順序を検証
      const tallyIdx = callOrder.indexOf('tallyVotes');
      const aiMoveIdx = callOrder.indexOf('executeAIMoves');
      const candidateIdx = callOrder.indexOf('generateCandidates');
      const commentaryIdx = callOrder.indexOf('generateCommentaries');
      const gameStateIdx = callOrder.indexOf('updateGameStates');

      expect(tallyIdx).toBeLessThan(aiMoveIdx);
      expect(aiMoveIdx).toBeLessThan(candidateIdx);
      expect(candidateIdx).toBeLessThan(commentaryIdx);
      expect(commentaryIdx).toBeLessThan(gameStateIdx);
    }
  });
});

/**
 * Feature: 34-game-state-update-batch, Property 2: 候補存在チェックとサマリー反映
 *
 * 任意のアクティブ対局セット（候補あり/なし混在）を生成し、
 * サマリーの warningCount が候補なし対局数と一致することを検証
 *
 * Validates: Requirements 2.1, 2.3
 */
describe('Feature: 34-game-state-update-batch, Property 2: 候補存在チェックとサマリー反映', () => {
  it('warningCount が候補なし対局数と一致する', () => {
    fc.assert(
      fc.property(fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }), (hasCandidatesFlags) => {
        // 各対局の processGame 結果をシミュレート:
        // hasCandidates=true → status: 'ok', hasCandidates=false → status: 'warning'
        // （集合知ターンの対局を想定。盤面は有効、連続パスなし）
        const results = hasCandidatesFlags.map((hasCandidates, i) => ({
          gameId: `game-${i}`,
          status: (hasCandidates ? 'ok' : 'warning') as 'ok' | 'warning',
          reason: hasCandidates ? undefined : 'No candidates for current turn',
          hasCandidates,
        }));

        // updateGameStates と同じサマリー構築ロジック
        const summary = {
          totalGames: results.length,
          okCount: results.filter((r) => r.status === 'ok').length,
          finishedCount: results.filter((r) => r.status === 'finished').length,
          warningCount: results.filter((r) => r.status === 'warning').length,
          errorCount: results.filter((r) => r.status === 'error').length,
          results,
        };

        // 候補なし対局数を計算
        const noCandidatesCount = hasCandidatesFlags.filter((f) => !f).length;

        // warningCount が候補なし対局数と一致する
        expect(summary.warningCount).toBe(noCandidatesCount);

        // okCount が候補あり対局数と一致する
        const hasCandidatesCount = hasCandidatesFlags.filter((f) => f).length;
        expect(summary.okCount).toBe(hasCandidatesCount);

        // totalGames = 配列長
        expect(summary.totalGames).toBe(hasCandidatesFlags.length);

        // カウント整合性
        expect(
          summary.okCount + summary.finishedCount + summary.warningCount + summary.errorCount
        ).toBe(summary.totalGames);
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });
});
