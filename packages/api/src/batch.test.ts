/**
 * batch.ts 統合テスト
 *
 * VoteTallyService が AIMoveExecutor の前に実行されること、
 * VoteTallyService の失敗時に後続処理が継続することを検証する。
 *
 * Validates: Requirements 7.1, 7.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// 呼び出し順序を追跡する配列
const callOrder: string[] = [];

// --- モック定義 ---

// DynamoDB モック
vi.mock('./lib/dynamodb.js', () => ({
  docClient: {},
  TABLE_NAME: 'test-table',
}));

// リポジトリモック
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

// Bedrock モック
vi.mock('./services/bedrock/index.js', () => ({
  BedrockClient: { getInstance: vi.fn().mockReturnValue({}) },
  BedrockService: vi.fn().mockImplementation(() => ({})),
  RetryHandler: vi.fn().mockImplementation(() => ({})),
  TokenCounter: vi.fn().mockImplementation(() => ({})),
  loadBedrockConfig: vi.fn().mockReturnValue({ region: 'ap-northeast-1' }),
}));

// VoteTallyService モック
const mockTallyVotes = vi.fn();
vi.mock('./services/vote-tally/index.js', () => ({
  VoteTallyService: vi.fn().mockImplementation(() => ({
    tallyVotes: mockTallyVotes,
  })),
}));

// AIMoveExecutor モック
const mockExecuteAIMoves = vi.fn();
vi.mock('./services/ai-move-executor/index.js', () => ({
  AIMoveExecutor: vi.fn().mockImplementation(() => ({
    executeAIMoves: mockExecuteAIMoves,
  })),
}));

// CandidateGenerator モック
const mockGenerateCandidates = vi.fn();
vi.mock('./services/candidate-generator/index.js', () => ({
  CandidateGenerator: vi.fn().mockImplementation(() => ({
    generateCandidates: mockGenerateCandidates,
  })),
}));

// CommentaryGenerator モック
const mockGenerateCommentaries = vi.fn();
vi.mock('./services/commentary-generator/index.js', () => ({
  CommentaryGenerator: vi.fn().mockImplementation(() => ({
    generateCommentaries: mockGenerateCommentaries,
  })),
}));

// GameStateUpdater モック
const mockUpdateGameStates = vi.fn();
vi.mock('./services/game-state-updater/index.js', () => ({
  GameStateUpdater: vi.fn().mockImplementation(() => ({
    updateGameStates: mockUpdateGameStates,
  })),
}));

describe('batch handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callOrder.length = 0;

    // 各モックが呼ばれた順序を記録
    mockTallyVotes.mockImplementation(async () => {
      callOrder.push('tallyVotes');
      return {
        totalGames: 1,
        successCount: 1,
        failedCount: 0,
        skippedCount: 0,
        passedCount: 0,
        finishedCount: 0,
        results: [],
      };
    });
    mockExecuteAIMoves.mockImplementation(async () => {
      callOrder.push('executeAIMoves');
      return { totalGames: 0, results: [] };
    });
    mockGenerateCandidates.mockImplementation(async () => {
      callOrder.push('generateCandidates');
      return { totalGames: 0, results: [] };
    });
    mockGenerateCommentaries.mockImplementation(async () => {
      callOrder.push('generateCommentaries');
      return { totalGames: 0, results: [] };
    });
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
  });

  it('VoteTallyService が AIMoveExecutor の前に実行される', async () => {
    const { handler } = await import('./batch.js');

    await handler({} as never, {} as never, () => {});

    expect(mockTallyVotes).toHaveBeenCalledTimes(1);
    expect(mockExecuteAIMoves).toHaveBeenCalledTimes(1);

    const tallyIndex = callOrder.indexOf('tallyVotes');
    const aiMoveIndex = callOrder.indexOf('executeAIMoves');
    expect(tallyIndex).toBeLessThan(aiMoveIndex);
  });

  it('VoteTallyService の失敗時に後続処理が継続する', async () => {
    mockTallyVotes.mockImplementation(async () => {
      callOrder.push('tallyVotes');
      throw new Error('Vote tally failed');
    });

    const { handler } = await import('./batch.js');

    await handler({} as never, {} as never, () => {});

    expect(mockTallyVotes).toHaveBeenCalledTimes(1);
    expect(mockExecuteAIMoves).toHaveBeenCalledTimes(1);
    expect(mockGenerateCandidates).toHaveBeenCalledTimes(1);
    expect(mockGenerateCommentaries).toHaveBeenCalledTimes(1);
    expect(mockUpdateGameStates).toHaveBeenCalledTimes(1);

    // 失敗後も後続サービスが順番通り実行される
    expect(callOrder).toEqual([
      'tallyVotes',
      'executeAIMoves',
      'generateCandidates',
      'generateCommentaries',
      'updateGameStates',
    ]);
  });

  it('全サービスが正常に呼び出される', async () => {
    const { handler } = await import('./batch.js');

    await handler({} as never, {} as never, () => {});

    expect(mockTallyVotes).toHaveBeenCalledTimes(1);
    expect(mockExecuteAIMoves).toHaveBeenCalledTimes(1);
    expect(mockGenerateCandidates).toHaveBeenCalledTimes(1);
    expect(mockGenerateCommentaries).toHaveBeenCalledTimes(1);
    expect(mockUpdateGameStates).toHaveBeenCalledTimes(1);

    expect(callOrder).toEqual([
      'tallyVotes',
      'executeAIMoves',
      'generateCandidates',
      'generateCommentaries',
      'updateGameStates',
    ]);
  });

  /**
   * CandidateGenerator エラー隔離テスト
   * Validates: Requirements 2.1, 2.2
   */
  it('CandidateGenerator の失敗時に CommentaryGenerator が実行される', async () => {
    mockGenerateCandidates.mockImplementation(async () => {
      callOrder.push('generateCandidates');
      throw new Error('Candidate generation failed');
    });

    const { handler } = await import('./batch.js');

    await handler({} as never, {} as never, () => {});

    expect(mockGenerateCandidates).toHaveBeenCalledTimes(1);
    expect(mockGenerateCommentaries).toHaveBeenCalledTimes(1);
    expect(mockUpdateGameStates).toHaveBeenCalledTimes(1);

    // CandidateGenerator が失敗しても CommentaryGenerator は実行される
    expect(callOrder).toEqual([
      'tallyVotes',
      'executeAIMoves',
      'generateCandidates',
      'generateCommentaries',
      'updateGameStates',
    ]);
  });

  /**
   * AIMoveExecutor エラー隔離テスト
   * Validates: Requirements 3.2
   */
  it('AIMoveExecutor の失敗時に CandidateGenerator と CommentaryGenerator が実行される', async () => {
    mockExecuteAIMoves.mockImplementation(async () => {
      callOrder.push('executeAIMoves');
      throw new Error('AI move execution failed');
    });

    const { handler } = await import('./batch.js');

    await handler({} as never, {} as never, () => {});

    expect(mockExecuteAIMoves).toHaveBeenCalledTimes(1);
    expect(mockGenerateCandidates).toHaveBeenCalledTimes(1);
    expect(mockGenerateCommentaries).toHaveBeenCalledTimes(1);
    expect(mockUpdateGameStates).toHaveBeenCalledTimes(1);

    // AIMoveExecutor が失敗しても後続の CandidateGenerator と CommentaryGenerator は実行される
    expect(callOrder).toEqual([
      'tallyVotes',
      'executeAIMoves',
      'generateCandidates',
      'generateCommentaries',
      'updateGameStates',
    ]);
  });

  /**
   * 全サービスの実行順序保証テスト
   * Validates: Requirements 3.1
   */
  it('全サービスの実行順序が VoteTallyService → AIMoveExecutor → CandidateGenerator → CommentaryGenerator である', async () => {
    const { handler } = await import('./batch.js');

    await handler({} as never, {} as never, () => {});

    // 実行順序を厳密に検証
    expect(callOrder).toEqual([
      'tallyVotes',
      'executeAIMoves',
      'generateCandidates',
      'generateCommentaries',
      'updateGameStates',
    ]);

    // インデックスベースでも順序を検証
    const tallyIndex = callOrder.indexOf('tallyVotes');
    const aiMoveIndex = callOrder.indexOf('executeAIMoves');
    const candidateIndex = callOrder.indexOf('generateCandidates');
    const commentaryIndex = callOrder.indexOf('generateCommentaries');

    expect(tallyIndex).toBeLessThan(aiMoveIndex);
    expect(aiMoveIndex).toBeLessThan(candidateIndex);
    expect(candidateIndex).toBeLessThan(commentaryIndex);
  });

  /**
   * GameStateUpdater が CommentaryGenerator の後に実行されるテスト
   * Validates: Requirements 5.1
   */
  it('GameStateUpdater が CommentaryGenerator の後に実行される', async () => {
    const { handler } = await import('./batch.js');

    await handler({} as never, {} as never, () => {});

    expect(mockGenerateCommentaries).toHaveBeenCalledTimes(1);
    expect(mockUpdateGameStates).toHaveBeenCalledTimes(1);

    const commentaryIndex = callOrder.indexOf('generateCommentaries');
    const gameStateIndex = callOrder.indexOf('updateGameStates');
    expect(commentaryIndex).toBeLessThan(gameStateIndex);
  });

  /**
   * GameStateUpdater の失敗時にエラーログが出力されるテスト
   * Validates: Requirements 5.2
   */
  it('GameStateUpdater の失敗時に BATCH_GAME_STATE_UPDATE_FAILED エラーログが出力される', async () => {
    mockUpdateGameStates.mockImplementation(async () => {
      callOrder.push('updateGameStates');
      throw new Error('Game state update failed');
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { handler } = await import('./batch.js');

    await handler({} as never, {} as never, () => {});

    expect(mockUpdateGameStates).toHaveBeenCalledTimes(1);

    // BATCH_GAME_STATE_UPDATE_FAILED ログが出力されること
    const errorCalls = consoleSpy.mock.calls.map((call) => {
      try {
        return JSON.parse(call[0] as string);
      } catch {
        return null;
      }
    });
    const failedLog = errorCalls.find((log) => log?.type === 'BATCH_GAME_STATE_UPDATE_FAILED');
    expect(failedLog).toBeDefined();
    expect(failedLog.error).toBe('Game state update failed');

    consoleSpy.mockRestore();
  });

  /**
   * 5つのサービスの実行順序保証テスト
   * Validates: Requirements 5.1, 5.4
   */
  it('5つのサービスの実行順序が VoteTallyService → AIMoveExecutor → CandidateGenerator → CommentaryGenerator → GameStateUpdater である', async () => {
    const { handler } = await import('./batch.js');

    await handler({} as never, {} as never, () => {});

    // 5つ全てのサービスが呼び出されること
    expect(mockTallyVotes).toHaveBeenCalledTimes(1);
    expect(mockExecuteAIMoves).toHaveBeenCalledTimes(1);
    expect(mockGenerateCandidates).toHaveBeenCalledTimes(1);
    expect(mockGenerateCommentaries).toHaveBeenCalledTimes(1);
    expect(mockUpdateGameStates).toHaveBeenCalledTimes(1);

    // 実行順序を厳密に検証
    expect(callOrder).toEqual([
      'tallyVotes',
      'executeAIMoves',
      'generateCandidates',
      'generateCommentaries',
      'updateGameStates',
    ]);

    // インデックスベースでも全5サービスの順序を検証
    const tallyIndex = callOrder.indexOf('tallyVotes');
    const aiMoveIndex = callOrder.indexOf('executeAIMoves');
    const candidateIndex = callOrder.indexOf('generateCandidates');
    const commentaryIndex = callOrder.indexOf('generateCommentaries');
    const gameStateIndex = callOrder.indexOf('updateGameStates');

    expect(tallyIndex).toBeLessThan(aiMoveIndex);
    expect(aiMoveIndex).toBeLessThan(candidateIndex);
    expect(candidateIndex).toBeLessThan(commentaryIndex);
    expect(commentaryIndex).toBeLessThan(gameStateIndex);
  });
});
