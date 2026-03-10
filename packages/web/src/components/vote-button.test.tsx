import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VoteButton } from './vote-button';
import * as votesApi from '@/lib/api/votes';
import { ApiError } from '@/lib/api/client';

// Mock the API module
vi.mock('@/lib/api/votes', () => ({
  createVote: vi.fn(),
  changeVote: vi.fn(),
}));

describe('VoteButton', () => {
  const defaultProps = {
    candidateId: 'candidate-123',
    gameId: 'game-456',
    turnNumber: 5,
    isVoted: false,
    hasVotedOther: false,
    isAuthenticated: true,
    onVoteSuccess: vi.fn(),
    voteCount: 10,
    currentCandidatePosition: 'C4',
    newCandidatePosition: 'D5',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('未認証時の表示', () => {
    it('should display disabled button when not authenticated', () => {
      render(<VoteButton {...defaultProps} isAuthenticated={false} />);

      const button = screen.getByTestId('vote-button');
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent('投票する');
    });

    it('should wrap button in tooltip trigger when not authenticated', () => {
      const { container } = render(<VoteButton {...defaultProps} isAuthenticated={false} />);

      // Tooltip wrapper exists with data-state attribute
      expect(container.querySelector('[data-state]')).toBeInTheDocument();
      // Button is wrapped in a div with inline-block class
      expect(container.querySelector('.inline-block')).toBeInTheDocument();
    });

    it('should have accessible aria-label when not authenticated', () => {
      render(<VoteButton {...defaultProps} isAuthenticated={false} />);

      const button = screen.getByTestId('vote-button');
      expect(button).toHaveAttribute('aria-label', 'ログインして投票');
    });
  });

  describe('未投票時の表示', () => {
    it('should display "投票する" button when not voted', () => {
      render(<VoteButton {...defaultProps} />);

      const button = screen.getByTestId('vote-button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('投票する');
      expect(button).not.toBeDisabled();
    });

    it('should have accessible aria-label', () => {
      render(<VoteButton {...defaultProps} />);

      const button = screen.getByTestId('vote-button');
      expect(button).toHaveAttribute('aria-label', '投票する');
    });
  });

  describe('投票済み時の表示', () => {
    it('should display VoteStatusIndicator when voted', () => {
      render(<VoteButton {...defaultProps} isVoted={true} />);

      const indicator = screen.getByTestId('vote-status-indicator');
      expect(indicator).toBeInTheDocument();
      expect(screen.getByText('投票済み')).toBeInTheDocument();
      expect(screen.getByText('(10票)')).toBeInTheDocument();
    });

    it('should not display vote button when voted', () => {
      render(<VoteButton {...defaultProps} isVoted={true} />);

      expect(screen.queryByTestId('vote-button')).not.toBeInTheDocument();
    });
  });

  describe('他候補に投票済み時の表示', () => {
    it('should display "投票を変更" button when voted for other candidate', () => {
      render(<VoteButton {...defaultProps} hasVotedOther={true} />);

      const button = screen.getByTestId('vote-change-button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('投票を変更');
      expect(button).not.toBeDisabled();
    });

    it('should have accessible aria-label for change button', () => {
      render(<VoteButton {...defaultProps} hasVotedOther={true} />);

      const button = screen.getByTestId('vote-change-button');
      expect(button).toHaveAttribute('aria-label', '投票を変更');
    });

    it('should have outline variant for change button', () => {
      render(<VoteButton {...defaultProps} hasVotedOther={true} />);

      const button = screen.getByTestId('vote-change-button');
      // Check for outline variant class (shadcn/ui uses specific classes)
      expect(button.className).toContain('outline');
    });
  });

  describe('投票処理', () => {
    it('should call createVote API when vote button is clicked', async () => {
      vi.mocked(votesApi.createVote).mockResolvedValue();

      render(<VoteButton {...defaultProps} />);

      const button = screen.getByTestId('vote-button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(votesApi.createVote).toHaveBeenCalledWith('game-456', 5, 'candidate-123');
      });
    });

    it('should call onVoteSuccess after successful vote', async () => {
      vi.mocked(votesApi.createVote).mockResolvedValue();

      render(<VoteButton {...defaultProps} />);

      const button = screen.getByTestId('vote-button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(defaultProps.onVoteSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('should display loading state during vote', async () => {
      vi.mocked(votesApi.createVote).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<VoteButton {...defaultProps} />);

      const button = screen.getByTestId('vote-button');
      fireEvent.click(button);

      expect(button).toHaveTextContent('投票中...');
      expect(button).toBeDisabled();

      await waitFor(() => {
        expect(button).toHaveTextContent('投票する');
      });
    });

    it('should display error message when vote fails', async () => {
      const errorMessage = '投票に失敗しました。もう一度お試しください。';
      vi.mocked(votesApi.createVote).mockRejectedValue(new ApiError(errorMessage, 500));

      render(<VoteButton {...defaultProps} />);

      const button = screen.getByTestId('vote-button');
      fireEvent.click(button);

      await waitFor(() => {
        const errorElement = screen.getByTestId('error-message');
        expect(errorElement).toHaveTextContent(errorMessage);
        expect(errorElement).toHaveAttribute('role', 'alert');
      });
    });

    it('should display generic error message for non-ApiError', async () => {
      vi.mocked(votesApi.createVote).mockRejectedValue(new Error('Network error'));

      render(<VoteButton {...defaultProps} />);

      const button = screen.getByTestId('vote-button');
      fireEvent.click(button);

      await waitFor(() => {
        const errorElement = screen.getByTestId('error-message');
        expect(errorElement).toHaveTextContent('投票に失敗しました。もう一度お試しください。');
      });
    });

    it('should clear error message on retry', async () => {
      vi.mocked(votesApi.createVote).mockRejectedValueOnce(new ApiError('Error', 500));

      render(<VoteButton {...defaultProps} />);

      const button = screen.getByTestId('vote-button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      // Retry with success
      vi.mocked(votesApi.createVote).mockResolvedValue();
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
      });
    });
  });

  describe('投票変更処理', () => {
    it('should open confirmation dialog when change button is clicked', () => {
      render(<VoteButton {...defaultProps} hasVotedOther={true} />);

      const button = screen.getByTestId('vote-change-button');
      fireEvent.click(button);

      expect(screen.getByText('投票を変更しますか?')).toBeInTheDocument();
      expect(screen.getByText('現在の投票先:')).toBeInTheDocument();
      expect(screen.getByText('C4')).toBeInTheDocument();
      expect(screen.getByText('新しい投票先:')).toBeInTheDocument();
      expect(screen.getByText('D5')).toBeInTheDocument();
    });

    it('should close dialog when cancel button is clicked', () => {
      render(<VoteButton {...defaultProps} hasVotedOther={true} />);

      const changeButton = screen.getByTestId('vote-change-button');
      fireEvent.click(changeButton);

      const cancelButton = screen.getByTestId('cancel-button');
      fireEvent.click(cancelButton);

      expect(screen.queryByText('投票を変更しますか?')).not.toBeInTheDocument();
    });

    it('should call changeVote API when confirm button is clicked', async () => {
      vi.mocked(votesApi.changeVote).mockResolvedValue();

      render(<VoteButton {...defaultProps} hasVotedOther={true} />);

      const changeButton = screen.getByTestId('vote-change-button');
      fireEvent.click(changeButton);

      const confirmButton = screen.getByTestId('confirm-button');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(votesApi.changeVote).toHaveBeenCalledWith('game-456', 5, 'candidate-123');
      });
    });

    it('should call onVoteSuccess after successful vote change', async () => {
      vi.mocked(votesApi.changeVote).mockResolvedValue();

      render(<VoteButton {...defaultProps} hasVotedOther={true} />);

      const changeButton = screen.getByTestId('vote-change-button');
      fireEvent.click(changeButton);

      const confirmButton = screen.getByTestId('confirm-button');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(defaultProps.onVoteSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('should close dialog after successful vote change', async () => {
      vi.mocked(votesApi.changeVote).mockResolvedValue();

      render(<VoteButton {...defaultProps} hasVotedOther={true} />);

      const changeButton = screen.getByTestId('vote-change-button');
      fireEvent.click(changeButton);

      const confirmButton = screen.getByTestId('confirm-button');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByText('投票を変更しますか?')).not.toBeInTheDocument();
      });
    });

    it('should display loading state during vote change', async () => {
      vi.mocked(votesApi.changeVote).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<VoteButton {...defaultProps} hasVotedOther={true} />);

      const changeButton = screen.getByTestId('vote-change-button');
      fireEvent.click(changeButton);

      const confirmButton = screen.getByTestId('confirm-button');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(changeButton).toHaveTextContent('変更中...');
        expect(changeButton).toBeDisabled();
      });
    });

    it('should display error message when vote change fails', async () => {
      const errorMessage = '投票の変更に失敗しました。もう一度お試しください。';
      vi.mocked(votesApi.changeVote).mockRejectedValue(new ApiError(errorMessage, 500));

      render(<VoteButton {...defaultProps} hasVotedOther={true} />);

      const changeButton = screen.getByTestId('vote-change-button');
      fireEvent.click(changeButton);

      const confirmButton = screen.getByTestId('confirm-button');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        const errorElement = screen.getByTestId('error-message');
        expect(errorElement).toHaveTextContent(errorMessage);
        expect(errorElement).toHaveAttribute('role', 'alert');
      });
    });

    it('should display generic error message for non-ApiError on change', async () => {
      vi.mocked(votesApi.changeVote).mockRejectedValue(new Error('Network error'));

      render(<VoteButton {...defaultProps} hasVotedOther={true} />);

      const changeButton = screen.getByTestId('vote-change-button');
      fireEvent.click(changeButton);

      const confirmButton = screen.getByTestId('confirm-button');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        const errorElement = screen.getByTestId('error-message');
        expect(errorElement).toHaveTextContent(
          '投票の変更に失敗しました。もう一度お試しください。'
        );
      });
    });
  });

  describe('ローディング状態', () => {
    it('should disable button during loading', async () => {
      vi.mocked(votesApi.createVote).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<VoteButton {...defaultProps} />);

      const button = screen.getByTestId('vote-button');
      fireEvent.click(button);

      expect(button).toBeDisabled();

      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });

    it('should prevent multiple clicks during loading', async () => {
      vi.mocked(votesApi.createVote).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<VoteButton {...defaultProps} />);

      const button = screen.getByTestId('vote-button');
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      await waitFor(() => {
        expect(votesApi.createVote).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('should handle 401 authentication error', async () => {
      vi.mocked(votesApi.createVote).mockRejectedValue(
        new ApiError('認証が必要です。ログインしてください。', 401)
      );

      render(<VoteButton {...defaultProps} />);

      const button = screen.getByTestId('vote-button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent(
          '認証が必要です。ログインしてください。'
        );
      });
    });

    it('should handle 409 already voted error', async () => {
      vi.mocked(votesApi.createVote).mockRejectedValue(
        new ApiError('既に投票済みです', 409, 'ALREADY_VOTED')
      );

      render(<VoteButton {...defaultProps} />);

      const button = screen.getByTestId('vote-button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('既に投票済みです');
      });
    });

    it('should handle 400 voting closed error', async () => {
      vi.mocked(votesApi.createVote).mockRejectedValue(
        new ApiError('投票期間が終了しています', 400, 'VOTING_CLOSED')
      );

      render(<VoteButton {...defaultProps} />);

      const button = screen.getByTestId('vote-button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('投票期間が終了しています');
      });
    });
  });

  describe('スタイリング', () => {
    it('should apply minimum height to button', () => {
      render(<VoteButton {...defaultProps} />);

      const button = screen.getByTestId('vote-button');
      expect(button).toHaveClass('min-h-[44px]');
    });

    it('should apply responsive width classes', () => {
      render(<VoteButton {...defaultProps} />);

      const button = screen.getByTestId('vote-button');
      expect(button).toHaveClass('w-full');
      expect(button).toHaveClass('sm:w-auto');
    });

    it('should apply error text styling', async () => {
      vi.mocked(votesApi.createVote).mockRejectedValue(new ApiError('Error', 500));

      render(<VoteButton {...defaultProps} />);

      const button = screen.getByTestId('vote-button');
      fireEvent.click(button);

      await waitFor(() => {
        const errorElement = screen.getByTestId('error-message');
        expect(errorElement).toHaveClass('text-sm');
        expect(errorElement).toHaveClass('text-red-600');
      });
    });
  });
});
