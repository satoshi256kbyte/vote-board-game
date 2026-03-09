/**
 * Unit tests for candidates API client
 *
 * Tests all API client functions for both success and error cases.
 * Validates Requirements: 13.1, 13.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getCandidates,
  getVoteStatus,
  createVote,
  changeVote,
  type Candidate,
  type VoteStatus,
} from './candidates';
import { ApiError } from './client';
import * as storageService from '@/lib/services/storage-service';

// Mock the storage service
vi.mock('@/lib/services/storage-service', () => ({
  storageService: {
    getAccessToken: vi.fn(),
  },
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('candidates API client', () => {
  const mockGameId = '123e4567-e89b-12d3-a456-426614174000';
  const mockTurnNumber = 5;
  const mockCandidateId = '987fcdeb-51a2-43f1-b456-426614174111';
  const mockToken = 'mock-jwt-token';

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    mockFetch.mockClear();

    // Set default environment variable
    process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCandidates', () => {
    const mockCandidates: Candidate[] = [
      {
        id: 'candidate-1',
        gameId: mockGameId,
        turnNumber: mockTurnNumber,
        position: 'D3',
        description: 'Good move',
        boardState: [[]],
        voteCount: 10,
        postedBy: 'user-1',
        postedByUsername: 'Alice',
        status: 'active',
        deadline: '2024-01-01T00:00:00Z',
        createdAt: '2023-12-31T00:00:00Z',
        source: 'user',
      },
      {
        id: 'candidate-2',
        gameId: mockGameId,
        turnNumber: mockTurnNumber,
        position: 'E4',
        description: 'AI suggestion',
        boardState: [[]],
        voteCount: 5,
        postedBy: 'ai',
        postedByUsername: 'AI',
        status: 'active',
        deadline: '2024-01-01T00:00:00Z',
        createdAt: '2023-12-31T00:00:00Z',
        source: 'ai',
      },
    ];

    it('should fetch candidates successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ candidates: mockCandidates }),
      });

      const result = await getCandidates(mockGameId, mockTurnNumber);

      expect(result).toEqual(mockCandidates);
      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.example.com/api/games/${mockGameId}/turns/${mockTurnNumber}/candidates`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        }
      );
    });

    it('should throw ApiError with 404 when game is not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(getCandidates(mockGameId, mockTurnNumber)).rejects.toThrow(ApiError);
      await expect(getCandidates(mockGameId, mockTurnNumber)).rejects.toThrow(
        '対局が見つかりません'
      );

      try {
        await getCandidates(mockGameId, mockTurnNumber);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(404);
      }
    });

    it('should throw ApiError with generic message for other errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(getCandidates(mockGameId, mockTurnNumber)).rejects.toThrow(ApiError);
      await expect(getCandidates(mockGameId, mockTurnNumber)).rejects.toThrow(
        '候補の取得に失敗しました'
      );

      try {
        await getCandidates(mockGameId, mockTurnNumber);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(500);
      }
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(getCandidates(mockGameId, mockTurnNumber)).rejects.toThrow(ApiError);
      await expect(getCandidates(mockGameId, mockTurnNumber)).rejects.toThrow('Network error');
    });

    it('should throw error when NEXT_PUBLIC_API_URL is not set', async () => {
      delete process.env.NEXT_PUBLIC_API_URL;
      vi.stubEnv('NODE_ENV', 'production');

      await expect(getCandidates(mockGameId, mockTurnNumber)).rejects.toThrow(
        'NEXT_PUBLIC_API_URL is not defined'
      );

      vi.unstubAllEnvs();
    });

    it('should use development fallback URL when in development mode', async () => {
      delete process.env.NEXT_PUBLIC_API_URL;
      vi.stubEnv('NODE_ENV', 'development');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ candidates: mockCandidates }),
      });

      await getCandidates(mockGameId, mockTurnNumber);

      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:3001/api/games/${mockGameId}/turns/${mockTurnNumber}/candidates`,
        expect.any(Object)
      );

      vi.unstubAllEnvs();
    });

    it('should throw error for invalid API URL format', async () => {
      process.env.NEXT_PUBLIC_API_URL = 'invalid-url';

      await expect(getCandidates(mockGameId, mockTurnNumber)).rejects.toThrow(
        'NEXT_PUBLIC_API_URL has invalid format'
      );
    });
  });

  describe('getVoteStatus', () => {
    const mockVoteStatus: VoteStatus = {
      gameId: mockGameId,
      turnNumber: mockTurnNumber,
      userId: 'user-1',
      candidateId: mockCandidateId,
      createdAt: '2023-12-31T12:00:00Z',
      updatedAt: '2023-12-31T12:00:00Z',
    };

    beforeEach(() => {
      vi.mocked(storageService.storageService.getAccessToken).mockReturnValue(mockToken);
    });

    it('should fetch vote status successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockVoteStatus,
      });

      const result = await getVoteStatus(mockGameId, mockTurnNumber);

      expect(result).toEqual(mockVoteStatus);
      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.example.com/api/games/${mockGameId}/turns/${mockTurnNumber}/votes/me`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          },
          cache: 'no-store',
        }
      );
    });

    it('should return null when user has not voted yet (404 with specific message)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: '投票が見つかりません' }),
      });

      const result = await getVoteStatus(mockGameId, mockTurnNumber);

      expect(result).toBeNull();
    });

    it('should return null when 404 response cannot be parsed', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => {
          throw new Error('Parse error');
        },
      });

      const result = await getVoteStatus(mockGameId, mockTurnNumber);

      expect(result).toBeNull();
    });

    it('should throw ApiError when game is not found (404 with different message)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Game not found' }),
      });

      await expect(getVoteStatus(mockGameId, mockTurnNumber)).rejects.toThrow(ApiError);
      await expect(getVoteStatus(mockGameId, mockTurnNumber)).rejects.toThrow(
        '対局が見つかりません'
      );
    });

    it('should throw ApiError when authentication fails (401)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await expect(getVoteStatus(mockGameId, mockTurnNumber)).rejects.toThrow(ApiError);
      await expect(getVoteStatus(mockGameId, mockTurnNumber)).rejects.toThrow('認証が必要です');

      try {
        await getVoteStatus(mockGameId, mockTurnNumber);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(401);
      }
    });

    it('should throw ApiError when no token is available', async () => {
      vi.mocked(storageService.storageService.getAccessToken).mockReturnValue(null);

      await expect(getVoteStatus(mockGameId, mockTurnNumber)).rejects.toThrow(ApiError);
      await expect(getVoteStatus(mockGameId, mockTurnNumber)).rejects.toThrow('認証が必要です');

      try {
        await getVoteStatus(mockGameId, mockTurnNumber);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(401);
      }
    });

    it('should throw ApiError for other server errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(getVoteStatus(mockGameId, mockTurnNumber)).rejects.toThrow(ApiError);
      await expect(getVoteStatus(mockGameId, mockTurnNumber)).rejects.toThrow(
        '投票状況の取得に失敗しました'
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(getVoteStatus(mockGameId, mockTurnNumber)).rejects.toThrow(ApiError);
      await expect(getVoteStatus(mockGameId, mockTurnNumber)).rejects.toThrow('Network error');
    });
  });

  describe('createVote', () => {
    beforeEach(() => {
      vi.mocked(storageService.storageService.getAccessToken).mockReturnValue(mockToken);
    });

    it('should create vote successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
      });

      await expect(
        createVote(mockGameId, mockTurnNumber, mockCandidateId)
      ).resolves.toBeUndefined();

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/api/votes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify({
          gameId: mockGameId,
          turnNumber: mockTurnNumber,
          candidateId: mockCandidateId,
        }),
      });
    });

    it('should throw ApiError when authentication fails (401)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await expect(createVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        ApiError
      );
      await expect(createVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        '認証が必要です'
      );

      try {
        await createVote(mockGameId, mockTurnNumber, mockCandidateId);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(401);
      }
    });

    it('should throw ApiError when no token is available', async () => {
      vi.mocked(storageService.storageService.getAccessToken).mockReturnValue(null);

      await expect(createVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        ApiError
      );
      await expect(createVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        '認証が必要です'
      );

      try {
        await createVote(mockGameId, mockTurnNumber, mockCandidateId);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(401);
      }
    });

    it('should throw ApiError with custom message for validation errors (400)', async () => {
      const errorMessage = 'すでに投票済みです';
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: errorMessage }),
      });

      await expect(createVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        ApiError
      );
      await expect(createVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        errorMessage
      );

      try {
        await createVote(mockGameId, mockTurnNumber, mockCandidateId);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(400);
      }
    });

    it('should throw generic ApiError when 400 response cannot be parsed', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => {
          throw new Error('Parse error');
        },
      });

      await expect(createVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        ApiError
      );
      await expect(createVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        '投票に失敗しました'
      );
    });

    it('should throw ApiError for other server errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(createVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        ApiError
      );
      await expect(createVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        '投票に失敗しました'
      );

      try {
        await createVote(mockGameId, mockTurnNumber, mockCandidateId);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(500);
      }
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(createVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        ApiError
      );
      await expect(createVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        'Network error'
      );
    });
  });

  describe('changeVote', () => {
    beforeEach(() => {
      vi.mocked(storageService.storageService.getAccessToken).mockReturnValue(mockToken);
    });

    it('should change vote successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      await expect(
        changeVote(mockGameId, mockTurnNumber, mockCandidateId)
      ).resolves.toBeUndefined();

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/api/votes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify({
          gameId: mockGameId,
          turnNumber: mockTurnNumber,
          candidateId: mockCandidateId,
        }),
      });
    });

    it('should throw ApiError when authentication fails (401)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await expect(changeVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        ApiError
      );
      await expect(changeVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        '認証が必要です'
      );

      try {
        await changeVote(mockGameId, mockTurnNumber, mockCandidateId);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(401);
      }
    });

    it('should throw ApiError when no token is available', async () => {
      vi.mocked(storageService.storageService.getAccessToken).mockReturnValue(null);

      await expect(changeVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        ApiError
      );
      await expect(changeVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        '認証が必要です'
      );

      try {
        await changeVote(mockGameId, mockTurnNumber, mockCandidateId);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(401);
      }
    });

    it('should throw ApiError with custom message for validation errors (400)', async () => {
      const errorMessage = '投票が見つかりません';
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: errorMessage }),
      });

      await expect(changeVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        ApiError
      );
      await expect(changeVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        errorMessage
      );

      try {
        await changeVote(mockGameId, mockTurnNumber, mockCandidateId);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(400);
      }
    });

    it('should throw generic ApiError when 400 response cannot be parsed', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => {
          throw new Error('Parse error');
        },
      });

      await expect(changeVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        ApiError
      );
      await expect(changeVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        '投票の変更に失敗しました'
      );
    });

    it('should throw ApiError for other server errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(changeVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        ApiError
      );
      await expect(changeVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        '投票の変更に失敗しました'
      );

      try {
        await changeVote(mockGameId, mockTurnNumber, mockCandidateId);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(500);
      }
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(changeVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        ApiError
      );
      await expect(changeVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        'Network error'
      );
    });
  });
});
