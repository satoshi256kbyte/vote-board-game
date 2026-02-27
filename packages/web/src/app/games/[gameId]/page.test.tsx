/**
 * Tests for Game Detail Screen
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import GameDetailPage from './page';
import * as apiClient from '@/lib/api/client';

// Mock dependencies
vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  fetchGame: vi.fn(),
  fetchCandidates: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      public statusCode: number
    ) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

vi.mock('@/components/board', () => ({
  Board: () => <div data-testid="board">Board Component</div>,
}));

vi.mock('@/components/move-history', () => ({
  MoveHistory: ({ moves }: { moves: unknown[] }) => (
    <div data-testid="move-history">Move History ({moves.length})</div>
  ),
}));

vi.mock('@/components/candidate-card', () => ({
  CandidateCard: ({ candidate }: { candidate: { candidateId: string } }) => (
    <div data-testid={`candidate-${candidate.candidateId}`}>Candidate Card</div>
  ),
}));

describe('GameDetailPage', () => {
  const mockGame = {
    gameId: 'test-game-123',
    gameType: 'OTHELLO' as const,
    status: 'ACTIVE' as const,
    aiSide: 'BLACK' as const,
    currentTurn: 5,
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
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockCandidates = [
    {
      candidateId: 'candidate-1',
      gameId: 'test-game-123',
      position: 'C4',
      description: 'Good move',
      userId: 'user-1',
      username: 'player1',
      voteCount: 5,
      resultingBoardState: mockGame.boardState,
      createdAt: '2024-01-01T00:00:00Z',
    },
  ];

  it('should render game details', async () => {
    vi.spyOn(apiClient, 'fetchGame').mockResolvedValue(mockGame);
    vi.spyOn(apiClient, 'fetchCandidates').mockResolvedValue(mockCandidates);

    const page = await GameDetailPage({ params: Promise.resolve({ gameId: 'test-game-123' }) });
    const { container } = render(page);

    expect(container.textContent).toContain('オセロ対局');
    expect(container.textContent).toContain('ターン: 5');
    expect(container.textContent).toContain('進行中');
  });

  it('should display board component', async () => {
    vi.spyOn(apiClient, 'fetchGame').mockResolvedValue(mockGame);
    vi.spyOn(apiClient, 'fetchCandidates').mockResolvedValue(mockCandidates);

    const page = await GameDetailPage({ params: Promise.resolve({ gameId: 'test-game-123' }) });
    render(page);

    expect(screen.getByTestId('board')).toBeInTheDocument();
  });

  it('should display disc counts', async () => {
    vi.spyOn(apiClient, 'fetchGame').mockResolvedValue(mockGame);
    vi.spyOn(apiClient, 'fetchCandidates').mockResolvedValue(mockCandidates);

    const page = await GameDetailPage({ params: Promise.resolve({ gameId: 'test-game-123' }) });
    const { container } = render(page);

    // 2 black discs and 2 white discs in initial position
    expect(container.textContent).toContain('2');
  });

  it('should display current player turn', async () => {
    vi.spyOn(apiClient, 'fetchGame').mockResolvedValue(mockGame);
    vi.spyOn(apiClient, 'fetchCandidates').mockResolvedValue(mockCandidates);

    const page = await GameDetailPage({ params: Promise.resolve({ gameId: 'test-game-123' }) });
    const { container } = render(page);

    expect(container.textContent).toContain('現在のターン');
  });

  it('should display candidates', async () => {
    vi.spyOn(apiClient, 'fetchGame').mockResolvedValue(mockGame);
    vi.spyOn(apiClient, 'fetchCandidates').mockResolvedValue(mockCandidates);

    const page = await GameDetailPage({ params: Promise.resolve({ gameId: 'test-game-123' }) });
    render(page);

    expect(screen.getByTestId('candidate-candidate-1')).toBeInTheDocument();
  });

  it('should show empty state when no candidates', async () => {
    vi.spyOn(apiClient, 'fetchGame').mockResolvedValue(mockGame);
    vi.spyOn(apiClient, 'fetchCandidates').mockResolvedValue([]);

    const page = await GameDetailPage({ params: Promise.resolve({ gameId: 'test-game-123' }) });
    const { container } = render(page);

    expect(container.textContent).toContain('まだ候補がありません');
  });

  it('should display share button', async () => {
    vi.spyOn(apiClient, 'fetchGame').mockResolvedValue(mockGame);
    vi.spyOn(apiClient, 'fetchCandidates').mockResolvedValue(mockCandidates);

    const page = await GameDetailPage({ params: Promise.resolve({ gameId: 'test-game-123' }) });
    const { container } = render(page);

    expect(container.textContent).toContain('シェア');
  });

  it('should display post candidate link when game is active', async () => {
    vi.spyOn(apiClient, 'fetchGame').mockResolvedValue(mockGame);
    vi.spyOn(apiClient, 'fetchCandidates').mockResolvedValue(mockCandidates);

    const page = await GameDetailPage({ params: Promise.resolve({ gameId: 'test-game-123' }) });
    const { container } = render(page);

    expect(container.textContent).toContain('候補を投稿');
  });

  it('should not display post candidate link when game is finished', async () => {
    const finishedGame = { ...mockGame, status: 'FINISHED' as const, winner: 'AI' as const };
    vi.spyOn(apiClient, 'fetchGame').mockResolvedValue(finishedGame);
    vi.spyOn(apiClient, 'fetchCandidates').mockResolvedValue(mockCandidates);

    const page = await GameDetailPage({ params: Promise.resolve({ gameId: 'test-game-123' }) });
    const { container } = render(page);

    expect(container.textContent).not.toContain('候補を投稿');
  });

  it('should display winner when game is finished', async () => {
    const finishedGame = { ...mockGame, status: 'FINISHED' as const, winner: 'AI' as const };
    vi.spyOn(apiClient, 'fetchGame').mockResolvedValue(finishedGame);
    vi.spyOn(apiClient, 'fetchCandidates').mockResolvedValue(mockCandidates);

    const page = await GameDetailPage({ params: Promise.resolve({ gameId: 'test-game-123' }) });
    const { container } = render(page);

    expect(container.textContent).toContain('勝者');
    expect(container.textContent).toContain('AI');
  });

  it('should display AI commentary section', async () => {
    vi.spyOn(apiClient, 'fetchGame').mockResolvedValue(mockGame);
    vi.spyOn(apiClient, 'fetchCandidates').mockResolvedValue(mockCandidates);

    const page = await GameDetailPage({ params: Promise.resolve({ gameId: 'test-game-123' }) });
    const { container } = render(page);

    expect(container.textContent).toContain('AI解説');
  });
});
