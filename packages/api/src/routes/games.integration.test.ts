/**
 * Game API Integration Tests
 *
 * これらのテストは、Game APIの完全なエンドツーエンドフローを検証します：
 * - ゲーム作成→取得のフロー
 * - ゲーム一覧取得のページネーション
 * - ゲーム終了検知と勝者決定
 *
 * Requirements: 1.1, 2.1, 3.1, 4.1
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Hono } from 'hono';
import { CellState } from '../lib/othello/index.js';
import type { GameEntity } from '../lib/dynamodb/types.js';

// Mock GameRepository
const mockCreate = vi.fn();
const mockGetById = vi.fn();
const mockListByStatus = vi.fn();
const mockUpdateBoardState = vi.fn();
const mockFinish = vi.fn();

vi.mock('../lib/dynamodb/repositories/game.js', () => ({
  GameRepository: vi.fn().mockImplementation(() => ({
    create: mockCreate,
    getById: mockGetById,
    listByStatus: mockListByStatus,
    updateBoardState: mockUpdateBoardState,
    finish: mockFinish,
  })),
}));

describe('Game API Integration Tests', () => {
  let app: Hono;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Honoアプリのセットアップ
    app = new Hono();

    // gamesRouterを動的にインポート
    const { createGamesRouter } = await import('./games.js');
    const { GameService } = await import('../services/game.js');
    const { GameRepository } = await import('../lib/dynamodb/repositories/game.js');

    const gameRepository = new GameRepository();
    const gameService = new GameService(gameRepository);
    app.route('/api/games', createGamesRouter(gameService));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('ゲーム作成→取得のエンドツーエンドフロー', () => {
    it('ゲームを作成し、そのゲームを取得できる', async () => {
      const gameId = '123e4567-e89b-12d3-a456-426614174000';
      const createdAt = '2024-01-01T00:00:00.000Z';

      // Mock repository responses
      const mockEntity: GameEntity = {
        PK: `GAME#${gameId}`,
        SK: `GAME#${gameId}`,
        GSI1PK: 'GAME#STATUS#ACTIVE',
        GSI1SK: createdAt,
        entityType: 'GAME',
        gameId,
        gameType: 'OTHELLO',
        status: 'ACTIVE',
        aiSide: 'BLACK',
        currentTurn: 0,
        boardState: '{"board":[]}',
        createdAt,
        updatedAt: createdAt,
      };

      mockCreate.mockResolvedValue(mockEntity);
      mockUpdateBoardState.mockResolvedValue(undefined);

      // Step 1: ゲームを作成
      const createRes = await app.request('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameType: 'OTHELLO',
          aiSide: 'BLACK',
        }),
      });

      expect(createRes.status).toBe(201);
      const createdGame = await createRes.json();

      expect(createdGame).toHaveProperty('gameId');
      expect(createdGame.gameType).toBe('OTHELLO');
      expect(createdGame.status).toBe('ACTIVE');
      expect(createdGame.aiSide).toBe('BLACK');
      expect(createdGame.currentTurn).toBe(0);
      expect(createdGame.winner).toBe(null);
      expect(createdGame.boardState).toBeDefined();
      expect(createdGame.boardState.board).toHaveLength(8);

      // 初期盤面の検証
      expect(createdGame.boardState.board[3][3]).toBe(CellState.White);
      expect(createdGame.boardState.board[3][4]).toBe(CellState.Black);
      expect(createdGame.boardState.board[4][3]).toBe(CellState.Black);
      expect(createdGame.boardState.board[4][4]).toBe(CellState.White);

      // Step 2: 作成したゲームを取得
      const boardStateJson = JSON.stringify(createdGame.boardState);
      mockGetById.mockResolvedValue({
        ...mockEntity,
        gameId: createdGame.gameId,
        boardState: boardStateJson,
        winner: undefined, // ACTIVEゲームはwinnerがundefined
      });

      const getRes = await app.request(`/api/games/${createdGame.gameId}`);

      expect(getRes.status).toBe(200);
      const retrievedGame = await getRes.json();

      // 作成したゲームと取得したゲームが一致することを確認
      expect(retrievedGame.gameId).toBe(createdGame.gameId);
      expect(retrievedGame.gameType).toBe(createdGame.gameType);
      expect(retrievedGame.status).toBe(createdGame.status);
      expect(retrievedGame.aiSide).toBe(createdGame.aiSide);
      expect(retrievedGame.currentTurn).toBe(createdGame.currentTurn);
      expect(retrievedGame.boardState).toEqual(createdGame.boardState);
      // winnerはundefinedまたはnullのどちらでも許容
      expect([null, undefined]).toContain(retrievedGame.winner);
    });

    it('複数のゲームを作成し、それぞれ取得できる', async () => {
      const games = [
        { aiSide: 'BLACK' as const, gameId: '111e4567-e89b-12d3-a456-426614174000' },
        { aiSide: 'WHITE' as const, gameId: '222e4567-e89b-12d3-a456-426614174000' },
        { aiSide: 'BLACK' as const, gameId: '333e4567-e89b-12d3-a456-426614174000' },
      ];

      const createdGames = [];

      for (const game of games) {
        const mockEntity: GameEntity = {
          PK: `GAME#${game.gameId}`,
          SK: `GAME#${game.gameId}`,
          GSI1PK: 'GAME#STATUS#ACTIVE',
          GSI1SK: new Date().toISOString(),
          entityType: 'GAME',
          gameId: game.gameId,
          gameType: 'OTHELLO',
          status: 'ACTIVE',
          aiSide: game.aiSide,
          currentTurn: 0,
          boardState: '{"board":[]}',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        mockCreate.mockResolvedValueOnce(mockEntity);
        mockUpdateBoardState.mockResolvedValueOnce(undefined);

        const createRes = await app.request('/api/games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameType: 'OTHELLO',
            aiSide: game.aiSide,
          }),
        });

        expect(createRes.status).toBe(201);
        const createdGame = await createRes.json();
        createdGames.push(createdGame);
      }

      // 各ゲームを取得して検証
      for (let i = 0; i < createdGames.length; i++) {
        const game = createdGames[i];
        const boardStateJson = JSON.stringify(game.boardState);

        mockGetById.mockResolvedValueOnce({
          PK: `GAME#${game.gameId}`,
          SK: `GAME#${game.gameId}`,
          GSI1PK: 'GAME#STATUS#ACTIVE',
          GSI1SK: game.createdAt,
          entityType: 'GAME',
          gameId: game.gameId,
          gameType: 'OTHELLO',
          status: 'ACTIVE',
          aiSide: games[i].aiSide,
          currentTurn: 0,
          boardState: boardStateJson,
          createdAt: game.createdAt,
          updatedAt: game.updatedAt,
        });

        const getRes = await app.request(`/api/games/${game.gameId}`);
        expect(getRes.status).toBe(200);

        const retrievedGame = await getRes.json();
        expect(retrievedGame.gameId).toBe(game.gameId);
        expect(retrievedGame.aiSide).toBe(games[i].aiSide);
      }
    });
  });

  describe('ゲーム一覧取得のページネーション', () => {
    it('ページネーションを使用して全ゲームを取得できる', async () => {
      // 30個のゲームを作成（3ページ分）
      const allGames = Array.from({ length: 30 }, (_, i) => ({
        gameId: `game-${i.toString().padStart(3, '0')}`,
        gameType: 'OTHELLO' as const,
        status: 'ACTIVE' as const,
        aiSide: (i % 2 === 0 ? 'BLACK' : 'WHITE') as const,
        currentTurn: 0,
        createdAt: new Date(Date.now() - i * 1000).toISOString(),
      }));

      // ページサイズ10でページネーション
      const pages = [allGames.slice(0, 10), allGames.slice(10, 20), allGames.slice(20, 30)];

      // 1ページ目
      mockListByStatus.mockResolvedValueOnce({
        items: pages[0].map((g) => ({
          ...g,
          PK: `GAME#${g.gameId}`,
          SK: `GAME#${g.gameId}`,
          GSI1PK: 'GAME#STATUS#ACTIVE',
          GSI1SK: g.createdAt,
          entityType: 'GAME',
          boardState: '{"board":[]}',
          updatedAt: g.createdAt,
        })),
        lastEvaluatedKey: {
          PK: 'GAME#game-009',
          SK: 'GAME#game-009',
          GSI1PK: 'GAME#STATUS#ACTIVE',
          GSI1SK: pages[0][9].createdAt,
        },
      });

      const res1 = await app.request('/api/games?limit=10');
      expect(res1.status).toBe(200);
      const data1 = await res1.json();

      expect(data1.games).toHaveLength(10);
      expect(data1.nextCursor).toBeDefined();

      // 2ページ目
      mockListByStatus.mockResolvedValueOnce({
        items: pages[1].map((g) => ({
          ...g,
          PK: `GAME#${g.gameId}`,
          SK: `GAME#${g.gameId}`,
          GSI1PK: 'GAME#STATUS#ACTIVE',
          GSI1SK: g.createdAt,
          entityType: 'GAME',
          boardState: '{"board":[]}',
          updatedAt: g.createdAt,
        })),
        lastEvaluatedKey: {
          PK: 'GAME#game-019',
          SK: 'GAME#game-019',
          GSI1PK: 'GAME#STATUS#ACTIVE',
          GSI1SK: pages[1][9].createdAt,
        },
      });

      const res2 = await app.request(`/api/games?limit=10&cursor=${data1.nextCursor}`);
      expect(res2.status).toBe(200);
      const data2 = await res2.json();

      expect(data2.games).toHaveLength(10);
      expect(data2.nextCursor).toBeDefined();

      // 3ページ目（最終ページ）
      mockListByStatus.mockResolvedValueOnce({
        items: pages[2].map((g) => ({
          ...g,
          PK: `GAME#${g.gameId}`,
          SK: `GAME#${g.gameId}`,
          GSI1PK: 'GAME#STATUS#ACTIVE',
          GSI1SK: g.createdAt,
          entityType: 'GAME',
          boardState: '{"board":[]}',
          updatedAt: g.createdAt,
        })),
        // lastEvaluatedKeyなし（最終ページ）
      });

      const res3 = await app.request(`/api/games?limit=10&cursor=${data2.nextCursor}`);
      expect(res3.status).toBe(200);
      const data3 = await res3.json();

      expect(data3.games).toHaveLength(10);
      expect(data3.nextCursor).toBeUndefined(); // 最終ページ

      // 全ゲームが重複なく取得されたことを確認
      const allRetrievedGameIds = [
        ...data1.games.map((g: { gameId: string }) => g.gameId),
        ...data2.games.map((g: { gameId: string }) => g.gameId),
        ...data3.games.map((g: { gameId: string }) => g.gameId),
      ];

      expect(allRetrievedGameIds).toHaveLength(30);
      expect(new Set(allRetrievedGameIds).size).toBe(30); // 重複なし
    });

    it('ステータスでフィルタリングしながらページネーションできる', async () => {
      // ACTIVEゲーム15個、FINISHEDゲーム15個
      const activeGames = Array.from({ length: 15 }, (_, i) => ({
        gameId: `active-${i}`,
        gameType: 'OTHELLO' as const,
        status: 'ACTIVE' as const,
        aiSide: 'BLACK' as const,
        currentTurn: i,
        createdAt: new Date(Date.now() - i * 1000).toISOString(),
      }));

      const finishedGames = Array.from({ length: 15 }, (_, i) => ({
        gameId: `finished-${i}`,
        gameType: 'OTHELLO' as const,
        status: 'FINISHED' as const,
        aiSide: 'WHITE' as const,
        currentTurn: 60,
        winner: 'AI' as const,
        createdAt: new Date(Date.now() - (i + 100) * 1000).toISOString(),
      }));

      // ACTIVEゲームの1ページ目
      mockListByStatus.mockResolvedValueOnce({
        items: activeGames.slice(0, 10).map((g) => ({
          ...g,
          PK: `GAME#${g.gameId}`,
          SK: `GAME#${g.gameId}`,
          GSI1PK: 'GAME#STATUS#ACTIVE',
          GSI1SK: g.createdAt,
          entityType: 'GAME',
          boardState: '{"board":[]}',
          updatedAt: g.createdAt,
        })),
        lastEvaluatedKey: {
          PK: 'GAME#active-9',
          SK: 'GAME#active-9',
          GSI1PK: 'GAME#STATUS#ACTIVE',
          GSI1SK: activeGames[9].createdAt,
        },
      });

      const activeRes1 = await app.request('/api/games?status=ACTIVE&limit=10');
      expect(activeRes1.status).toBe(200);
      const activeData1 = await activeRes1.json();

      expect(activeData1.games).toHaveLength(10);
      expect(activeData1.games.every((g: { status: string }) => g.status === 'ACTIVE')).toBe(true);
      expect(activeData1.nextCursor).toBeDefined();

      // FINISHEDゲームの1ページ目
      mockListByStatus.mockResolvedValueOnce({
        items: finishedGames.slice(0, 10).map((g) => ({
          ...g,
          PK: `GAME#${g.gameId}`,
          SK: `GAME#${g.gameId}`,
          GSI1PK: 'GAME#STATUS#FINISHED',
          GSI1SK: g.createdAt,
          entityType: 'GAME',
          boardState: '{"board":[]}',
          updatedAt: g.createdAt,
        })),
        lastEvaluatedKey: {
          PK: 'GAME#finished-9',
          SK: 'GAME#finished-9',
          GSI1PK: 'GAME#STATUS#FINISHED',
          GSI1SK: finishedGames[9].createdAt,
        },
      });

      const finishedRes1 = await app.request('/api/games?status=FINISHED&limit=10');
      expect(finishedRes1.status).toBe(200);
      const finishedData1 = await finishedRes1.json();

      expect(finishedData1.games).toHaveLength(10);
      expect(finishedData1.games.every((g: { status: string }) => g.status === 'FINISHED')).toBe(
        true
      );
      expect(finishedData1.nextCursor).toBeDefined();
    });
  });

  describe('ゲーム終了検知と勝者決定', () => {
    it('盤面が満杯の場合、ゲームを終了状態に更新できる', async () => {
      const gameId = '123e4567-e89b-12d3-a456-426614174000';

      // 満杯の盤面（黒35個、白29個）
      const fullBoard = Array(8)
        .fill(null)
        .map((_, row) =>
          Array(8)
            .fill(null)
            .map((_, col) => {
              if (row < 4 || (row === 4 && col < 3)) return CellState.Black;
              return CellState.White;
            })
        );

      const boardStateJson = JSON.stringify({ board: fullBoard });

      // ゲーム取得のモック
      mockGetById.mockResolvedValueOnce({
        PK: `GAME#${gameId}`,
        SK: `GAME#${gameId}`,
        GSI1PK: 'GAME#STATUS#ACTIVE',
        GSI1SK: '2024-01-01T00:00:00.000Z',
        entityType: 'GAME',
        gameId,
        gameType: 'OTHELLO',
        status: 'ACTIVE',
        aiSide: 'BLACK',
        currentTurn: 60,
        boardState: boardStateJson,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      // finish呼び出しのモック
      mockFinish.mockResolvedValueOnce(undefined);

      // ゲーム終了検知を実行（GameServiceを直接使用）
      const { GameService } = await import('../services/game.js');
      const { GameRepository } = await import('../lib/dynamodb/repositories/game.js');
      const gameRepository = new GameRepository();
      const gameService = new GameService(gameRepository);

      await gameService.checkAndFinishGame(gameId);

      // finishが呼ばれたことを確認
      expect(mockFinish).toHaveBeenCalledWith(gameId, 'AI');

      // 再度取得して終了状態を確認
      mockGetById.mockResolvedValueOnce({
        PK: `GAME#${gameId}`,
        SK: `GAME#${gameId}`,
        GSI1PK: 'GAME#STATUS#FINISHED',
        GSI1SK: '2024-01-01T01:00:00.000Z',
        entityType: 'GAME',
        gameId,
        gameType: 'OTHELLO',
        status: 'FINISHED',
        aiSide: 'BLACK',
        currentTurn: 60,
        boardState: boardStateJson,
        winner: 'AI',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T01:00:00.000Z',
      });

      const getRes = await app.request(`/api/games/${gameId}`);
      expect(getRes.status).toBe(200);
      const game = await getRes.json();

      expect(game.status).toBe('FINISHED');
      expect(game.winner).toBe('AI');
    });

    it('引き分けの場合、winnerがDRAWになる', async () => {
      const gameId = '123e4567-e89b-12d3-a456-426614174000';

      // 引き分けの盤面（黒32個、白32個）
      const drawBoard = Array(8)
        .fill(null)
        .map((_, row) =>
          Array(8)
            .fill(null)
            .map(() => {
              if (row < 4) return CellState.Black;
              return CellState.White;
            })
        );

      const boardStateJson = JSON.stringify({ board: drawBoard });

      // ゲーム取得のモック
      mockGetById.mockResolvedValueOnce({
        PK: `GAME#${gameId}`,
        SK: `GAME#${gameId}`,
        GSI1PK: 'GAME#STATUS#ACTIVE',
        GSI1SK: '2024-01-01T00:00:00.000Z',
        entityType: 'GAME',
        gameId,
        gameType: 'OTHELLO',
        status: 'ACTIVE',
        aiSide: 'BLACK',
        currentTurn: 60,
        boardState: boardStateJson,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      // finish呼び出しのモック
      mockFinish.mockResolvedValueOnce(undefined);

      // ゲーム終了検知を実行
      const { GameService } = await import('../services/game.js');
      const { GameRepository } = await import('../lib/dynamodb/repositories/game.js');
      const gameRepository = new GameRepository();
      const gameService = new GameService(gameRepository);

      await gameService.checkAndFinishGame(gameId);

      // finishが引き分けで呼ばれたことを確認
      expect(mockFinish).toHaveBeenCalledWith(gameId, 'DRAW');

      // 再度取得して引き分けを確認
      mockGetById.mockResolvedValueOnce({
        PK: `GAME#${gameId}`,
        SK: `GAME#${gameId}`,
        GSI1PK: 'GAME#STATUS#FINISHED',
        GSI1SK: '2024-01-01T01:00:00.000Z',
        entityType: 'GAME',
        gameId,
        gameType: 'OTHELLO',
        status: 'FINISHED',
        aiSide: 'BLACK',
        currentTurn: 60,
        boardState: boardStateJson,
        winner: 'DRAW',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T01:00:00.000Z',
      });

      const getRes = await app.request(`/api/games/${gameId}`);
      expect(getRes.status).toBe(200);
      const game = await getRes.json();

      expect(game.status).toBe('FINISHED');
      expect(game.winner).toBe('DRAW');
    });

    it('集合知が勝利した場合、winnerがCOLLECTIVEになる', async () => {
      const gameId = '123e4567-e89b-12d3-a456-426614174000';

      // 白が多い盤面（黒20個、白44個）、AIは黒
      const collectiveWinBoard = Array(8)
        .fill(null)
        .map((_, row) =>
          Array(8)
            .fill(null)
            .map((_, col) => {
              if (row < 2 && col < 5) return CellState.Black;
              return CellState.White;
            })
        );

      const boardStateJson = JSON.stringify({ board: collectiveWinBoard });

      // ゲーム取得のモック
      mockGetById.mockResolvedValueOnce({
        PK: `GAME#${gameId}`,
        SK: `GAME#${gameId}`,
        GSI1PK: 'GAME#STATUS#ACTIVE',
        GSI1SK: '2024-01-01T00:00:00.000Z',
        entityType: 'GAME',
        gameId,
        gameType: 'OTHELLO',
        status: 'ACTIVE',
        aiSide: 'BLACK', // AIは黒
        currentTurn: 60,
        boardState: boardStateJson,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      // finish呼び出しのモック
      mockFinish.mockResolvedValueOnce(undefined);

      // ゲーム終了検知を実行
      const { GameService } = await import('../services/game.js');
      const { GameRepository } = await import('../lib/dynamodb/repositories/game.js');
      const gameRepository = new GameRepository();
      const gameService = new GameService(gameRepository);

      await gameService.checkAndFinishGame(gameId);

      // finishが集合知の勝利で呼ばれたことを確認
      expect(mockFinish).toHaveBeenCalledWith(gameId, 'COLLECTIVE');

      // 再度取得して集合知の勝利を確認
      mockGetById.mockResolvedValueOnce({
        PK: `GAME#${gameId}`,
        SK: `GAME#${gameId}`,
        GSI1PK: 'GAME#STATUS#FINISHED',
        GSI1SK: '2024-01-01T01:00:00.000Z',
        entityType: 'GAME',
        gameId,
        gameType: 'OTHELLO',
        status: 'FINISHED',
        aiSide: 'BLACK',
        currentTurn: 60,
        boardState: boardStateJson,
        winner: 'COLLECTIVE', // 集合知（白）の勝利
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T01:00:00.000Z',
      });

      const getRes = await app.request(`/api/games/${gameId}`);
      expect(getRes.status).toBe(200);
      const game = await getRes.json();

      expect(game.status).toBe('FINISHED');
      expect(game.winner).toBe('COLLECTIVE');
    });
  });

  describe('複合フロー', () => {
    it('ゲーム作成→一覧取得→詳細取得の完全なフローが正常に動作する', async () => {
      // Step 1: 3つのゲームを作成
      const createdGames = [];
      const gameIds = [
        '111e4567-e89b-12d3-a456-426614174000',
        '222e4567-e89b-12d3-a456-426614174000',
        '333e4567-e89b-12d3-a456-426614174000',
      ];

      for (let i = 0; i < 3; i++) {
        const gameId = gameIds[i];
        const mockEntity: GameEntity = {
          PK: `GAME#${gameId}`,
          SK: `GAME#${gameId}`,
          GSI1PK: 'GAME#STATUS#ACTIVE',
          GSI1SK: new Date().toISOString(),
          entityType: 'GAME',
          gameId,
          gameType: 'OTHELLO',
          status: 'ACTIVE',
          aiSide: i % 2 === 0 ? 'BLACK' : 'WHITE',
          currentTurn: 0,
          boardState: '{"board":[]}',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        mockCreate.mockResolvedValueOnce(mockEntity);
        mockUpdateBoardState.mockResolvedValueOnce(undefined);

        const createRes = await app.request('/api/games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameType: 'OTHELLO',
            aiSide: i % 2 === 0 ? 'BLACK' : 'WHITE',
          }),
        });

        expect(createRes.status).toBe(201);
        const game = await createRes.json();
        createdGames.push(game);
      }

      // Step 2: ゲーム一覧を取得
      mockListByStatus.mockResolvedValueOnce({
        items: createdGames.map((g) => ({
          PK: `GAME#${g.gameId}`,
          SK: `GAME#${g.gameId}`,
          GSI1PK: 'GAME#STATUS#ACTIVE',
          GSI1SK: g.createdAt,
          entityType: 'GAME',
          gameId: g.gameId,
          gameType: 'OTHELLO',
          status: 'ACTIVE',
          aiSide: g.aiSide,
          currentTurn: 0,
          boardState: JSON.stringify(g.boardState),
          createdAt: g.createdAt,
          updatedAt: g.updatedAt,
        })),
      });

      const listRes = await app.request('/api/games?limit=10');
      expect(listRes.status).toBe(200);
      const listData = await listRes.json();

      expect(listData.games).toHaveLength(3);
      expect(listData.games.every((g: { status: string }) => g.status === 'ACTIVE')).toBe(true);

      // Step 3: 各ゲームの詳細を取得
      for (const game of createdGames) {
        mockGetById.mockResolvedValueOnce({
          PK: `GAME#${game.gameId}`,
          SK: `GAME#${game.gameId}`,
          GSI1PK: 'GAME#STATUS#ACTIVE',
          GSI1SK: game.createdAt,
          entityType: 'GAME',
          gameId: game.gameId,
          gameType: 'OTHELLO',
          status: 'ACTIVE',
          aiSide: game.aiSide,
          currentTurn: 0,
          boardState: JSON.stringify(game.boardState),
          createdAt: game.createdAt,
          updatedAt: game.updatedAt,
        });

        const getRes = await app.request(`/api/games/${game.gameId}`);
        expect(getRes.status).toBe(200);

        const detailGame = await getRes.json();
        expect(detailGame.gameId).toBe(game.gameId);
        expect(detailGame.boardState).toEqual(game.boardState);
      }
    });
  });
});
