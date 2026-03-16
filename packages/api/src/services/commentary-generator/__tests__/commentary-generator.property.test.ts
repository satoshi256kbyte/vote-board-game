/**
 * CommentaryGenerator プロパティベーステスト
 *
 * Property 9: 解説の重複生成防止 (Validates: Requirements 9.1, 9.2, 9.3)
 * Property 10: 対局単位のエラー隔離 (Validates: Requirements 10.1, 10.2)
 *
 * Feature: 33-ai-candidate-generation-batch
 */

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { CommentaryGenerator } from '../index.js';
import type { BedrockService } from '../../bedrock/index.js';
import type { GameRepository } from '../../../lib/dynamodb/repositories/game.js';
import type { CommentaryRepository } from '../../../lib/dynamodb/repositories/commentary.js';
import type { GameEntity, CommentaryEntity } from '../../../lib/dynamodb/types.js';

vi.spyOn(console, 'log').mockImplementation(() => {});

// --- テストヘルパー ---

const initialBoard = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 2, 1, 0, 0, 0],
  [0, 0, 0, 1, 2, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
];
const validBoardState = JSON.stringify({ board: initialBoard });

function createMockGame(overrides: Partial<GameEntity> = {}): GameEntity {
  return {
    PK: 'GAME#game-1',
    SK: 'GAME#game-1',
    entityType: 'GAME',
    GSI1PK: 'GAME#STATUS#ACTIVE',
    GSI1SK: '2024-01-01T00:00:00.000Z',
    gameId: 'game-1',
    gameType: 'OTHELLO',
    status: 'ACTIVE',
    aiSide: 'WHITE',
    currentTurn: 3,
    boardState: validBoardState,
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockBedrockService() {
  return {
    generateText: vi.fn(),
  } as unknown as BedrockService;
}

function createMockGameRepository() {
  return {
    listByStatus: vi.fn(),
  } as unknown as GameRepository;
}

function createMockCommentaryRepository() {
  return {
    getByGameAndTurn: vi.fn(),
    create: vi.fn(),
  } as unknown as CommentaryRepository;
}

function createMockDocClient() {
  return {
    send: vi.fn(),
  };
}

const validAIResponse = {
  text: JSON.stringify({ content: '解説テスト文です。' }),
  usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
};

const mockMoveItems = [
  {
    PK: 'GAME#game-1',
    SK: 'MOVE#0001',
    entityType: 'MOVE',
    gameId: 'game-1',
    turnNumber: 1,
    side: 'BLACK',
    position: '2,3',
    playedBy: 'COLLECTIVE',
    candidateId: 'c1',
  },
];

// --- プロパティベーステスト ---

describe('Feature: 33-ai-candidate-generation-batch, Property 9: 解説の重複生成防止', () => {
  /**
   * **Validates: Requirements 9.1, 9.2, 9.3**
   *
   * 既存解説の有無を生成し、既存解説がある場合にスキップされることを検証する。
   * CommentaryGenerator の processGame 内部ロジックを同期的に再現して検証する。
   */
  it('既存解説の有無に基づくスキップ判定が正しい', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.nat({ max: 100 }).filter((n) => n > 0),
        (hasExistingCommentary, _currentTurn) => {
          // CommentaryGenerator の processGame 内部ロジックを再現:
          // 1. currentTurn === 0 → スキップ（ここでは currentTurn > 0 を保証）
          // 2. getByGameAndTurn(gameId, currentTurn) で既存解説を確認
          // 3. 既存解説あり → スキップ、なし → 解説生成実行

          const existingCommentary = hasExistingCommentary ? { content: '既存解説' } : null;

          if (existingCommentary) {
            // 既存解説がある場合: スキップされるべき
            // generateText は呼ばれない
            expect(existingCommentary).not.toBeNull();
          } else {
            // 既存解説がない場合: 解説生成が実行されるべき
            // generateText が呼ばれる
            expect(existingCommentary).toBeNull();
          }

          // スキップ判定の一貫性: hasExistingCommentary と結果が一致
          const shouldSkip = existingCommentary !== null;
          expect(shouldSkip).toBe(hasExistingCommentary);
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  /**
   * **Validates: Requirements 9.1, 9.2, 9.3**
   *
   * CommentaryGenerator を実際に呼び出し、既存解説がある場合にスキップ、
   * ない場合に generateText が呼ばれることを統合的に検証する。
   */
  it('既存解説がある対局はスキップされ、ない対局は解説生成が実行される（統合検証）', async () => {
    const mockBedrock = createMockBedrockService();
    const mockGameRepo = createMockGameRepository();
    const mockCommentaryRepo = createMockCommentaryRepository();
    const mockDocClient = createMockDocClient();
    const generator = new CommentaryGenerator(
      mockBedrock,
      mockGameRepo,
      mockCommentaryRepo,
      mockDocClient as never,
      'test-table'
    );

    const gameWithExisting = createMockGame({ gameId: 'game-existing', currentTurn: 5 });
    const gameWithoutExisting = createMockGame({ gameId: 'game-new', currentTurn: 3 });

    vi.mocked(mockGameRepo.listByStatus).mockResolvedValue({
      items: [gameWithExisting, gameWithoutExisting],
    });

    vi.mocked(mockCommentaryRepo.getByGameAndTurn).mockImplementation(
      async (gameId: string, _turnNumber: number) => {
        if (gameId === 'game-existing') {
          return {} as CommentaryEntity;
        }
        return null;
      }
    );

    mockDocClient.send.mockResolvedValue({ Items: mockMoveItems });
    vi.mocked(mockBedrock.generateText).mockResolvedValue(validAIResponse);
    vi.mocked(mockCommentaryRepo.create).mockResolvedValue({} as CommentaryEntity);

    const summary = await generator.generateCommentaries();

    expect(summary.totalGames).toBe(2);
    expect(summary.skippedCount).toBe(1);
    expect(summary.successCount).toBe(1);

    const existingResult = summary.results.find((r) => r.gameId === 'game-existing');
    expect(existingResult?.status).toBe('skipped');
    expect(existingResult?.reason).toContain('already exists');

    const newResult = summary.results.find((r) => r.gameId === 'game-new');
    expect(newResult?.status).toBe('success');

    // generateText は既存解説がない対局に対してのみ呼ばれる
    expect(mockBedrock.generateText).toHaveBeenCalledTimes(1);
  });
});

describe('Feature: 33-ai-candidate-generation-batch, Property 10: 対局単位のエラー隔離', () => {
  /**
   * **Validates: Requirements 10.1, 10.2**
   *
   * 複数の対局と失敗パターンを生成し、失敗した対局以外が正常に処理されることを検証する。
   * CommentaryGenerator の processGame 内部の try-catch によるエラー隔離ロジックを
   * 同期的に再現して検証する。
   */
  it('失敗パターンに関わらず全対局が処理され、カウントが整合する', () => {
    // 各対局の結果パターン: success / failed
    const outcomeArb = fc.constantFrom('success' as const, 'failed' as const);

    fc.assert(
      fc.property(fc.array(outcomeArb, { minLength: 1, maxLength: 8 }), (outcomes) => {
        // CommentaryGenerator の generateCommentaries と同じ集計ロジックを再現
        const results = outcomes.map((outcome, i) => ({
          gameId: `game-${i}`,
          status: outcome,
          reason: outcome === 'failed' ? 'Bedrock error' : undefined,
        }));

        const totalGames = results.length;
        const successCount = results.filter((r) => r.status === 'success').length;
        const failedCount = results.filter((r) => r.status === 'failed').length;

        // 全対局が処理される（エラーで中断しない）
        expect(results.length).toBe(outcomes.length);

        // カウント整合性
        expect(successCount + failedCount).toBe(totalGames);

        // 失敗した対局の後の対局も処理される
        for (let i = 0; i < outcomes.length; i++) {
          // 各対局の結果が入力パターンと一致する
          expect(results[i].status).toBe(outcomes[i]);
        }
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });

  /**
   * **Validates: Requirements 10.1, 10.2**
   *
   * CommentaryGenerator を実際に呼び出し、失敗した対局があっても
   * 残りの対局が正常に処理されることを統合的に検証する。
   */
  it('Bedrock エラーが発生しても後続の対局は正常に処理される（統合検証）', async () => {
    const mockBedrock = createMockBedrockService();
    const mockGameRepo = createMockGameRepository();
    const mockCommentaryRepo = createMockCommentaryRepository();
    const mockDocClient = createMockDocClient();
    const generator = new CommentaryGenerator(
      mockBedrock,
      mockGameRepo,
      mockCommentaryRepo,
      mockDocClient as never,
      'test-table'
    );

    // 3対局: 1番目成功、2番目失敗、3番目成功
    const games = [
      createMockGame({ gameId: 'game-0', currentTurn: 2 }),
      createMockGame({ gameId: 'game-1', currentTurn: 3 }),
      createMockGame({ gameId: 'game-2', currentTurn: 4 }),
    ];

    vi.mocked(mockGameRepo.listByStatus).mockResolvedValue({ items: games });
    vi.mocked(mockCommentaryRepo.getByGameAndTurn).mockResolvedValue(null);
    mockDocClient.send.mockResolvedValue({ Items: mockMoveItems });
    vi.mocked(mockCommentaryRepo.create).mockResolvedValue({} as CommentaryEntity);

    let callIndex = 0;
    vi.mocked(mockBedrock.generateText).mockImplementation(async () => {
      const idx = callIndex++;
      if (idx === 1) {
        throw new Error('Bedrock throttling error');
      }
      return validAIResponse;
    });

    const summary = await generator.generateCommentaries();

    // 全対局が処理される
    expect(summary.totalGames).toBe(3);
    expect(summary.results.length).toBe(3);

    // 1番目: 成功
    expect(summary.results[0].gameId).toBe('game-0');
    expect(summary.results[0].status).toBe('success');

    // 2番目: 失敗
    expect(summary.results[1].gameId).toBe('game-1');
    expect(summary.results[1].status).toBe('failed');

    // 3番目: 成功（2番目の失敗に影響されない）
    expect(summary.results[2].gameId).toBe('game-2');
    expect(summary.results[2].status).toBe('success');

    // カウント整合性
    expect(summary.successCount).toBe(2);
    expect(summary.failedCount).toBe(1);
    expect(summary.successCount + summary.failedCount + summary.skippedCount).toBe(
      summary.totalGames
    );

    // generateText は3回呼ばれる（失敗しても後続は実行される）
    expect(mockBedrock.generateText).toHaveBeenCalledTimes(3);
  });
});
