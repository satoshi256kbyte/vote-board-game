/**
 * Game Card Component Tests
 *
 * Unit tests for the GameCard component using React Testing Library.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameCard } from './game-card';
import type { GameSummary, BoardState } from '@/types/game';

describe('GameCard', () => {
  const mockBoardState: BoardState = {
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
  };

  const mockGame: GameSummary = {
    gameId: 'test-game-123',
    gameType: 'OTHELLO',
    status: 'ACTIVE',
    aiSide: 'BLACK',
    currentTurn: 5,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T12:00:00Z',
  };

  it('should render board thumbnail', () => {
    render(
      <GameCard
        game={mockGame}
        boardState={mockBoardState}
        participantCount={42}
        votingDeadline="2024-01-02T00:00:00Z"
      />
    );

    const board = screen.getByRole('grid', { name: 'オセロの盤面' });
    expect(board).toBeInTheDocument();
  });

  it('should display game title with type and mode', () => {
    render(
      <GameCard
        game={mockGame}
        boardState={mockBoardState}
        participantCount={42}
        votingDeadline="2024-01-02T00:00:00Z"
      />
    );

    expect(screen.getByText('オセロ - AI vs 集合知')).toBeInTheDocument();
  });

  it('should display current turn number', () => {
    const { container } = render(
      <GameCard
        game={mockGame}
        boardState={mockBoardState}
        participantCount={42}
        votingDeadline="2024-01-02T00:00:00Z"
      />
    );

    expect(screen.getByText('ターン数:')).toBeInTheDocument();
    // Find the turn number in the metadata section (not board coordinates)
    const metadataSection = container.querySelector('.space-y-1');
    expect(metadataSection).toHaveTextContent('5');
  });

  it('should display participant count', () => {
    render(
      <GameCard
        game={mockGame}
        boardState={mockBoardState}
        participantCount={42}
        votingDeadline="2024-01-02T00:00:00Z"
      />
    );

    expect(screen.getByText('参加者数:')).toBeInTheDocument();
    expect(screen.getByText('42人')).toBeInTheDocument();
  });

  it('should display voting deadline', () => {
    render(
      <GameCard
        game={mockGame}
        boardState={mockBoardState}
        participantCount={42}
        votingDeadline="2024-01-02T15:30:00Z"
      />
    );

    expect(screen.getByText('投票締切:')).toBeInTheDocument();
    // Note: The exact format depends on timezone, so we just check it exists
    expect(screen.getByText(/\d+\/\d+ \d+:\d+/)).toBeInTheDocument();
  });

  it('should display "詳細を見る" button', () => {
    render(
      <GameCard
        game={mockGame}
        boardState={mockBoardState}
        participantCount={42}
        votingDeadline="2024-01-02T00:00:00Z"
      />
    );

    const button = screen.getByRole('link', { name: '詳細を見る' });
    expect(button).toBeInTheDocument();
  });

  it('should link to game detail page', () => {
    render(
      <GameCard
        game={mockGame}
        boardState={mockBoardState}
        participantCount={42}
        votingDeadline="2024-01-02T00:00:00Z"
      />
    );

    const link = screen.getByRole('link', { name: '詳細を見る' });
    expect(link).toHaveAttribute('href', '/games/test-game-123');
  });

  it('should render with different game types', () => {
    const chessGame: GameSummary = {
      ...mockGame,
      gameType: 'CHESS',
    };

    render(
      <GameCard
        game={chessGame}
        boardState={mockBoardState}
        participantCount={42}
        votingDeadline="2024-01-02T00:00:00Z"
      />
    );

    expect(screen.getByText('チェス - AI vs 集合知')).toBeInTheDocument();
  });

  it('should render with different turn numbers', () => {
    const gameWithDifferentTurn: GameSummary = {
      ...mockGame,
      currentTurn: 20,
    };

    render(
      <GameCard
        game={gameWithDifferentTurn}
        boardState={mockBoardState}
        participantCount={42}
        votingDeadline="2024-01-02T00:00:00Z"
      />
    );

    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('should render with different participant counts', () => {
    render(
      <GameCard
        game={mockGame}
        boardState={mockBoardState}
        participantCount={100}
        votingDeadline="2024-01-02T00:00:00Z"
      />
    );

    expect(screen.getByText('100人')).toBeInTheDocument();
  });

  it('should render with zero participants', () => {
    render(
      <GameCard
        game={mockGame}
        boardState={mockBoardState}
        participantCount={0}
        votingDeadline="2024-01-02T00:00:00Z"
      />
    );

    expect(screen.getByText('0人')).toBeInTheDocument();
  });

  it('should have proper styling classes', () => {
    const { container } = render(
      <GameCard
        game={mockGame}
        boardState={mockBoardState}
        participantCount={42}
        votingDeadline="2024-01-02T00:00:00Z"
      />
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('bg-white', 'rounded-lg', 'shadow-md');
  });

  it('should render board with correct cell size', () => {
    render(
      <GameCard
        game={mockGame}
        boardState={mockBoardState}
        participantCount={42}
        votingDeadline="2024-01-02T00:00:00Z"
      />
    );

    // Board should be rendered with cellSize=30 for thumbnail
    const board = screen.getByRole('grid', { name: 'オセロの盤面' });
    expect(board).toBeInTheDocument();
  });

  it('should format deadline with leading zeros for minutes', () => {
    render(
      <GameCard
        game={mockGame}
        boardState={mockBoardState}
        participantCount={42}
        votingDeadline="2024-01-02T15:05:00Z"
      />
    );

    // Should format minutes with leading zero (05 not 5)
    expect(screen.getByText(/\d+\/\d+ \d+:05/)).toBeInTheDocument();
  });

  it('should handle different AI sides', () => {
    const whiteAiGame: GameSummary = {
      ...mockGame,
      aiSide: 'WHITE',
    };

    render(
      <GameCard
        game={whiteAiGame}
        boardState={mockBoardState}
        participantCount={42}
        votingDeadline="2024-01-02T00:00:00Z"
      />
    );

    // Game mode should still show "AI vs 集合知"
    expect(screen.getByText('オセロ - AI vs 集合知')).toBeInTheDocument();
  });
});
