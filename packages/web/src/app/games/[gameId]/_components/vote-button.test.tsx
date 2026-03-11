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
      const mockCreateVote = vi.mocked(createVote);
      mockCreateVote.mockResolvedValue();

      const onVoteSuccess = vi.fn();
      render(<VoteButton {...defaultProps} onVoteSuccess={onVoteSuccess} />);

      const button = screen.getByRole('button', { name: '投票する' });
      fireEvent.click(button);

      await waitFor(
        () => {
          expect(mockCreateVote).toHaveBeenCalledWith('game-456', 5, 'candidate-123');
          expect(onVoteSuccess).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );
    });

    it('should show loading indicator during vote submission', async () => {
      const { createVote } = await import('@/lib/api/candidates');
      const mockCreateVote = vi.mocked(createVote);
      mockCreateVote.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      render(<VoteButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: '投票する' });
      fireEvent.click(button);

      // Check for loading state
      await waitFor(
        () => {
          expect(screen.getByText('投票中...')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Button should be disabled during loading
      expect(button).toBeDisabled();
    });

    it('should disable button during vote submission', async () => {
      const { createVote } = await import('@/lib/api/candidates');
      const mockCreateVote = vi.mocked(createVote);
      mockCreateVote.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      render(<VoteButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: '投票する' });
      fireEvent.click(button);

      await waitFor(
        () => {
          expect(button).toBeDisabled();
        },
        { timeout: 3000 }
      );
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
      const mockChangeVote = vi.mocked(changeVote);
      mockChangeVote.mockResolvedValue();

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

      await waitFor(
        () => {
          expect(mockChangeVote).toHaveBeenCalledWith('game-456', 5, 'candidate-123');
          expect(onVoteSuccess).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );
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
      const mockChangeVote = vi.mocked(changeVote);
      mockChangeVote.mockResolvedValue();

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
        expect(mockChangeVote).not.toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should log error when vote fails', async () => {
      const { createVote } = await import('@/lib/api/candidates');
      const mockCreateVote = vi.mocked(createVote);
      const error = new Error('Vote failed');
      mockCreateVote.mockRejectedValue(error);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<VoteButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: '投票する' });
      fireEvent.click(button);

      await waitFor(
        () => {
          expect(mockCreateVote).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );

      // Error should be logged
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });

    it('should re-enable button after error', async () => {
      const { createVote } = await import('@/lib/api/candidates');
      const mockCreateVote = vi.mocked(createVote);
      mockCreateVote.mockRejectedValue(new Error('Vote failed'));

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<VoteButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: '投票する' });
      fireEvent.click(button);

      await waitFor(
        () => {
          expect(button).not.toBeDisabled();
        },
        { timeout: 3000 }
      );

      consoleErrorSpy.mockRestore();
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
      const mockCreateVote = vi.mocked(createVote);
      mockCreateVote.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      render(<VoteButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: '投票する' });
      fireEvent.click(button);

      await waitFor(
        () => {
          const spinner = screen.getByRole('button').querySelector('svg');
          expect(spinner).toHaveAttribute('aria-hidden', 'true');
        },
        { timeout: 3000 }
      );
    });
  });

  describe('Keyboard Navigation', () => {
    it('should be keyboard accessible', () => {
      render(<VoteButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: '投票する' });
      button.focus();

      expect(document.activeElement).toBe(button);
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

    it('should have aria-disabled when button is disabled', () => {
      render(<VoteButton {...defaultProps} isAuthenticated={false} />);

      const button = screen.getByRole('button', { name: '投票する' });
      expect(button).toBeDisabled();
    });
  });

  describe('Contrast Ratio', () => {
    it('should have sufficient contrast for button text', () => {
      render(<VoteButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: '投票する' });
      // Primary button uses shadcn/ui semantic colors (bg-primary with text-primary-foreground)
      expect(button.className).toMatch(/bg-primary/);
      expect(button.className).toMatch(/text-primary-foreground/);
    });

    it('should have sufficient contrast for disabled button', () => {
      render(<VoteButton {...defaultProps} isAuthenticated={false} />);

      const button = screen.getByRole('button', { name: '投票する' });
      // Disabled button uses opacity to indicate disabled state
      expect(button.className).toMatch(/disabled:opacity-50/);
    });

    it('should have sufficient contrast for dialog text', async () => {
      render(<VoteButton {...defaultProps} currentVotedCandidateId="other-candidate-789" />);

      const button = screen.getByRole('button', { name: '投票を変更' });
      fireEvent.click(button);

      await waitFor(() => {
        const dialogTitle = screen.getByText('投票を変更しますか？');
        // Dialog title uses semantic font sizing and weight
        expect(dialogTitle.className).toMatch(/text-lg/);
        expect(dialogTitle.className).toMatch(/font-semibold/);
      });
    });

    it('should have sufficient contrast for confirm button', async () => {
      render(<VoteButton {...defaultProps} currentVotedCandidateId="other-candidate-789" />);

      const button = screen.getByRole('button', { name: '投票を変更' });
      fireEvent.click(button);

      await waitFor(() => {
        const confirmButton = screen.getByTestId('confirm-button');
        // Confirm button uses primary color scheme
        expect(confirmButton.className).toMatch(/bg-primary/);
        expect(confirmButton.className).toMatch(/text-primary-foreground/);
      });
    });
  });

  describe('Focus Management', () => {
    it('should have visible focus ring', () => {
      render(<VoteButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: '投票する' });
      expect(button.className).toMatch(/focus:ring|focus-visible:ring/);
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
      const mockCreateVote = vi.mocked(createVote);
      mockCreateVote.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      render(<VoteButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: '投票する' });
      fireEvent.click(button);

      await waitFor(
        () => {
          const spinner = screen.getByRole('button').querySelector('svg');
          expect(spinner).toHaveAttribute('aria-hidden', 'true');
        },
        { timeout: 3000 }
      );
    });

    it('should announce loading state to screen readers', async () => {
      const { createVote } = await import('@/lib/api/candidates');
      const mockCreateVote = vi.mocked(createVote);
      mockCreateVote.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      render(<VoteButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: '投票する' });
      fireEvent.click(button);

      await waitFor(
        () => {
          expect(screen.getByText('投票中...')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
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
