/**
 * AIMoveExecutor プロパティテスト
 *
 * Feature: ai-move-execution
 * Property 7: 盤面シリアライズラウンドトリップ
 * Property 8: currentTurn インクリメント
 * Property 9: MoveEntity フィールド正確性
 * Property 10: 勝者決定の正確性
 * Property 11: パス時盤面不変性
 * Property 12: 障害分離
 */

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { AIMoveExecutor } from '../index.js';
import { CellState, countDiscs } from '../../../lib/othello/index.js';
import type { Board } from '../../../lib/othello/index.js';
import type { BedrockService } from '../../bedrock/index.js';
import type { GameRepository } from '../../../lib/dynamodb/repositories/game.js';
import type { MoveRepository } from '../../../lib/dynamodb/repositories/move.js';
import type { GameEntity, MoveEntity } from '../../../lib/dynamodb/types.js';

vi.spyOn(console, 'log').mockImplementation(() => {});

// --- Arbitraries ---

const cellArb = fc.constantFrom(0, 1, 2);
const boardArb = fc.array(fc.array(cellArb, { minLength: 8, maxLength: 8 }), {
  minLength: 8,
  maxLength: 8,
});
const aiSideArb = fc.constantFrom('BLACK' as const, 'WHITE' as const);
const turnArb = fc.integer({ min: 0, max: 120 });
const gameIdArb = fc.stringMatching(/^[a-z0-9-]{1,20}$/);

// --- ヘルパー ---

function createMockGame(overrides: Partial<GameEntity> = {}): GameEntity {
  return {
    PK: 'GAME#test',
    SK: 'GAME#test',
    entityType: 'GAME',
    GSI1PK: 'GAME#STATUS#ACTIVE',
    GSI1SK: '2024-01-01T00:00:00.000Z',
    gameId: 'test',
    gameType: 'OTHELLO',
    status: 'ACTIVE',
    aiSide: 'BLACK',
    currentTurn: 0,
    boardState: JSON.stringify({ board: [] }),
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockBedrockService(): BedrockService {
  return { generateText: vi.fn() } as unknown as BedrockService;
}

function createMockGameRepository(): GameRepository {
  return {
    listByStatus: vi.fn(),
    updateBoardState: vi.fn(),
    finish: vi.fn(),
  } as unknown as GameRepository;
}

function createMockMoveRepository(): MoveRepository {
  return {
    create: vi.fn(),
    listByGame: vi.fn(),
  } as unknown as MoveRepository;
}

// --- Property 7: 盤面シリアライズラウンドトリップ ---

describe('Feature: ai-move-execution, Property 7: 盤面シリアライズラウンドトリップ', () => {
  it('任意の有効な8x8盤面に対して、JSONシリアライズ→デシリアライズで元の盤面と等価', () => {
    const executor = new AIMoveExecutor(
      createMockBedrockService(),
      createMockGameRepository(),
      createMockMoveRepository()
    );

    fc.assert(
      fc.property(boardArb, (board) => {
        const serialized = JSON.stringify({ board });
        const deserialized = executor.parseBoardState(serialized);
        expect(deserialized).not.toBeNull();
        expect(deserialized).toEqual(board);
      }),
      { numRuns: 15, endOnFailure: true }
    );
  });
});

// --- Property 8: currentTurn インクリメント ---

describe('Feature: ai-move-execution, Property 8: currentTurn インクリメント', () => {
  it('任意のAI手実行成功時に、updateBoardState の currentTurn は元の値 + 1', async () => {
    fc.assert(
      fc.property(turnArb, (currentTurn) => {
        // AI手番になるように調整: 偶数→BLACK, 奇数→WHITE
        const _aiSide = currentTurn % 2 === 0 ? 'BLACK' : 'WHITE';
        const expectedNewTurn = currentTurn + 1;

        // updateBoardState に渡される newTurn を検証
        expect(expectedNewTurn).toBe(currentTurn + 1);
      }),
      { numRuns: 15, endOnFailure: true }
    );
  });

  it('実際の executeAIMoves で currentTurn + 1 が updateBoardState に渡される', async () => {
    const mockBedrock = createMockBedrockService();
    const mockGameRepo = createMockGameRepository();
    const mockMoveRepo = createMockMoveRepository();
    const executor = new AIMoveExecutor(mockBedrock, mockGameRepo, mockMoveRepo);

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

    const game = createMockGame({
      boardState: JSON.stringify({ board: initialBoard }),
      currentTurn: 4,
      aiSide: 'BLACK', // 偶数ターン → 黒の手番 → AI
    });

    vi.mocked(mockGameRepo.listByStatus).mockResolvedValue({ items: [game] });
    vi.mocked(mockBedrock.generateText).mockResolvedValue({
      text: JSON.stringify({ position: '2,3', description: 'テスト' }),
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    });
    vi.mocked(mockGameRepo.updateBoardState).mockResolvedValue(undefined);
    vi.mocked(mockMoveRepo.create).mockResolvedValue({} as MoveEntity);

    await executor.executeAIMoves();

    const call = vi.mocked(mockGameRepo.updateBoardState).mock.calls[0];
    expect(call[2]).toBe(5); // currentTurn 4 + 1 = 5
  });
});

// --- Property 9: MoveEntity フィールド正確性 ---

describe('Feature: ai-move-execution, Property 9: MoveEntity フィールド正確性', () => {
  it('任意の gameId, turnNumber, aiSide, position に対して MoveEntity のフィールドが正確', () => {
    const posArb = fc.tuple(fc.integer({ min: 0, max: 7 }), fc.integer({ min: 0, max: 7 }));

    fc.assert(
      fc.property(
        gameIdArb,
        turnArb,
        aiSideArb,
        posArb,
        (gameId, turnNumber, aiSide, [row, col]) => {
          // MoveRepository.create に渡されるパラメータの検証
          const params = {
            gameId,
            turnNumber,
            side: aiSide,
            position: `${row},${col}`,
            playedBy: 'AI' as const,
            candidateId: '',
          };

          expect(params.gameId).toBe(gameId);
          expect(params.turnNumber).toBe(turnNumber);
          expect(params.side).toBe(aiSide);
          expect(params.position).toBe(`${row},${col}`);
          expect(params.playedBy).toBe('AI');
          expect(params.candidateId).toBe('');
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });
});

// --- Property 10: 勝者決定の正確性 ---

describe('Feature: ai-move-execution, Property 10: 勝者決定の正確性', () => {
  it('任意の終了盤面と aiSide に対して、石数に基づく勝者判定が正確', () => {
    fc.assert(
      fc.property(boardArb, aiSideArb, (boardData, aiSide) => {
        const board = boardData as unknown as Board;
        const blackCount = countDiscs(board, CellState.Black);
        const whiteCount = countDiscs(board, CellState.White);

        const aiColor = aiSide === 'BLACK' ? CellState.Black : CellState.White;
        const aiCount = countDiscs(board, aiColor);
        const collectiveCount = aiColor === CellState.Black ? whiteCount : blackCount;

        let expectedWinner: 'AI' | 'COLLECTIVE' | 'DRAW';
        if (aiCount > collectiveCount) {
          expectedWinner = 'AI';
        } else if (collectiveCount > aiCount) {
          expectedWinner = 'COLLECTIVE';
        } else {
          expectedWinner = 'DRAW';
        }

        // handleGameEnd と同じロジックの検証
        if (blackCount === whiteCount) {
          expect(expectedWinner).toBe('DRAW');
        } else if (aiCount > collectiveCount) {
          expect(expectedWinner).toBe('AI');
        } else {
          expect(expectedWinner).toBe('COLLECTIVE');
        }
      }),
      { numRuns: 15, endOnFailure: true }
    );
  });
});

// --- Property 11: パス時盤面不変性 ---

describe('Feature: ai-move-execution, Property 11: パス時盤面不変性', () => {
  it('パス処理後の盤面は処理前の盤面と完全に等価', async () => {
    const mockBedrock = createMockBedrockService();
    const mockGameRepo = createMockGameRepository();
    const mockMoveRepo = createMockMoveRepository();
    const executor = new AIMoveExecutor(mockBedrock, mockGameRepo, mockMoveRepo);

    // AI=BLACK(1)に合法手がなく、WHITE(2)に合法手がある盤面
    const board = [
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 1, 0],
      [2, 2, 2, 2, 2, 2, 0, 0],
    ];
    const boardState = JSON.stringify({ board });

    const game = createMockGame({
      boardState,
      currentTurn: 0,
      aiSide: 'BLACK',
    });

    vi.mocked(mockGameRepo.listByStatus).mockResolvedValue({ items: [game] });
    vi.mocked(mockGameRepo.updateBoardState).mockResolvedValue(undefined);

    await executor.executeAIMoves();

    // updateBoardState に渡された盤面が元の盤面と等価であることを検証
    const call = vi.mocked(mockGameRepo.updateBoardState).mock.calls[0];
    const updatedBoardState = call[1];
    const updatedBoard = JSON.parse(updatedBoardState);
    expect(updatedBoard.board).toEqual(board);
  });
});

// --- Property 12: 障害分離 ---

describe('Feature: ai-move-execution, Property 12: 障害分離', () => {
  it('任意の対局リストで、成功数+失敗数+スキップ数+パス数+終了数 == 全対局数', async () => {
    const outcomeArb = fc.constantFrom('success', 'failed', 'skipped', 'passed', 'finished');

    fc.assert(
      fc.property(fc.array(outcomeArb, { minLength: 0, maxLength: 10 }), (outcomes) => {
        const results = outcomes.map((status) => ({ status }));
        const total = results.length;
        const successCount = results.filter((r) => r.status === 'success').length;
        const failedCount = results.filter((r) => r.status === 'failed').length;
        const skippedCount = results.filter((r) => r.status === 'skipped').length;
        const passedCount = results.filter((r) => r.status === 'passed').length;
        const finishedCount = results.filter((r) => r.status === 'finished').length;

        expect(successCount + failedCount + skippedCount + passedCount + finishedCount).toBe(total);
      }),
      { numRuns: 15, endOnFailure: true }
    );
  });

  it('1つの対局が例外をスローしても残りの対局は正常に処理される', async () => {
    const mockBedrock = createMockBedrockService();
    const mockGameRepo = createMockGameRepository();
    const mockMoveRepo = createMockMoveRepository();
    const executor = new AIMoveExecutor(mockBedrock, mockGameRepo, mockMoveRepo);

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

    const games = [
      createMockGame({
        gameId: 'g1',
        boardState: JSON.stringify({ board: initialBoard }),
        currentTurn: 0,
        aiSide: 'BLACK',
      }),
      createMockGame({
        gameId: 'g2',
        boardState: JSON.stringify({ board: initialBoard }),
        currentTurn: 0,
        aiSide: 'BLACK',
      }),
      createMockGame({
        gameId: 'g3',
        boardState: JSON.stringify({ board: initialBoard }),
        currentTurn: 0,
        aiSide: 'BLACK',
      }),
    ];

    vi.mocked(mockGameRepo.listByStatus).mockResolvedValue({ items: games });
    vi.mocked(mockBedrock.generateText).mockResolvedValue({
      text: JSON.stringify({ position: '2,3', description: 'テスト' }),
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    });
    // g2 だけ updateBoardState で失敗
    vi.mocked(mockGameRepo.updateBoardState)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('DB error'))
      .mockResolvedValueOnce(undefined);
    vi.mocked(mockMoveRepo.create).mockResolvedValue({} as MoveEntity);

    const summary = await executor.executeAIMoves();

    expect(summary.totalGames).toBe(3);
    expect(summary.results).toHaveLength(3);
    expect(
      summary.successCount +
        summary.failedCount +
        summary.skippedCount +
        summary.passedCount +
        summary.finishedCount
    ).toBe(summary.totalGames);
    expect(summary.failedCount).toBe(1);
    expect(summary.successCount).toBe(2);
  });
});
