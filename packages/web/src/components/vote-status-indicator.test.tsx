import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VoteStatusIndicator } from './vote-status-indicator';

describe('VoteStatusIndicator', () => {
  describe('投票済み表示', () => {
    it('should display checkmark icon and "投票済み" text when isVoted is true', () => {
      render(<VoteStatusIndicator voteCount={5} isVoted={true} />);

      expect(screen.getByText('投票済み')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should display vote count', () => {
      render(<VoteStatusIndicator voteCount={10} isVoted={true} />);

      expect(screen.getByText('(10票)')).toBeInTheDocument();
    });

    it('should display correct vote count for different numbers', () => {
      const { rerender } = render(<VoteStatusIndicator voteCount={1} isVoted={true} />);
      expect(screen.getByText('(1票)')).toBeInTheDocument();

      rerender(<VoteStatusIndicator voteCount={100} isVoted={true} />);
      expect(screen.getByText('(100票)')).toBeInTheDocument();
    });

    it('should return null when isVoted is false', () => {
      const { container } = render(<VoteStatusIndicator voteCount={5} isVoted={false} />);

      expect(container.firstChild).toBeNull();
      expect(screen.queryByText('投票済み')).not.toBeInTheDocument();
    });
  });

  describe('スタイル適用', () => {
    it('should apply green background styling', () => {
      const { container } = render(<VoteStatusIndicator voteCount={5} isVoted={true} />);
      const indicator = container.firstChild as HTMLElement;

      expect(indicator).toHaveClass('bg-green-50');
      expect(indicator).toHaveClass('text-green-700');
    });

    it('should apply rounded corners', () => {
      const { container } = render(<VoteStatusIndicator voteCount={5} isVoted={true} />);
      const indicator = container.firstChild as HTMLElement;

      expect(indicator).toHaveClass('rounded-md');
    });

    it('should apply padding', () => {
      const { container } = render(<VoteStatusIndicator voteCount={5} isVoted={true} />);
      const indicator = container.firstChild as HTMLElement;

      expect(indicator).toHaveClass('px-3');
      expect(indicator).toHaveClass('py-2');
    });

    it('should apply flex layout with gap', () => {
      const { container } = render(<VoteStatusIndicator voteCount={5} isVoted={true} />);
      const indicator = container.firstChild as HTMLElement;

      expect(indicator).toHaveClass('flex');
      expect(indicator).toHaveClass('items-center');
      expect(indicator).toHaveClass('gap-2');
    });

    it('should apply text styling', () => {
      const { container } = render(<VoteStatusIndicator voteCount={5} isVoted={true} />);
      const indicator = container.firstChild as HTMLElement;

      expect(indicator).toHaveClass('text-sm');
      expect(indicator).toHaveClass('font-medium');
    });

    it('should accept custom className', () => {
      const { container } = render(
        <VoteStatusIndicator voteCount={5} isVoted={true} className="custom-class" />
      );
      const indicator = container.firstChild as HTMLElement;

      expect(indicator).toHaveClass('custom-class');
      expect(indicator).toHaveClass('bg-green-50');
    });
  });

  describe('アイコン表示', () => {
    it('should render checkmark icon', () => {
      const { container } = render(<VoteStatusIndicator voteCount={5} isVoted={true} />);
      const icon = container.querySelector('svg');

      expect(icon).toBeInTheDocument();
    });

    it('should hide icon from screen readers', () => {
      const { container } = render(<VoteStatusIndicator voteCount={5} isVoted={true} />);
      const icon = container.querySelector('svg');

      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    it('should apply correct icon size', () => {
      const { container } = render(<VoteStatusIndicator voteCount={5} isVoted={true} />);
      const icon = container.querySelector('svg');

      expect(icon).toHaveClass('h-4');
      expect(icon).toHaveClass('w-4');
    });
  });

  describe('アクセシビリティ', () => {
    it('should have role="status" for live region', () => {
      render(<VoteStatusIndicator voteCount={5} isVoted={true} />);
      const indicator = screen.getByRole('status');

      expect(indicator).toBeInTheDocument();
    });

    it('should have accessible aria-label with vote count', () => {
      render(<VoteStatusIndicator voteCount={5} isVoted={true} />);
      const indicator = screen.getByRole('status');

      expect(indicator).toHaveAttribute('aria-label', '投票済み、投票数: 5');
    });

    it('should update aria-label when vote count changes', () => {
      const { rerender } = render(<VoteStatusIndicator voteCount={5} isVoted={true} />);
      let indicator = screen.getByRole('status');
      expect(indicator).toHaveAttribute('aria-label', '投票済み、投票数: 5');

      rerender(<VoteStatusIndicator voteCount={10} isVoted={true} />);
      indicator = screen.getByRole('status');
      expect(indicator).toHaveAttribute('aria-label', '投票済み、投票数: 10');
    });

    it('should have data-testid for testing', () => {
      render(<VoteStatusIndicator voteCount={5} isVoted={true} />);
      const indicator = screen.getByTestId('vote-status-indicator');

      expect(indicator).toBeInTheDocument();
    });
  });

  describe('投票数の表示スタイル', () => {
    it('should apply green color to vote count', () => {
      render(<VoteStatusIndicator voteCount={5} isVoted={true} />);
      const voteCountElement = screen.getByText('(5票)');

      expect(voteCountElement).toHaveClass('text-green-600');
    });

    it('should apply left margin to vote count', () => {
      render(<VoteStatusIndicator voteCount={5} isVoted={true} />);
      const voteCountElement = screen.getByText('(5票)');

      expect(voteCountElement).toHaveClass('ml-1');
    });
  });
});
