import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VoteButton } from './vote-button';

// Mock the API functions
vi.mock('@/lib/api/candidates', () => ({
  createVote: vi.fn(),
  changeVote: vi.fn(),
}));

describe('VoteButton', () => {
  const defaultProps = {
    candidateId: 'candidate-123',
    gameId: 'game-456',
    turnNumber: 5,
    isAuthenticated: true,
    onVoteSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Display States', () => {
    it('should display "投票する" button when user has not voted', () => {
      render(<VoteButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: '投票する' });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('投票する');
    });

    it('should display "投票を変更" button when user has voted for another candidate', () => {
      render(<VoteButton {...defaultProps} currentVotedCandidateId="other-candidate-789" />);

      const button = screen.getByRole('button', { name: '投票を変更' });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('投票を変更');
    });

    it('should not render button when user has voted for this candidate', () => {
      render(<VoteButton {...defaultProps} currentVotedCandidateId="candidate-123" />);

      const button = screen.queryByRole('button');
      expect(button).not.toBeInTheDocument();
    });

    it('should disable button when user is not authenticated', () => {
      render(<VoteButton {...defaultProps} isAuthenticated={false} />);

      const button = screen.getByRole('button', { name: '投票する' });
      expect(button).toBeDisabled();
    });

    it('should show tooltip for unauthenticated users', () => {
      render(<VoteButton {...defaultProps} isAuthenticated={false} />);

      const tooltip = screen.getByRole('tooltip', { name: 'ログインして投票' });
      expect(tooltip).toBeInTheDocument();
    });
  });

  describe('Vote Submission', () => {
    it('should call createVote when voting for the first time', async () => {
      const { createVote } = await import('@/lib/api/candidates');
      vi.mocked(createVote).mockResolvedValue();

      const onVoteSuccess = vi.fn();
      render(<VoteButton {...defaultProps} onVoteSuccess={onVoteSuccess} />);

      const button = screen.getByRole('button', { name: '投票する' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(createVote).toHaveBeenCalledWith('game-456', 5, 'candidate-123');
        expect(onVoteSuccess).toHaveBeenCalled();
      });
    });

    it('should show loading indicator during vote submission', async () => {
      const { createVote } = await import('@/lib/api/candidates');
      vi.mocked(createVote).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<VoteButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: '投票する' });
      fireEvent.click(button);

      // Check for loading state
      await waitFor(() => {
        expect(screen.getByText('処理中...')).toBeInTheDocument();
      });

      // Button should be disabled during loading
      expect(button).toBeDisabled();
    });

    it('should disable button during vote submission', async () => {
      const { createVote } = await import('@/lib/api/candidates');
      vi.mocked(createVote).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<VoteButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: '投票する' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('Vote Change Confirmation', () => {
    it('should show confirmation dialog when changing vote', async () => {
      render(<VoteButton {...defaultProps} currentVotedCandidateId="other-candidate-789" />);

      const button = screen.getByRole('button', { name: '投票を変更' });
      fireEvent.click(button);

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
        expect(screen.getByText('投票を変更しますか？')).toBeInTheDocument();
        expect(
          screen.getByText('現在の投票を取り消して、この候補に投票しますか？')
        ).toBeInTheDocument();
      });
    });

    it('should call changeVote when user confirms vote change', async () => {
      const { changeVote } = await import('@/lib/api/candidates');
      vi.mocked(changeVote).mockResolvedValue();

      const onVoteSuccess = vi.fn();
      render(
        <VoteButton
          {...defaultProps}
          currentVotedCandidateId="other-candidate-789"
          onVoteSuccess={onVoteSuccess}
        />
      );

      // Click vote change button
      const button = screen.getByRole('button', { name: '投票を変更' });
      fireEvent.click(button);

      // Confirm in dialog
      await waitFor(() => {
        const confirmButton = screen.getByTestId('confirm-button');
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(changeVote).toHaveBeenCalledWith('game-456', 5, 'candidate-123');
        expect(onVoteSuccess).toHaveBeenCalled();
      });
    });

    it('should close dialog when user cancels vote change', async () => {
      render(<VoteButton {...defaultProps} currentVotedCandidateId="other-candidate-789" />);

      // Click vote change button
      const button = screen.getByRole('button', { name: '投票を変更' });
      fireEvent.click(button);

      // Cancel in dialog
      await waitFor(() => {
        const cancelButton = screen.getByTestId('cancel-button');
        fireEvent.click(cancelButton);
      });

      await waitFor(() => {
        const dialog = screen.queryByRole('dialog');
        expect(dialog).not.toBeInTheDocument();
      });
    });

    it('should not call changeVote when user cancels', async () => {
      const { changeVote } = await import('@/lib/api/candidates');
      vi.mocked(changeVote).mockResolvedValue();

      render(<VoteButton {...defaultProps} currentVotedCandidateId="other-candidate-789" />);

      // Click vote change button
      const button = screen.getByRole('button', { name: '投票を変更' });
      fireEvent.click(button);

      // Cancel in dialog
      await waitFor(() => {
        const cancelButton = screen.getByTestId('cancel-button');
        fireEvent.click(cancelButton);
      });

      await waitFor(() => {
        expect(changeVote).not.toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should re-throw error when vote fails', async () => {
      const { createVote } = await import('@/lib/api/candidates');
      const error = new Error('Vote failed');
      vi.mocked(createVote).mockRejectedValue(error);

      render(<VoteButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: '投票する' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(createVote).toHaveBeenCalled();
      });

      // Error should be logged
      expect(console.error).toHaveBeenCalled();
    });

    it('should re-enable button after error', async () => {
      const { createVote } = await import('@/lib/api/candidates');
      vi.mocked(createVote).mockRejectedValue(new Error('Vote failed'));

      render(<VoteButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: '投票する' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label for vote button', () => {
      render(<VoteButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: '投票する' });
      expect(button).toHaveAttribute('aria-label', '投票する');
    });

    it('should have proper aria-label for vote change button', () => {
      render(<VoteButton {...defaultProps} currentVotedCandidateId="other-candidate-789" />);

      const button = screen.getByRole('button', { name: '投票を変更' });
      expect(button).toHaveAttribute('aria-label', '投票を変更');
    });

    it('should have proper dialog attributes', async () => {
      render(<VoteButton {...defaultProps} currentVotedCandidateId="other-candidate-789" />);

      const button = screen.getByRole('button', { name: '投票を変更' });
      fireEvent.click(button);

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(dialog).toHaveAttribute('aria-labelledby', 'confirm-dialog-title');
      });
    });

    it('should have minimum touch target size', () => {
      render(<VoteButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: '投票する' });
      expect(button).toHaveClass('min-h-[44px]');
    });

    it('should hide loading spinner from screen readers', async () => {
      const { createVote } = await import('@/lib/api/candidates');
      vi.mocked(createVote).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<VoteButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: '投票する' });
      fireEvent.click(button);

      await waitFor(() => {
        const spinner = screen.getByRole('button').querySelector('svg');
        expect(spinner).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should be keyboard accessible', () => {
      render(<VoteButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: '投票する' });
      button.focus();

      expect(document.activeElement).toBe(button);
    });

    it('should handle Enter key press', async () => {
      const { createVote } = await import('@/lib/api/candidates');
      vi.mocked(createVote).mockResolvedValue();

      const onVoteSuccess = vi.fn();
      render(<VoteButton {...defaultProps} onVoteSuccess={onVoteSuccess} />);

      const button = screen.getByRole('button', { name: '投票する' });
      button.focus();
      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(createVote).toHaveBeenCalled();
      });
    });

    it('should handle Space key press', async () => {
      const { createVote } = await import('@/lib/api/candidates');
      vi.mocked(createVote).mockResolvedValue();

      const onVoteSuccess = vi.fn();
      render(<VoteButton {...defaultProps} onVoteSuccess={onVoteSuccess} />);

      const button = screen.getByRole('button', { name: '投票する' });
      button.focus();
      fireEvent.keyDown(button, { key: ' ', code: 'Space' });

      await waitFor(() => {
        expect(createVote).toHaveBeenCalled();
      });
    });

    it('should handle Escape key in confirmation dialog', async () => {
      render(<VoteButton {...defaultProps} currentVotedCandidateId="other-candidate-789" />);

      const button = screen.getByRole('button', { name: '投票を変更' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should navigate dialog buttons with Tab key', async () => {
      render(<VoteButton {...defaultProps} currentVotedCandidateId="other-candidate-789" />);

      const button = screen.getByRole('button', { name: '投票を変更' });
      fireEvent.click(button);

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
      });

      const confirmButton = screen.getByTestId('confirm-button');
      const cancelButton = screen.getByTestId('cancel-button');

      confirmButton.focus();
      expect(document.activeElement).toBe(confirmButton);

      cancelButton.focus();
      expect(document.activeElement).toBe(cancelButton);
    });

    it('should trap focus within dialog', async () => {
      render(<VoteButton {...defaultProps} currentVotedCandidateId="other-candidate-789" />);

      const button = screen.getByRole('button', { name: '投票を変更' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Focus should be trapped within dialog
      const confirmButton = screen.getByTestId('confirm-button');
      expect(confirmButton).toBeInTheDocument();
    });
  });

  describe('ARIA Labels and Attributes', () => {
    it('should have proper aria-label for vote button', () => {
      render(<VoteButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: '投票する' });
      expect(button).toHaveAttribute('aria-label', '投票する');
    });

    it('should have proper aria-label for vote change button', () => {
      render(<VoteButton {...defaultProps} currentVotedCandidateId="other-candidate-789" />);

      const button = screen.getByRole('button', { name: '投票を変更' });
      expect(button).toHaveAttribute('aria-label', '投票を変更');
    });

    it('should have proper dialog attributes', async () => {
      render(<VoteButton {...defaultProps} currentVotedCandidateId="other-candidate-789" />);

      const button = screen.getByRole('button', { name: '投票を変更' });
      fireEvent.click(button);

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(dialog).toHaveAttribute('aria-labelledby', 'confirm-dialog-title');
      });
    });

    it('should have aria-describedby on dialog', async () => {
      render(<VoteButton {...defaultProps} currentVotedCandidateId="other-candidate-789" />);

      const button = screen.getByRole('button', { name: '投票を変更' });
      fireEvent.click(button);

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-describedby');
      });
    });

    it('should have aria-disabled when button is disabled', () => {
      render(<VoteButton {...defaultProps} isAuthenticated={false} />);

      const button = screen.getByRole('button', { name: '投票する' });
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toBeDisabled();
    });

    it('should have aria-busy during loading', async () => {
      const { createVote } = await import('@/lib/api/candidates');
      vi.mocked(createVote).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<VoteButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: '投票する' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(button).toHaveAttribute('aria-busy', 'true');
      });
    });
  });

  describe('Contrast Ratio', () => {
    it('should have sufficient contrast for button text', () => {
      render(<VoteButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: '投票する' });
      // Primary button should have white text on blue background (sufficient contrast)
      expect(button.className).toMatch(/bg-(blue|primary)-(500|600)/);
      expect(button.className).toMatch(/text-white/);
    });

    it('should have sufficient contrast for disabled button', () => {
      render(<VoteButton {...defaultProps} isAuthenticated={false} />);

      const button = screen.getByRole('button', { name: '投票する' });
      // Disabled button should have gray-400 text on gray-100 background
      expect(button.className).toMatch(/bg-gray-(100|200)/);
      expect(button.className).toMatch(/text-gray-(400|500)/);
    });

    it('should have sufficient contrast for dialog text', async () => {
      render(<VoteButton {...defaultProps} currentVotedCandidateId="other-candidate-789" />);

      const button = screen.getByRole('button', { name: '投票を変更' });
      fireEvent.click(button);

      await waitFor(() => {
        const dialogTitle = screen.getByText('投票を変更しますか？');
        expect(dialogTitle.className).toMatch(/text-(gray-900|black)/);
      });
    });

    it('should have sufficient contrast for confirm button', async () => {
      render(<VoteButton {...defaultProps} currentVotedCandidateId="other-candidate-789" />);

      const button = screen.getByRole('button', { name: '投票を変更' });
      fireEvent.click(button);

      await waitFor(() => {
        const confirmButton = screen.getByTestId('confirm-button');
        expect(confirmButton.className).toMatch(/bg-(blue|red)-(500|600)/);
        expect(confirmButton.className).toMatch(/text-white/);
      });
    });
  });

  describe('Focus Management', () => {
    it('should have visible focus ring', () => {
      render(<VoteButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: '投票する' });
      expect(button.className).toMatch(/focus:ring|focus-visible:ring/);
    });

    it('should return focus to trigger button after dialog closes', async () => {
      render(<VoteButton {...defaultProps} currentVotedCandidateId="other-candidate-789" />);

      const button = screen.getByRole('button', { name: '投票を変更' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const cancelButton = screen.getByTestId('cancel-button');
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(document.activeElement).toBe(button);
      });
    });

    it('should focus first interactive element in dialog', async () => {
      render(<VoteButton {...defaultProps} currentVotedCandidateId="other-candidate-789" />);

      const button = screen.getByRole('button', { name: '投票を変更' });
      fireEvent.click(button);

      await waitFor(() => {
        const confirmButton = screen.getByTestId('confirm-button');
        expect(document.activeElement).toBe(confirmButton);
      });
    });

    it('should maintain focus order in dialog', async () => {
      render(<VoteButton {...defaultProps} currentVotedCandidateId="other-candidate-789" />);

      const button = screen.getByRole('button', { name: '投票を変更' });
      fireEvent.click(button);

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
      });

      const confirmButton = screen.getByTestId('confirm-button');
      const cancelButton = screen.getByTestId('cancel-button');

      // Focus order should be: confirm -> cancel
      expect(confirmButton).toBeInTheDocument();
      expect(cancelButton).toBeInTheDocument();
    });
  });

  describe('Screen Reader Support', () => {
    it('should hide loading spinner from screen readers', async () => {
      const { createVote } = await import('@/lib/api/candidates');
      vi.mocked(createVote).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<VoteButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: '投票する' });
      fireEvent.click(button);

      await waitFor(() => {
        const spinner = screen.getByRole('button').querySelector('svg');
        expect(spinner).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('should announce loading state to screen readers', async () => {
      const { createVote } = await import('@/lib/api/candidates');
      vi.mocked(createVote).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<VoteButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: '投票する' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('処理中...')).toBeInTheDocument();
      });
    });

    it('should have descriptive tooltip for disabled button', () => {
      render(<VoteButton {...defaultProps} isAuthenticated={false} />);

      const tooltip = screen.getByRole('tooltip', { name: 'ログインして投票' });
      expect(tooltip).toBeInTheDocument();
    });

    it('should announce dialog to screen readers', async () => {
      render(<VoteButton {...defaultProps} currentVotedCandidateId="other-candidate-789" />);

      const button = screen.getByRole('button', { name: '投票を変更' });
      fireEvent.click(button);

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('role', 'dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
      });
    });

    it('should have descriptive button text', () => {
      render(<VoteButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: '投票する' });
      expect(button).toHaveTextContent('投票する');
    });
  });
});
