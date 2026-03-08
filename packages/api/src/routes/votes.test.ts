/**
 * Vote API Routes Unit Tests
 *
 * Requirements: 1.1, 3.1, 3.2, 4.1, 4.2, 5.1, 6.1, 8.1, 9.1
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Hono } from 'hono';
import { createGameVotesRouter } from './votes.js';
import { CandidateNotFoundError, VotingClosedError, AlreadyVotedError } from '../services/vote.js';
import { GameNotFoundError, TurnNotFoundError } from '../services/candidate.js';
import type { AuthVariables } from '../lib/auth/types.js';
import type { VoteResponse } from '../types/vote.js';

const validGameId = '550e8400-e29b-41d4-a716-446655440000';
const validCandidateId = '789e0123-e89b-12d3-a456-426614174002';
const userId = 'user-123';

describe('POST /api/games/:gameId/turns/:turnNumber/votes', () => {
  let app: Hono;
  let mockService: { createVote: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockService = { createVote: vi.fn() };
    app = new Hono<{ Variables: AuthVariables }>();
    // 認証ミドルウェアのモック: userId をセット
    app.use('*', async (c, next) => {
      c.set('userId', userId);
      await next();
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    app.route('/api', createGameVotesRouter(mockService as any));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('正常系 (201 Created)', () => {
    it('投票を作成して201を返す', async () => {
      const mockResponse: VoteResponse = {
        gameId: validGameId,
        turnNumber: 5,
        userId,
        candidateId: validCandidateId,
        createdAt: '2024-01-15T00:00:00.000Z',
      };
      mockService.createVote.mockResolvedValue(mockResponse);

      const res = await app.request(`/api/games/${validGameId}/turns/5/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: validCandidateId }),
      });
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.gameId).toBe(validGameId);
      expect(data.turnNumber).toBe(5);
      expect(data.userId).toBe(userId);
      expect(data.candidateId).toBe(validCandidateId);
      expect(mockService.createVote).toHaveBeenCalledWith(validGameId, 5, validCandidateId, userId);
    });
  });

  describe('バリデーションエラー (400)', () => {
    it('無効なgameIdで400を返す', async () => {
      const res = await app.request('/api/games/not-a-uuid/turns/1/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: validCandidateId }),
      });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
    });

    it('負のturnNumberで400を返す', async () => {
      const res = await app.request(`/api/games/${validGameId}/turns/-1/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: validCandidateId }),
      });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
    });

    it('非UUID形式のcandidateIdで400を返す', async () => {
      const res = await app.request(`/api/games/${validGameId}/turns/5/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: 'invalid' }),
      });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
    });

    it('candidateId未指定で400を返す', async () => {
      const res = await app.request(`/api/games/${validGameId}/turns/5/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('ゲーム未存在 (404)', () => {
    it('GameNotFoundErrorで404を返す', async () => {
      mockService.createVote.mockRejectedValue(new GameNotFoundError(validGameId));

      const res = await app.request(`/api/games/${validGameId}/turns/5/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: validCandidateId }),
      });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('NOT_FOUND');
      expect(data.message).toBe('Game not found');
    });
  });

  describe('ターン未存在 (404)', () => {
    it('TurnNotFoundErrorで404を返す', async () => {
      mockService.createVote.mockRejectedValue(new TurnNotFoundError(validGameId, 99));

      const res = await app.request(`/api/games/${validGameId}/turns/5/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: validCandidateId }),
      });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('NOT_FOUND');
      expect(data.message).toBe('Turn not found');
    });
  });

  describe('候補未存在 (404)', () => {
    it('CandidateNotFoundErrorで404を返す', async () => {
      mockService.createVote.mockRejectedValue(new CandidateNotFoundError(validCandidateId));

      const res = await app.request(`/api/games/${validGameId}/turns/5/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: validCandidateId }),
      });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('NOT_FOUND');
      expect(data.message).toBe('Candidate not found');
    });
  });

  describe('投票締切済み (400)', () => {
    it('VotingClosedErrorで400を返す', async () => {
      mockService.createVote.mockRejectedValue(new VotingClosedError());

      const res = await app.request(`/api/games/${validGameId}/turns/5/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: validCandidateId }),
      });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('VOTING_CLOSED');
    });
  });

  describe('既に投票済み (409)', () => {
    it('AlreadyVotedErrorで409を返す', async () => {
      mockService.createVote.mockRejectedValue(new AlreadyVotedError());

      const res = await app.request(`/api/games/${validGameId}/turns/5/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: validCandidateId }),
      });
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.error).toBe('ALREADY_VOTED');
    });
  });

  describe('認証なし (401)', () => {
    it('userIdが未設定の場合401を返す', async () => {
      // 認証なしのアプリを作成
      const noAuthApp = new Hono<{ Variables: AuthVariables }>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      noAuthApp.route('/api', createGameVotesRouter(mockService as any));

      const res = await noAuthApp.request(`/api/games/${validGameId}/turns/5/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: validCandidateId }),
      });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('UNAUTHORIZED');
    });
  });
});
