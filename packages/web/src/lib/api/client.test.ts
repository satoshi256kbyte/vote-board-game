import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  fetchGames,
  fetchGame,
  createGame,
  fetchCandidates,
  createCandidate,
  vote,
  ApiError,
} from './client';
import type { Game, GameSummary, Candidate } from '@/types/game';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock environment variable
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';

describe('API Client', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('fetchGames', () => {
    it('should fetch games with default parameters', async () => {
      const mockResponse: { games: GameSummary[]; nextCursor?: string } = {
        games: [
          {
            gameId: '123e4567-e89b-12d3-a456-426614174000',
            gameType: 'OTHELLO',
            status: 'ACTIVE',
            aiSide: 'BLACK',
            currentTurn: 5,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:05:00Z',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await fetchGames();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/games',
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should fetch games with status filter', async () => {
      const mockResponse = { games: [] };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await fetchGames({ status: 'FINISHED' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/games?status=FINISHED',
        expect.any(Object)
      );
    });

    it('should fetch games with limit and cursor', async () => {
      const mockResponse = { games: [], nextCursor: 'next-cursor' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await fetchGames({ limit: 10, cursor: 'cursor-123' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/games?limit=10&cursor=cursor-123',
        expect.any(Object)
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(fetchGames()).rejects.toThrow('Network error');
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: 'INTERNAL_ERROR',
          message: 'Internal Server Error',
        }),
      });

      try {
        await fetchGames();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(500);
        expect((error as ApiError).errorCode).toBe('INTERNAL_ERROR');
      }
    });
  });

  describe('fetchGame', () => {
    it('should fetch a specific game', async () => {
      const mockGame: Game = {
        gameId: '123e4567-e89b-12d3-a456-426614174000',
        gameType: 'OTHELLO',
        status: 'ACTIVE',
        aiSide: 'BLACK',
        currentTurn: 5,
        boardState: {
          board: Array(8).fill(Array(8).fill(0)),
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:05:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGame,
      });

      const result = await fetchGame('123e4567-e89b-12d3-a456-426614174000');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/games/123e4567-e89b-12d3-a456-426614174000',
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
      );
      expect(result).toEqual(mockGame);
    });

    it('should handle 404 error when game not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: 'NOT_FOUND',
          message: 'Game not found',
        }),
      });

      try {
        await fetchGame('non-existent-id');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(404);
        expect((error as ApiError).errorCode).toBe('NOT_FOUND');
      }
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      await expect(fetchGame('123')).rejects.toThrow('Network timeout');
    });
  });

  describe('createGame', () => {
    it('should create a new game', async () => {
      const mockGame: Game = {
        gameId: '123e4567-e89b-12d3-a456-426614174000',
        gameType: 'OTHELLO',
        status: 'ACTIVE',
        aiSide: 'BLACK',
        currentTurn: 0,
        boardState: {
          board: Array(8).fill(Array(8).fill(0)),
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockGame,
      });

      const result = await createGame({
        gameType: 'OTHELLO',
        aiSide: 'BLACK',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/games',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameType: 'OTHELLO',
            aiSide: 'BLACK',
          }),
        })
      );
      expect(result).toEqual(mockGame);
    });

    it('should handle validation errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: {
            fields: {
              aiSide: 'Required',
            },
          },
        }),
      });

      try {
        await createGame({ gameType: 'OTHELLO', aiSide: 'BLACK' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(400);
        expect((error as ApiError).errorCode).toBe('VALIDATION_ERROR');
      }
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(createGame({ gameType: 'OTHELLO', aiSide: 'BLACK' })).rejects.toThrow(
        'Connection refused'
      );
    });
  });

  describe('fetchCandidates', () => {
    it('should fetch candidates for a game', async () => {
      const mockCandidates: Candidate[] = [
        {
          candidateId: '987fcdeb-51a2-43f1-b123-456789abcdef',
          gameId: '123e4567-e89b-12d3-a456-426614174000',
          position: 'C4',
          description: 'この手は中央を制圧する重要な一手です。',
          userId: 'user-123',
          username: 'player1',
          voteCount: 5,
          resultingBoardState: {
            board: Array(8).fill(Array(8).fill(0)),
          },
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCandidates,
      });

      const result = await fetchCandidates('123e4567-e89b-12d3-a456-426614174000');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/games/123e4567-e89b-12d3-a456-426614174000/candidates',
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
      );
      expect(result).toEqual(mockCandidates);
    });

    it('should handle empty candidates list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const result = await fetchCandidates('123e4567-e89b-12d3-a456-426614174000');

      expect(result).toEqual([]);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(fetchCandidates('123')).rejects.toThrow('Network error');
    });
  });

  describe('createCandidate', () => {
    it('should create a new candidate', async () => {
      const mockCandidate: Candidate = {
        candidateId: '987fcdeb-51a2-43f1-b123-456789abcdef',
        gameId: '123e4567-e89b-12d3-a456-426614174000',
        position: 'C4',
        description: 'この手は中央を制圧する重要な一手です。',
        userId: 'user-123',
        username: 'player1',
        voteCount: 0,
        resultingBoardState: {
          board: Array(8).fill(Array(8).fill(0)),
        },
        createdAt: '2024-01-01T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockCandidate,
      });

      const result = await createCandidate('123e4567-e89b-12d3-a456-426614174000', {
        position: 'C4',
        description: 'この手は中央を制圧する重要な一手です。',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/games/123e4567-e89b-12d3-a456-426614174000/candidates',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            position: 'C4',
            description: 'この手は中央を制圧する重要な一手です。',
          }),
        })
      );
      expect(result).toEqual(mockCandidate);
    });

    it('should handle validation errors for illegal moves', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'VALIDATION_ERROR',
          message: 'Illegal move',
          details: {
            fields: {
              position: 'This move is not legal',
            },
          },
        }),
      });

      try {
        await createCandidate('123', { position: 'A1', description: 'Test' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(400);
        expect((error as ApiError).errorCode).toBe('VALIDATION_ERROR');
      }
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(createCandidate('123', { position: 'C4', description: 'Test' })).rejects.toThrow(
        'Network error'
      );
    });
  });

  describe('vote', () => {
    it('should vote for a candidate', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await vote('123e4567-e89b-12d3-a456-426614174000', '987fcdeb-51a2-43f1-b123-456789abcdef');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/games/123e4567-e89b-12d3-a456-426614174000/candidates/987fcdeb-51a2-43f1-b123-456789abcdef/vote',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should handle already voted error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'ALREADY_VOTED',
          message: 'You have already voted',
        }),
      });

      try {
        await vote('123', '456');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(400);
        expect((error as ApiError).errorCode).toBe('ALREADY_VOTED');
      }
    });

    it('should handle candidate not found error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: 'NOT_FOUND',
          message: 'Candidate not found',
        }),
      });

      try {
        await vote('123', 'non-existent');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(404);
        expect((error as ApiError).errorCode).toBe('NOT_FOUND');
      }
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(vote('123', '456')).rejects.toThrow('Network error');
    });
  });

  describe('ApiError', () => {
    it('should create ApiError with all properties', () => {
      const error = new ApiError('Test error', 400, 'TEST_ERROR', { field: 'value' });

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('TEST_ERROR');
      expect(error.details).toEqual({ field: 'value' });
      expect(error.name).toBe('ApiError');
    });

    it('should create ApiError without optional properties', () => {
      const error = new ApiError('Test error', 500);

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.errorCode).toBeUndefined();
      expect(error.details).toBeUndefined();
    });
  });

  describe('Error handling for non-JSON responses', () => {
    it('should handle non-JSON error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => {
          throw new Error('Not JSON');
        },
      });

      try {
        await fetchGames();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).message).toBe('Internal Server Error');
        expect((error as ApiError).statusCode).toBe(500);
      }
    });
  });

  describe('Environment variable validation', () => {
    it('should throw error when NEXT_PUBLIC_API_URL is not defined', async () => {
      const originalUrl = process.env.NEXT_PUBLIC_API_URL;
      delete process.env.NEXT_PUBLIC_API_URL;

      await expect(fetchGames()).rejects.toThrow('NEXT_PUBLIC_API_URL is not defined');

      process.env.NEXT_PUBLIC_API_URL = originalUrl;
    });
  });
});
