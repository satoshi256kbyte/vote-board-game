/**
 * Unit tests for Turn OGP Image Generation Route
 *
 * Tests the route that fetches turn data from backend API
 * and generates OGP images with actual board rendering.
 *
 * Requirements: 2.1, 2.3, 7.4
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

/** Sample turn data */
const sampleTurnData = {
  gameId: 'test-game-id-123',
  turnNumber: 5,
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
  currentPlayer: 'BLACK' as const,
};

describe('GET /api/og/game/[gameId]/turn/[turnNumber]', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.com');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it('should return an image response when turn data is fetched successfully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(sampleTurnData),
    });

    const gameId = 'test-game-id-123';
    const turnNumber = '5';
    const request = new Request(`http://localhost:3000/api/og/game/${gameId}/turn/${turnNumber}`);
    const params = Promise.resolve({ gameId, turnNumber });

    const response = await GET(request, { params });

    expect(response).toBeDefined();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('image');
    expect(global.fetch).toHaveBeenCalledWith(
      `https://api.example.com/api/games/${gameId}/turns/${turnNumber}`,
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('should return a fallback image when API returns 404 (turn not found)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    const gameId = 'test-game-id-123';
    const turnNumber = '999';
    const request = new Request(`http://localhost:3000/api/og/game/${gameId}/turn/${turnNumber}`);
    const params = Promise.resolve({ gameId, turnNumber });

    const response = await GET(request, { params });

    expect(response).toBeDefined();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('image');
  });

  it('should return a fallback image when fetch throws an error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const gameId = 'error-game';
    const turnNumber = '1';
    const request = new Request(`http://localhost:3000/api/og/game/${gameId}/turn/${turnNumber}`);
    const params = Promise.resolve({ gameId, turnNumber });

    const response = await GET(request, { params });

    expect(response).toBeDefined();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('image');
  });

  it('should set Cache-Control with 24-hour max-age for turn images', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(sampleTurnData),
    });

    const gameId = 'test-game-id-123';
    const turnNumber = '5';
    const request = new Request(`http://localhost:3000/api/og/game/${gameId}/turn/${turnNumber}`);
    const params = Promise.resolve({ gameId, turnNumber });

    const response = await GET(request, { params });

    expect(response.headers.get('Cache-Control')).toBe('public, max-age=86400, s-maxage=86400');
  });

  it('should return a fallback image when NEXT_PUBLIC_API_URL is not defined', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');

    const gameId = 'no-api-url-game';
    const turnNumber = '1';
    const request = new Request(`http://localhost:3000/api/og/game/${gameId}/turn/${turnNumber}`);
    const params = Promise.resolve({ gameId, turnNumber });

    const response = await GET(request, { params });

    expect(response).toBeDefined();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('image');
  });
});
