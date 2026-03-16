/**
 * Unit tests for Turn Detail Page
 *
 * Tests generateMetadata and TurnDetailPage component rendering.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { generateMetadata } from './page';
import TurnDetailPage from './page';

vi.mock('@/components/board', () => ({
  Board: (props: Record<string, unknown>) => (
    <div data-testid="board" data-board-state={JSON.stringify(props.boardState)} />
  ),
}));

vi.mock('@/components/share-button', () => ({
  ShareButton: (props: Record<string, unknown>) => (
    <div data-testid="share-button" data-title={props.title} data-text={props.text} />
  ),
}));

const mockNotFound = vi.fn();
vi.mock('next/navigation', () => ({
  notFound: (...args: unknown[]) => {
    mockNotFound(...args);
    throw new Error('NEXT_NOT_FOUND');
  },
}));

describe('Turn Detail Page', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.com');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.example.com');
    mockNotFound.mockClear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  const mockTurnData = {
    gameId: 'game-123',
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

  describe('generateMetadata', () => {
    it('should return correct og:title with formatGameTitle', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTurnData),
      });

      const metadata = await generateMetadata({
        params: Promise.resolve({ gameId: 'game-123', turnNumber: '5' }),
      });

      expect(metadata.title).toBe('オセロ対局 - ターン5');
      expect(metadata.openGraph?.title).toBe('オセロ対局 - ターン5');
    });

    it('should return correct og:description', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTurnData),
      });

      const metadata = await generateMetadata({
        params: Promise.resolve({ gameId: 'game-123', turnNumber: '5' }),
      });

      expect(metadata.description).toBe('ターン5の盤面');
      expect(metadata.openGraph?.description).toBe('ターン5の盤面');
    });

    it('should return correct og:image URL', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTurnData),
      });

      const metadata = await generateMetadata({
        params: Promise.resolve({ gameId: 'game-123', turnNumber: '5' }),
      });

      expect(metadata.openGraph?.images).toEqual([
        {
          url: 'https://app.example.com/api/og/game/game-123/turn/5',
          width: 1200,
          height: 630,
          alt: 'オセロ対局 - ターン5',
        },
      ]);
    });

    it('should return twitter:card as summary_large_image', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTurnData),
      });

      const metadata = await generateMetadata({
        params: Promise.resolve({ gameId: 'game-123', turnNumber: '5' }),
      });

      const twitter = metadata.twitter as Record<string, unknown>;
      expect(twitter?.card).toBe('summary_large_image');
    });

    it('should return fallback metadata on API failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const metadata = await generateMetadata({
        params: Promise.resolve({ gameId: 'bad-game', turnNumber: '1' }),
      });

      expect(metadata).toEqual({ title: 'ターン詳細 - 投票対局' });
    });

    it('should return fallback when NEXT_PUBLIC_API_URL is not set', async () => {
      vi.stubEnv('NEXT_PUBLIC_API_URL', '');

      const metadata = await generateMetadata({
        params: Promise.resolve({ gameId: 'game-123', turnNumber: '5' }),
      });

      expect(metadata).toEqual({ title: 'ターン詳細 - 投票対局' });
    });
  });

  describe('TurnDetailPage', () => {
    it('should render Board component with turn data', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTurnData),
      });

      const page = await TurnDetailPage({
        params: Promise.resolve({ gameId: 'game-123', turnNumber: '5' }),
      });
      render(page);

      expect(screen.getByTestId('board')).toBeInTheDocument();
    });

    it('should render ShareButton', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTurnData),
      });

      const page = await TurnDetailPage({
        params: Promise.resolve({ gameId: 'game-123', turnNumber: '5' }),
      });
      render(page);

      const shareButton = screen.getByTestId('share-button');
      expect(shareButton).toBeInTheDocument();
      expect(shareButton).toHaveAttribute('data-title', 'オセロ対局 - ターン5');
      expect(shareButton).toHaveAttribute('data-text', 'ターン5の盤面');
    });

    it('should call notFound() when data fetch fails', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(
        TurnDetailPage({
          params: Promise.resolve({ gameId: 'bad-game', turnNumber: '99' }),
        })
      ).rejects.toThrow('NEXT_NOT_FOUND');

      expect(mockNotFound).toHaveBeenCalled();
    });

    it('should show back link to game detail', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTurnData),
      });

      const page = await TurnDetailPage({
        params: Promise.resolve({ gameId: 'game-123', turnNumber: '5' }),
      });
      render(page);

      const backLink = screen.getByText('← 対局詳細に戻る');
      expect(backLink).toBeInTheDocument();
      expect(backLink.closest('a')).toHaveAttribute('href', '/games/game-123');
    });

    it('should display disc counts', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTurnData),
      });

      const page = await TurnDetailPage({
        params: Promise.resolve({ gameId: 'game-123', turnNumber: '5' }),
      });
      render(page);

      // mockTurnData has 2 black and 2 white discs
      const discCounts = screen.getAllByText('2');
      expect(discCounts).toHaveLength(2);
    });
  });
});
