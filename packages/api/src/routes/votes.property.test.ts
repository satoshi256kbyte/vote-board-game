/**
 * Vote API Routes プロパティベーステスト
 *
 * Property 10: エラーレスポンスの一貫性検証
 *
 * Requirements: 9.1, 9.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { Hono } from 'hono';
import { createGameVotesRouter } from './votes.js';
import { CandidateNotFoundError, VotingClosedError, AlreadyVotedError } from '../services/vote.js';
import { GameNotFoundError, TurnNotFoundError } from '../services/candidate.js';
import type { AuthVariables } from '../lib/auth/types.js';

const validGameId = '550e8400-e29b-41d4-a716-446655440000';
const validCandidateId = '789e0123-e89b-12d3-a456-426614174002';

describe('Vote API - プロパティテスト', () => {
  let app: Hono;
  let mockService: { createVote: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockService = { createVote: vi.fn() };
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
});
