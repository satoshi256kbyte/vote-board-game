/**
 * Unit tests for commentary API client
 *
 * Tests getCommentaries() for success, 404, and error cases.
 * Validates Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCommentaries } from './commentary';
import { ApiError } from './client';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('commentary API client', () => {
  const mockGameId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
    process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCommentaries', () => {
    it('should fetch commentaries successfully', async () => {
      const mockCommentaries = [
        {
          turnNumber: 1,
          content: '序盤の展開について解説します。',
          generatedBy: 'AI',
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          turnNumber: 2,
          content: '中盤の戦略について解説します。',
          generatedBy: 'AI',
          createdAt: '2024-01-01T01:00:00Z',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ commentaries: mockCommentaries }),
      });

      const result = await getCommentaries(mockGameId);

      expect(result).toEqual(mockCommentaries);
      expect(result).toHaveLength(2);
      expect(result[0].turnNumber).toBe(1);
      expect(result[1].turnNumber).toBe(2);
    });

    it('should call correct URL with correct headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ commentaries: [] }),
      });

      await getCommentaries(mockGameId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.example.com/api/games/${mockGameId}/commentary`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        }
      );
    });

    it('should return empty array when API returns 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'NOT_FOUND', message: 'Game not found' }),
      });

      const result = await getCommentaries(mockGameId);

      expect(result).toEqual([]);
    });

    it('should throw ApiError when API returns 500', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'INTERNAL_ERROR', message: 'Internal Server Error' }),
      });

      try {
        await getCommentaries(mockGameId);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(500);
        expect((error as ApiError).errorCode).toBe('INTERNAL_ERROR');
      }
    });

    it('should throw ApiError on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      try {
        await getCommentaries(mockGameId);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(0);
        expect((error as ApiError).message).toBe('Network error');
      }
    });

    it('should handle non-JSON error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        json: async () => {
          throw new Error('Not JSON');
        },
      });

      await expect(getCommentaries(mockGameId)).rejects.toThrow(ApiError);
    });
  });
});
