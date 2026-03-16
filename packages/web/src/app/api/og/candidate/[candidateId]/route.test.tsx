/**
 * Unit tests for Candidate OGP Image Generation Route
 *
 * Tests the route that fetches game and candidate data from backend API
 * and generates OGP images with actual board rendering and highlighted move.
 *
 * Requirements: 1.2, 1.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from './route';

// Mock @vercel/og ImageResponse
vi.mock('@vercel/og', () => ({
  ImageResponse: class MockImageResponse extends Response {
    constructor(element: React.ReactElement, options?: { width?: number; height?: number }) {
      const body = JSON.stringify({ element: 'mock-image', options });
      super(body, {
        status: 200,
        headers: {
          'content-type': 'image/png',
        },
      });
    }
  },
}));

/** Sample game data */
const sampleGameData = {
  gameId: 'game-123',
  currentTurn: 5,
  status: 'ACTIVE' as const,
  boardState: {
    board: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 2, 1, 0, 0, 0],
      [0, 0, 0, 1, 2, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
  },
};

/** Sample candidates data */
const sampleCandidates = {
  candidates: [
    {
      candidateId: 'candidate-abc',
      position: '2,3',
      description: '中央を制圧する手',
      voteCount: 5,
    },
    {
      candidateId: 'candidate-def',
      position: '5,4',
      description: '角を狙う手',
      voteCount: 3,
    },
  ],
};

describe('GET /api/og/candidate/[candidateId]', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.com');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it('should return an image response when candidate data is fetched successfully', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ games: [sampleGameData] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleCandidates),
      });

    const candidateId = 'candidate-abc';
    const request = new Request(`http://localhost:3000/api/og/candidate/${candidateId}`);
    const params = Promise.resolve({ candidateId });

    const response = await GET(request, { params });

    expect(response).toBeDefined();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('image');
  });

  it('should return a fallback image when candidate is not found', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ games: [sampleGameData] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleCandidates),
      });

    const candidateId = 'nonexistent-candidate';
    const request = new Request(`http://localhost:3000/api/og/candidate/${candidateId}`);
    const params = Promise.resolve({ candidateId });

    const response = await GET(request, { params });

    expect(response).toBeDefined();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('image');
  });

  it('should return a fallback image when games API fails', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const candidateId = 'candidate-abc';
    const request = new Request(`http://localhost:3000/api/og/candidate/${candidateId}`);
    const params = Promise.resolve({ candidateId });

    const response = await GET(request, { params });

    expect(response).toBeDefined();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('image');
  });

  it('should return a fallback image when fetch throws an error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const candidateId = 'candidate-abc';
    const request = new Request(`http://localhost:3000/api/og/candidate/${candidateId}`);
    const params = Promise.resolve({ candidateId });

    const response = await GET(request, { params });

    expect(response).toBeDefined();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('image');
  });

  it('should return a fallback image when NEXT_PUBLIC_API_URL is not defined', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');

    const candidateId = 'candidate-abc';
    const request = new Request(`http://localhost:3000/api/og/candidate/${candidateId}`);
    const params = Promise.resolve({ candidateId });

    const response = await GET(request, { params });

    expect(response).toBeDefined();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('image');
  });

  it('should fetch games and candidates from the correct API endpoints', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ games: [sampleGameData] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleCandidates),
      });

    const candidateId = 'candidate-abc';
    const request = new Request(`http://localhost:3000/api/og/candidate/${candidateId}`);
    const params = Promise.resolve({ candidateId });

    await GET(request, { params });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/api/games',
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
      })
    );
    expect(global.fetch).toHaveBeenCalledWith(
      `https://api.example.com/api/games/${sampleGameData.gameId}/turns/${sampleGameData.currentTurn}/candidates`,
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('should search across multiple games to find the candidate', async () => {
    const game1 = { ...sampleGameData, gameId: 'game-1', currentTurn: 3 };
    const game2 = { ...sampleGameData, gameId: 'game-2', currentTurn: 7 };

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ games: [game1, game2] }),
      })
      // First game has no matching candidate
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ candidates: [] }),
      })
      // Second game has the matching candidate
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleCandidates),
      });

    const candidateId = 'candidate-abc';
    const request = new Request(`http://localhost:3000/api/og/candidate/${candidateId}`);
    const params = Promise.resolve({ candidateId });

    const response = await GET(request, { params });

    expect(response).toBeDefined();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('image');
    // Should have fetched candidates from both games
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
});
