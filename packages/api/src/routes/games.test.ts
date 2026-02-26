/**
 * Game API Routes Unit Tests
 * Requirements: 1.1, 2.1, 2.4, 3.1, 3.13, 5.2, 5.3, 5.4
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Hono } from 'hono';
import { createGamesRouter } from './games.js';
import type { GetGamesResponse, GetGameResponse, CreateGameResponse } from '../types/game.js';

describe('Game API Routes', () => {
  let app: Hono;
  let mockGameService: {
    listGames: ReturnType<typeof vi.fn>;
    getGame: ReturnType<typeof vi.fn>;
    createGame: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // モックGameServiceを作成
    mockGameService = {
      listGames: vi.fn(),
      getGame: vi.fn(),
      createGame: vi.fn(),
    };

    // Honoアプリのセットアップ（モックを注入）
    app = new Hono();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    app.route('/api/games', createGamesRouter(mockGameService as any));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/games', () => {
    describe('正常系', () => {
      it('デフォルトパラメータでゲーム一覧を取得できる', async () => {
        // Arrange
        const mockResponse: GetGamesResponse = {
          games: [
            {
              gameId: '123e4567-e89b-12d3-a456-426614174000',
              gameType: 'OTHELLO',
              status: 'ACTIVE',
              aiSide: 'BLACK',
              currentTurn: 5,
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:05:00.000Z',
            },
          ],
        };
        mockGameService.listGames.mockResolvedValue(mockResponse);

        // Act
        const res = await app.request('/api/games');
        const data = await res.json();

        // Assert
        expect(res.status).toBe(200);
        expect(data).toEqual(mockResponse);
        expect(mockGameService.listGames).toHaveBeenCalledWith({
          status: 'ACTIVE',
          limit: 20,
          cursor: undefined,
        });
      });

      it('statusパラメータでフィルタリングできる', async () => {
        // Arrange
        const mockResponse: GetGamesResponse = {
          games: [
            {
              gameId: '123e4567-e89b-12d3-a456-426614174000',
              gameType: 'OTHELLO',
              status: 'FINISHED',
              aiSide: 'WHITE',
              currentTurn: 60,
              winner: 'AI',
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T01:00:00.000Z',
            },
          ],
        };
        mockGameService.listGames.mockResolvedValue(mockResponse);

        // Act
        const res = await app.request('/api/games?status=FINISHED');
        const data = await res.json();

        // Assert
        expect(res.status).toBe(200);
        expect(data).toEqual(mockResponse);
        expect(mockGameService.listGames).toHaveBeenCalledWith({
          status: 'FINISHED',
          limit: 20,
          cursor: undefined,
        });
      });

      it('limitパラメータで取得件数を指定できる', async () => {
        // Arrange
        const mockResponse: GetGamesResponse = {
          games: [],
        };
        mockGameService.listGames.mockResolvedValue(mockResponse);

        // Act
        const res = await app.request('/api/games?limit=50');
        const data = await res.json();

        // Assert
        expect(res.status).toBe(200);
        expect(data).toEqual(mockResponse);
        expect(mockGameService.listGames).toHaveBeenCalledWith({
          status: 'ACTIVE',
          limit: 50,
          cursor: undefined,
        });
      });

      it('cursorパラメータでページネーションできる', async () => {
        // Arrange
        const mockResponse: GetGamesResponse = {
          games: [],
          nextCursor: 'next-cursor-value',
        };
        mockGameService.listGames.mockResolvedValue(mockResponse);

        // Act
        const res = await app.request('/api/games?cursor=current-cursor');
        const data = await res.json();

        // Assert
        expect(res.status).toBe(200);
        expect(data).toEqual(mockResponse);
        expect(mockGameService.listGames).toHaveBeenCalledWith({
          status: 'ACTIVE',
          limit: 20,
          cursor: 'current-cursor',
        });
      });
    });

    describe('エラー系', () => {
      it('無効なstatusパラメータで400エラーを返す', async () => {
        // Act
        const res = await app.request('/api/games?status=INVALID');
        const data = await res.json();

        // Assert
        expect(res.status).toBe(400);
        expect(data.error).toBe('VALIDATION_ERROR');
        expect(data.message).toBe('Validation failed');
        expect(data.details.fields).toBeDefined();
      });

      it('limitが範囲外の場合に400エラーを返す', async () => {
        // Act
        const res = await app.request('/api/games?limit=0');
        const data = await res.json();

        // Assert
        expect(res.status).toBe(400);
        expect(data.error).toBe('VALIDATION_ERROR');
      });

      it('サービス層でエラーが発生した場合に500エラーを返す', async () => {
        // Arrange
        mockGameService.listGames.mockRejectedValue(new Error('Database error'));

        // Act
        const res = await app.request('/api/games');
        const data = await res.json();

        // Assert
        expect(res.status).toBe(500);
        expect(data.error).toBe('INTERNAL_ERROR');
        expect(data.message).toBe('Failed to retrieve games');
      });
    });
  });

  describe('GET /api/games/:gameId', () => {
    describe('正常系', () => {
      it('ゲーム詳細を取得できる', async () => {
        // Arrange
        const mockResponse: GetGameResponse = {
          gameId: '123e4567-e89b-12d3-a456-426614174000',
          gameType: 'OTHELLO',
          status: 'ACTIVE',
          aiSide: 'BLACK',
          currentTurn: 10,
          boardState: {
            board: [
              [0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 2, 1, 0, 0, 0],
              [0, 0, 0, 1, 2, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0],
            ],
          },
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:10:00.000Z',
        };
        mockGameService.getGame.mockResolvedValue(mockResponse);

        // Act
        const res = await app.request('/api/games/123e4567-e89b-12d3-a456-426614174000');
        const data = await res.json();

        // Assert
        expect(res.status).toBe(200);
        expect(data).toEqual(mockResponse);
        expect(mockGameService.getGame).toHaveBeenCalledWith(
          '123e4567-e89b-12d3-a456-426614174000'
        );
      });

      it('終了したゲームの詳細を取得できる', async () => {
        // Arrange
        const mockResponse: GetGameResponse = {
          gameId: '123e4567-e89b-12d3-a456-426614174000',
          gameType: 'OTHELLO',
          status: 'FINISHED',
          aiSide: 'WHITE',
          currentTurn: 60,
          boardState: {
            board: Array(8).fill(Array(8).fill(1)),
          },
          winner: 'COLLECTIVE',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T01:00:00.000Z',
        };
        mockGameService.getGame.mockResolvedValue(mockResponse);

        // Act
        const res = await app.request('/api/games/123e4567-e89b-12d3-a456-426614174000');
        const data = await res.json();

        // Assert
        expect(res.status).toBe(200);
        expect(data).toEqual(mockResponse);
        expect(data.winner).toBe('COLLECTIVE');
      });
    });

    describe('エラー系', () => {
      it('存在しないゲームIDで404エラーを返す', async () => {
        // Arrange
        mockGameService.getGame.mockResolvedValue(null);

        // Act
        const res = await app.request('/api/games/123e4567-e89b-12d3-a456-426614174000');
        const data = await res.json();

        // Assert
        expect(res.status).toBe(404);
        expect(data.error).toBe('NOT_FOUND');
        expect(data.message).toBe('Game not found');
      });

      it('無効なUUID形式で400エラーを返す', async () => {
        // Act
        const res = await app.request('/api/games/invalid-uuid');
        const data = await res.json();

        // Assert
        expect(res.status).toBe(400);
        expect(data.error).toBe('VALIDATION_ERROR');
        expect(data.details.fields).toBeDefined();
      });

      it('サービス層でエラーが発生した場合に500エラーを返す', async () => {
        // Arrange
        mockGameService.getGame.mockRejectedValue(new Error('Database error'));

        // Act
        const res = await app.request('/api/games/123e4567-e89b-12d3-a456-426614174000');
        const data = await res.json();

        // Assert
        expect(res.status).toBe(500);
        expect(data.error).toBe('INTERNAL_ERROR');
        expect(data.message).toBe('Failed to retrieve game');
      });
    });
  });

  describe('POST /api/games', () => {
    describe('正常系', () => {
      it('新しいゲームを作成できる（AI: BLACK）', async () => {
        // Arrange
        const mockResponse: CreateGameResponse = {
          gameId: '123e4567-e89b-12d3-a456-426614174000',
          gameType: 'OTHELLO',
          status: 'ACTIVE',
          aiSide: 'BLACK',
          currentTurn: 0,
          boardState: {
            board: [
              [0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 2, 1, 0, 0, 0],
              [0, 0, 0, 1, 2, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0],
            ],
          },
          winner: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        };
        mockGameService.createGame.mockResolvedValue(mockResponse);

        // Act
        const res = await app.request('/api/games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameType: 'OTHELLO',
            aiSide: 'BLACK',
          }),
        });
        const data = await res.json();

        // Assert
        expect(res.status).toBe(201);
        expect(data).toEqual(mockResponse);
        expect(mockGameService.createGame).toHaveBeenCalledWith({
          gameType: 'OTHELLO',
          aiSide: 'BLACK',
        });
      });

      it('新しいゲームを作成できる（AI: WHITE）', async () => {
        // Arrange
        const mockResponse: CreateGameResponse = {
          gameId: '123e4567-e89b-12d3-a456-426614174000',
          gameType: 'OTHELLO',
          status: 'ACTIVE',
          aiSide: 'WHITE',
          currentTurn: 0,
          boardState: {
            board: [
              [0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 2, 1, 0, 0, 0],
              [0, 0, 0, 1, 2, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0],
            ],
          },
          winner: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        };
        mockGameService.createGame.mockResolvedValue(mockResponse);

        // Act
        const res = await app.request('/api/games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameType: 'OTHELLO',
            aiSide: 'WHITE',
          }),
        });
        const data = await res.json();

        // Assert
        expect(res.status).toBe(201);
        expect(data).toEqual(mockResponse);
        expect(mockGameService.createGame).toHaveBeenCalledWith({
          gameType: 'OTHELLO',
          aiSide: 'WHITE',
        });
      });
    });

    describe('エラー系', () => {
      it('gameTypeが欠落している場合に400エラーを返す', async () => {
        // Act
        const res = await app.request('/api/games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            aiSide: 'BLACK',
          }),
        });
        const data = await res.json();

        // Assert
        expect(res.status).toBe(400);
        expect(data.error).toBe('VALIDATION_ERROR');
        expect(data.message).toBe('Validation failed');
        expect(data.details.fields).toBeDefined();
      });

      it('aiSideが欠落している場合に400エラーを返す', async () => {
        // Act
        const res = await app.request('/api/games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameType: 'OTHELLO',
          }),
        });
        const data = await res.json();

        // Assert
        expect(res.status).toBe(400);
        expect(data.error).toBe('VALIDATION_ERROR');
        expect(data.message).toBe('Validation failed');
        expect(data.details.fields).toBeDefined();
      });

      it('無効なgameTypeで400エラーを返す', async () => {
        // Act
        const res = await app.request('/api/games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameType: 'CHESS',
            aiSide: 'BLACK',
          }),
        });
        const data = await res.json();

        // Assert
        expect(res.status).toBe(400);
        expect(data.error).toBe('VALIDATION_ERROR');
        expect(data.details.fields).toBeDefined();
      });

      it('無効なaiSideで400エラーを返す', async () => {
        // Act
        const res = await app.request('/api/games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameType: 'OTHELLO',
            aiSide: 'RED',
          }),
        });
        const data = await res.json();

        // Assert
        expect(res.status).toBe(400);
        expect(data.error).toBe('VALIDATION_ERROR');
        expect(data.details.fields).toBeDefined();
      });

      it('リクエストボディが空の場合に400エラーを返す', async () => {
        // Act
        const res = await app.request('/api/games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const data = await res.json();

        // Assert
        expect(res.status).toBe(400);
        expect(data.error).toBe('VALIDATION_ERROR');
        expect(data.details.fields).toBeDefined();
      });

      it('サービス層でエラーが発生した場合に500エラーを返す', async () => {
        // Arrange
        mockGameService.createGame.mockRejectedValue(new Error('Database error'));

        // Act
        const res = await app.request('/api/games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameType: 'OTHELLO',
            aiSide: 'BLACK',
          }),
        });
        const data = await res.json();

        // Assert
        expect(res.status).toBe(500);
        expect(data.error).toBe('INTERNAL_ERROR');
        expect(data.message).toBe('Failed to create game');
      });
    });
  });
});
