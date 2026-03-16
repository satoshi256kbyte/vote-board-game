/**
 * GameStateUpdater ユニットテスト
 *
 * リポジトリと Othello Engine 関数をモックし、
 * processGame / updateGameStates の各シナリオを検証する。
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 3.1, 3.2, 4.1, 6.1, 6.2, 7.1, 7.2, 7.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameStateUpdater } from './index.js';
import type { GameEntity, CandidateEntity } from '../../lib/dynamodb/types.js';

// Othello Engine 関数をモック
vi.mock('../../lib/othello/index.js', async () => {
  const actual = await vi.importActual('../../lib/othello/index.js');
  return {
    ...actual,
    getLegalMoves: vi.fn(),
    countDiscs: vi.fn(),
  };
});

// game-utils をモック
vi.mock('../../lib/game-utils.js', () => ({
  isAITurn: vi.fn(),
  determineWinner: vi.fn(),
}));

import { getLegalMoves, countDiscs, CellState } from '../../lib/othello/index.js';
import { isAITurn, determineWinner } from '../../lib/game-utils.js';

const mockedGetLegalMoves = vi.mocked(getLegalMoves);
const mockedCountDiscs = vi.mocked(countDiscs);
const mockedIsAITurn = vi.mocked(isAITurn);
const mockedDetermineWinner = vi.mocked(determineWinner);

// --- ヘルパー ---

function createValidBoardState(): string {
  const board = Array.from({ length: 8 }, () => Array(8).fill(0));
  board[3][3] = CellState.White;
  board[3][4] = CellState.Black;
  board[4][3] = CellState.Black;
  board[4][4] = CellState.White;
  return JSON.stringify({ board });
}

function createGame(overrides: Partial<GameEntity> = {}): GameEntity {
  return {
    PK: 'GAME#game-1',
    SK: 'GAME#game-1',
    entityType: 'GAME',
    GSI1PK: 'GAME#STATUS#ACTIVE',
    GSI1SK: '2024-01-01T00:00:00Z',
    gameId: 'game-1',
    gameType: 'OTHELLO',
    status: 'ACTIVE',
    aiSide: 'BLACK',
    currentTurn: 1,
    boardState: createValidBoardState(),
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function createCandidate(overrides: Partial<CandidateEntity> = {}): CandidateEntity {
  return {
    PK: 'GAME#game-1#TURN#1',
    SK: 'CANDIDATE#cand-1',
    entityType: 'CANDIDATE',
    candidateId: 'cand-1',
    gameId: 'game-1',
    turnNumber: 1,
    position: '2,3',
    description: 'テスト候補',
    voteCount: 5,
    createdBy: 'AI',
    status: 'VOTING',
    votingDeadline: '2024-01-02T15:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function createMockRepositories() {
  return {
    gameRepository: {
      listByStatus: vi.fn(),
      finish: vi.fn(),
    },
    candidateRepository: {
      listByTurn: vi.fn(),
    },
  };
}

describe('GameStateUpdater', () => {
  let mocks: ReturnType<typeof createMockRepositories>;
  let service: GameStateUpdater;
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks = createMockRepositories();
    service = new GameStateUpdater(
      mocks.gameRepository as never,
      mocks.candidateRepository as never
    );
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    };
  });

  describe('updateGameStates - 単一対局', () => {
    // 正常な盤面で対局継続（候補あり）→ status: 'ok'
    it('正常な盤面で候補ありの場合 ok を返す', async () => {
      const game = createGame();
      mocks.gameRepository.listByStatus.mockResolvedValue({ items: [game] });
      mockedGetLegalMoves.mockReturnValue([{ row: 2, col: 3 }]);
      mockedIsAITurn.mockReturnValue(false);
      mocks.candidateRepository.listByTurn.mockResolvedValue([createCandidate()]);

      const summary = await service.updateGameStates();

      expect(summary.totalGames).toBe(1);
      expect(summary.okCount).toBe(1);
      expect(summary.results[0].status).toBe('ok');
      expect(summary.results[0].hasCandidates).toBe(true);
    });

    // 連続パス検出時の finish 呼び出しと勝者判定 → status: 'finished'
    it('連続パス検出時に finish を呼び出し finished を返す', async () => {
      const game = createGame();
      mocks.gameRepository.listByStatus.mockResolvedValue({ items: [game] });
      mockedGetLegalMoves.mockReturnValue([]);
      mockedDetermineWinner.mockReturnValue('AI');
      mockedCountDiscs.mockImplementation((_board, player) => {
        return player === CellState.Black ? 40 : 24;
      });
      mocks.gameRepository.finish.mockResolvedValue(undefined);

      const summary = await service.updateGameStates();

      expect(summary.finishedCount).toBe(1);
      expect(summary.results[0].status).toBe('finished');
      expect(summary.results[0].winner).toBe('AI');
      expect(summary.results[0].blackCount).toBe(40);
      expect(summary.results[0].whiteCount).toBe(24);
      expect(mocks.gameRepository.finish).toHaveBeenCalledWith('game-1', 'AI');
    });

    // 無効な boardState（JSON パース失敗）→ status: 'error'
    it('boardState の JSON パースに失敗した場合 error を返す', async () => {
      const game = createGame({ boardState: 'invalid json' });
      mocks.gameRepository.listByStatus.mockResolvedValue({ items: [game] });

      const summary = await service.updateGameStates();

      expect(summary.errorCount).toBe(1);
      expect(summary.results[0].status).toBe('error');
      expect(summary.results[0].reason).toBe('Invalid board state');
    });

    // 無効な boardState（非 8x8 配列）→ status: 'error'
    it('boardState が 8x8 配列でない場合 error を返す', async () => {
      const game = createGame({
        boardState: JSON.stringify({
          board: [
            [1, 2],
            [3, 4],
          ],
        }),
      });
      mocks.gameRepository.listByStatus.mockResolvedValue({ items: [game] });

      const summary = await service.updateGameStates();

      expect(summary.errorCount).toBe(1);
      expect(summary.results[0].status).toBe('error');
      expect(summary.results[0].reason).toBe('Invalid board state');
    });

    // AI ターンの対局で候補チェックがスキップされること → status: 'ok'
    it('AI ターンの場合は候補チェックをスキップし ok を返す', async () => {
      const game = createGame({ currentTurn: 0, aiSide: 'BLACK' });
      mocks.gameRepository.listByStatus.mockResolvedValue({ items: [game] });
      mockedGetLegalMoves.mockReturnValue([{ row: 2, col: 3 }]);
      mockedIsAITurn.mockReturnValue(true);

      const summary = await service.updateGameStates();

      expect(summary.okCount).toBe(1);
      expect(summary.results[0].status).toBe('ok');
      expect(summary.results[0].reason).toBe('AI turn - candidate check skipped');
      expect(mocks.candidateRepository.listByTurn).not.toHaveBeenCalled();
    });

    // 候補なし時の警告 → status: 'warning'
    it('候補が存在しない場合 warning を返す', async () => {
      const game = createGame();
      mocks.gameRepository.listByStatus.mockResolvedValue({ items: [game] });
      mockedGetLegalMoves.mockReturnValue([{ row: 2, col: 3 }]);
      mockedIsAITurn.mockReturnValue(false);
      mocks.candidateRepository.listByTurn.mockResolvedValue([]);

      const summary = await service.updateGameStates();

      expect(summary.warningCount).toBe(1);
      expect(summary.results[0].status).toBe('warning');
      expect(summary.results[0].hasCandidates).toBe(false);
    });

    // finish 失敗時のエラー処理 → status: 'error'
    it('finish が失敗した場合 error を返す', async () => {
      const game = createGame();
      mocks.gameRepository.listByStatus.mockResolvedValue({ items: [game] });
      mockedGetLegalMoves.mockReturnValue([]);
      mockedDetermineWinner.mockReturnValue('AI');
      mockedCountDiscs.mockReturnValue(30);
      mocks.gameRepository.finish.mockRejectedValue(new Error('DynamoDB error'));

      const summary = await service.updateGameStates();

      expect(summary.errorCount).toBe(1);
      expect(summary.results[0].status).toBe('error');
      expect(summary.results[0].reason).toBe('DynamoDB error');
    });
  });

  describe('updateGameStates - 複数対局', () => {
    // 複数対局処理時のエラー隔離（1対局の失敗が他に影響しない）
    it('1対局の失敗が他の対局に影響しない', async () => {
      const game1 = createGame({ gameId: 'game-1', boardState: 'invalid' });
      const game2 = createGame({ gameId: 'game-2' });
      mocks.gameRepository.listByStatus.mockResolvedValue({ items: [game1, game2] });
      mockedGetLegalMoves.mockReturnValue([{ row: 2, col: 3 }]);
      mockedIsAITurn.mockReturnValue(false);
      mocks.candidateRepository.listByTurn.mockResolvedValue([createCandidate()]);

      const summary = await service.updateGameStates();

      expect(summary.totalGames).toBe(2);
      expect(summary.errorCount).toBe(1);
      expect(summary.okCount).toBe(1);
      expect(summary.results.find((r) => r.gameId === 'game-1')?.status).toBe('error');
      expect(summary.results.find((r) => r.gameId === 'game-2')?.status).toBe('ok');
    });

    // サマリーの totalGames と各カウントの整合性
    it('サマリーの totalGames と各カウントの合計が一致する', async () => {
      const gameOk = createGame({ gameId: 'game-ok' });
      const gameFinished = createGame({ gameId: 'game-finished' });
      const gameWarning = createGame({ gameId: 'game-warning' });
      const gameError = createGame({ gameId: 'game-error', boardState: 'bad' });

      mocks.gameRepository.listByStatus.mockResolvedValue({
        items: [gameOk, gameFinished, gameWarning, gameError],
      });

      // game-ok: 候補あり → ok
      // game-finished: 連続パス → finished
      // game-warning: 候補なし → warning
      // game-error: 無効な盤面 → error
      mockedGetLegalMoves
        .mockReturnValueOnce([{ row: 2, col: 3 }]) // game-ok: black
        .mockReturnValueOnce([{ row: 2, col: 3 }]) // game-ok: white
        .mockReturnValueOnce([]) // game-finished: black
        .mockReturnValueOnce([]) // game-finished: white
        .mockReturnValueOnce([{ row: 2, col: 3 }]) // game-warning: black
        .mockReturnValueOnce([{ row: 2, col: 3 }]); // game-warning: white

      mockedIsAITurn.mockReturnValue(false);
      mocks.candidateRepository.listByTurn
        .mockResolvedValueOnce([createCandidate()]) // game-ok
        .mockResolvedValueOnce([]); // game-warning

      mockedDetermineWinner.mockReturnValue('COLLECTIVE');
      mockedCountDiscs.mockReturnValue(20);
      mocks.gameRepository.finish.mockResolvedValue(undefined);

      const summary = await service.updateGameStates();

      expect(summary.totalGames).toBe(4);
      const total =
        summary.okCount + summary.finishedCount + summary.warningCount + summary.errorCount;
      expect(total).toBe(summary.totalGames);
      expect(summary.okCount).toBe(1);
      expect(summary.finishedCount).toBe(1);
      expect(summary.warningCount).toBe(1);
      expect(summary.errorCount).toBe(1);
    });
  });

  describe('構造化ログの出力検証', () => {
    it('処理開始時に GAME_STATE_UPDATE_START ログを出力する', async () => {
      mocks.gameRepository.listByStatus.mockResolvedValue({ items: [] });

      await service.updateGameStates();

      const startLog = consoleSpy.log.mock.calls.find((call) => {
        const parsed = JSON.parse(call[0] as string);
        return parsed.type === 'GAME_STATE_UPDATE_START';
      });
      expect(startLog).toBeDefined();
    });

    it('処理完了時に GAME_STATE_UPDATE_COMPLETE ログを出力する', async () => {
      mocks.gameRepository.listByStatus.mockResolvedValue({ items: [] });

      await service.updateGameStates();

      const completeLog = consoleSpy.log.mock.calls.find((call) => {
        const parsed = JSON.parse(call[0] as string);
        return parsed.type === 'GAME_STATE_UPDATE_COMPLETE';
      });
      expect(completeLog).toBeDefined();
    });

    it('無効な盤面で GAME_STATE_INVALID_BOARD_ERROR ログを出力する', async () => {
      const game = createGame({ boardState: 'invalid' });
      mocks.gameRepository.listByStatus.mockResolvedValue({ items: [game] });

      await service.updateGameStates();

      const errorLog = consoleSpy.error.mock.calls.find((call) => {
        const parsed = JSON.parse(call[0] as string);
        return parsed.type === 'GAME_STATE_INVALID_BOARD_ERROR';
      });
      expect(errorLog).toBeDefined();
    });

    it('連続パス検出時に GAME_STATE_CONSECUTIVE_PASS ログを出力する', async () => {
      const game = createGame();
      mocks.gameRepository.listByStatus.mockResolvedValue({ items: [game] });
      mockedGetLegalMoves.mockReturnValue([]);
      mockedDetermineWinner.mockReturnValue('DRAW');
      mockedCountDiscs.mockReturnValue(32);
      mocks.gameRepository.finish.mockResolvedValue(undefined);

      await service.updateGameStates();

      const passLog = consoleSpy.log.mock.calls.find((call) => {
        const parsed = JSON.parse(call[0] as string);
        return parsed.type === 'GAME_STATE_CONSECUTIVE_PASS';
      });
      expect(passLog).toBeDefined();
    });

    it('AI ターンスキップ時に GAME_STATE_AI_TURN_SKIP ログを出力する', async () => {
      const game = createGame();
      mocks.gameRepository.listByStatus.mockResolvedValue({ items: [game] });
      mockedGetLegalMoves.mockReturnValue([{ row: 0, col: 0 }]);
      mockedIsAITurn.mockReturnValue(true);

      await service.updateGameStates();

      const skipLog = consoleSpy.log.mock.calls.find((call) => {
        const parsed = JSON.parse(call[0] as string);
        return parsed.type === 'GAME_STATE_AI_TURN_SKIP';
      });
      expect(skipLog).toBeDefined();
    });

    it('候補なし時に GAME_STATE_NO_CANDIDATES_WARNING ログを出力する', async () => {
      const game = createGame();
      mocks.gameRepository.listByStatus.mockResolvedValue({ items: [game] });
      mockedGetLegalMoves.mockReturnValue([{ row: 0, col: 0 }]);
      mockedIsAITurn.mockReturnValue(false);
      mocks.candidateRepository.listByTurn.mockResolvedValue([]);

      await service.updateGameStates();

      const warnLog = consoleSpy.warn.mock.calls.find((call) => {
        const parsed = JSON.parse(call[0] as string);
        return parsed.type === 'GAME_STATE_NO_CANDIDATES_WARNING';
      });
      expect(warnLog).toBeDefined();
    });

    it('finish 失敗時に GAME_STATE_FINISH_FAILED ログを出力する', async () => {
      const game = createGame();
      mocks.gameRepository.listByStatus.mockResolvedValue({ items: [game] });
      mockedGetLegalMoves.mockReturnValue([]);
      mockedDetermineWinner.mockReturnValue('AI');
      mockedCountDiscs.mockReturnValue(30);
      mocks.gameRepository.finish.mockRejectedValue(new Error('DynamoDB error'));

      await service.updateGameStates();

      const failLog = consoleSpy.error.mock.calls.find((call) => {
        const parsed = JSON.parse(call[0] as string);
        return parsed.type === 'GAME_STATE_FINISH_FAILED';
      });
      expect(failLog).toBeDefined();
    });

    it('各対局処理完了時に GAME_STATE_UPDATE_GAME_COMPLETE ログを出力する', async () => {
      const game = createGame();
      mocks.gameRepository.listByStatus.mockResolvedValue({ items: [game] });
      mockedGetLegalMoves.mockReturnValue([{ row: 0, col: 0 }]);
      mockedIsAITurn.mockReturnValue(false);
      mocks.candidateRepository.listByTurn.mockResolvedValue([createCandidate()]);

      await service.updateGameStates();

      const completeLog = consoleSpy.log.mock.calls.find((call) => {
        const parsed = JSON.parse(call[0] as string);
        return parsed.type === 'GAME_STATE_UPDATE_GAME_COMPLETE' && parsed.gameId === 'game-1';
      });
      expect(completeLog).toBeDefined();
    });
  });

  describe('validateBoardState', () => {
    it('有効な 8x8 盤面を Board として返す', () => {
      const boardState = createValidBoardState();
      const result = service.validateBoardState(boardState);
      expect(result).not.toBeNull();
      expect(result).toHaveLength(8);
      expect(result![0]).toHaveLength(8);
    });

    it('無効な JSON で null を返す', () => {
      expect(service.validateBoardState('not json')).toBeNull();
    });

    it('board プロパティがない場合 null を返す', () => {
      expect(service.validateBoardState(JSON.stringify({ data: [] }))).toBeNull();
    });

    it('行数が 8 でない場合 null を返す', () => {
      const board = Array.from({ length: 7 }, () => Array(8).fill(0));
      expect(service.validateBoardState(JSON.stringify({ board }))).toBeNull();
    });

    it('列数が 8 でない場合 null を返す', () => {
      const board = Array.from({ length: 8 }, () => Array(7).fill(0));
      expect(service.validateBoardState(JSON.stringify({ board }))).toBeNull();
    });
  });
});
