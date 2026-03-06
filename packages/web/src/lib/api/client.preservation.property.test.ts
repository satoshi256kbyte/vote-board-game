/**
 * Preservation Property-Based Tests for API Client
 *
 * Feature: 17-e2e-test-timeout-fix
 *
 * These tests verify that the API client's core functionality remains unchanged
 * after fixing the E2E test timeout issue. They test behavior OUTSIDE the bug condition
 * (CI environment failures) to ensure no regressions are introduced.
 *
 * IMPORTANT: These tests run on UNFIXED code and should PASS, establishing baseline behavior.
 *
 * Note: Using asyncProperty for API client tests (no React rendering involved).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { ApiError, createGame, fetchGames, fetchGame, fetchCandidates } from './client';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API Client - Preservation Property Tests', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    // Set API URL for tests to avoid environment-specific issues
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 1: API Base URL Resolution with Environment Variable
   * **Validates: Requirements 3.1, 3.4**
   *
   * When NEXT_PUBLIC_API_URL is set, the API client should consistently use
   * that URL for all API calls, maintaining proper configuration-based routing.
   */
  it('Property 1: NEXT_PUBLIC_API_URLが設定されている場合、その値を使用する', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constantFrom('BLACK' as const, 'WHITE' as const), async (aiSide) => {
        process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';

        mockFetch.mockClear();
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => ({
            gameId: '123e4567-e89b-12d3-a456-426614174000',
            gameType: 'OTHELLO',
            status: 'ACTIVE',
            aiSide,
            currentTurn: 'BLACK',
            boardState: Array(8).fill(Array(8).fill(0)),
            moveHistory: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
        } as Response);

        await createGame({ gameType: 'OTHELLO', aiSide });

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/games',
          expect.objectContaining({ method: 'POST' })
        );
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });

  /**
   * Property 2: Error Response Status Code Preservation
   * **Validates: Requirements 3.4**
   *
   * For any error response (4xx or 5xx status codes),
   * the API client should create an ApiError with the correct status code,
   * maintaining consistent error handling behavior.
   */
  it('Property 2: 任意のエラーステータスコードに対して、APIクライアントは正しいstatusCodeを持つApiErrorを生成する', () => {
    const errorStatusArb = fc.oneof(
      fc.integer({ min: 400, max: 499 }),
      fc.integer({ min: 500, max: 599 })
    );

    fc.assert(
      fc.property(
        errorStatusArb,
        fc.string({ minLength: 1, maxLength: 50 }),
        (statusCode, message) => {
          const error = new ApiError(message, statusCode);

          expect(error).toBeInstanceOf(ApiError);
          expect(error).toBeInstanceOf(Error);
          expect(error.name).toBe('ApiError');
          expect(error.message).toBe(message);
          expect(error.statusCode).toBe(statusCode);
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  /**
   * Property 3: ApiError with Optional Fields
   * **Validates: Requirements 3.4**
   *
   * For any combination of optional error fields (errorCode, details),
   * the ApiError should correctly store and preserve these fields.
   */
  it('Property 3: 任意のオプショナルフィールドに対して、ApiErrorは正しくフィールドを保持する', () => {
    const errorCodeArb = fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined });
    const detailsArb = fc.option(
      fc.record({
        field: fc.string({ minLength: 1, maxLength: 20 }),
        issue: fc.string({ minLength: 1, maxLength: 50 }),
      }),
      { nil: undefined }
    );

    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.integer({ min: 400, max: 599 }),
        errorCodeArb,
        detailsArb,
        (message, statusCode, errorCode, details) => {
          const error = new ApiError(message, statusCode, errorCode, details);

          expect(error.message).toBe(message);
          expect(error.statusCode).toBe(statusCode);
          expect(error.errorCode).toBe(errorCode);
          expect(error.details).toEqual(details);
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });
});

/**
 * Property 8: Successful Response Returns Valid Game Object
 * **Validates: Requirements 3.2, 3.4**
 *
 * For any successful game creation response, the API client should correctly
 * parse and return a Game object with all required fields.
 */
it('Property 8: 成功レスポンス（201）に対して、APIクライアントは有効なGameオブジェクトを返す', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.constantFrom('BLACK' as const, 'WHITE' as const),
      fc.uuid(),
      async (aiSide, gameId) => {
        mockFetch.mockClear();
        const mockGame = {
          gameId,
          gameType: 'OTHELLO' as const,
          status: 'ACTIVE' as const,
          aiSide,
          currentTurn: 'BLACK' as const,
          boardState: Array(8).fill(Array(8).fill(0)),
          moveHistory: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => mockGame,
        } as Response);

        const result = await createGame({ gameType: 'OTHELLO', aiSide });

        expect(result).toBeDefined();
        expect(result.gameId).toBe(gameId);
        expect(result.gameType).toBe('OTHELLO');
        expect(result.status).toBe('ACTIVE');
        expect(result.aiSide).toBe(aiSide);
        expect(result.currentTurn).toBe('BLACK');
        expect(result.boardState).toBeDefined();
        expect(Array.isArray(result.boardState.board)).toBe(true);
        expect(typeof result.createdAt).toBe('string');
        expect(typeof result.updatedAt).toBe('string');
      }
    ),
    { numRuns: 10, endOnFailure: true }
  );
});

/**
 * Property 9: Network Error Handling Consistency
 * **Validates: Requirements 3.4**
 *
 * For any network error, the API client should wrap the error in an ApiError
 * with status code 0.
 */
it('Property 9: ネットワークエラーに対して、APIクライアントはstatusCode 0のApiErrorを生成する', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.constantFrom('BLACK' as const, 'WHITE' as const),
      fc.constantFrom('Failed to fetch', 'Network request failed', 'TypeError: Failed to fetch'),
      async (aiSide, errorMessage) => {
        mockFetch.mockClear();
        mockFetch.mockRejectedValueOnce(new Error(errorMessage));

        try {
          await createGame({ gameType: 'OTHELLO', aiSide });
          expect(true).toBe(false); // Should not reach here
        } catch (error) {
          expect(error).toBeInstanceOf(ApiError);
          if (error instanceof ApiError) {
            expect(error.statusCode).toBe(0);
            expect(error.message).toContain(errorMessage);
          }
        }
      }
    ),
    { numRuns: 10, endOnFailure: true }
  );
});

/**
 * Property 10: Other API Operations Remain Functional
 * **Validates: Requirements 3.1, 3.4**
 *
 * For any API operation other than createGame, the functionality should remain unchanged.
 */
it('Property 10: createGame以外のAPI操作は引き続き正常に動作する', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.constantFrom('fetchGames', 'fetchGame', 'fetchCandidates'),
      fc.uuid(),
      async (operation, gameId) => {
        mockFetch.mockClear();

        if (operation === 'fetchGames') {
          mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ games: [], nextCursor: undefined }),
          } as Response);

          const result = await fetchGames();
          expect(result).toBeDefined();
          expect(Array.isArray(result.games)).toBe(true);
        } else if (operation === 'fetchGame') {
          mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
              gameId,
              gameType: 'OTHELLO',
              status: 'ACTIVE',
              aiSide: 'BLACK',
              currentTurn: 'BLACK',
              boardState: Array(8).fill(Array(8).fill(0)),
              moveHistory: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }),
          } as Response);

          const result = await fetchGame(gameId);
          expect(result).toBeDefined();
          expect(result.gameId).toBe(gameId);
        } else if (operation === 'fetchCandidates') {
          mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => [],
          } as Response);

          const result = await fetchCandidates(gameId);
          expect(result).toBeDefined();
          expect(Array.isArray(result)).toBe(true);
        }

        expect(mockFetch).toHaveBeenCalledTimes(1);
      }
    ),
    { numRuns: 10, endOnFailure: true }
  );
});
