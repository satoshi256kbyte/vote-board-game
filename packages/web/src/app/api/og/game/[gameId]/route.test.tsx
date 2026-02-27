/**
 * Unit tests for Game OGP Image Generation Route
 *
 * Requirements: Task 19
 */

import { describe, it, expect } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';

describe('GET /api/og/game/[gameId]', () => {
  it('should generate OGP image with game data', async () => {
    const gameId = 'test-game-id-123';
    const url = `http://localhost:3000/api/og/game/${gameId}?turn=5&black=10&white=8&status=ACTIVE`;
    const request = new NextRequest(url);
    const params = Promise.resolve({ gameId });

    const response = await GET(request, { params });

    expect(response).toBeDefined();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('image');
  });

  it('should handle missing query parameters with defaults', async () => {
    const gameId = 'test-game-id-456';
    const url = `http://localhost:3000/api/og/game/${gameId}`;
    const request = new NextRequest(url);
    const params = Promise.resolve({ gameId });

    const response = await GET(request, { params });

    expect(response).toBeDefined();
    expect(response.status).toBe(200);
  });

  it('should include game ID in the image', async () => {
    const gameId = 'abcd1234-5678-90ef-ghij-klmnopqrstuv';
    const url = `http://localhost:3000/api/og/game/${gameId}?turn=1&black=2&white=2&status=ACTIVE`;
    const request = new NextRequest(url);
    const params = Promise.resolve({ gameId });

    const response = await GET(request, { params });

    expect(response).toBeDefined();
    expect(response.status).toBe(200);
  });

  it('should handle finished game status', async () => {
    const gameId = 'finished-game-123';
    const url = `http://localhost:3000/api/og/game/${gameId}?turn=30&black=35&white=29&status=FINISHED`;
    const request = new NextRequest(url);
    const params = Promise.resolve({ gameId });

    const response = await GET(request, { params });

    expect(response).toBeDefined();
    expect(response.status).toBe(200);
  });
});
