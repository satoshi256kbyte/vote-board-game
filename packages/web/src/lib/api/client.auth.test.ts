/**
 * Authentication Token Tests for API Client
 *
 * Feature: 17-e2e-test-timeout-fix
 * Task: 3.7 Phase 4: 認証トークンの追加
 *
 * These tests verify that the API client correctly handles authentication tokens
 * for endpoints that require authentication (createCandidate, vote) and properly
 * omits tokens for public endpoints (fetchGames, fetchGame, createGame).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createGame, createCandidate, vote, fetchGames, fetchGame } from './client';
import * as storageService from '@/lib/services/storage-service';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock storage service
vi.mock('@/lib/services/storage-service', () => ({
  storageService: {
    getAccessToken: vi.fn(),
  },
}));

describe('API Client - Authentication Token Handling', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Public Endpoints (No Authentication Required)', () => {
    it('fetchGames: トークンなしでリクエストを送信する', async () => {
      vi.mocked(storageService.storageService.getAccessToken).mockReturnValue(null);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ games: [], nextCursor: undefined }),
      } as Response);

      await fetchGames();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/games',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );

      // Verify no Authorization header
      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1]?.headers as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
    });

    it('fetchGame: トークンなしでリクエストを送信する', async () => {
      vi.mocked(storageService.storageService.getAccessToken).mockReturnValue(null);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          gameId: 'test-game-id',
          gameType: 'OTHELLO',
          status: 'ACTIVE',
          aiSide: 'BLACK',
          currentTurn: 'BLACK',
          boardState: { board: Array(8).fill(Array(8).fill(0)) },
          moveHistory: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      } as Response);

      await fetchGame('test-game-id');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/games/test-game-id',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );

      // Verify no Authorization header
      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1]?.headers as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
    });

    it('createGame: トークンなしでリクエストを送信する（ゲーム作成は公開エンドポイント）', async () => {
      vi.mocked(storageService.storageService.getAccessToken).mockReturnValue(null);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          gameId: 'new-game-id',
          gameType: 'OTHELLO',
          status: 'ACTIVE',
          aiSide: 'BLACK',
          currentTurn: 'BLACK',
          boardState: { board: Array(8).fill(Array(8).fill(0)) },
          moveHistory: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      } as Response);

      await createGame({ gameType: 'OTHELLO', aiSide: 'BLACK' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/games',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );

      // Verify no Authorization header
      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1]?.headers as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
    });
  });

  describe('Protected Endpoints (Authentication Required)', () => {
    it('createCandidate: トークンありでAuthorizationヘッダーを含める', async () => {
      const mockToken = 'mock-jwt-token-12345';
      vi.mocked(storageService.storageService.getAccessToken).mockReturnValue(mockToken);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          candidateId: 'candidate-id',
          gameId: 'game-id',
          position: 'C4',
          description: 'Test move',
          voteCount: 0,
          createdAt: new Date().toISOString(),
        }),
      } as Response);

      await createCandidate('game-id', { position: 'C4', description: 'Test move' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/games/game-id/candidates',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it('vote: トークンありでAuthorizationヘッダーを含める', async () => {
      const mockToken = 'mock-jwt-token-67890';
      vi.mocked(storageService.storageService.getAccessToken).mockReturnValue(mockToken);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response);

      await vote('game-id', 'candidate-id');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/games/game-id/candidates/candidate-id/vote',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it('createCandidate: トークンなしの場合、Authorizationヘッダーを含めない（401エラーが期待される）', async () => {
      vi.mocked(storageService.storageService.getAccessToken).mockReturnValue(null);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'UNAUTHORIZED', message: 'Authorization header is required' }),
      } as Response);

      await expect(
        createCandidate('game-id', { position: 'C4', description: 'Test move' })
      ).rejects.toThrow();

      // Verify no Authorization header was sent
      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1]?.headers as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
    });

    it('vote: トークンなしの場合、Authorizationヘッダーを含めない（401エラーが期待される）', async () => {
      vi.mocked(storageService.storageService.getAccessToken).mockReturnValue(null);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'UNAUTHORIZED', message: 'Authorization header is required' }),
      } as Response);

      await expect(vote('game-id', 'candidate-id')).rejects.toThrow();

      // Verify no Authorization header was sent
      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1]?.headers as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
    });
  });

  describe('Token Retrieval Error Handling', () => {
    it('getAuthToken: storageServiceがエラーをスローした場合、nullを返す', async () => {
      vi.mocked(storageService.storageService.getAccessToken).mockImplementation(() => {
        throw new Error('Storage access error');
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          candidateId: 'candidate-id',
          gameId: 'game-id',
          position: 'C4',
          description: 'Test move',
          voteCount: 0,
          createdAt: new Date().toISOString(),
        }),
      } as Response);

      // Should not throw, but should proceed without token
      await createCandidate('game-id', { position: 'C4', description: 'Test move' });

      // Verify no Authorization header (token retrieval failed gracefully)
      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1]?.headers as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
    });
  });
});
