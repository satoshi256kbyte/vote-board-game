/**
 * Vote API Routes プロパティベーステスト
 *
 * POST:
 *   Property 10: エラーレスポンスの一貫性検証
 *
 * PUT (Feature: 21-vote-change-api):
 *   Property 9: エラーレスポンスの一貫性検証
 *
 * Requirements: 9.1, 9.2, 10.1, 10.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { Hono } from 'hono';
import { createGameVotesRouter } from './votes.js';
import {
  CandidateNotFoundError,
  VotingClosedError,
  AlreadyVotedError,
  NotVotedError,
  SameCandidateError,
  VoteNotFoundError,
} from '../services/vote.js';
import { GameNotFoundError, TurnNotFoundError } from '../services/candidate.js';
import type { AuthVariables } from '../lib/auth/types.js';

const validGameId = '550e8400-e29b-41d4-a716-446655440000';
const validCandidateId = '789e0123-e89b-12d3-a456-426614174002';

describe('Vote API - プロパティテスト', () => {
  let app: Hono;
  let mockService: {
    createVote: ReturnType<typeof vi.fn>;
    changeVote: ReturnType<typeof vi.fn>;
    getMyVote: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockService = { createVote: vi.fn(), changeVote: vi.fn(), getMyVote: vi.fn() };
    app = new Hono<{ Variables: AuthVariables }>();
    app.use('*', async (c, next) => {
      c.set('userId', 'user-123');
      await next();
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    app.route('/api', createGameVotesRouter(mockService as any));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('Property 10: 各種エラーケースで { error, message } 構造が返される', async () => {
    const errorFactories = [
      () => new GameNotFoundError(validGameId),
      () => new TurnNotFoundError(validGameId, 99),
      () => new CandidateNotFoundError(validCandidateId),
      () => new VotingClosedError(),
      () => new AlreadyVotedError(),
    ];

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: errorFactories.length - 1 }),
        async (errorIndex) => {
          mockService.createVote.mockClear();
          mockService.createVote.mockRejectedValue(errorFactories[errorIndex]());

          const res = await app.request(`/api/games/${validGameId}/turns/5/votes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ candidateId: validCandidateId }),
          });
          const data = await res.json();

          expect(data).toHaveProperty('error');
          expect(data).toHaveProperty('message');
          expect(typeof data.error).toBe('string');
          expect(typeof data.message).toBe('string');
          expect(res.status).toBeGreaterThanOrEqual(400);
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  /**
   * Feature: 21-vote-change-api, Property 9: エラーレスポンスの一貫性
   * PUT /games/:gameId/turns/:turnNumber/votes/me の各種エラーケースで
   * { error, message } 構造が返されることを検証
   * **Validates: Requirements 10.1, 10.2**
   */
  it('Property 9: PUT 投票変更の各種エラーケースで { error, message } 構造が返される', async () => {
    const errorFactories = [
      () => new GameNotFoundError(validGameId),
      () => new TurnNotFoundError(validGameId, 99),
      () => new CandidateNotFoundError(validCandidateId),
      () => new VotingClosedError(),
      () => new NotVotedError(),
      () => new SameCandidateError(),
    ];

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: errorFactories.length - 1 }),
        async (errorIndex) => {
          mockService.changeVote.mockClear();
          mockService.changeVote.mockRejectedValue(errorFactories[errorIndex]());

          const res = await app.request(`/api/games/${validGameId}/turns/5/votes/me`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ candidateId: validCandidateId }),
          });
          const data = await res.json();

          expect(data).toHaveProperty('error');
          expect(data).toHaveProperty('message');
          expect(typeof data.error).toBe('string');
          expect(typeof data.message).toBe('string');
          expect(res.status).toBeGreaterThanOrEqual(400);
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  /**
   * Feature: 22-vote-status-api, Property 6: エラーレスポンスの一貫性
   * GET /games/:gameId/turns/:turnNumber/votes/me の各種エラーケースで
   * { error, message } 構造が返されることを検証
   * **Validates: Requirements 6.1, 6.2**
   */
  it('Property 6: GET 投票状況取得の各種エラーケースで { error, message } 構造が返される', async () => {
    const errorFactories = [
      { factory: () => new VoteNotFoundError(), expectedStatus: 404 },
      { factory: () => new Error('Unexpected error'), expectedStatus: 500 },
    ];

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: errorFactories.length - 1 }),
        async (errorIndex) => {
          mockService.getMyVote.mockClear();
          mockService.getMyVote.mockRejectedValue(errorFactories[errorIndex].factory());

          const res = await app.request(`/api/games/${validGameId}/turns/5/votes/me`, {
            method: 'GET',
          });
          const data = await res.json();

          expect(data).toHaveProperty('error');
          expect(data).toHaveProperty('message');
          expect(typeof data.error).toBe('string');
          expect(typeof data.message).toBe('string');
          expect(res.status).toBe(errorFactories[errorIndex].expectedStatus);
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('Property 6: GET バリデーションエラーで { error, message } 構造が返される', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string().filter((s) => {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          return !uuidRegex.test(s) && s.length > 0;
        }),
        async (invalidGameId) => {
          // Encode dots as %2E to prevent URL path normalization
          // ("." and ".." are special path segments that get normalized away by URL parsers)
          const encodedId = encodeURIComponent(invalidGameId).replace(/\./g, '%2E');
          const res = await app.request(`/api/games/${encodedId}/turns/5/votes/me`, {
            method: 'GET',
          });
          const data = await res.json();

          expect(res.status).toBe(400);
          expect(data).toHaveProperty('error');
          expect(data).toHaveProperty('message');
          expect(typeof data.error).toBe('string');
          expect(typeof data.message).toBe('string');
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });
});
