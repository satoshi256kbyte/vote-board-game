/**
 * Unit tests for Game OGP Image Generation Route
 *
 * Tests the route that fetches game data from backend API
 * and generates OGP images with actual board rendering.
 *
 * Requirements: 1.1, 1.6, 7.2, 7.3
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

/** Sample board state for an active game */
const sampleActiveGameData = {
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

/** Sample board state for a finished game */
const sampleFinishedGameData = {
  currentTurn: 30,
  status: 'FINISHED' as const,
  boardState: {
    board: [
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
  },
};

describe('GET /api/og/game/[gameId]', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.com');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it('should return an image response when game data is fetched successfully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(sampleActiveGameData),
    });

    const gameId = 'test-game-id-123';
    const request = new Request(`http://localhost:3000/api/og/game/${gameId}`);
    const params = Promise.resolve({ gameId });

    const response = await GET(request, { params });

    expect(response).toBeDefined();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('image');
    expect(global.fetch).toHaveBeenCalledWith(
      `https://api.example.com/api/games/${gameId}`,
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('should return a fallback image when API fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    const gameId = 'nonexistent-game';
    const request = new Request(`http://localhost:3000/api/og/game/${gameId}`);
    const params = Promise.resolve({ gameId });

    const response = await GET(request, { params });

    expect(response).toBeDefined();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('image');
  });

  it('should return a fallback image when fetch throws an error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const gameId = 'error-game';
    const request = new Request(`http://localhost:3000/api/og/game/${gameId}`);
    const params = Promise.resolve({ gameId });

    const response = await GET(request, { params });

    expect(response).toBeDefined();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('image');
  });

  it('should set Cache-Control with 1-hour max-age for ACTIVE games', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(sampleActiveGameData),
    });

    const gameId = 'active-game';
    const request = new Request(`http://localhost:3000/api/og/game/${gameId}`);
    const params = Promise.resolve({ gameId });

    const response = await GET(request, { params });

    expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600, s-maxage=3600');
  });

  it('should set Cache-Control with 24-hour max-age for FINISHED games', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(sampleFinishedGameData),
    });

    const gameId = 'finished-game';
    const request = new Request(`http://localhost:3000/api/og/game/${gameId}`);
    const params = Promise.resolve({ gameId });

    const response = await GET(request, { params });

    expect(response.headers.get('Cache-Control')).toBe('public, max-age=86400, s-maxage=86400');
  });

  it('should return a fallback image when NEXT_PUBLIC_API_URL is not defined', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');

    const gameId = 'no-api-url-game';
    const request = new Request(`http://localhost:3000/api/og/game/${gameId}`);
    const params = Promise.resolve({ gameId });

    const response = await GET(request, { params });

    expect(response).toBeDefined();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('image');
  });
});
