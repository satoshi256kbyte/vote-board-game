/**
 * Unit tests for Game List Component
 *
 * Tests tab switching, pagination, and empty state.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameList } from './game-list';
import type { GameSummary } from '@/types/game';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock GameCard component
vi.mock('./game-card', () => ({
  GameCard: ({ game }: { game: GameSummary }) => (
    <div data-testid={`game-card-${game.gameId}`}>{game.gameType}</div>
  ),
}));

describe('GameList', () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render tabs for status filtering', () => {
    render(
      <GameList initialGames={mockGames} initialStatus="ACTIVE" initialNextCursor={undefined} />
    );

    expect(screen.getByText('進行中')).toBeInTheDocument();
    expect(screen.getByText('終了')).toBeInTheDocument();
  });

  it('should highlight active tab', () => {
    render(
      <GameList initialGames={mockGames} initialStatus="ACTIVE" initialNextCursor={undefined} />
    );

    const activeTab = screen.getByText('進行中');
    expect(activeTab).toHaveClass('border-blue-500', 'text-blue-600');
    expect(activeTab).toHaveAttribute('aria-current', 'page');
  });

  it('should highlight finished tab when selected', () => {
    render(
      <GameList initialGames={mockGames} initialStatus="FINISHED" initialNextCursor={undefined} />
    );

    const finishedTab = screen.getByText('終了');
    expect(finishedTab).toHaveClass('border-blue-500', 'text-blue-600');
    expect(finishedTab).toHaveAttribute('aria-current', 'page');
  });

  it('should navigate when tab is clicked', () => {
    render(
      <GameList initialGames={mockGames} initialStatus="ACTIVE" initialNextCursor={undefined} />
    );

    const finishedTab = screen.getByText('終了');
    fireEvent.click(finishedTab);

    expect(mockPush).toHaveBeenCalledWith('/?status=FINISHED');
  });

  it('should render game cards', () => {
    render(
      <GameList initialGames={mockGames} initialStatus="ACTIVE" initialNextCursor={undefined} />
    );

    expect(screen.getByTestId('game-card-game-1')).toBeInTheDocument();
    expect(screen.getByTestId('game-card-game-2')).toBeInTheDocument();
  });

  it('should render empty state when no games', () => {
    render(<GameList initialGames={[]} initialStatus="ACTIVE" initialNextCursor={undefined} />);

    expect(screen.getByText('対局がありません')).toBeInTheDocument();
    expect(screen.queryByTestId('game-card-game-1')).not.toBeInTheDocument();
  });

  it('should render load more button when nextCursor exists', () => {
    render(
      <GameList initialGames={mockGames} initialStatus="ACTIVE" initialNextCursor="cursor-123" />
    );

    expect(screen.getByText('さらに読み込む')).toBeInTheDocument();
  });

  it('should not render load more button when no nextCursor', () => {
    render(
      <GameList initialGames={mockGames} initialStatus="ACTIVE" initialNextCursor={undefined} />
    );

    expect(screen.queryByText('さらに読み込む')).not.toBeInTheDocument();
  });

  it('should navigate with cursor when load more is clicked', () => {
    render(
      <GameList initialGames={mockGames} initialStatus="ACTIVE" initialNextCursor="cursor-123" />
    );

    const loadMoreButton = screen.getByText('さらに読み込む');
    fireEvent.click(loadMoreButton);

    expect(mockPush).toHaveBeenCalledWith('/?status=ACTIVE&cursor=cursor-123');
  });

  it('should use grid layout for game cards', () => {
    const { container } = render(
      <GameList initialGames={mockGames} initialStatus="ACTIVE" initialNextCursor={undefined} />
    );

    const grid = container.querySelector('.grid');
    expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');
  });

  it('should update active tab state when tab is clicked', () => {
    render(
      <GameList initialGames={mockGames} initialStatus="ACTIVE" initialNextCursor={undefined} />
    );

    const finishedTab = screen.getByText('終了');
    fireEvent.click(finishedTab);

    expect(finishedTab).toHaveClass('border-blue-500', 'text-blue-600');
  });

  it('should render with finished status initially', () => {
    render(
      <GameList initialGames={mockGames} initialStatus="FINISHED" initialNextCursor={undefined} />
    );

    const finishedTab = screen.getByText('終了');
    expect(finishedTab).toHaveAttribute('aria-current', 'page');
  });
});
