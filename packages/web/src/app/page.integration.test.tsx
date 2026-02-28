/**
 * Integration tests for Game List Screen
 *
 * Tests the full user flow including tab switching and pagination.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

// Mock next/navigation
const mockPush = vi.fn();
const mockGet = vi.fn();
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: mockGet,
  }),
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('Game List Screen Integration', () => {
  const mockActiveGames: GameSummary[] = [
    {
      gameId: 'active-1',
      gameType: 'OTHELLO',
      status: 'ACTIVE',
      aiSide: 'BLACK',
      currentTurn: 1,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      gameId: 'active-2',
      gameType: 'OTHELLO',
      status: 'ACTIVE',
      aiSide: 'WHITE',
      currentTurn: 5,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ];

  const mockFinishedGames: GameSummary[] = [
    {
      gameId: 'finished-1',
      gameType: 'OTHELLO',
      status: 'FINISHED',
      aiSide: 'BLACK',
      currentTurn: 60,
      winner: 'AI',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockReturnValue(null);
  });

  it('should display active games by default and allow switching to finished games', async () => {
    vi.mocked(apiClient.fetchGames).mockResolvedValue({
      games: mockActiveGames,
      nextCursor: undefined,
    });

    render(<Home />);

    await waitFor(() => {
      expect(screen.queryByText('進行中')).toBeInTheDocument();
    });

    expect(screen.getByText('進行中')).toHaveClass('border-blue-500');

    // Should not show empty state
    expect(screen.queryByText('対局がありません')).not.toBeInTheDocument();

    // Click on finished tab
    const finishedTab = screen.getByText('終了');
    fireEvent.click(finishedTab);

    // Should navigate to finished games
    expect(mockPush).toHaveBeenCalledWith('/?status=FINISHED');
  });

  it('should handle pagination flow', async () => {
    vi.mocked(apiClient.fetchGames).mockResolvedValue({
      games: mockActiveGames,
      nextCursor: 'cursor-123',
    });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('さらに読み込む')).toBeInTheDocument();
    });

    // Click load more
    const loadMoreButton = screen.getByText('さらに読み込む');
    fireEvent.click(loadMoreButton);

    // Should navigate with cursor
    expect(mockPush).toHaveBeenCalledWith('/?status=ACTIVE&cursor=cursor-123');
  });

  it('should display empty state when no games exist', async () => {
    vi.mocked(apiClient.fetchGames).mockResolvedValue({
      games: [],
      nextCursor: undefined,
    });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('対局がありません')).toBeInTheDocument();
    });

    expect(screen.queryByText('さらに読み込む')).not.toBeInTheDocument();
  });

  it('should handle network errors gracefully', async () => {
    vi.mocked(apiClient.fetchGames).mockRejectedValue(
      new Error('ネットワークエラーが発生しました')
    );

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('ネットワークエラーが発生しました')).toBeInTheDocument();
    });

    expect(screen.queryByText('進行中')).not.toBeInTheDocument();
  });

  it('should maintain status when paginating', async () => {
    mockGet.mockImplementation((key: string) => {
      if (key === 'status') return 'FINISHED';
      return null;
    });

    vi.mocked(apiClient.fetchGames).mockResolvedValue({
      games: mockFinishedGames,
      nextCursor: 'cursor-456',
    });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('終了')).toHaveClass('border-blue-500');
    });

    // Click load more
    const loadMoreButton = screen.getByText('さらに読み込む');
    fireEvent.click(loadMoreButton);

    // Should maintain FINISHED status in pagination
    expect(mockPush).toHaveBeenCalledWith('/?status=FINISHED&cursor=cursor-456');
  });

  it('should render responsive grid layout', async () => {
    vi.mocked(apiClient.fetchGames).mockResolvedValue({
      games: mockActiveGames,
      nextCursor: undefined,
    });

    const { container } = render(<Home />);

    await waitFor(() => {
      const grid = container.querySelector('.grid');
      expect(grid).toBeInTheDocument();
    });

    const grid = container.querySelector('.grid');
    expect(grid).toHaveClass('grid-cols-1');
    expect(grid).toHaveClass('md:grid-cols-2');
    expect(grid).toHaveClass('lg:grid-cols-3');
  });

  it('should fetch games with correct parameters', async () => {
    mockGet.mockImplementation((key: string) => {
      if (key === 'status') return 'ACTIVE';
      if (key === 'cursor') return 'test-cursor';
      return null;
    });

    vi.mocked(apiClient.fetchGames).mockResolvedValue({
      games: mockActiveGames,
      nextCursor: undefined,
    });

    render(<Home />);

    await waitFor(() => {
      expect(apiClient.fetchGames).toHaveBeenCalledWith({
        status: 'ACTIVE',
        limit: 20,
        cursor: 'test-cursor',
      });
    });
  });
});
