/**
 * Unit tests for candidates API client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCandidates, type Candidate } from './candidates';
import { ApiError } from './client';

describe('getCandidates', () => {
  const mockGameId = '123e4567-e89b-12d3-a456-426614174000';
  const mockTurnNumber = 5;
  const mockApiUrl = 'https://api.example.com';

  beforeEach(() => {
    // Set environment variable
    process.env.NEXT_PUBLIC_API_URL = mockApiUrl;
    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore fetch mock
    vi.restoreAllMocks();
  });

  it('should fetch candidates successfully', async () => {
    const mockCandidates: Candidate[] = [
      {
        id: 'candidate-1',
        gameId: mockGameId,
        turnNumber: mockTurnNumber,
        position: 'D3',
        description: 'Test candidate 1',
        boardState: Array(8).fill(Array(8).fill('')),
        voteCount: 10,
        postedBy: 'user-1',
        postedByUsername: 'testuser1',
        status: 'active',
        deadline: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        source: 'ai',
      },
      {
        id: 'candidate-2',
        gameId: mockGameId,
        turnNumber: mockTurnNumber,
        position: 'E4',
        description: 'Test candidate 2',
        boardState: Array(8).fill(Array(8).fill('')),
        voteCount: 5,
        postedBy: 'user-2',
        postedByUsername: 'testuser2',
        status: 'active',
        deadline: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        source: 'user',
      },
    ];

    const mockResponse = {
      candidates: mockCandidates,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await getCandidates(mockGameId, mockTurnNumber);

    expect(result).toEqual(mockCandidates);
    expect(global.fetch).toHaveBeenCalledWith(
      `${mockApiUrl}/api/games/${mockGameId}/turns/${mockTurnNumber}/candidates`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );
  });

  it('should throw ApiError with "対局が見つかりません" when API returns 404', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ message: 'Game not found' }),
    });

    await expect(getCandidates(mockGameId, mockTurnNumber)).rejects.toThrow(ApiError);
    await expect(getCandidates(mockGameId, mockTurnNumber)).rejects.toThrow('対局が見つかりません');

    try {
      await getCandidates(mockGameId, mockTurnNumber);
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).statusCode).toBe(404);
    }
  });

  it('should throw ApiError with "候補の取得に失敗しました" for other HTTP errors', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Internal server error' }),
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
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    await expect(getCandidates(mockGameId, mockTurnNumber)).rejects.toThrow(ApiError);
    await expect(getCandidates(mockGameId, mockTurnNumber)).rejects.toThrow('Network error');
  });

  it('should use no-store cache policy', async () => {
    const mockCandidates: Candidate[] = [];
    const mockResponse = { candidates: mockCandidates };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    await getCandidates(mockGameId, mockTurnNumber);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        cache: 'no-store',
      })
    );
  });

  it('should construct correct URL with gameId and turnNumber', async () => {
    const mockResponse = { candidates: [] };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    await getCandidates(mockGameId, mockTurnNumber);

    expect(global.fetch).toHaveBeenCalledWith(
      `${mockApiUrl}/api/games/${mockGameId}/turns/${mockTurnNumber}/candidates`,
      expect.any(Object)
    );
  });
});
