/**
 * Candidate Card Component Tests
 *
 * Tests for the CandidateCard component including:
 * - Rendering candidate information
 * - Voting functionality
 * - Voted state display
 * - Accessibility
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CandidateCard } from './candidate-card';
import type { Candidate } from '@/types/game';

describe('CandidateCard', () => {
  const mockCandidate: Candidate = {
    candidateId: 'candidate-1',
    gameId: 'game-1',
    position: 'C4',
    description: 'この手は中央を制圧し、次のターンで有利な展開を作ります。',
    userId: 'user-1',
    username: 'テストユーザー',
    voteCount: 5,
    resultingBoardState: {
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
  };

  describe('Rendering', () => {
    it('should display candidate position', () => {
      render(<CandidateCard candidate={mockCandidate} isVoted={false} onVote={vi.fn()} />);
      expect(screen.getByText('C4')).toBeInTheDocument();
    });

    it('should display vote count', () => {
      render(<CandidateCard candidate={mockCandidate} isVoted={false} onVote={vi.fn()} />);
      expect(screen.getByText('5票')).toBeInTheDocument();
    });

    it('should display candidate description', () => {
      render(<CandidateCard candidate={mockCandidate} isVoted={false} onVote={vi.fn()} />);
      expect(
        screen.getByText('この手は中央を制圧し、次のターンで有利な展開を作ります。')
      ).toBeInTheDocument();
    });

    it('should display poster username', () => {
      render(<CandidateCard candidate={mockCandidate} isVoted={false} onVote={vi.fn()} />);
      expect(screen.getByText('投稿者: テストユーザー')).toBeInTheDocument();
    });

    it('should display board preview', () => {
      render(<CandidateCard candidate={mockCandidate} isVoted={false} onVote={vi.fn()} />);
      expect(screen.getByRole('grid', { name: 'オセロの盤面' })).toBeInTheDocument();
    });

    it('should truncate long descriptions', () => {
      const longDescription = 'あ'.repeat(300);
      const candidateWithLongDesc = { ...mockCandidate, description: longDescription };
      const { container } = render(
        <CandidateCard candidate={candidateWithLongDesc} isVoted={false} onVote={vi.fn()} />
      );
      const descElement = container.querySelector('.line-clamp-3');
      expect(descElement).toBeInTheDocument();
    });
  });

  describe('Voting Functionality', () => {
    it('should display "投票する" button when not voted', () => {
      render(<CandidateCard candidate={mockCandidate} isVoted={false} onVote={vi.fn()} />);
      expect(screen.getByRole('button', { name: 'C4に投票する' })).toBeInTheDocument();
    });

    it('should call onVote with candidateId when vote button is clicked', () => {
      const onVote = vi.fn();
      render(<CandidateCard candidate={mockCandidate} isVoted={false} onVote={onVote} />);

      const voteButton = screen.getByRole('button', { name: 'C4に投票する' });
      fireEvent.click(voteButton);

      expect(onVote).toHaveBeenCalledTimes(1);
      expect(onVote).toHaveBeenCalledWith('candidate-1');
    });

    it('should not call onVote when already voted', () => {
      const onVote = vi.fn();
      render(<CandidateCard candidate={mockCandidate} isVoted={true} onVote={onVote} />);

      const voteButton = screen.getByRole('button', { name: '投票済み' });
      fireEvent.click(voteButton);

      expect(onVote).not.toHaveBeenCalled();
    });
  });

  describe('Voted State', () => {
    it('should display "✓ 投票済み" indicator when voted', () => {
      render(<CandidateCard candidate={mockCandidate} isVoted={true} onVote={vi.fn()} />);
      expect(screen.getByText('✓ 投票済み')).toBeInTheDocument();
    });

    it('should disable button when already voted', () => {
      render(<CandidateCard candidate={mockCandidate} isVoted={true} onVote={vi.fn()} />);
      const voteButton = screen.getByRole('button', { name: '投票済み' });
      expect(voteButton).toBeDisabled();
    });

    it('should apply different styling when voted', () => {
      render(<CandidateCard candidate={mockCandidate} isVoted={true} onVote={vi.fn()} />);
      const voteButton = screen.getByRole('button', { name: '投票済み' });
      expect(voteButton).toHaveClass('bg-green-100', 'text-green-700', 'cursor-not-allowed');
    });

    it('should apply active styling when not voted', () => {
      render(<CandidateCard candidate={mockCandidate} isVoted={false} onVote={vi.fn()} />);
      const voteButton = screen.getByRole('button', { name: 'C4に投票する' });
      expect(voteButton).toHaveClass('bg-blue-600', 'text-white');
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label for vote button when not voted', () => {
      render(<CandidateCard candidate={mockCandidate} isVoted={false} onVote={vi.fn()} />);
      const voteButton = screen.getByRole('button', { name: 'C4に投票する' });
      expect(voteButton).toHaveAttribute('aria-label', 'C4に投票する');
    });

    it('should have proper aria-label for vote button when voted', () => {
      render(<CandidateCard candidate={mockCandidate} isVoted={true} onVote={vi.fn()} />);
      const voteButton = screen.getByRole('button', { name: '投票済み' });
      expect(voteButton).toHaveAttribute('aria-label', '投票済み');
    });

    it('should render board with accessibility features', () => {
      render(<CandidateCard candidate={mockCandidate} isVoted={false} onVote={vi.fn()} />);
      const board = screen.getByRole('grid', { name: 'オセロの盤面' });
      expect(board).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero vote count', () => {
      const candidateWithZeroVotes = { ...mockCandidate, voteCount: 0 };
      render(<CandidateCard candidate={candidateWithZeroVotes} isVoted={false} onVote={vi.fn()} />);
      expect(screen.getByText('0票')).toBeInTheDocument();
    });

    it('should handle large vote count', () => {
      const candidateWithManyVotes = { ...mockCandidate, voteCount: 9999 };
      render(<CandidateCard candidate={candidateWithManyVotes} isVoted={false} onVote={vi.fn()} />);
      expect(screen.getByText('9999票')).toBeInTheDocument();
    });

    it('should handle empty description', () => {
      const candidateWithEmptyDesc = { ...mockCandidate, description: '' };
      const { container } = render(
        <CandidateCard candidate={candidateWithEmptyDesc} isVoted={false} onVote={vi.fn()} />
      );
      const descElement = container.querySelector('.line-clamp-3');
      expect(descElement).toBeInTheDocument();
      expect(descElement?.textContent).toBe('');
    });

    it('should handle special characters in username', () => {
      const candidateWithSpecialChars = { ...mockCandidate, username: 'ユーザー@123' };
      render(
        <CandidateCard candidate={candidateWithSpecialChars} isVoted={false} onVote={vi.fn()} />
      );
      expect(screen.getByText('投稿者: ユーザー@123')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should render board with appropriate cell size', () => {
      const { container } = render(
        <CandidateCard candidate={mockCandidate} isVoted={false} onVote={vi.fn()} />
      );
      // Board component uses cellSize={30} for card preview
      const board = container.querySelector('[role="grid"]');
      expect(board).toBeInTheDocument();
    });

    it('should have responsive card layout', () => {
      const { container } = render(
        <CandidateCard candidate={mockCandidate} isVoted={false} onVote={vi.fn()} />
      );
      const card = container.firstChild;
      expect(card).toHaveClass('rounded-lg', 'shadow-md', 'overflow-hidden');
    });
  });
});
