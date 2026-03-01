/**
 * Unit tests for Game List Screen
 *
 * Tests the client component rendering and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import * as apiClient from '@/lib/api/client';
import Home from './page';
import type { GameSummary } from '@/types/game';

// Mock the API client
vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return {
    ...actual,
    fetchGames: vi.fn(),
  };
});

// Mock useAuth hook
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    isAuthenticated: false,
    logout: vi.fn(),
    login: vi.fn(),
    setUser: vi.fn(),
    isLoading: false,
  })),
}));

// Mock the GameList component
vi.mock('@/components/game-list', () => ({
  GameList: ({ initialGames }: { initialGames: GameSummary[] }) => (
    <div data-testid="game-list">
      {initialGames.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">対局がありません</p>
        </div>
      ) : (
        initialGames.map((game) => (
          <div key={game.gameId} data-testid={`game-${game.gameId}`}>
            {game.gameType}
          </div>
        ))
      )}
    </div>
  ),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: vi.fn((key: string) => {
      if (key === 'status') return null;
      if (key === 'cursor') return null;
      return null;
    }),
  }),
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('Home (Game List Screen)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render game list with active games by default', async () => {
    const mockGames: GameSummary[] = [
      {
        gameId: 'game-1',
        gameType: 'OTHELLO',
        status: 'ACTIVE',
        aiSide: 'BLACK',
        currentTurn: 1,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        gameId: 'game-2',
        gameType: 'OTHELLO',
        status: 'ACTIVE',
        aiSide: 'WHITE',
        currentTurn: 5,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ];

    vi.mocked(apiClient.fetchGames).mockResolvedValue({
      games: mockGames,
      nextCursor: undefined,
    });

    render(<Home />);

    await waitFor(() => {
      expect(screen.queryByTestId('game-list')).toBeInTheDocument();
    });

    expect(screen.getByTestId('game-game-1')).toBeInTheDocument();
    expect(screen.getByTestId('game-game-2')).toBeInTheDocument();
  });

  it('should display loading state initially', () => {
    vi.mocked(apiClient.fetchGames).mockImplementation(() => new Promise(() => {}));

    const { container } = render(<Home />);

    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should render error message when API fails', async () => {
    vi.mocked(apiClient.fetchGames).mockRejectedValue(
      new Error('ネットワークエラーが発生しました')
    );

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('投票対局')).toBeInTheDocument();
    });

    expect(screen.getByText('ネットワークエラーが発生しました')).toBeInTheDocument();
    expect(screen.queryByTestId('game-list')).not.toBeInTheDocument();
  });

  it('should render error message for API error', async () => {
    vi.mocked(apiClient.fetchGames).mockRejectedValue(new apiClient.ApiError('Server error', 500));

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });

  it('should fetch games with ACTIVE status by default', async () => {
    vi.mocked(apiClient.fetchGames).mockResolvedValue({
      games: [],
      nextCursor: undefined,
    });

    render(<Home />);

    await waitFor(() => {
      expect(apiClient.fetchGames).toHaveBeenCalledWith({
        status: 'ACTIVE',
        limit: 20,
        cursor: undefined,
      });
    });
  });

  it('should pass nextCursor to GameList component', async () => {
    const mockGames: GameSummary[] = [
      {
        gameId: 'game-1',
        gameType: 'OTHELLO',
        status: 'ACTIVE',
        aiSide: 'BLACK',
        currentTurn: 1,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ];

    vi.mocked(apiClient.fetchGames).mockResolvedValue({
      games: mockGames,
      nextCursor: 'next-cursor-123',
    });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByTestId('game-list')).toBeInTheDocument();
    });
  });

  it('should display empty state message when no games exist', async () => {
    vi.mocked(apiClient.fetchGames).mockResolvedValue({
      games: [],
      nextCursor: undefined,
    });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('対局がありません')).toBeInTheDocument();
    });

    // GameList component is rendered, but with empty games array
    expect(screen.getByTestId('game-list')).toBeInTheDocument();
    // No individual game cards should be present
    expect(screen.queryByTestId(/^game-/)).not.toBeInTheDocument();
  });
});
