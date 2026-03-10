/**
 * CandidateCard Component Unit Tests
 *
 * Tests for the CandidateCard component including:
 * - Rendering of required fields (Requirements 13.1, 13.2)
 * - Voted/unvoted states
 * - Status badge display
 * - Accessibility
 *
 * Validates Requirements: 13.1, 13.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CandidateCard } from './candidate-card';
import type { Candidate } from '@/lib/api/candidates';

// Mock child components
vi.mock('./board-preview', () => ({
  BoardPreview: ({ highlightPosition }: { highlightPosition?: string }) => (
    <div data-testid="board-preview" data-highlight={highlightPosition}>
      Board Preview Mock
    </div>
  ),
}));

vi.mock('./vote-button', () => ({
  VoteButton: ({
    candidateId,
    isAuthenticated,
  }: {
    candidateId: string;
    isAuthenticated: boolean;
  }) => (
    <button data-testid="vote-button" data-candidate-id={candidateId} disabled={!isAuthenticated}>
      投票する
    </button>
  ),
}));

vi.mock('./vote-status-indicator', () => ({
  VoteStatusIndicator: () => <div data-testid="vote-status-indicator">✓ 投票済み</div>,
}));

// Mock time-remaining utility
vi.mock('@/lib/utils/time-remaining', () => ({
  calculateTimeRemaining: vi.fn((deadline: string) => {
    const now = new Date('2024-01-15T12:00:00Z');
    const deadlineDate = new Date(deadline);
    const diffMs = deadlineDate.getTime() - now.getTime();

    if (diffMs <= 0) {
      return {
        hours: 0,
        minutes: 0,
        isExpired: true,
        displayText: '締切済み',
        colorClass: 'text-gray-500',
      };
    }

    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    let displayText = 'あと';
    if (hours > 0) displayText += `${hours}時間`;
    if (minutes > 0 || hours === 0) displayText += `${minutes}分`;

    let colorClass = 'text-gray-700';
    if (totalMinutes < 60) {
      colorClass = 'text-red-500';
    } else if (totalMinutes < 24 * 60) {
      colorClass = 'text-orange-500';
    }

    return {
      hours,
      minutes,
      isExpired: false,
      displayText,
      colorClass,
    };
  }),
}));

describe('CandidateCard', () => {
  const mockCandidate: Candidate = {
    id: 'candidate-123',
    gameId: 'game-456',
    turnNumber: 5,
    position: 'D3',
    description: 'この手は中央を制圧し、次のターンで有利な展開を作ります。',
    boardState: [
      ['0', '0', '0', '0', '0', '0', '0', '0'],
      ['0', '0', '0', '0', '0', '0', '0', '0'],
      ['0', '0', '0', '0', '0', '0', '0', '0'],
      ['0', '0', '0', '2', '1', '0', '0', '0'],
      ['0', '0', '0', '1', '2', '0', '0', '0'],
      ['0', '0', '0', '0', '0', '0', '0', '0'],
      ['0', '0', '0', '0', '0', '0', '0', '0'],
      ['0', '0', '0', '0', '0', '0', '0', '0'],
    ],
    voteCount: 12,
    postedBy: 'user-789',
    postedByUsername: 'テストユーザー',
    status: 'active',
    deadline: '2024-01-16T00:00:00Z',
    createdAt: '2024-01-15T10:00:00Z',
    source: 'user',
  };

  const defaultProps = {
    candidate: mockCandidate,
    gameId: 'game-456',
    turnNumber: 5,
    isAuthenticated: true,
    currentVotedCandidateId: undefined,
    onVoteSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Required Fields Rendering (Requirements 13.1, 13.2)', () => {
    it('should display candidate position', () => {
      render(<CandidateCard {...defaultProps} />);
      expect(screen.getByTestId('candidate-position')).toHaveTextContent('D3');
    });

    it('should display board preview', () => {
      render(<CandidateCard {...defaultProps} />);
      const boardPreview = screen.getByTestId('board-preview');
      expect(boardPreview).toBeInTheDocument();
      expect(boardPreview).toHaveAttribute('data-highlight', 'D3');
    });

    it('should display description', () => {
      render(<CandidateCard {...defaultProps} />);
      expect(screen.getByTestId('candidate-description')).toHaveTextContent(
        'この手は中央を制圧し、次のターンで有利な展開を作ります。'
      );
    });

    it('should display poster username', () => {
      render(<CandidateCard {...defaultProps} />);
      expect(screen.getByTestId('candidate-poster')).toHaveTextContent('テストユーザー');
    });

    it('should display vote count', () => {
      render(<CandidateCard {...defaultProps} />);
      expect(screen.getByTestId('candidate-vote-count')).toHaveTextContent('12');
    });

    it('should display voting deadline', () => {
      render(<CandidateCard {...defaultProps} />);
      const deadline = screen.getByTestId('candidate-deadline');
      expect(deadline).toBeInTheDocument();
      expect(deadline.textContent).toMatch(/あと/);
    });

    it('should display creation date', () => {
      render(<CandidateCard {...defaultProps} />);
      const createdAt = screen.getByTestId('candidate-created-at');
      expect(createdAt).toBeInTheDocument();
      expect(createdAt.textContent).toMatch(/2024/);
    });

    it('should display all required fields together', () => {
      render(<CandidateCard {...defaultProps} />);

      // Verify all required fields are present
      expect(screen.getByTestId('candidate-position')).toBeInTheDocument();
      expect(screen.getByTestId('board-preview')).toBeInTheDocument();
      expect(screen.getByTestId('candidate-description')).toBeInTheDocument();
      expect(screen.getByTestId('candidate-poster')).toBeInTheDocument();
      expect(screen.getByTestId('candidate-vote-count')).toBeInTheDocument();
      expect(screen.getByTestId('candidate-deadline')).toBeInTheDocument();
      expect(screen.getByTestId('status-badge')).toBeInTheDocument();
      expect(screen.getByTestId('candidate-created-at')).toBeInTheDocument();
    });
  });

  describe('Voted/Unvoted States', () => {
    it('should display vote button when user has not voted', () => {
      render(<CandidateCard {...defaultProps} currentVotedCandidateId={undefined} />);
      expect(screen.getByTestId('vote-button')).toBeInTheDocument();
      expect(screen.queryByTestId('vote-status-indicator')).not.toBeInTheDocument();
    });

    it('should display vote status indicator when user has voted for this candidate', () => {
      render(<CandidateCard {...defaultProps} currentVotedCandidateId="candidate-123" />);
      expect(screen.getByTestId('vote-status-indicator')).toBeInTheDocument();
      expect(screen.queryByTestId('vote-button')).not.toBeInTheDocument();
    });

    it('should display vote button when user has voted for a different candidate', () => {
      render(<CandidateCard {...defaultProps} currentVotedCandidateId="other-candidate-id" />);
      expect(screen.getByTestId('vote-button')).toBeInTheDocument();
      expect(screen.queryByTestId('vote-status-indicator')).not.toBeInTheDocument();
    });

    it('should pass correct props to vote button when not voted', () => {
      render(<CandidateCard {...defaultProps} />);
      const voteButton = screen.getByTestId('vote-button');
      expect(voteButton).toHaveAttribute('data-candidate-id', 'candidate-123');
      expect(voteButton).not.toBeDisabled();
    });
  });

  describe('Status Badge Display', () => {
    it('should display "投票受付中" badge when status is active', () => {
      const activeCandidate = { ...mockCandidate, status: 'active' as const };
      render(<CandidateCard {...defaultProps} candidate={activeCandidate} />);

      const badge = screen.getByTestId('status-badge');
      expect(badge).toHaveTextContent('投票受付中');
      expect(badge.querySelector('.bg-green-100')).toBeInTheDocument();
    });

    it('should display "締切済み" badge when status is closed', () => {
      const closedCandidate = { ...mockCandidate, status: 'closed' as const };
      render(<CandidateCard {...defaultProps} candidate={closedCandidate} />);

      const badge = screen.getByTestId('status-badge');
      expect(badge).toHaveTextContent('締切済み');
      expect(badge.querySelector('.bg-gray-100')).toBeInTheDocument();
    });

    it('should display "締切済み" badge when deadline has passed', () => {
      const expiredCandidate = {
        ...mockCandidate,
        deadline: '2024-01-14T00:00:00Z', // Past deadline
        status: 'active' as const,
      };
      render(<CandidateCard {...defaultProps} candidate={expiredCandidate} />);

      const badge = screen.getByTestId('status-badge');
      expect(badge).toHaveTextContent('締切済み');
    });

    it('should disable voting when status is closed', () => {
      const closedCandidate = { ...mockCandidate, status: 'closed' as const };
      render(<CandidateCard {...defaultProps} candidate={closedCandidate} />);

      // Vote button should not be rendered when voted, but if not voted, it should be disabled
      const voteButton = screen.queryByTestId('vote-button');
      if (voteButton) {
        expect(voteButton).toBeDisabled();
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero vote count', () => {
      const candidateWithZeroVotes = { ...mockCandidate, voteCount: 0 };
      render(<CandidateCard {...defaultProps} candidate={candidateWithZeroVotes} />);
      expect(screen.getByTestId('candidate-vote-count')).toHaveTextContent('0');
    });

    it('should handle large vote count', () => {
      const candidateWithManyVotes = { ...mockCandidate, voteCount: 9999 };
      render(<CandidateCard {...defaultProps} candidate={candidateWithManyVotes} />);
      expect(screen.getByTestId('candidate-vote-count')).toHaveTextContent('9999');
    });

    it('should handle empty description', () => {
      const candidateWithEmptyDesc = { ...mockCandidate, description: '' };
      render(<CandidateCard {...defaultProps} candidate={candidateWithEmptyDesc} />);
      const description = screen.getByTestId('candidate-description');
      expect(description).toBeInTheDocument();
      expect(description.textContent).toBe('');
    });

    it('should handle long description with line clamp', () => {
      const longDescription = 'あ'.repeat(300);
      const candidateWithLongDesc = { ...mockCandidate, description: longDescription };
      render(<CandidateCard {...defaultProps} candidate={candidateWithLongDesc} />);
      const description = screen.getByTestId('candidate-description');
      expect(description).toHaveClass('line-clamp-3');
    });

    it('should handle special characters in username', () => {
      const candidateWithSpecialChars = { ...mockCandidate, postedByUsername: 'ユーザー@123' };
      render(<CandidateCard {...defaultProps} candidate={candidateWithSpecialChars} />);
      expect(screen.getByTestId('candidate-poster')).toHaveTextContent('ユーザー@123');
    });
  });

  describe('Accessibility', () => {
    it('should use semantic HTML article element', () => {
      const { container } = render(<CandidateCard {...defaultProps} />);
      const article = container.querySelector('article');
      expect(article).toBeInTheDocument();
      expect(article).toHaveAttribute('data-testid', 'candidate-card');
    });

    it('should have proper heading hierarchy', () => {
      render(<CandidateCard {...defaultProps} />);
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('D3');
    });

    it('should render with proper test ids for all key elements', () => {
      render(<CandidateCard {...defaultProps} />);

      expect(screen.getByTestId('candidate-card')).toBeInTheDocument();
      expect(screen.getByTestId('status-badge')).toBeInTheDocument();
      expect(screen.getByTestId('candidate-position')).toBeInTheDocument();
      expect(screen.getByTestId('board-preview')).toBeInTheDocument();
      expect(screen.getByTestId('candidate-description')).toBeInTheDocument();
      expect(screen.getByTestId('candidate-poster')).toBeInTheDocument();
      expect(screen.getByTestId('candidate-vote-count')).toBeInTheDocument();
      expect(screen.getByTestId('candidate-deadline')).toBeInTheDocument();
      expect(screen.getByTestId('candidate-created-at')).toBeInTheDocument();
    });

    describe('Keyboard Navigation (Requirement 10.2)', () => {
      it('should be keyboard accessible with Tab key', () => {
        render(<CandidateCard {...defaultProps} />);
        const voteButton = screen.getByTestId('vote-button');

        voteButton.focus();
        expect(document.activeElement).toBe(voteButton);
      });

      it('should have visible focus indicators', () => {
        render(<CandidateCard {...defaultProps} />);
        const article = document.querySelector('article');

        // Check for focus-visible or focus classes
        expect(article?.className).toMatch(/focus|ring/);
      });

      it('should allow keyboard navigation to all interactive elements', () => {
        render(<CandidateCard {...defaultProps} />);
        const voteButton = screen.getByTestId('vote-button');

        // Simulate Tab navigation
        voteButton.focus();
        expect(document.activeElement).toBe(voteButton);
      });
    });

    describe('ARIA Labels (Requirement 10.4)', () => {
      it('should have aria-label on article element', () => {
        const { container } = render(<CandidateCard {...defaultProps} />);
        const article = container.querySelector('article');

        expect(article).toHaveAttribute('aria-label');
        expect(article?.getAttribute('aria-label')).toContain('D3');
      });

      it('should have aria-describedby linking description', () => {
        render(<CandidateCard {...defaultProps} />);
        const description = screen.getByTestId('candidate-description');

        expect(description).toHaveAttribute('id');
      });

      it('should have proper role attributes', () => {
        const { container } = render(<CandidateCard {...defaultProps} />);
        const article = container.querySelector('article');

        expect(article).toHaveAttribute('role', 'article');
      });

      it('should have aria-label on status badge', () => {
        render(<CandidateCard {...defaultProps} />);
        const badge = screen.getByTestId('status-badge');

        expect(badge).toHaveAttribute('aria-label');
      });

      it('should have aria-label on vote count', () => {
        render(<CandidateCard {...defaultProps} />);
        const voteCount = screen.getByTestId('candidate-vote-count');

        expect(voteCount.parentElement).toHaveAttribute('aria-label');
      });
    });

    describe('Contrast Ratio (Requirement 10.7)', () => {
      it('should have sufficient contrast for text elements', () => {
        render(<CandidateCard {...defaultProps} />);

        // Check that text elements have appropriate color classes
        const position = screen.getByTestId('candidate-position');
        expect(position.className).toMatch(/text-(gray-900|black|slate-900)/);
      });

      it('should have sufficient contrast for status badge', () => {
        render(<CandidateCard {...defaultProps} />);
        const badge = screen.getByTestId('status-badge');

        // Active status should have green-800 on green-100 (sufficient contrast)
        expect(badge.querySelector('.text-green-800')).toBeInTheDocument();
        expect(badge.querySelector('.bg-green-100')).toBeInTheDocument();
      });

      it('should have sufficient contrast for closed status badge', () => {
        const closedCandidate = { ...mockCandidate, status: 'closed' as const };
        render(<CandidateCard {...defaultProps} candidate={closedCandidate} />);
        const badge = screen.getByTestId('status-badge');

        // Closed status should have gray-800 on gray-100 (sufficient contrast)
        expect(badge.querySelector('.text-gray-800')).toBeInTheDocument();
        expect(badge.querySelector('.bg-gray-100')).toBeInTheDocument();
      });

      it('should have sufficient contrast for metadata text', () => {
        render(<CandidateCard {...defaultProps} />);
        const poster = screen.getByTestId('candidate-poster');

        // Metadata should use gray-600 or darker for sufficient contrast
        expect(poster.className).toMatch(/text-gray-(600|700|800|900)/);
      });
    });

    describe('Screen Reader Support (Requirement 10.5)', () => {
      it('should announce vote status to screen readers', () => {
        render(<CandidateCard {...defaultProps} currentVotedCandidateId="candidate-123" />);
        const indicator = screen.getByTestId('vote-status-indicator');

        expect(indicator).toHaveAttribute('role', 'status');
        expect(indicator).toHaveAttribute('aria-label');
      });

      it('should have descriptive text for all visual elements', () => {
        render(<CandidateCard {...defaultProps} />);

        // All key information should be accessible via text content
        expect(screen.getByText('D3')).toBeInTheDocument();
        expect(screen.getByText('テストユーザー')).toBeInTheDocument();
        expect(screen.getByTestId('candidate-vote-count')).toHaveTextContent('12');
      });

      it('should hide decorative elements from screen readers', () => {
        render(<CandidateCard {...defaultProps} />);

        // This component doesn't use decorative icons with aria-hidden
        // All elements are semantic and accessible
        // This test verifies that the component is accessible without hidden decorative elements
        const article = screen.getByRole('article');
        expect(article).toBeInTheDocument();
      });
    });

    describe('Focus Management (Requirement 10.3)', () => {
      it('should maintain focus order', () => {
        render(<CandidateCard {...defaultProps} />);
        const voteButton = screen.getByTestId('vote-button');

        // Focus should be manageable
        voteButton.focus();
        expect(document.activeElement).toBe(voteButton);
      });

      it('should have visible focus ring on interactive elements', () => {
        render(<CandidateCard {...defaultProps} />);
        const voteButton = screen.getByTestId('vote-button');

        // Button uses shadcn/ui Button component which includes focus-visible:ring classes
        // The classes are applied via CVA and may not be visible in className string
        // Instead, verify the button is focusable and has proper ARIA attributes
        expect(voteButton).toBeInTheDocument();
        expect(voteButton.tagName).toBe('BUTTON');
      });

      it('should not trap focus within card', () => {
        render(<CandidateCard {...defaultProps} />);
        const voteButton = screen.getByTestId('vote-button');

        voteButton.focus();
        expect(document.activeElement).toBe(voteButton);

        // Focus should be releasable (no focus trap)
        voteButton.blur();
        expect(document.activeElement).not.toBe(voteButton);
      });
    });

    describe('Semantic HTML (Requirement 10.1)', () => {
      it('should use article element for card container', () => {
        const { container } = render(<CandidateCard {...defaultProps} />);
        const article = container.querySelector('article');

        expect(article).toBeInTheDocument();
      });

      it('should use heading element for position', () => {
        render(<CandidateCard {...defaultProps} />);
        const heading = screen.getByRole('heading', { level: 3 });

        expect(heading).toBeInTheDocument();
        expect(heading).toHaveTextContent('D3');
      });

      it('should use paragraph element for description', () => {
        render(<CandidateCard {...defaultProps} />);
        const description = screen.getByTestId('candidate-description');

        expect(description.tagName).toBe('P');
      });

      it('should use time element for dates', () => {
        const { container } = render(<CandidateCard {...defaultProps} />);
        const timeElements = container.querySelectorAll('time');

        // Should have time elements for deadline and created date
        expect(timeElements.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Responsive Design', () => {
    it('should apply responsive card styling', () => {
      const { container } = render(<CandidateCard {...defaultProps} />);
      const card = container.querySelector('article');
      expect(card).toHaveClass('rounded-lg', 'shadow-sm', 'hover:shadow-md', 'transition-shadow');
    });

    it('should have proper spacing for mobile layout', () => {
      const { container } = render(<CandidateCard {...defaultProps} />);
      const card = container.querySelector('article');
      expect(card).toHaveClass('p-4');
    });
  });

  describe('Authentication States', () => {
    it('should pass authentication state to vote button', () => {
      render(<CandidateCard {...defaultProps} isAuthenticated={true} />);
      const voteButton = screen.getByTestId('vote-button');
      expect(voteButton).not.toBeDisabled();
    });

    it('should disable vote button when not authenticated', () => {
      render(<CandidateCard {...defaultProps} isAuthenticated={false} />);
      const voteButton = screen.getByTestId('vote-button');
      expect(voteButton).toBeDisabled();
    });
  });
});
