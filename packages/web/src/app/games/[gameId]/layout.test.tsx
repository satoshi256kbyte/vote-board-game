/**
 * Unit tests for Game Detail Layout - generateMetadata
 *
 * Tests that generateMetadata returns correct OGP/Twitter Card metadata
 * for the game detail page, including fallback behavior.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateMetadata } from './layout';

describe('generateMetadata for /games/[gameId]', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.com');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.example.com');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it('should return correct metadata for an ACTIVE game', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          currentTurn: 5,
          status: 'ACTIVE',
        }),
    });

    const metadata = await generateMetadata({
      children: null as unknown as React.ReactNode,
      params: Promise.resolve({ gameId: 'game-123' }),
    });

    expect(metadata.title).toBe('オセロ対局 - ターン5');
    expect(metadata.description).toBe('AI vs 集合知の対局が進行中です');
    expect(metadata.openGraph?.title).toBe('オセロ対局 - ターン5');
    expect(metadata.openGraph?.description).toBe('AI vs 集合知の対局が進行中です');
    expect(metadata.openGraph?.images).toEqual([
      {
        url: 'https://app.example.com/api/og/game/game-123',
        width: 1200,
        height: 630,
        alt: 'オセロ対局 - ターン5',
      },
    ]);
    const twitter = metadata.twitter as Record<string, unknown>;
    expect(twitter?.card).toBe('summary_large_image');
  });

  it('should return correct metadata for a FINISHED game', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          currentTurn: 30,
          status: 'FINISHED',
        }),
    });

    const metadata = await generateMetadata({
      children: null as unknown as React.ReactNode,
      params: Promise.resolve({ gameId: 'game-456' }),
    });

    expect(metadata.title).toBe('オセロ対局 - ターン30');
    expect(metadata.description).toBe('対局が終了しました');
    expect(metadata.openGraph?.description).toBe('対局が終了しました');
    const twitter = metadata.twitter as Record<string, unknown>;
    expect(twitter?.card).toBe('summary_large_image');
  });

  it('should return fallback metadata when API fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    const metadata = await generateMetadata({
      children: null as unknown as React.ReactNode,
      params: Promise.resolve({ gameId: 'bad-game' }),
    });

    expect(metadata).toEqual({ title: '対局詳細 - 投票対局' });
  });

  it('should return fallback metadata when NEXT_PUBLIC_API_URL is not defined', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');

    const metadata = await generateMetadata({
      children: null as unknown as React.ReactNode,
      params: Promise.resolve({ gameId: 'no-url-game' }),
    });

    expect(metadata).toEqual({ title: '対局詳細 - 投票対局' });
  });

  it('should set twitter:card to summary_large_image', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          currentTurn: 10,
          status: 'ACTIVE',
        }),
    });

    const metadata = await generateMetadata({
      children: null as unknown as React.ReactNode,
      params: Promise.resolve({ gameId: 'twitter-test' }),
    });

    const twitter = metadata.twitter as Record<string, unknown>;
    expect(twitter?.card).toBe('summary_large_image');
  });
});
