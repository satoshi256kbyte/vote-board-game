/**
 * VoteTallyService ユニットテスト
 *
 * リポジトリと Othello Engine 関数をモックし、
 * processGame / tallyVotes の各シナリオを検証する。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VoteTallyService } from './index.js';
import type { GameEntity, CandidateEntity } from '../../lib/dynamodb/types.js';
import { CellState } from '../../lib/othello/index.js';

// Othello Engine 関数をモック
vi.mock('../../lib/othello/index.js', async () => {
  const actual = await vi.importActual('../../lib/othello/index.js');
  return {
    ...actual,
    getLegalMoves: vi.fn(),
    hasLegalMoves: vi.fn(),
    executeMove: vi.fn(),
    shouldEndGame: vi.fn(),
    countDiscs: vi.fn(),
  };
});

import {
  getLegalMoves,
  hasLegalMoves,
  executeMove,
  shouldEndGame,
  countDiscs,
} from '../../lib/othello/index.js';

const mockedGetLegalMoves = vi.mocked(getLegalMoves);
const mockedHasLegalMoves = vi.mocked(hasLegalMoves);
const mockedExecuteMove = vi.mocked(executeMove);
const mockedShouldEndGame = vi.mocked(shouldEndGame);
const mockedCountDiscs = vi.mocked(countDiscs);

// --- ヘルパー ---

function createInitialBoardState(): string {
  const board = Array.from({ length: 8 }, () => Array(8).fill(0));
  board[3][3] = 2;
  board[3][4] = 1;
  board[4][3] = 1;
  board[4][4] = 2;
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
    currentTurn: 1, // 奇数 → WHITE の手番 → aiSide=BLACK なので集合知ターン
    boardState: createInitialBoardState(),
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

function createNewBoard(): number[][] {
  const board = Array.from({ length: 8 }, () => Array(8).fill(0));
  board[2][3] = 2; // 新しい石
  board[3][3] = 2;
  board[3][4] = 1;
  board[4][3] = 1;
  board[4][4] = 2;
  return board;
}

// --- モックリポジトリ ---

function createMockRepositories() {
  return {
    gameRepository: {
      listByStatus: vi.fn(),
      updateBoardState: vi.fn(),
      finish: vi.fn(),
    },
    candidateRepository: {
      listByTurn: vi.fn(),
      closeVoting: vi.fn(),
      markAsAdopted: vi.fn(),
    },
    moveRepository: {
      create: vi.fn(),
    },
  };
}

describe('VoteTallyService', () => {
  let mocks: ReturnType<typeof createMockRepositories>;
  let service: VoteTallyService;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks = createMockRepositories();
    service = new VoteTallyService(
      mocks.gameRepository as never,
      mocks.candidateRepository as never,
      mocks.moveRepository as never
    );
  });

  describe('processGame', () => {
    // 1. 正常系: 候補あり → 投票締切 → 最多得票候補採用 → 盤面更新 → success
    it('正常系: 最多得票候補を採用し盤面を更新して success を返す', async () => {
      const game = createGame();
      const candidate = createCandidate();
      const newBoard = createNewBoard();

      mockedGetLegalMoves.mockReturnValue([{ row: 2, col: 3 }]);
      mocks.candidateRepository.listByTurn.mockResolvedValue([candidate]);
      mocks.candidateRepository.closeVoting.mockResolvedValue(undefined);
      mocks.candidateRepository.markAsAdopted.mockResolvedValue(undefined);
      mockedExecuteMove.mockReturnValue(newBoard as never);
      mocks.moveRepository.create.mockResolvedValue(undefined);
      mocks.gameRepository.updateBoardState.mockResolvedValue(undefined);
      mockedShouldEndGame.mockReturnValue(false);

      const result = await service.processGame(game);

      expect(result.status).toBe('success');
      expect(result.gameId).toBe('game-1');
      expect(result.adoptedCandidateId).toBe('cand-1');
      expect(result.position).toBe('2,3');

      // closeVoting が呼ばれた
      expect(mocks.candidateRepository.closeVoting).toHaveBeenCalledWith('game-1', 1);
      // markAsAdopted が呼ばれた
      expect(mocks.candidateRepository.markAsAdopted).toHaveBeenCalledWith('game-1', 1, 'cand-1');
      // executeMove が正しい引数で呼ばれた (集合知=WHITE=CellState.White)
      expect(mockedExecuteMove).toHaveBeenCalledWith(
        expect.anything(),
        { row: 2, col: 3 },
        CellState.White
      );
      // Move レコード作成
      expect(mocks.moveRepository.create).toHaveBeenCalledWith({
        gameId: 'game-1',
        turnNumber: 1,
        side: 'WHITE',
        position: '2,3',
        playedBy: 'COLLECTIVE',
        candidateId: 'cand-1',
      });
      // boardState 更新 (currentTurn + 1)
      expect(mocks.gameRepository.updateBoardState).toHaveBeenCalledWith(
        'game-1',
        JSON.stringify({ board: newBoard }),
        2
      );
    });

    // 2. AI ターンのスキップ
    it('AI ターンの場合は skipped を返す', async () => {
      // currentTurn=0, aiSide=BLACK → 偶数+BLACK = AI ターン
      const game = createGame({ currentTurn: 0, aiSide: 'BLACK' });

      const result = await service.processGame(game);

      expect(result.status).toBe('skipped');
      expect(result.reason).toBe('AI turn');
      expect(mocks.candidateRepository.listByTurn).not.toHaveBeenCalled();
    });

    // 3. 候補なしのスキップ
    it('候補が存在しない場合は skipped を返す', async () => {
      const game = createGame();
      mockedGetLegalMoves.mockReturnValue([{ row: 2, col: 3 }]);
      mocks.candidateRepository.listByTurn.mockResolvedValue([]);

      const result = await service.processGame(game);

      expect(result.status).toBe('skipped');
      expect(result.reason).toBe('No candidates');
    });

    // 4. パス処理（集合知側に合法手なし、AI側にあり）
    it('集合知側に合法手がなく AI 側にある場合は passed を返す', async () => {
      const game = createGame();
      // 集合知側（WHITE）の合法手なし
      mockedGetLegalMoves.mockReturnValue([]);
      // AI 側（BLACK）には合法手あり
      mockedHasLegalMoves.mockReturnValue(true);

      const result = await service.processGame(game);

      expect(result.status).toBe('passed');
      // boardState は同じまま、currentTurn +1 で更新
      expect(mocks.gameRepository.updateBoardState).toHaveBeenCalledWith(
        'game-1',
        game.boardState,
        2
      );
    });

    // 5. 両者合法手なし → finished
    it('両者に合法手がない場合は finished を返す', async () => {
      const game = createGame();
      mockedGetLegalMoves.mockReturnValue([]);
      mockedHasLegalMoves.mockReturnValue(false);
      mockedCountDiscs.mockImplementation((_board, player) => {
        return player === CellState.Black ? 30 : 34;
      });
      mocks.gameRepository.finish.mockResolvedValue(undefined);

      const result = await service.processGame(game);

      expect(result.status).toBe('finished');
      expect(mocks.gameRepository.finish).toHaveBeenCalledWith('game-1', 'COLLECTIVE');
    });

    // 6. 対局終了判定（手の適用後に shouldEndGame が true）
    it('手の適用後に対局終了条件を満たす場合は finished を返す', async () => {
      const game = createGame();
      const candidate = createCandidate();
      const newBoard = createNewBoard();

      mockedGetLegalMoves.mockReturnValue([{ row: 2, col: 3 }]);
      mocks.candidateRepository.listByTurn.mockResolvedValue([candidate]);
      mocks.candidateRepository.closeVoting.mockResolvedValue(undefined);
      mocks.candidateRepository.markAsAdopted.mockResolvedValue(undefined);
      mockedExecuteMove.mockReturnValue(newBoard as never);
      mocks.moveRepository.create.mockResolvedValue(undefined);
      mocks.gameRepository.updateBoardState.mockResolvedValue(undefined);
      mockedShouldEndGame.mockReturnValue(true);
      mockedCountDiscs.mockImplementation((_board, player) => {
        return player === CellState.Black ? 40 : 24;
      });
      mocks.gameRepository.finish.mockResolvedValue(undefined);

      const result = await service.processGame(game);

      expect(result.status).toBe('finished');
      expect(result.adoptedCandidateId).toBe('cand-1');
      expect(mocks.gameRepository.finish).toHaveBeenCalledWith('game-1', 'AI');
    });

    // 7. closeVoting 失敗時のエラー隔離
    it('closeVoting が失敗した場合はエラーが throw される', async () => {
      const game = createGame();
      const candidate = createCandidate();

      mockedGetLegalMoves.mockReturnValue([{ row: 2, col: 3 }]);
      mocks.candidateRepository.listByTurn.mockResolvedValue([candidate]);
      mocks.candidateRepository.closeVoting.mockRejectedValue(new Error('DynamoDB error'));

      await expect(service.processGame(game)).rejects.toThrow('DynamoDB error');
    });

    // 8. 無効な position → failed
    it('無効な position フォーマットの場合は failed を返す', async () => {
      const game = createGame();
      const candidate = createCandidate({ position: 'invalid' });

      mockedGetLegalMoves.mockReturnValue([{ row: 2, col: 3 }]);
      mocks.candidateRepository.listByTurn.mockResolvedValue([candidate]);
      mocks.candidateRepository.closeVoting.mockResolvedValue(undefined);
      mocks.candidateRepository.markAsAdopted.mockResolvedValue(undefined);

      const result = await service.processGame(game);

      expect(result.status).toBe('failed');
      expect(result.reason).toContain('Invalid position');
    });

    // 9. boardState パース失敗 → skipped
    it('boardState のパースに失敗した場合は skipped を返す', async () => {
      const game = createGame({ boardState: 'invalid json' });

      const result = await service.processGame(game);

      expect(result.status).toBe('skipped');
      expect(result.reason).toBe('Failed to parse boardState');
    });
  });

  describe('tallyVotes', () => {
    // 7 (continued). closeVoting 失敗時のエラー隔離 → failed（他の対局は継続）
    it('1つの対局が失敗しても他の対局の処理は継続する', async () => {
      const game1 = createGame({ gameId: 'game-1' });
      const game2 = createGame({ gameId: 'game-2' });
      const candidate2 = createCandidate({ gameId: 'game-2', candidateId: 'cand-2' });
      const newBoard = createNewBoard();

      mocks.gameRepository.listByStatus.mockResolvedValue({ items: [game1, game2] });

      // game-1: closeVoting で失敗
      mockedGetLegalMoves.mockReturnValue([{ row: 2, col: 3 }]);
      mocks.candidateRepository.listByTurn
        .mockResolvedValueOnce([createCandidate({ gameId: 'game-1' })])
        .mockResolvedValueOnce([candidate2]);
      mocks.candidateRepository.closeVoting
        .mockRejectedValueOnce(new Error('DynamoDB error'))
        .mockResolvedValueOnce(undefined);
      mocks.candidateRepository.markAsAdopted.mockResolvedValue(undefined);
      mockedExecuteMove.mockReturnValue(newBoard as never);
      mocks.moveRepository.create.mockResolvedValue(undefined);
      mocks.gameRepository.updateBoardState.mockResolvedValue(undefined);
      mockedShouldEndGame.mockReturnValue(false);

      const summary = await service.tallyVotes();

      expect(summary.totalGames).toBe(2);
      expect(summary.failedCount).toBe(1);
      expect(summary.successCount).toBe(1);
      // game-1 は failed
      expect(summary.results.find((r) => r.gameId === 'game-1')?.status).toBe('failed');
      // game-2 は success
      expect(summary.results.find((r) => r.gameId === 'game-2')?.status).toBe('success');
    });

    // 10. 複数対局の処理とサマリーの正確性
    it('複数対局の処理結果をサマリーに正確に集計する', async () => {
      const gameAI = createGame({ gameId: 'game-ai', currentTurn: 0, aiSide: 'BLACK' }); // AI ターン → skipped
      const gameNoCandidates = createGame({ gameId: 'game-no-cand' }); // 候補なし → skipped
      const gameSuccess = createGame({ gameId: 'game-success' }); // 正常系 → success
      const candidate = createCandidate({ gameId: 'game-success', candidateId: 'cand-s' });
      const newBoard = createNewBoard();

      mocks.gameRepository.listByStatus.mockResolvedValue({
        items: [gameAI, gameNoCandidates, gameSuccess],
      });

      mockedGetLegalMoves.mockReturnValue([{ row: 2, col: 3 }]);
      mocks.candidateRepository.listByTurn
        .mockResolvedValueOnce([]) // gameNoCandidates
        .mockResolvedValueOnce([candidate]); // gameSuccess
      mocks.candidateRepository.closeVoting.mockResolvedValue(undefined);
      mocks.candidateRepository.markAsAdopted.mockResolvedValue(undefined);
      mockedExecuteMove.mockReturnValue(newBoard as never);
      mocks.moveRepository.create.mockResolvedValue(undefined);
      mocks.gameRepository.updateBoardState.mockResolvedValue(undefined);
      mockedShouldEndGame.mockReturnValue(false);

      const summary = await service.tallyVotes();

      expect(summary.totalGames).toBe(3);
      expect(summary.skippedCount).toBe(2); // AI ターン + 候補なし
      expect(summary.successCount).toBe(1);
      expect(summary.failedCount).toBe(0);
      expect(summary.passedCount).toBe(0);
      expect(summary.finishedCount).toBe(0);
      expect(summary.results).toHaveLength(3);

      // 各カウントの合計 = totalGames
      const total =
        summary.successCount +
        summary.failedCount +
        summary.skippedCount +
        summary.passedCount +
        summary.finishedCount;
      expect(total).toBe(summary.totalGames);
    });
  });
});
