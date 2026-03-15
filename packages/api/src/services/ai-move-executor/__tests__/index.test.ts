/**
 * AIMoveExecutor ユニットテスト
 *
 * モックを使用して AIMoveExecutor の各シナリオを検証する。
 * - AI手番スキップ、パス処理、対局終了判定、フォールバック
 * - DynamoDBエラー、空リスト、構造化ログ出力
 *
 * Feature: ai-move-execution
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIMoveExecutor } from '../index.js';
import type { BedrockService } from '../../bedrock/index.js';
import type { GameRepository } from '../../../lib/dynamodb/repositories/game.js';
import type { MoveRepository } from '../../../lib/dynamodb/repositories/move.js';
import type { GameEntity, MoveEntity } from '../../../lib/dynamodb/types.js';

vi.spyOn(console, 'log').mockImplementation(() => {});

// --- 初期盤面（標準オセロ開始配置） ---
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

// --- テストヘルパー ---

function createMockGame(overrides: Partial<GameEntity> = {}): GameEntity {
  return {
    PK: 'GAME#test-game-1',
    SK: 'GAME#test-game-1',
    entityType: 'GAME',
    GSI1PK: 'GAME#STATUS#ACTIVE',
    GSI1SK: '2024-01-01T00:00:00.000Z',
    gameId: 'test-game-1',
    gameType: 'OTHELLO',
    status: 'ACTIVE',
    aiSide: 'BLACK',
    currentTurn: 0, // 偶数 → 黒の手番 → aiSide=BLACK なので AI の手番
    boardState: validBoardState,
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockBedrockService(): BedrockService {
  return {
    generateText: vi.fn(),
  } as unknown as BedrockService;
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

// 黒の合法手がある初期盤面で有効なAIレスポンス
// 黒(1)の合法手: (2,3), (3,2), (4,5), (5,4)
const validAIResponse = JSON.stringify({
  position: '2,3',
  description: '角を狙う戦略的な一手です。',
});

describe('AIMoveExecutor', () => {
  let mockBedrock: BedrockService;
  let mockGameRepo: GameRepository;
  let mockMoveRepo: MoveRepository;
  let executor: AIMoveExecutor;

  beforeEach(() => {
    vi.clearAllMocks();
    mockBedrock = createMockBedrockService();
    mockGameRepo = createMockGameRepository();
    mockMoveRepo = createMockMoveRepository();
    executor = new AIMoveExecutor(mockBedrock, mockGameRepo, mockMoveRepo);
  });

  it('空リスト: アクティブな対局がない場合は正常終了する', async () => {
    vi.mocked(mockGameRepo.listByStatus).mockResolvedValue({ items: [] });

    const summary = await executor.executeAIMoves();

    expect(summary.totalGames).toBe(0);
    expect(summary.successCount).toBe(0);
    expect(summary.failedCount).toBe(0);
    expect(summary.skippedCount).toBe(0);
    expect(summary.passedCount).toBe(0);
    expect(summary.finishedCount).toBe(0);
    expect(summary.results).toHaveLength(0);
  });

  it('AI手番スキップ: AI側の手番でない場合はスキップされる', async () => {
    // currentTurn=1 (奇数→白の手番), aiSide=BLACK → AIの手番ではない
    const game = createMockGame({ currentTurn: 1, aiSide: 'BLACK' });
    vi.mocked(mockGameRepo.listByStatus).mockResolvedValue({ items: [game] });

    const summary = await executor.executeAIMoves();

    expect(summary.skippedCount).toBe(1);
    expect(summary.results[0].status).toBe('skipped');
    expect(summary.results[0].reason).toContain('Not AI turn');
  });

  it('boardStateパース失敗: 不正なboardStateの対局はスキップされる', async () => {
    const game = createMockGame({ boardState: 'invalid-json' });
    vi.mocked(mockGameRepo.listByStatus).mockResolvedValue({ items: [game] });

    const summary = await executor.executeAIMoves();

    expect(summary.skippedCount).toBe(1);
    expect(summary.results[0].status).toBe('skipped');
    expect(summary.results[0].reason).toContain('parse');
  });

  it('正常系: AIが有効な手を返した場合、盤面更新と手履歴保存が行われる', async () => {
    const game = createMockGame();
    vi.mocked(mockGameRepo.listByStatus).mockResolvedValue({ items: [game] });
    vi.mocked(mockBedrock.generateText).mockResolvedValue({
      text: validAIResponse,
      usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
    });
    vi.mocked(mockGameRepo.updateBoardState).mockResolvedValue(undefined);
    vi.mocked(mockMoveRepo.create).mockResolvedValue({} as MoveEntity);

    const summary = await executor.executeAIMoves();

    expect(summary.successCount).toBe(1);
    expect(summary.results[0].status).toBe('success');
    expect(mockGameRepo.updateBoardState).toHaveBeenCalledTimes(1);
    expect(mockMoveRepo.create).toHaveBeenCalledTimes(1);

    // MoveRepository.create の引数を検証
    const createCall = vi.mocked(mockMoveRepo.create).mock.calls[0][0];
    expect(createCall.gameId).toBe('test-game-1');
    expect(createCall.turnNumber).toBe(0);
    expect(createCall.side).toBe('BLACK');
    expect(createCall.playedBy).toBe('AI');
    expect(createCall.candidateId).toBe('');
  });

  it('フォールバック: AIレスポンスが不正な場合、合法手の先頭が選択される', async () => {
    const game = createMockGame();
    vi.mocked(mockGameRepo.listByStatus).mockResolvedValue({ items: [game] });
    vi.mocked(mockBedrock.generateText).mockResolvedValue({
      text: 'invalid response',
      usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
    });
    vi.mocked(mockGameRepo.updateBoardState).mockResolvedValue(undefined);
    vi.mocked(mockMoveRepo.create).mockResolvedValue({} as MoveEntity);

    const summary = await executor.executeAIMoves();

    expect(summary.successCount).toBe(1);
    expect(mockGameRepo.updateBoardState).toHaveBeenCalledTimes(1);
    expect(mockMoveRepo.create).toHaveBeenCalledTimes(1);
  });

  it('Bedrockエラー: BedrockService.generateText がエラーを投げた場合、フォールバックが使用される', async () => {
    const game = createMockGame();
    vi.mocked(mockGameRepo.listByStatus).mockResolvedValue({ items: [game] });
    vi.mocked(mockBedrock.generateText).mockRejectedValue(new Error('Bedrock API error'));
    vi.mocked(mockGameRepo.updateBoardState).mockResolvedValue(undefined);
    vi.mocked(mockMoveRepo.create).mockResolvedValue({} as MoveEntity);

    const summary = await executor.executeAIMoves();

    // フォールバックで処理が続行されるので success
    expect(summary.successCount).toBe(1);
    expect(mockGameRepo.updateBoardState).toHaveBeenCalledTimes(1);
  });

  it('DynamoDBエラー（盤面更新）: updateBoardState がエラーを投げた場合は失敗として記録される', async () => {
    const game = createMockGame();
    vi.mocked(mockGameRepo.listByStatus).mockResolvedValue({ items: [game] });
    vi.mocked(mockBedrock.generateText).mockResolvedValue({
      text: validAIResponse,
      usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
    });
    vi.mocked(mockGameRepo.updateBoardState).mockRejectedValue(new Error('DynamoDB error'));

    const summary = await executor.executeAIMoves();

    expect(summary.failedCount).toBe(1);
    expect(summary.results[0].status).toBe('failed');
  });

  it('DynamoDBエラー（手履歴保存）: MoveRepository.create がエラーを投げても処理は続行される', async () => {
    const game = createMockGame();
    vi.mocked(mockGameRepo.listByStatus).mockResolvedValue({ items: [game] });
    vi.mocked(mockBedrock.generateText).mockResolvedValue({
      text: validAIResponse,
      usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
    });
    vi.mocked(mockGameRepo.updateBoardState).mockResolvedValue(undefined);
    vi.mocked(mockMoveRepo.create).mockRejectedValue(new Error('DynamoDB error'));

    const summary = await executor.executeAIMoves();

    // 手履歴保存失敗はエラーログのみ、処理は続行
    expect(summary.successCount).toBe(1);
    expect(summary.results[0].status).toBe('success');
  });

  it('パス処理: AI側に合法手がなく集合知側に合法手がある場合、パスとして処理される', async () => {
    // AI=BLACK(1), 黒に合法手がなく白に合法手がある盤面を作る
    // 全て白で埋めて、1箇所だけ空きを残す（白に合法手あり、黒に合法手なし）
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
    const game = createMockGame({
      boardState: JSON.stringify({ board }),
      currentTurn: 0,
      aiSide: 'BLACK',
    });
    vi.mocked(mockGameRepo.listByStatus).mockResolvedValue({ items: [game] });
    vi.mocked(mockGameRepo.updateBoardState).mockResolvedValue(undefined);

    const summary = await executor.executeAIMoves();

    expect(summary.passedCount).toBe(1);
    expect(summary.results[0].status).toBe('passed');
    // パス時は盤面は変わらないが currentTurn は +1
    expect(mockGameRepo.updateBoardState).toHaveBeenCalledWith(
      'test-game-1',
      JSON.stringify({ board }),
      1
    );
  });

  it('対局終了: 両者合法手なしの場合、対局が終了する', async () => {
    // 全て黒で埋まった盤面（両者合法手なし）
    const board = Array(8)
      .fill(null)
      .map(() => Array(8).fill(1));
    const game = createMockGame({
      boardState: JSON.stringify({ board }),
      currentTurn: 0,
      aiSide: 'BLACK',
    });
    vi.mocked(mockGameRepo.listByStatus).mockResolvedValue({ items: [game] });
    vi.mocked(mockGameRepo.finish).mockResolvedValue(undefined);

    const summary = await executor.executeAIMoves();

    expect(summary.finishedCount).toBe(1);
    expect(summary.results[0].status).toBe('finished');
    expect(mockGameRepo.finish).toHaveBeenCalledWith('test-game-1', 'AI');
  });

  it('構造化ログ: executeAIMoves が開始・完了ログを出力する', async () => {
    vi.mocked(mockGameRepo.listByStatus).mockResolvedValue({ items: [] });

    await executor.executeAIMoves();

    const logCalls = vi.mocked(console.log).mock.calls.map((c) => c[0]);
    const startLog = logCalls.find(
      (l) => typeof l === 'string' && l.includes('AI_MOVE_EXECUTION_START')
    );
    const completeLog = logCalls.find(
      (l) => typeof l === 'string' && l.includes('AI_MOVE_EXECUTION_COMPLETE')
    );

    expect(startLog).toBeDefined();
    expect(completeLog).toBeDefined();

    const parsedComplete = JSON.parse(completeLog as string);
    expect(parsedComplete.type).toBe('AI_MOVE_EXECUTION_COMPLETE');
    expect(parsedComplete).toHaveProperty('totalGames');
    expect(parsedComplete).toHaveProperty('successCount');
    expect(parsedComplete).toHaveProperty('failedCount');
  });

  it('障害分離: 1つの対局が失敗しても他の対局は正常に処理される', async () => {
    const game1 = createMockGame({ gameId: 'game-1' });
    const game2 = createMockGame({ gameId: 'game-2' });
    vi.mocked(mockGameRepo.listByStatus).mockResolvedValue({ items: [game1, game2] });

    // game-1 は updateBoardState で失敗
    vi.mocked(mockGameRepo.updateBoardState)
      .mockRejectedValueOnce(new Error('DynamoDB error'))
      .mockResolvedValue(undefined);
    vi.mocked(mockBedrock.generateText).mockResolvedValue({
      text: validAIResponse,
      usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
    });
    vi.mocked(mockMoveRepo.create).mockResolvedValue({} as MoveEntity);

    const summary = await executor.executeAIMoves();

    expect(summary.totalGames).toBe(2);
    expect(summary.failedCount).toBe(1);
    expect(summary.successCount).toBe(1);
    expect(summary.results).toHaveLength(2);
  });

  it('勝者判定: AI側の石が多い場合、勝者はAIとなる', async () => {
    // 黒(AI)が多い盤面で対局終了
    const board = Array(8)
      .fill(null)
      .map(() => Array(8).fill(1)); // 全て黒
    board[0][0] = 2; // 1つだけ白
    const game = createMockGame({
      boardState: JSON.stringify({ board }),
      currentTurn: 0,
      aiSide: 'BLACK',
    });
    vi.mocked(mockGameRepo.listByStatus).mockResolvedValue({ items: [game] });
    vi.mocked(mockGameRepo.finish).mockResolvedValue(undefined);

    await executor.executeAIMoves();

    expect(mockGameRepo.finish).toHaveBeenCalledWith('test-game-1', 'AI');
  });

  it('勝者判定: 集合知側の石が多い場合、勝者はCOLLECTIVEとなる', async () => {
    // 白(集合知)が多い盤面で対局終了、AI=BLACK
    const board = Array(8)
      .fill(null)
      .map(() => Array(8).fill(2)); // 全て白
    board[0][0] = 1; // 1つだけ黒
    const game = createMockGame({
      boardState: JSON.stringify({ board }),
      currentTurn: 0,
      aiSide: 'BLACK',
    });
    vi.mocked(mockGameRepo.listByStatus).mockResolvedValue({ items: [game] });
    vi.mocked(mockGameRepo.finish).mockResolvedValue(undefined);

    await executor.executeAIMoves();

    expect(mockGameRepo.finish).toHaveBeenCalledWith('test-game-1', 'COLLECTIVE');
  });
});
