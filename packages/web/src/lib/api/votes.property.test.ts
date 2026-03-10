/**
 * Property-based tests for votes API client
 *
 * Tests universal properties that should hold for all valid inputs.
 * Uses fast-check for property-based testing.
 */

import { describe, it, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { createVote, changeVote } from './votes';
import { ApiError } from './client';
import { storageService } from '@/lib/services/storage-service';

// Mock storage service
vi.mock('@/lib/services/storage-service', () => ({
  storageService: {
    getAccessToken: vi.fn(),
  },
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('votes API client - Property-based tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: user is authenticated
    vi.mocked(storageService.getAccessToken).mockReturnValue('mock-token');
    // Set API URL
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 7: エラーメッセージの表示
   * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 11.4
   *
   * For any error status code, appropriate error messages are returned
   */
  describe('Property 7: エラーメッセージの表示', () => {
    it('createVote: 401エラーは常に認証エラーメッセージを返す', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.integer({ min: 0, max: 100 }),
          fc.uuid(),
          async (gameId, turnNumber, candidateId) => {
            // Arrange: 401 Unauthorized response
            mockFetch.mockClear();
            mockFetch.mockResolvedValue({
              ok: false,
              status: 401,
              json: async () => ({ error: 'UNAUTHORIZED', message: 'Unauthorized' }),
            });

            // Act & Assert
            try {
              await createVote(gameId, turnNumber, candidateId);
              return false; // Should have thrown
            } catch (error) {
              // Validate error properties
              if (!(error instanceof ApiError)) return false;
              if (error.message !== '認証が必要です。ログインしてください。') return false;
              if (error.statusCode !== 401) return false;
              return true;
            }
          }
        ),
        { numRuns: 10, endOnFailure: true }
      );
    });

    it('createVote: 409エラーは常に既に投票済みメッセージを返す', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.integer({ min: 0, max: 100 }),
          fc.uuid(),
          async (gameId, turnNumber, candidateId) => {
            // Arrange: 409 Conflict (ALREADY_VOTED) response
            mockFetch.mockClear();
            mockFetch.mockResolvedValue({
              ok: false,
              status: 409,
              json: async () => ({ error: 'ALREADY_VOTED', message: 'Already voted' }),
            });

            // Act & Assert
            try {
              await createVote(gameId, turnNumber, candidateId);
              return false; // Should have thrown
            } catch (error) {
              // Validate error properties
              if (!(error instanceof ApiError)) return false;
              if (error.message !== '既に投票済みです') return false;
              if (error.statusCode !== 409) return false;
              if (error.errorCode !== 'ALREADY_VOTED') return false;
              return true;
            }
          }
        ),
        { numRuns: 10, endOnFailure: true }
      );
    });

    it('createVote: 400 VOTING_CLOSEDエラーは常に投票締切メッセージを返す', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.integer({ min: 0, max: 100 }),
          fc.uuid(),
          async (gameId, turnNumber, candidateId) => {
            // Arrange: 400 Bad Request (VOTING_CLOSED) response
            mockFetch.mockClear();
            mockFetch.mockResolvedValue({
              ok: false,
              status: 400,
              json: async () => ({ error: 'VOTING_CLOSED', message: 'Voting is closed' }),
            });

            // Act & Assert
            try {
              await createVote(gameId, turnNumber, candidateId);
              return false; // Should have thrown
            } catch (error) {
              // Validate error properties
              if (!(error instanceof ApiError)) return false;
              if (error.message !== '投票期間が終了しています') return false;
              if (error.statusCode !== 400) return false;
              if (error.errorCode !== 'VOTING_CLOSED') return false;
              return true;
            }
          }
        ),
        { numRuns: 10, endOnFailure: true }
      );
    });

    it('createVote: 500エラーは常にサーバーエラーメッセージを返す', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.integer({ min: 0, max: 100 }),
          fc.uuid(),
          async (gameId, turnNumber, candidateId) => {
            // Arrange: 500 Internal Server Error response
            mockFetch.mockClear();
            mockFetch.mockResolvedValue({
              ok: false,
              status: 500,
              json: async () => ({ error: 'INTERNAL_ERROR', message: 'Internal server error' }),
            });

            // Act & Assert
            try {
              await createVote(gameId, turnNumber, candidateId);
              return false; // Should have thrown
            } catch (error) {
              // Validate error properties
              if (!(error instanceof ApiError)) return false;
              if (error.message !== '投票に失敗しました。もう一度お試しください。') return false;
              if (error.statusCode !== 500) return false;
              return true;
            }
          }
        ),
        { numRuns: 10, endOnFailure: true }
      );
    });

    it('createVote: ネットワークエラーは常にネットワークエラーメッセージを返す', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.integer({ min: 0, max: 100 }),
          fc.uuid(),
          async (gameId, turnNumber, candidateId) => {
            // Arrange: Network error (fetch throws)
            mockFetch.mockClear();
            mockFetch.mockRejectedValue(new Error('Network error'));

            // Act & Assert
            try {
              await createVote(gameId, turnNumber, candidateId);
              return false; // Should have thrown
            } catch (error) {
              // Validate error properties
              if (!(error instanceof ApiError)) return false;
              if (error.message !== 'ネットワークエラーが発生しました') return false;
              if (error.statusCode !== 0) return false;
              return true;
            }
          }
        ),
        { numRuns: 10, endOnFailure: true }
      );
    });

    it('changeVote: 401エラーは常に認証エラーメッセージを返す', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.integer({ min: 0, max: 100 }),
          fc.uuid(),
          async (gameId, turnNumber, candidateId) => {
            // Arrange: 401 Unauthorized response
            mockFetch.mockClear();
            mockFetch.mockResolvedValue({
              ok: false,
              status: 401,
              json: async () => ({ error: 'UNAUTHORIZED', message: 'Unauthorized' }),
            });

            // Act & Assert
            try {
              await changeVote(gameId, turnNumber, candidateId);
              return false; // Should have thrown
            } catch (error) {
              // Validate error properties
              if (!(error instanceof ApiError)) return false;
              if (error.message !== '認証が必要です。ログインしてください。') return false;
              if (error.statusCode !== 401) return false;
              return true;
            }
          }
        ),
        { numRuns: 10, endOnFailure: true }
      );
    });

    it('changeVote: 409 NOT_VOTEDエラーは常に未投票メッセージを返す', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.integer({ min: 0, max: 100 }),
          fc.uuid(),
          async (gameId, turnNumber, candidateId) => {
            // Arrange: 409 Conflict (NOT_VOTED) response
            mockFetch.mockClear();
            mockFetch.mockResolvedValue({
              ok: false,
              status: 409,
              json: async () => ({ error: 'NOT_VOTED', message: 'Not voted yet' }),
            });

            // Act & Assert
            try {
              await changeVote(gameId, turnNumber, candidateId);
              return false; // Should have thrown
            } catch (error) {
              // Validate error properties
              if (!(error instanceof ApiError)) return false;
              if (error.message !== 'まだ投票していません') return false;
              if (error.statusCode !== 409) return false;
              if (error.errorCode !== 'NOT_VOTED') return false;
              return true;
            }
          }
        ),
        { numRuns: 10, endOnFailure: true }
      );
    });

    it('changeVote: 400 SAME_CANDIDATEエラーは常に同じ候補エラーメッセージを返す', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.integer({ min: 0, max: 100 }),
          fc.uuid(),
          async (gameId, turnNumber, candidateId) => {
            // Arrange: 400 Bad Request (SAME_CANDIDATE) response
            mockFetch.mockClear();
            mockFetch.mockResolvedValue({
              ok: false,
              status: 400,
              json: async () => ({ error: 'SAME_CANDIDATE', message: 'Same candidate' }),
            });

            // Act & Assert
            try {
              await changeVote(gameId, turnNumber, candidateId);
              return false; // Should have thrown
            } catch (error) {
              // Validate error properties
              if (!(error instanceof ApiError)) return false;
              if (error.message !== '既にこの候補に投票しています') return false;
              if (error.statusCode !== 400) return false;
              if (error.errorCode !== 'SAME_CANDIDATE') return false;
              return true;
            }
          }
        ),
        { numRuns: 10, endOnFailure: true }
      );
    });

    it('changeVote: 400 VOTING_CLOSEDエラーは常に投票締切メッセージを返す', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.integer({ min: 0, max: 100 }),
          fc.uuid(),
          async (gameId, turnNumber, candidateId) => {
            // Arrange: 400 Bad Request (VOTING_CLOSED) response
            mockFetch.mockClear();
            mockFetch.mockResolvedValue({
              ok: false,
              status: 400,
              json: async () => ({ error: 'VOTING_CLOSED', message: 'Voting is closed' }),
            });

            // Act & Assert
            try {
              await changeVote(gameId, turnNumber, candidateId);
              return false; // Should have thrown
            } catch (error) {
              // Validate error properties
              if (!(error instanceof ApiError)) return false;
              if (error.message !== '投票期間が終了しています') return false;
              if (error.statusCode !== 400) return false;
              if (error.errorCode !== 'VOTING_CLOSED') return false;
              return true;
            }
          }
        ),
        { numRuns: 10, endOnFailure: true }
      );
    });

    it('changeVote: 500エラーは常にサーバーエラーメッセージを返す', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.integer({ min: 0, max: 100 }),
          fc.uuid(),
          async (gameId, turnNumber, candidateId) => {
            // Arrange: 500 Internal Server Error response
            mockFetch.mockClear();
            mockFetch.mockResolvedValue({
              ok: false,
              status: 500,
              json: async () => ({ error: 'INTERNAL_ERROR', message: 'Internal server error' }),
            });

            // Act & Assert
            try {
              await changeVote(gameId, turnNumber, candidateId);
              return false; // Should have thrown
            } catch (error) {
              // Validate error properties
              if (!(error instanceof ApiError)) return false;
              if (error.message !== '投票に失敗しました。もう一度お試しください。') return false;
              if (error.statusCode !== 500) return false;
              return true;
            }
          }
        ),
        { numRuns: 10, endOnFailure: true }
      );
    });

    it('changeVote: ネットワークエラーは常にネットワークエラーメッセージを返す', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.integer({ min: 0, max: 100 }),
          fc.uuid(),
          async (gameId, turnNumber, candidateId) => {
            // Arrange: Network error (fetch throws)
            mockFetch.mockClear();
            mockFetch.mockRejectedValue(new Error('Network error'));

            // Act & Assert
            try {
              await changeVote(gameId, turnNumber, candidateId);
              return false; // Should have thrown
            } catch (error) {
              // Validate error properties
              if (!(error instanceof ApiError)) return false;
              if (error.message !== 'ネットワークエラーが発生しました') return false;
              if (error.statusCode !== 0) return false;
              return true;
            }
          }
        ),
        { numRuns: 10, endOnFailure: true }
      );
    });
  });
});
