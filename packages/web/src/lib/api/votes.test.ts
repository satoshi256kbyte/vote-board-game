/**
 * Unit tests for votes API client
 *
 * Tests all API client functions for both success and error cases.
 * Validates Requirements: 11.1, 11.2, 11.3, 11.4, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createVote, changeVote } from './votes';
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

describe('votes API client', () => {
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

  describe('createVote', () => {
    it('should create vote successfully', async () => {
      vi.mocked(storageService.storageService.getAccessToken).mockReturnValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({}),
      });

      await createVote(mockGameId, mockTurnNumber, mockCandidateId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.example.com/api/games/${mockGameId}/turns/${mockTurnNumber}/votes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          },
          body: JSON.stringify({
            candidateId: mockCandidateId,
          }),
        }
      );
    });

    it('should throw ApiError when authentication token is missing (401)', async () => {
      vi.mocked(storageService.storageService.getAccessToken).mockReturnValue(null);

      await expect(createVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        new ApiError('認証が必要です。ログインしてください。', 401)
      );

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should throw ApiError when already voted (409)', async () => {
      vi.mocked(storageService.storageService.getAccessToken).mockReturnValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ error: 'ALREADY_VOTED', message: '既に投票済みです' }),
      });

      await expect(createVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        new ApiError('既に投票済みです', 409, 'ALREADY_VOTED')
      );
    });

    it('should throw ApiError when voting is closed (400 VOTING_CLOSED)', async () => {
      vi.mocked(storageService.storageService.getAccessToken).mockReturnValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'VOTING_CLOSED', message: '投票期間が終了しています' }),
      });

      await expect(createVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        new ApiError('投票期間が終了しています', 400, 'VOTING_CLOSED')
      );
    });

    it('should throw ApiError for generic 400 errors', async () => {
      vi.mocked(storageService.storageService.getAccessToken).mockReturnValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'INVALID_REQUEST', message: '不正なリクエストです' }),
      });

      await expect(createVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        new ApiError('不正なリクエストです', 400, 'INVALID_REQUEST')
      );
    });

    it('should throw ApiError for server errors (500)', async () => {
      vi.mocked(storageService.storageService.getAccessToken).mockReturnValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'INTERNAL_ERROR', message: 'サーバーエラー' }),
      });

      await expect(createVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        new ApiError('投票に失敗しました。もう一度お試しください。', 500)
      );
    });

    it('should throw ApiError for network errors', async () => {
      vi.mocked(storageService.storageService.getAccessToken).mockReturnValue(mockToken);
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(createVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        new ApiError('ネットワークエラーが発生しました', 0)
      );
    });

    it('should throw ApiError when response is not ok with unknown status', async () => {
      vi.mocked(storageService.storageService.getAccessToken).mockReturnValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ error: 'SERVICE_UNAVAILABLE' }),
      });

      await expect(createVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        new ApiError('投票に失敗しました。もう一度お試しください。', 503)
      );
    });
  });

  describe('changeVote', () => {
    it('should change vote successfully', async () => {
      vi.mocked(storageService.storageService.getAccessToken).mockReturnValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await changeVote(mockGameId, mockTurnNumber, mockCandidateId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.example.com/api/games/${mockGameId}/turns/${mockTurnNumber}/votes/me`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          },
          body: JSON.stringify({
            candidateId: mockCandidateId,
          }),
        }
      );
    });

    it('should throw ApiError when authentication token is missing (401)', async () => {
      vi.mocked(storageService.storageService.getAccessToken).mockReturnValue(null);

      await expect(changeVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        new ApiError('認証が必要です。ログインしてください。', 401)
      );

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should throw ApiError when not voted yet (409 NOT_VOTED)', async () => {
      vi.mocked(storageService.storageService.getAccessToken).mockReturnValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ error: 'NOT_VOTED', message: 'まだ投票していません' }),
      });

      await expect(changeVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        new ApiError('まだ投票していません', 409, 'NOT_VOTED')
      );
    });

    it('should throw ApiError when same candidate (400 SAME_CANDIDATE)', async () => {
      vi.mocked(storageService.storageService.getAccessToken).mockReturnValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'SAME_CANDIDATE',
          message: '既にこの候補に投票しています',
        }),
      });

      await expect(changeVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        new ApiError('既にこの候補に投票しています', 400, 'SAME_CANDIDATE')
      );
    });

    it('should throw ApiError when voting is closed (400 VOTING_CLOSED)', async () => {
      vi.mocked(storageService.storageService.getAccessToken).mockReturnValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'VOTING_CLOSED', message: '投票期間が終了しています' }),
      });

      await expect(changeVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        new ApiError('投票期間が終了しています', 400, 'VOTING_CLOSED')
      );
    });

    it('should throw ApiError for generic 400 errors', async () => {
      vi.mocked(storageService.storageService.getAccessToken).mockReturnValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'INVALID_REQUEST', message: '不正なリクエストです' }),
      });

      await expect(changeVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        new ApiError('不正なリクエストです', 400, 'INVALID_REQUEST')
      );
    });

    it('should throw ApiError for generic 409 errors', async () => {
      vi.mocked(storageService.storageService.getAccessToken).mockReturnValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ error: 'CONFLICT', message: '競合が発生しました' }),
      });

      await expect(changeVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        new ApiError('競合が発生しました', 409, 'CONFLICT')
      );
    });

    it('should throw ApiError for server errors (500)', async () => {
      vi.mocked(storageService.storageService.getAccessToken).mockReturnValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'INTERNAL_ERROR', message: 'サーバーエラー' }),
      });

      await expect(changeVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        new ApiError('投票に失敗しました。もう一度お試しください。', 500)
      );
    });

    it('should throw ApiError for network errors', async () => {
      vi.mocked(storageService.storageService.getAccessToken).mockReturnValue(mockToken);
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(changeVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        new ApiError('ネットワークエラーが発生しました', 0)
      );
    });

    it('should throw ApiError when response is not ok with unknown status', async () => {
      vi.mocked(storageService.storageService.getAccessToken).mockReturnValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ error: 'SERVICE_UNAVAILABLE' }),
      });

      await expect(changeVote(mockGameId, mockTurnNumber, mockCandidateId)).rejects.toThrow(
        new ApiError('投票の変更に失敗しました。もう一度お試しください。', 503)
      );
    });
  });
});
