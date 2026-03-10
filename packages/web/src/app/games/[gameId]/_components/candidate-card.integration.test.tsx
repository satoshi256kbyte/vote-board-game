/**
 * Integration tests for CandidateCard component
 *
 * Tests the complete voting flow including:
 * - Vote button interaction
 * - API calls
 * - UI updates
 * - Vote change flow with confirmation dialog
 * - Error handling
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 8.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CandidateCard } from './candidate-card';
import type { Candidate } from '@/lib/api/candidates';

// Mock the API functions
vi.mock('@/lib/api/candidates', () => ({
  createVote: vi.fn(),
  changeVote: vi.fn(),
}));

// Mock the storage service
vi.mock('@/lib/services/storage-service', () => ({
  storageService: {
    getAccessToken: vi.fn(() => 'mock-token'),
  },
}));

describe('CandidateCard Integration Tests', () => {
  const mockCandidate: Candidate = {
    id: 'candidate-1',
    gameId: 'game-1',
    turnNumber: 1,
    position: 'D3',
    description: 'この手で中央を制圧できます',
    boardState: [
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', 'white', 'black', '', '', ''],
      ['', '', '', 'black', 'white', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
    ],
    voteCount: 5,
    postedBy: 'user-1',
    postedByUsername: 'testuser',
    status: 'active',
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
    createdAt: new Date().toISOString(),
    source: 'user',
  };

  const defaultProps = {
    candidate: mockCandidate,
    gameId: 'game-1',
    turnNumber: 1,
    isAuthenticated: true,
    onVoteSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Vote Flow', () => {
    it('should complete vote flow successfully', async () => {
      const { createVote } = await import('@/lib/api/candidates');
      vi.mocked(createVote).mockResolvedValue();

      const onVoteSuccess = vi.fn();

      render(<CandidateCard {...defaultProps} onVoteSuccess={onVoteSuccess} />);

      // Find and click vote button
      const voteButton = screen.getByTestId('vote-button');
      expect(voteButton).toBeInTheDocument();
      expect(voteButton).toHaveTextContent('投票する');

      fireEvent.click(voteButton);

      // Wait for loading state
      await waitFor(() => {
        expect(voteButton).toHaveTextContent('処理中...');
      });

      // Wait for API call and success callback
      await waitFor(() => {
        expect(createVote).toHaveBeenCalledWith('game-1', 1, 'candidate-1');
        expect(onVoteSuccess).toHaveBeenCalled();
      });
    });

    it('should update UI after successful vote', async () => {
      const { createVote } = await import('@/lib/api/candidates');
      vi.mocked(createVote).mockResolvedValue();

      const { rerender } = render(<CandidateCard {...defaultProps} />);

      // Click vote button
      const voteButton = screen.getByTestId('vote-button');
      fireEvent.click(voteButton);

      // Wait for API call
      await waitFor(() => {
        expect(createVote).toHaveBeenCalled();
      });

      // Simulate parent component updating props after vote success
      rerender(<CandidateCard {...defaultProps} currentVotedCandidateId={mockCandidate.id} />);

      // Vote status indicator should be displayed
      await waitFor(() => {
        expect(screen.getByTestId('vote-status-indicator')).toBeInTheDocument();
        expect(screen.getByText('投票済み')).toBeInTheDocument();
      });

      // Vote button should not be displayed
      expect(screen.queryByTestId('vote-button')).not.toBeInTheDocument();
    });
  });

  describe('Vote Change Flow', () => {
    it('should show confirmation dialog when changing vote', async () => {
      render(<CandidateCard {...defaultProps} currentVotedCandidateId="other-candidate-id" />);

      // Vote button should show "投票を変更"
      const voteButton = screen.getByTestId('vote-button');
      expect(voteButton).toHaveTextContent('投票を変更');

      // Click vote change button
      fireEvent.click(voteButton);

      // Confirmation dialog should appear
      await waitFor(() => {
        expect(screen.getByTestId('vote-change-dialog')).toBeInTheDocument();
        expect(screen.getByText('投票を変更しますか？')).toBeInTheDocument();
      });
    });

    it('should complete vote change flow when confirmed', async () => {
      const { changeVote } = await import('@/lib/api/candidates');
      vi.mocked(changeVote).mockResolvedValue();

      const onVoteSuccess = vi.fn();

      render(
        <CandidateCard
          {...defaultProps}
          currentVotedCandidateId="other-candidate-id"
          onVoteSuccess={onVoteSuccess}
        />
      );

      // Click vote change button
      const voteButton = screen.getByTestId('vote-button');
      fireEvent.click(voteButton);

      // Wait for dialog
      await waitFor(() => {
        expect(screen.getByTestId('vote-change-dialog')).toBeInTheDocument();
      });

      // Click confirm button
      const confirmButton = screen.getByTestId('confirm-button');
      fireEvent.click(confirmButton);

      // Wait for API call and success callback
      await waitFor(() => {
        expect(changeVote).toHaveBeenCalledWith('game-1', 1, 'candidate-1');
        expect(onVoteSuccess).toHaveBeenCalled();
      });
    });

    it('should cancel vote change when cancel button is clicked', async () => {
      const { changeVote } = await import('@/lib/api/candidates');
      vi.mocked(changeVote).mockResolvedValue();

      const onVoteSuccess = vi.fn();

      render(
        <CandidateCard
          {...defaultProps}
          currentVotedCandidateId="other-candidate-id"
          onVoteSuccess={onVoteSuccess}
        />
      );

      // Click vote change button
      const voteButton = screen.getByTestId('vote-button');
      fireEvent.click(voteButton);

      // Wait for dialog
      await waitFor(() => {
        expect(screen.getByTestId('vote-change-dialog')).toBeInTheDocument();
      });

      // Click cancel button
      const cancelButton = screen.getByTestId('cancel-button');
      fireEvent.click(cancelButton);

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByTestId('vote-change-dialog')).not.toBeInTheDocument();
      });

      // API should not be called
      expect(changeVote).not.toHaveBeenCalled();
      expect(onVoteSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle vote API error gracefully', async () => {
      const { createVote } = await import('@/lib/api/candidates');
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(createVote).mockRejectedValue(new Error('Network error'));

      const onVoteSuccess = vi.fn();

      render(<CandidateCard {...defaultProps} onVoteSuccess={onVoteSuccess} />);

      // Click vote button
      const voteButton = screen.getByTestId('vote-button');
      fireEvent.click(voteButton);

      // Wait for API call
      await waitFor(() => {
        expect(createVote).toHaveBeenCalled();
      });

      // Error should be logged
      expect(consoleErrorSpy).toHaveBeenCalledWith('[VoteButton] Vote failed:', expect.any(Error));

      // Success callback should not be called
      expect(onVoteSuccess).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle vote change API error gracefully', async () => {
      const { changeVote } = await import('@/lib/api/candidates');
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(changeVote).mockRejectedValue(new Error('Network error'));

      const onVoteSuccess = vi.fn();

      render(
        <CandidateCard
          {...defaultProps}
          currentVotedCandidateId="other-candidate-id"
          onVoteSuccess={onVoteSuccess}
        />
      );

      // Click vote change button
      const voteButton = screen.getByTestId('vote-button');
      fireEvent.click(voteButton);

      // Wait for dialog
      await waitFor(() => {
        expect(screen.getByTestId('vote-change-dialog')).toBeInTheDocument();
      });

      // Click confirm button
      const confirmButton = screen.getByTestId('confirm-button');
      fireEvent.click(confirmButton);

      // Wait for API call
      await waitFor(() => {
        expect(changeVote).toHaveBeenCalled();
      });

      // Error should be logged
      expect(consoleErrorSpy).toHaveBeenCalledWith('[VoteButton] Vote failed:', expect.any(Error));

      // Success callback should not be called
      expect(onVoteSuccess).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Unauthenticated User', () => {
    it('should disable vote button for unauthenticated users', () => {
      render(<CandidateCard {...defaultProps} isAuthenticated={false} />);

      const voteButton = screen.getByTestId('vote-button');
      expect(voteButton).toBeDisabled();
    });

    it('should not show vote button when user has already voted', () => {
      render(<CandidateCard {...defaultProps} currentVotedCandidateId={mockCandidate.id} />);

      // Vote button should not be displayed
      expect(screen.queryByTestId('vote-button')).not.toBeInTheDocument();

      // Vote status indicator should be displayed
      expect(screen.getByTestId('vote-status-indicator')).toBeInTheDocument();
    });
  });

  describe('Closed Voting', () => {
    it('should disable vote button when voting is closed', () => {
      const closedCandidate: Candidate = {
        ...mockCandidate,
        status: 'closed',
      };

      render(<CandidateCard {...defaultProps} candidate={closedCandidate} />);

      const voteButton = screen.getByTestId('vote-button');
      expect(voteButton).toBeDisabled();
    });

    it('should disable vote button when deadline has passed', () => {
      const expiredCandidate: Candidate = {
        ...mockCandidate,
        deadline: new Date(Date.now() - 1000).toISOString(), // 1 second ago
      };

      render(<CandidateCard {...defaultProps} candidate={expiredCandidate} />);

      const voteButton = screen.getByTestId('vote-button');
      expect(voteButton).toBeDisabled();
    });
  });

  describe('Vote Count Display', () => {
    it('should display current vote count', () => {
      render(<CandidateCard {...defaultProps} />);

      const voteCount = screen.getByTestId('candidate-vote-count');
      expect(voteCount).toHaveTextContent('5');
    });

    it('should update vote count after successful vote', async () => {
      const { createVote } = await import('@/lib/api/candidates');
      vi.mocked(createVote).mockResolvedValue();

      const updatedCandidate: Candidate = {
        ...mockCandidate,
        voteCount: 6,
      };

      const { rerender } = render(<CandidateCard {...defaultProps} />);

      // Click vote button
      const voteButton = screen.getByTestId('vote-button');
      fireEvent.click(voteButton);

      // Wait for API call
      await waitFor(() => {
        expect(createVote).toHaveBeenCalled();
      });

      // Simulate parent component updating props with new vote count
      rerender(
        <CandidateCard
          {...defaultProps}
          candidate={updatedCandidate}
          currentVotedCandidateId={mockCandidate.id}
        />
      );

      // Vote count should be updated
      const voteCount = screen.getByTestId('candidate-vote-count');
      expect(voteCount).toHaveTextContent('6');
    });
  });
});
