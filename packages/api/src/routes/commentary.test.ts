/**
 * Commentary API Routes Unit Tests
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Hono } from 'hono';
import { createCommentaryRouter } from './commentary.js';

describe('Commentary API Routes', () => {
  let app: Hono;
  let mockCommentaryRepo: {
    listByGame: ReturnType<typeof vi.fn>;
  };
  let mockGameRepo: {
    getById: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockCommentaryRepo = {
      listByGame: vi.fn(),
    };
    mockGameRepo = {
      getById: vi.fn(),
    };

    app = new Hono();
    app.route('/api', createCommentaryRouter(mockCommentaryRepo as never, mockGameRepo as never));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/games/:gameId/commentary', () => {
    const gameId = '123e4567-e89b-12d3-a456-426614174000';
    const mockGame = {
      PK: `GAME#${gameId}`,
      SK: `GAME#${gameId}`,
      entityType: 'GAME',
      gameId,
      gameType: 'OTHELLO',
      status: 'ACTIVE',
      aiSide: 'BLACK',
      currentTurn: 5,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:05:00.000Z',
    };

    describe('正常系', () => {
      it('解説一覧をturnNumber昇順で取得できる', async () => {
        // Arrange
        mockGameRepo.getById.mockResolvedValue(mockGame);
        mockCommentaryRepo.listByGame.mockResolvedValue([
          {
            PK: `GAME#${gameId}`,
            SK: 'COMMENTARY#3',
            entityType: 'COMMENTARY',
            gameId,
            turnNumber: 3,
            content: 'ターン3の解説',
            generatedBy: 'AI',
            createdAt: '2024-01-01T00:03:00.000Z',
          },
          {
            PK: `GAME#${gameId}`,
            SK: 'COMMENTARY#1',
            entityType: 'COMMENTARY',
            gameId,
            turnNumber: 1,
            content: 'ターン1の解説',
            generatedBy: 'AI',
            createdAt: '2024-01-01T00:01:00.000Z',
          },
          {
            PK: `GAME#${gameId}`,
            SK: 'COMMENTARY#2',
            entityType: 'COMMENTARY',
            gameId,
            turnNumber: 2,
            content: 'ターン2の解説',
            generatedBy: 'AI',
            createdAt: '2024-01-01T00:02:00.000Z',
          },
        ]);

        // Act
        const res = await app.request(`/api/games/${gameId}/commentary`);
        const data = await res.json();

        // Assert
        expect(res.status).toBe(200);
        expect(data.commentaries).toHaveLength(3);
        expect(data.commentaries[0].turnNumber).toBe(1);
        expect(data.commentaries[1].turnNumber).toBe(2);
        expect(data.commentaries[2].turnNumber).toBe(3);
        expect(mockGameRepo.getById).toHaveBeenCalledWith(gameId);
        expect(mockCommentaryRepo.listByGame).toHaveBeenCalledWith(gameId);
      });

      it('レスポンスに必須フィールド（turnNumber, content, generatedBy, createdAt）が含まれる', async () => {
        // Arrange
        mockGameRepo.getById.mockResolvedValue(mockGame);
        mockCommentaryRepo.listByGame.mockResolvedValue([
          {
            PK: `GAME#${gameId}`,
            SK: 'COMMENTARY#1',
            entityType: 'COMMENTARY',
            gameId,
            turnNumber: 1,
            content: 'テスト解説',
            generatedBy: 'AI',
            createdAt: '2024-01-01T00:01:00.000Z',
          },
        ]);

        // Act
        const res = await app.request(`/api/games/${gameId}/commentary`);
        const data = await res.json();

        // Assert
        expect(res.status).toBe(200);
        const commentary = data.commentaries[0];
        expect(commentary).toEqual({
          turnNumber: 1,
          content: 'テスト解説',
          generatedBy: 'AI',
          createdAt: '2024-01-01T00:01:00.000Z',
        });
        // 内部フィールド（PK, SK, entityType, gameId）が含まれないことを確認
        expect(commentary).not.toHaveProperty('PK');
        expect(commentary).not.toHaveProperty('SK');
        expect(commentary).not.toHaveProperty('entityType');
        expect(commentary).not.toHaveProperty('gameId');
      });

      it('解説が存在しない場合は空のcommentaries配列を返す', async () => {
        // Arrange
        mockGameRepo.getById.mockResolvedValue(mockGame);
        mockCommentaryRepo.listByGame.mockResolvedValue([]);

        // Act
        const res = await app.request(`/api/games/${gameId}/commentary`);
        const data = await res.json();

        // Assert
        expect(res.status).toBe(200);
        expect(data.commentaries).toEqual([]);
      });
    });

    describe('エラー系', () => {
      it('存在しないgameIdで404エラーを返す', async () => {
        // Arrange
        mockGameRepo.getById.mockResolvedValue(null);

        // Act
        const res = await app.request(`/api/games/${gameId}/commentary`);
        const data = await res.json();

        // Assert
        expect(res.status).toBe(404);
        expect(data.error).toBe('NOT_FOUND');
        expect(data.message).toBe('Game not found');
        expect(mockCommentaryRepo.listByGame).not.toHaveBeenCalled();
      });

      it('リポジトリでエラーが発生した場合に500エラーを返す', async () => {
        // Arrange
        mockGameRepo.getById.mockRejectedValue(new Error('Database error'));

        // Act
        const res = await app.request(`/api/games/${gameId}/commentary`);
        const data = await res.json();

        // Assert
        expect(res.status).toBe(500);
        expect(data.error).toBe('INTERNAL_ERROR');
        expect(data.message).toBe('Failed to retrieve commentaries');
      });
    });

    describe('ソート順の検証', () => {
      it('ランダムな順序の解説がturnNumber昇順にソートされる', async () => {
        // Arrange
        mockGameRepo.getById.mockResolvedValue(mockGame);
        mockCommentaryRepo.listByGame.mockResolvedValue([
          {
            PK: `GAME#${gameId}`,
            SK: 'COMMENTARY#5',
            entityType: 'COMMENTARY',
            gameId,
            turnNumber: 5,
            content: 'ターン5の解説',
            generatedBy: 'AI',
            createdAt: '2024-01-01T00:05:00.000Z',
          },
          {
            PK: `GAME#${gameId}`,
            SK: 'COMMENTARY#1',
            entityType: 'COMMENTARY',
            gameId,
            turnNumber: 1,
            content: 'ターン1の解説',
            generatedBy: 'AI',
            createdAt: '2024-01-01T00:01:00.000Z',
          },
          {
            PK: `GAME#${gameId}`,
            SK: 'COMMENTARY#3',
            entityType: 'COMMENTARY',
            gameId,
            turnNumber: 3,
            content: 'ターン3の解説',
            generatedBy: 'AI',
            createdAt: '2024-01-01T00:03:00.000Z',
          },
          {
            PK: `GAME#${gameId}`,
            SK: 'COMMENTARY#2',
            entityType: 'COMMENTARY',
            gameId,
            turnNumber: 2,
            content: 'ターン2の解説',
            generatedBy: 'AI',
            createdAt: '2024-01-01T00:02:00.000Z',
          },
          {
            PK: `GAME#${gameId}`,
            SK: 'COMMENTARY#4',
            entityType: 'COMMENTARY',
            gameId,
            turnNumber: 4,
            content: 'ターン4の解説',
            generatedBy: 'AI',
            createdAt: '2024-01-01T00:04:00.000Z',
          },
        ]);

        // Act
        const res = await app.request(`/api/games/${gameId}/commentary`);
        const data = await res.json();

        // Assert
        expect(res.status).toBe(200);
        expect(data.commentaries).toHaveLength(5);
        for (let i = 0; i < data.commentaries.length - 1; i++) {
          expect(data.commentaries[i].turnNumber).toBeLessThan(data.commentaries[i + 1].turnNumber);
        }
      });
    });
  });
});
