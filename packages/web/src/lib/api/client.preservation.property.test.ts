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
 * Note: Following implementation guide - avoiding asyncProperty due to JSDOM environment issues.
 * Using synchronous property tests with mock verification instead.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  ApiError,
  createGame,
  fetchGames,
  fetchGame,
  fetchCandidates,
  createCandidate,
  vote,
} from './client';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API Client - Preservation Property Tests', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    // Note: Cannot modify process.env.NODE_ENV in tests (read-only in Vitest)
    // Tests assume development environment
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 1: API Base URL Resolution in Development
   * **Validates: Requirements 3.1, 3.4**
   *
   * In development environment without NEXT_PUBLIC_API_URL,
   * the API client should consistently use localhost:3001 as fallback,
   * maintaining local development functionality.
   */
  it('Property 1: 開発環境でNEXT_PUBLIC_API_URLが未設定の場合、localhostをフォールバックとして使用する', () => {
    fc.assert(
      fc.property(fc.constantFrom('BLACK' as const, 'WHITE' as const), (aiSide) => {
        // Note: Cannot modify process.env.NODE_ENV (read-only)
        delete process.env.NEXT_PUBLIC_API_URL;

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

        // Call the function (don't await in property)
        createGame({
          gameType: 'OTHELLO',
          aiSide,
        });

        // Verify the fetch was called with localhost URL
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/games',
          expect.objectContaining({
            method: 'POST',
          })
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
      fc.integer({ min: 400, max: 499 }), // Client errors
      fc.integer({ min: 500, max: 599 }) // Server errors
    );

    fc.assert(
      fc.property(
        errorStatusArb,
        fc.string({ minLength: 1, maxLength: 50 }),
        (statusCode, message) => {
          const error = new ApiError(message, statusCode);

          // Verify ApiError properties are correctly set
          expect(error).toBeInstanceOf(ApiError);
          expect(error).toBeInstanceOf(Error);
          expect(error.name).toBe('ApiError');
          expect(error.message).toBe(message);
          expect(error.statusCode).toBe(statusCode);
          expect(typeof error.message).toBe('string');
          expect(typeof error.statusCode).toBe('number');
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
   * the ApiError should correctly store and preserve these fields,
   * maintaining consistent error structure.
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

          // Verify optional fields are undefined when not provided
          if (errorCode === undefined) {
            expect(error.errorCode).toBeUndefined();
          }
          if (details === undefined) {
            expect(error.details).toBeUndefined();
          }
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  /**
   * Property 4: Query Parameter Construction
   * **Validates: Requirements 3.4**
   *
   * For any valid query parameters (status, limit, cursor),
   * the URL construction should correctly encode parameters,
   * maintaining consistent API request formatting.
   */
  it('Property 4: 任意のクエリパラメータに対して、URL構築は正しくパラメータをエンコードする', () => {
    const statusArb = fc.option(fc.constantFrom('ACTIVE', 'FINISHED'), { nil: undefined });
    const limitArb = fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined });
    const cursorArb = fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined });

    fc.assert(
      fc.property(statusArb, limitArb, cursorArb, (status, limit, cursor) => {
        mockFetch.mockClear();
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ games: [], nextCursor: undefined }),
        } as Response);

        const query: { status?: string; limit?: number; cursor?: string } = {};
        if (status) query.status = status;
        if (limit) query.limit = limit;
        if (cursor) query.cursor = cursor;

        fetchGames(Object.keys(query).length > 0 ? query : undefined);

        // Verify fetch was called
        expect(mockFetch).toHaveBeenCalledTimes(1);
        const callUrl = mockFetch.mock.calls[0][0] as string;

        // Verify URL contains base path
        expect(callUrl).toContain('/api/games');

        // Verify query parameters are included when provided
        if (status) {
          expect(callUrl).toContain(`status=${status}`);
        }
        if (limit) {
          expect(callUrl).toContain(`limit=${limit}`);
        }
        if (cursor) {
          expect(callUrl).toContain(`cursor=${encodeURIComponent(cursor)}`);
        }
      }),
      { numRuns: 15, endOnFailure: true }
    );
  });

  /**
   * Property 5: HTTP Method Consistency
   * **Validates: Requirements 3.4**
   *
   * For different API operations, the correct HTTP method should be used,
   * maintaining RESTful API conventions (GET for fetching, POST for creating).
   */
  it('Property 5: 異なるAPI操作に対して、正しいHTTPメソッドが使用される', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'fetchGames',
          'fetchGame',
          'createGame',
          'fetchCandidates',
          'createCandidate',
          'vote'
        ),
        (operation) => {
          mockFetch.mockClear();
          mockFetch.mockResolvedValueOnce({
            ok: true,
            status: operation.startsWith('create') || operation === 'vote' ? 201 : 200,
            json: async () =>
              operation === 'fetchGames'
                ? { games: [] }
                : operation === 'fetchCandidates'
                  ? []
                  : {
                      gameId: '123',
                      gameType: 'OTHELLO',
                      status: 'ACTIVE',
                      aiSide: 'BLACK',
                      currentTurn: 'BLACK',
                      boardState: [],
                      moveHistory: [],
                      createdAt: '',
                      updatedAt: '',
                    },
          } as Response);

          // Call appropriate function
          switch (operation) {
            case 'fetchGames':
              fetchGames();
              break;
            case 'fetchGame':
              fetchGame('123e4567-e89b-12d3-a456-426614174000');
              break;
            case 'createGame':
              createGame({ gameType: 'OTHELLO', aiSide: 'BLACK' });
              break;
            case 'fetchCandidates':
              fetchCandidates('123e4567-e89b-12d3-a456-426614174000');
              break;
            case 'createCandidate':
              createCandidate('123e4567-e89b-12d3-a456-426614174000', {
                position: 'C4',
                description: 'Test move',
              });
              break;
            case 'vote':
              vote('123e4567-e89b-12d3-a456-426614174000', '987fcdeb-51a2-43f1-b123-456789abcdef');
              break;
          }

          // Verify correct HTTP method
          expect(mockFetch).toHaveBeenCalledTimes(1);
          const callOptions = mockFetch.mock.calls[0][1] as RequestInit;

          if (operation.startsWith('fetch')) {
            expect(callOptions.method).toBe('GET');
          } else {
            expect(callOptions.method).toBe('POST');
          }
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });

  /**
   * Property 6: Content-Type Header Consistency
   * **Validates: Requirements 3.4**
   *
   * For all API requests, the Content-Type header should be set to application/json,
   * maintaining consistent request formatting across all operations.
   */
  it('Property 6: すべてのAPIリクエストに対して、Content-Typeヘッダーがapplication/jsonに設定される', () => {
    fc.assert(
      fc.property(fc.constantFrom('fetchGames', 'createGame', 'fetchGame'), (operation) => {
        mockFetch.mockClear();
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () =>
            operation === 'fetchGames'
              ? { games: [] }
              : {
                  gameId: '123',
                  gameType: 'OTHELLO',
                  status: 'ACTIVE',
                  aiSide: 'BLACK',
                  currentTurn: 'BLACK',
                  boardState: [],
                  moveHistory: [],
                  createdAt: '',
                  updatedAt: '',
                },
        } as Response);

        switch (operation) {
          case 'fetchGames':
            fetchGames();
            break;
          case 'createGame':
            createGame({ gameType: 'OTHELLO', aiSide: 'BLACK' });
            break;
          case 'fetchGame':
            fetchGame('123e4567-e89b-12d3-a456-426614174000');
            break;
        }

        // Verify Content-Type header
        expect(mockFetch).toHaveBeenCalledTimes(1);
        const callOptions = mockFetch.mock.calls[0][1] as RequestInit;
        const headers = callOptions.headers as Record<string, string>;

        expect(headers['Content-Type']).toBe('application/json');
      }),
      { numRuns: 15, endOnFailure: true }
    );
  });

  /**
   * Property 7: Request Body JSON Serialization
   * **Validates: Requirements 3.2, 3.4**
   *
   * For any valid game creation request, the request body should be properly
   * JSON-serialized, maintaining data integrity for API communication.
   */
  it('Property 7: 任意の有効なゲーム作成リクエストに対して、リクエストボディが正しくJSON化される', () => {
    fc.assert(
      fc.property(fc.constantFrom('BLACK' as const, 'WHITE' as const), (aiSide) => {
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
            boardState: [],
            moveHistory: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
        } as Response);

        createGame({ gameType: 'OTHELLO', aiSide });

        // Verify request body is JSON-serialized
        expect(mockFetch).toHaveBeenCalledTimes(1);
        const callOptions = mockFetch.mock.calls[0][1] as RequestInit;
        const body = callOptions.body as string;

        expect(typeof body).toBe('string');
        const parsed = JSON.parse(body);
        expect(parsed.gameType).toBe('OTHELLO');
        expect(parsed.aiSide).toBe(aiSide);
      }),
      { numRuns: 15, endOnFailure: true }
    );
  });
});
