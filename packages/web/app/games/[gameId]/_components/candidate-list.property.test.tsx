/**
 * CandidateList Component Property-Based Tests
 *
 * Property-based tests using fast-check to verify correctness properties
 * across a wide range of inputs.
 *
 * Test Configuration:
 * - numRuns: 10 (limited for JSDOM stability)
 * - endOnFailure: true (stop on first failure)
 * - Uses synchronous fc.property (NOT fc.asyncProperty to avoid JSDOM issues)
 *
 * Validates Requirements: 8.7, 13.8
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import { CandidateList } from './candidate-list';
import type { Candidate } from '../../../../src/lib/api/candidates';
import * as candidatesApi from '../../../../src/lib/api/candidates';
import { ApiError } from '../../../../src/lib/api/client';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(() => ({
    get: vi.fn(() => null),
  })),
}));

// Mock child components
vi.mock('./candidate-card', () => ({
  CandidateCard: () => <div data-testid="candidate-card">Candidate Card</div>,
}));

vi.mock('./candidate-sort-filter', () => ({
  CandidateSortFilter: () => <div data-testid="candidate-sort-filter">Sort Filter</div>,
}));

// Mock API functions
vi.mock('../../../../src/lib/api/candidates', () => ({
  getCandidates: vi.fn(),
  getVoteStatus: vi.fn(),
  createVote: vi.fn(),
  changeVote: vi.fn(),
}));

// Mock sort-filter utilities
vi.mock('../../../../src/lib/utils/sort-filter', () => ({
  sortCandidates: vi.fn((candidates) => candidates),
  filterCandidates: vi.fn((candidates) => candidates),
}));

describe('CandidateList Property-Based Tests', () => {
  const mockCandidate: Candidate = {
    id: 'candidate-1',
    gameId: 'game-123',
    turnNumber: 5,
    position: 'D3',
    description: 'テスト候補',
    boardState: Array(8).fill(Array(8).fill('0')),
    voteCount: 10,
    postedBy: 'user-1',
    postedByUsername: 'ユーザー1',
    status: 'active',
    deadline: '2024-01-16T00:00:00Z',
    createdAt: '2024-01-15T10:00:00Z',
    source: 'user',
  };

  const defaultProps = {
    initialCandidates: [mockCandidate],
    initialVoteStatus: null,
    gameId: 'game-123',
    turnNumber: 5,
    isAuthenticated: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  /**
   * Property 6: エラーメッセージのセキュリティ
   *
   * **Validates: Requirements 8.7**
   *
   * For any error scenario, error messages displayed to users must not contain
   * sensitive information such as:
   * - API keys or tokens
   * - Internal file paths
   * - Stack traces
   * - User IDs or database IDs
   * - Database queries
   * - Internal server details
   * - Environment variables
   *
   * This property generates random error scenarios and verifies that the
   * displayed error messages are user-friendly and don't leak sensitive data.
   */
  describe('Property 6: エラーメッセージのセキュリティ (Requirements 8.7)', () => {
    // Patterns that should NOT appear in user-facing error messages
    const sensitivePatterns = [
      // API keys and tokens
      /api[_-]?key/i,
      /access[_-]?token/i,
      /bearer\s+[a-zA-Z0-9_-]+/i,
      /jwt[_-]?token/i,
      /secret/i,
      /password/i,
      /auth[_-]?token/i,

      // File paths
      /\/home\//i,
      /\/usr\//i,
      /\/var\//i,
      /\/opt\//i,
      /C:\\/i,
      /\\Users\\/i,
      /node_modules/i,
      /\.ts$/i,
      /\.tsx$/i,
      /\.js$/i,
      /\.jsx$/i,

      // Stack traces
      /at\s+\w+\s+\(/i,
      /^\s+at\s+/m,
      /Error:\s+at\s+/i,
      /\.tsx?:\d+:\d+/i,
      /\.jsx?:\d+:\d+/i,

      // Database details
      /SELECT\s+\*/i,
      /INSERT\s+INTO/i,
      /UPDATE\s+\w+\s+SET/i,
      /DELETE\s+FROM/i,
      /dynamodb/i,
      /PK#/i,
      /SK#/i,
      /GSI\d+/i,

      // UUIDs (user IDs, internal IDs)
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,

      // Environment variables
      /NEXT_PUBLIC_/i,
      /AWS_/i,
      /NODE_ENV/i,
      /process\.env/i,

      // Internal server details
      /localhost:\d+/i,
      /127\.0\.0\.1/i,
      /0\.0\.0\.0/i,
      /internal server/i,
      /stack trace/i,
    ];

    /**
     * Arbitrary generator for error scenarios
     * Generates various types of errors that might occur in the application
     */
    const errorScenarioArbitrary = fc.oneof(
      // Network errors
      fc.record({
        type: fc.constant('network' as const),
        message: fc.constantFrom(
          'Failed to fetch',
          'Network request failed',
          'TypeError: Failed to fetch',
          'NetworkError when attempting to fetch resource'
        ),
      }),

      // API errors with status codes
      fc.record({
        type: fc.constant('api' as const),
        statusCode: fc.constantFrom(400, 401, 403, 404, 500, 502, 503),
        message: fc.constantFrom(
          'API request failed',
          'Bad Request',
          'Unauthorized',
          'Forbidden',
          'Not Found',
          'Internal Server Error',
          'Bad Gateway',
          'Service Unavailable'
        ),
        errorCode: fc.option(fc.constantFrom('INVALID_REQUEST', 'AUTH_FAILED', 'NOT_FOUND'), {
          nil: undefined,
        }),
      }),

      // Simulated errors with sensitive data (should be sanitized)
      fc.record({
        type: fc.constant('sensitive' as const),
        message: fc.constantFrom(
          'Error at /home/user/app/src/components/candidate-list.tsx:123',
          'Failed to connect to database: PK#USER#12345',
          'JWT token expired: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
          'API key invalid: sk_live_1234567890abcdef',
          'SELECT * FROM users WHERE id = "user-123"',
          'Error in /usr/local/app/node_modules/react/index.js',
          'Access token: Bearer abc123def456',
          'Environment: NEXT_PUBLIC_API_URL=http://localhost:3001'
        ),
      }),

      // Auth errors
      fc.record({
        type: fc.constant('auth' as const),
        statusCode: fc.constant(401),
        message: fc.constantFrom('認証が必要です', 'Unauthorized', 'Authentication required'),
      }),

      // Validation errors
      fc.record({
        type: fc.constant('validation' as const),
        statusCode: fc.constant(400),
        message: fc.constantFrom(
          'Invalid input',
          'Validation failed',
          'Bad request',
          'Invalid game ID'
        ),
      })
    );

    it('should not expose sensitive information in error messages', () => {
      fc.assert(
        fc.property(errorScenarioArbitrary, (errorScenario) => {
          // Setup: Mock getCandidates to throw the error
          let thrownError: Error;

          if (errorScenario.type === 'network') {
            thrownError = new Error(errorScenario.message);
          } else if (errorScenario.type === 'api') {
            thrownError = new ApiError(
              errorScenario.message,
              errorScenario.statusCode,
              errorScenario.errorCode
            );
          } else if (errorScenario.type === 'sensitive') {
            // This simulates an error that accidentally contains sensitive data
            thrownError = new Error(errorScenario.message);
          } else if (errorScenario.type === 'auth') {
            thrownError = new ApiError(errorScenario.message, errorScenario.statusCode);
          } else {
            // validation
            thrownError = new ApiError(errorScenario.message, errorScenario.statusCode);
          }

          vi.mocked(candidatesApi.getCandidates).mockRejectedValue(thrownError);

          // Render component
          render(<CandidateList {...defaultProps} />);

          // Trigger polling to cause the error
          vi.advanceTimersByTime(30000);

          // Wait for error to be displayed
          vi.runAllTimers();

          // Get all text content from the component
          const componentText = document.body.textContent || '';

          // Verify: Error message should not contain sensitive patterns
          for (const pattern of sensitivePatterns) {
            const match = componentText.match(pattern);
            if (match) {
              // If we find a sensitive pattern, fail with a descriptive message
              throw new Error(
                `Sensitive information detected in error message: "${match[0]}" (pattern: ${pattern})`
              );
            }
          }

          // Verify: Error message should be user-friendly
          // It should contain one of the expected user-facing messages
          const userFriendlyMessages = [
            '候補の取得に失敗しました',
            'ネットワークエラーが発生しました',
            '対局が見つかりません',
            '認証が必要です',
          ];

          const hasUserFriendlyMessage = userFriendlyMessages.some((msg) =>
            componentText.includes(msg)
          );

          // For sensitive errors, we should show a generic message, not the raw error
          if (errorScenario.type === 'sensitive') {
            expect(hasUserFriendlyMessage).toBe(true);
            // Ensure the sensitive message itself is NOT displayed
            expect(componentText).not.toContain(errorScenario.message);
          }

          // Cleanup for next iteration
          cleanup();
          vi.clearAllMocks();
        }),
        {
          numRuns: 10,
          endOnFailure: true,
        }
      );
    });

    it('should sanitize error messages from API responses', () => {
      /**
       * Test that even if the API returns an error with sensitive data,
       * the component displays a sanitized version
       */
      fc.assert(
        fc.property(
          fc.record({
            statusCode: fc.constantFrom(400, 401, 404, 500),
            rawMessage: fc.constantFrom(
              'Database error: PK#GAME#123 not found',
              'Token validation failed: eyJhbGciOiJIUzI1NiI...',
              'File not found: /var/app/data/games.json',
              'SQL error: SELECT * FROM games WHERE id = 123',
              'Internal error at /home/user/app/src/lib/api.ts:45'
            ),
          }),
          (errorData) => {
            // Mock API error with sensitive data
            const apiError = new ApiError(errorData.rawMessage, errorData.statusCode);
            vi.mocked(candidatesApi.getCandidates).mockRejectedValue(apiError);

            // Render component
            render(<CandidateList {...defaultProps} />);

            // Trigger error
            vi.advanceTimersByTime(30000);
            vi.runAllTimers();

            // Get displayed text
            const displayedText = document.body.textContent || '';

            // Verify: Raw sensitive message should NOT be displayed
            expect(displayedText).not.toContain(errorData.rawMessage);

            // Verify: Should show generic user-friendly message instead
            const hasGenericMessage =
              displayedText.includes('候補の取得に失敗しました') ||
              displayedText.includes('エラーが発生しました');

            expect(hasGenericMessage).toBe(true);

            // Verify: No sensitive patterns in displayed text
            for (const pattern of sensitivePatterns) {
              expect(displayedText).not.toMatch(pattern);
            }

            // Cleanup
            cleanup();
            vi.clearAllMocks();
          }
        ),
        {
          numRuns: 10,
          endOnFailure: true,
        }
      );
    });

    it('should handle errors without exposing internal implementation details', () => {
      /**
       * Test various error types to ensure internal details are never exposed
       */
      fc.assert(
        fc.property(
          fc.record({
            errorType: fc.constantFrom(
              'TypeError',
              'ReferenceError',
              'SyntaxError',
              'NetworkError'
            ),
            internalDetail: fc.constantFrom(
              'Cannot read property "map" of undefined at CandidateList.tsx:123',
              'fetch is not defined at node_modules/cross-fetch/index.js:45',
              'Unexpected token < in JSON at position 0',
              'Failed to execute "fetch" on "Window"'
            ),
          }),
          (errorData) => {
            // Create error with internal details
            const error = new Error(`${errorData.errorType}: ${errorData.internalDetail}`);
            vi.mocked(candidatesApi.getCandidates).mockRejectedValue(error);

            // Render
            render(<CandidateList {...defaultProps} />);

            // Trigger error
            vi.advanceTimersByTime(30000);
            vi.runAllTimers();

            const displayedText = document.body.textContent || '';

            // Should NOT show internal details
            expect(displayedText).not.toContain(errorData.internalDetail);
            expect(displayedText).not.toContain('.tsx');
            expect(displayedText).not.toContain('.ts');
            expect(displayedText).not.toContain('node_modules');
            expect(displayedText).not.toContain('at position');

            // Should show user-friendly message
            expect(displayedText).toContain('候補の取得に失敗しました');

            // Cleanup
            cleanup();
            vi.clearAllMocks();
          }
        ),
        {
          numRuns: 10,
          endOnFailure: true,
        }
      );
    });

    it('should log errors to console without exposing them in UI', () => {
      /**
       * Verify that detailed errors are logged for debugging but not shown to users
       */
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 100 }),
          fc.integer({ min: 400, max: 599 }),
          (errorMessage, statusCode) => {
            // Create API error
            const apiError = new ApiError(errorMessage, statusCode);
            vi.mocked(candidatesApi.getCandidates).mockRejectedValue(apiError);

            // Render
            render(<CandidateList {...defaultProps} />);

            // Trigger error
            vi.advanceTimersByTime(30000);
            vi.runAllTimers();

            // Verify: Error should be logged to console
            expect(consoleErrorSpy).toHaveBeenCalled();

            // Verify: UI should show generic message, not the raw error
            const displayedText = document.body.textContent || '';
            expect(displayedText).toContain('候補の取得に失敗しました');

            // Cleanup
            cleanup();
            vi.clearAllMocks();
            consoleErrorSpy.mockClear();
          }
        ),
        {
          numRuns: 10,
          endOnFailure: true,
        }
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle malformed error objects safely', () => {
      /**
       * Test that even malformed or unexpected error objects don't cause
       * sensitive data exposure
       */
      fc.assert(
        fc.property(
          fc.oneof(
            // Error with no message
            fc.constant(new Error()),
            // Error with null message
            fc.constant(Object.assign(new Error(), { message: null })),
            // Non-Error object
            fc.constant({ error: 'Something went wrong', stack: 'at /home/user/app.ts:123' }),
            // String error
            fc.constant('Error string with /usr/local/path'),
            // Undefined
            fc.constant(undefined)
          ),
          (malformedError) => {
            vi.mocked(candidatesApi.getCandidates).mockRejectedValue(malformedError);

            // Render
            render(<CandidateList {...defaultProps} />);

            // Trigger error
            vi.advanceTimersByTime(30000);
            vi.runAllTimers();

            const displayedText = document.body.textContent || '';

            // Should not expose any sensitive patterns
            for (const pattern of sensitivePatterns) {
              expect(displayedText).not.toMatch(pattern);
            }

            // Should show generic error message
            expect(displayedText).toContain('候補の取得に失敗しました');

            // Cleanup
            cleanup();
            vi.clearAllMocks();
          }
        ),
        {
          numRuns: 10,
          endOnFailure: true,
        }
      );
    });
  });
});
