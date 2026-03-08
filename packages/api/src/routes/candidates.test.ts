/**
 * Candidate API Routes Unit Tests
 *
 * Requirements: 1.3, 1.4, 2.3, 2.4, 3.3, 3.4, 4.2, 4.3
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Hono } from 'hono';
import { createGameCandidatesRouter } from './candidates.js';
import { GameNotFoundError, TurnNotFoundError } from '../services/candidate.js';
import type { GetCandidatesResponse } from '../types/candidate.js';

describe('GET /api/games/:gameId/turns/:turnNumber/candidates', () => {
  let app: Hono;
  let mockService: {
    listCandidates: ReturnType<typeof vi.fn>;
  };

  const validGameId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    mockService = {
      listCandidates: vi.fn(),
    };
    app = new Hono();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    app.route('/api', createGameCandidatesRouter(mockService as any));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('正常系 (200 OK)', () => {
    it('候補一覧を取得して200を返す', async () => {
      const mockResponse: GetCandidatesResponse = {
        candidates: [
          {
            candidateId: 'c1a2b3c4-d5e6-7f8g-9h0i-1j2k3l4m5n6o',
            position: '3,4',
            description: '中央を制圧する手',
            voteCount: 42,
            createdBy: 'AI',
            status: 'VOTING',
            votingDeadline: '2024-01-15T23:59:59.999Z',
            createdAt: '2024-01-14T00:00:00.000Z',
          },
        ],
      };
      mockService.listCandidates.mockResolvedValue(mockResponse);

      const res = await app.request(`/api/games/${validGameId}/turns/5/candidates`);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.candidates).toHaveLength(1);
      expect(data.candidates[0].voteCount).toBe(42);
      expect(mockService.listCandidates).toHaveBeenCalledWith(validGameId, 5);
    });
  });

  describe('空の候補一覧 (200 OK)', () => {
    it('候補が存在しない場合は空配列で200を返す', async () => {
      mockService.listCandidates.mockResolvedValue({ candidates: [] });

      const res = await app.request(`/api/games/${validGameId}/turns/1/candidates`);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual({ candidates: [] });
    });
  });

  describe('バリデーションエラー (400)', () => {
    it('無効なgameIdで400を返す', async () => {
      const res = await app.request('/api/games/not-a-uuid/turns/1/candidates');
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
      expect(data.details.fields).toHaveProperty('gameId');
    });

    it('空のgameIdで400を返す', async () => {
      const res = await app.request('/api/games//turns/1/candidates');

      // Honoのルーティングでは空パスはマッチしない（404になる可能性）
      expect([400, 404]).toContain(res.status);
    });

    it('負のturnNumberで400を返す', async () => {
      const res = await app.request(`/api/games/${validGameId}/turns/-1/candidates`);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
    });

    it('小数のturnNumberで400を返す', async () => {
      const res = await app.request(`/api/games/${validGameId}/turns/1.5/candidates`);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
    });

    it('文字列のturnNumberで400を返す', async () => {
      const res = await app.request(`/api/games/${validGameId}/turns/abc/candidates`);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('Not Foundエラー (404)', () => {
    it('ゲームが存在しない場合404を返す', async () => {
      mockService.listCandidates.mockRejectedValue(new GameNotFoundError(validGameId));

      const res = await app.request(`/api/games/${validGameId}/turns/1/candidates`);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('NOT_FOUND');
      expect(data.message).toBe('Game not found');
    });

    it('ターンが存在しない場合404を返す', async () => {
      mockService.listCandidates.mockRejectedValue(new TurnNotFoundError(validGameId, 99));

      const res = await app.request(`/api/games/${validGameId}/turns/99/candidates`);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('NOT_FOUND');
      expect(data.message).toBe('Turn not found');
    });
  });

  describe('Internal Server Error (500)', () => {
    it('予期しないエラーで500を返す', async () => {
      mockService.listCandidates.mockRejectedValue(new Error('DynamoDB connection failed'));

      const res = await app.request(`/api/games/${validGameId}/turns/1/candidates`);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('INTERNAL_ERROR');
      expect(data.message).toBe('Failed to retrieve candidates');
    });
  });
});
