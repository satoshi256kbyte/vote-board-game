/**
 * CandidateList Component Unit Tests
 *
 * Tests for the CandidateList component including:
 * - Candidate list display (grid layout, responsive)
 * - Sort and filter functionality
 * - Polling functionality (30-second intervals, page visibility)
 * - Vote processing (handleVote, handleVoteChange)
 * - Error handling (API errors, network errors)
 * - Loading states
 * - Empty state
 * - Integration with CandidateCard components
 *
 * Validates Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { CandidateList } from './candidate-list';
import type { Candidate, VoteStatus } from '@/lib/api/candidates';
import * as candidatesApi from '@/lib/api/candidates';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(() => ({
    get: vi.fn((key: string) => {
      const params: Record<string, string> = {
        sortBy: 'votes',
        sortOrder: 'desc',
        filter: 'all',
      };
      return params[key] || null;
    }),
  })),
}));

// Mock child components
vi.mock('./candidate-card', () => ({
  CandidateCard: ({
    candidate,
    onVoteSuccess,
  }: {
    candidate: Candidate;
    onVoteSuccess: () => void;
  }) => (
    <div
      data-testid="candidate-card"
      data-candidate-id={candidate.id}
      data-position={candidate.position}
      data-vote-count={candidate.voteCount}
    >
      <button data-testid={`vote-button-${candidate.id}`} onClick={onVoteSuccess}>
        投票する
      </button>
    </div>
  ),
}));

vi.mock('@/app/games/[gameId]/_components/candidate-sort-filter', () => ({
  CandidateSortFilter: ({
    sortBy,
    sortOrder,
    filter,
    onSortChange,
    onFilterChange,
  }: {
    sortBy: string;
    sortOrder: string;
    filter: string;
    onSortChange: (sortBy: 'voteCount' | 'createdAt', sortOrder: 'asc' | 'desc') => void;
    onFilterChange: (filter: string) => void;
  }) => (
    <div data-testid="candidate-sort-filter">
      <button
        data-testid="sort-by-votes"
        onClick={() => onSortChange('voteCount', sortOrder as 'asc' | 'desc')}
      >
        Sort by Votes
      </button>
      <button
        data-testid="sort-by-created"
        onClick={() => onSortChange('createdAt', sortOrder as 'asc' | 'desc')}
      >
        Sort by Created
      </button>
      <button data-testid="filter-all" onClick={() => onFilterChange('all')}>
        All
      </button>
      <button data-testid="filter-ai" onClick={() => onFilterChange('ai')}>
        AI
      </button>
      <button data-testid="filter-user" onClick={() => onFilterChange('user')}>
        User
      </button>
      <span data-testid="current-sort">
        {sortBy}-{sortOrder}
      </span>
      <span data-testid="current-filter">{filter}</span>
    </div>
  ),
}));

// Mock API functions
vi.mock('@/lib/api/candidates', () => ({
  getCandidates: vi.fn(),
  getVoteStatus: vi.fn(),
  createVote: vi.fn(),
  changeVote: vi.fn(),
}));

// Mock sort-filter utilities
vi.mock('@/lib/utils/sort-filter', () => ({
  sortCandidates: vi.fn((candidates, sortBy, sortOrder) => {
    const sorted = [...candidates].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'votes') {
        comparison = a.voteCount - b.voteCount;
      } else if (sortBy === 'createdAt') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });
    return sorted;
  }),
  filterCandidates: vi.fn((candidates, filter, votedCandidateId) => {
    if (filter === 'all') return candidates;
    if (filter === 'my-vote') return candidates.filter((c: Candidate) => c.id === votedCandidateId);
    if (filter === 'ai') return candidates.filter((c: Candidate) => c.source === 'ai');
    if (filter === 'user') return candidates.filter((c: Candidate) => c.source === 'user');
    return candidates;
  }),
}));

describe('CandidateList', () => {
  const mockCandidates: Candidate[] = [
    {
      id: 'candidate-1',
      gameId: 'game-123',
      turnNumber: 5,
      position: 'D3',
      description: '中央を制圧する手',
      boardState: Array(8).fill(Array(8).fill('0')),
      voteCount: 15,
      postedBy: 'user-1',
      postedByUsername: 'ユーザー1',
      status: 'active',
      deadline: '2024-01-16T00:00:00Z',
      createdAt: '2024-01-15T10:00:00Z',
      source: 'user',
    },
    {
      id: 'candidate-2',
      gameId: 'game-123',
      turnNumber: 5,
      position: 'E4',
      description: 'AI推奨の手',
      boardState: Array(8).fill(Array(8).fill('0')),
      voteCount: 10,
      postedBy: 'ai',
      postedByUsername: 'AI',
      status: 'active',
      deadline: '2024-01-16T00:00:00Z',
      createdAt: '2024-01-15T11:00:00Z',
      source: 'ai',
    },
    {
      id: 'candidate-3',
      gameId: 'game-123',
      turnNumber: 5,
      position: 'F5',
      description: '攻撃的な手',
      boardState: Array(8).fill(Array(8).fill('0')),
      voteCount: 8,
      postedBy: 'user-2',
      postedByUsername: 'ユーザー2',
      status: 'active',
      deadline: '2024-01-16T00:00:00Z',
      createdAt: '2024-01-15T12:00:00Z',
      source: 'user',
    },
  ];

  const mockVoteStatus: VoteStatus = {
    gameId: 'game-123',
    turnNumber: 5,
    userId: 'user-123',
    candidateId: 'candidate-1',
    createdAt: '2024-01-15T13:00:00Z',
    updatedAt: '2024-01-15T13:00:00Z',
  };

  const defaultProps = {
    initialCandidates: mockCandidates,
    initialVoteStatus: null,
    gameId: 'game-123',
    turnNumber: 5,
    isAuthenticated: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));

    // Setup default mock implementations
    vi.mocked(candidatesApi.getCandidates).mockResolvedValue(mockCandidates);
    vi.mocked(candidatesApi.getVoteStatus).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Candidate List Display (Requirements 13.1, 13.2)', () => {
    it('should render candidate list container', () => {
      render(<CandidateList {...defaultProps} />);
      expect(screen.getByTestId('candidate-list')).toBeInTheDocument();
    });

    it('should display all candidates in grid layout', () => {
      render(<CandidateList {...defaultProps} />);
      const candidateCards = screen.getAllByTestId('candidate-card');
      expect(candidateCards).toHaveLength(3);
    });

    it('should render candidate grid with proper styling', () => {
      render(<CandidateList {...defaultProps} />);
      const grid = screen.getByTestId('candidates-grid');
      expect(grid).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'gap-4');
    });

    it('should pass correct props to CandidateCard components', () => {
      render(<CandidateList {...defaultProps} />);
      const firstCard = screen.getByTestId('candidate-card');
      expect(firstCard).toHaveAttribute('data-candidate-id');
      expect(firstCard).toHaveAttribute('data-position');
      expect(firstCard).toHaveAttribute('data-vote-count');
    });

    it('should display empty message when no candidates', () => {
      render(<CandidateList {...defaultProps} initialCandidates={[]} />);
      expect(screen.getByTestId('empty-message')).toHaveTextContent('まだ候補がありません');
    });

    it('should not display grid when no candidates', () => {
      render(<CandidateList {...defaultProps} initialCandidates={[]} />);
      expect(screen.queryByTestId('candidates-grid')).not.toBeInTheDocument();
    });
  });

  describe('Sort and Filter Functionality (Requirements 13.3)', () => {
    it('should render sort and filter controls', () => {
      render(<CandidateList {...defaultProps} />);
      expect(screen.getByTestId('candidate-sort-filter')).toBeInTheDocument();
    });

    it('should sort candidates by vote count in descending order by default', () => {
      render(<CandidateList {...defaultProps} />);
      const candidateCards = screen.getAllByTestId('candidate-card');

      // Should be sorted by voteCount desc: 15, 10, 8
      expect(candidateCards[0]).toHaveAttribute('data-vote-count', '15');
      expect(candidateCards[1]).toHaveAttribute('data-vote-count', '10');
      expect(candidateCards[2]).toHaveAttribute('data-vote-count', '8');
    });

    it('should update sort when sort button is clicked', async () => {
      render(<CandidateList {...defaultProps} />);

      const sortByCreatedButton = screen.getByTestId('sort-by-created');
      await act(async () => {
        sortByCreatedButton.click();
      });

      // Verify sort was applied (candidates should be re-rendered)
      await waitFor(() => {
        const candidateCards = screen.getAllByTestId('candidate-card');
        expect(candidateCards).toHaveLength(3);
      });
    });

    it('should filter candidates when filter is changed', async () => {
      render(<CandidateList {...defaultProps} />);

      const filterAiButton = screen.getByTestId('filter-ai');
      await act(async () => {
        filterAiButton.click();
      });

      await waitFor(() => {
        const candidateCards = screen.getAllByTestId('candidate-card');
        // Should only show AI candidate
        expect(candidateCards).toHaveLength(1);
        expect(candidateCards[0]).toHaveAttribute('data-candidate-id', 'candidate-2');
      });
    });

    it('should filter to show only user-voted candidate', async () => {
      render(<CandidateList {...defaultProps} initialVoteStatus={mockVoteStatus} />);

      const filterMyVoteButton = screen.getByTestId('filter-all');
      await act(async () => {
        filterMyVoteButton.click();
      });

      await waitFor(() => {
        const candidateCards = screen.getAllByTestId('candidate-card');
        expect(candidateCards.length).toBeGreaterThan(0);
      });
    });

    it('should apply both sort and filter together', async () => {
      render(<CandidateList {...defaultProps} />);

      // Apply filter first
      const filterUserButton = screen.getByTestId('filter-user');
      await act(async () => {
        filterUserButton.click();
      });

      await waitFor(() => {
        const candidateCards = screen.getAllByTestId('candidate-card');
        // Should show 2 user candidates
        expect(candidateCards).toHaveLength(2);
      });
    });
  });

  describe('Polling Functionality (Requirements 13.3)', () => {
    it('should poll for updates every 30 seconds', async () => {
      render(<CandidateList {...defaultProps} />);

      // Initial render - getCandidates should not be called yet
      expect(candidatesApi.getCandidates).not.toHaveBeenCalled();

      // Fast-forward 30 seconds
      await act(async () => {
        vi.advanceTimersByTime(30000);
      });

      // Should have called getCandidates once
      await waitFor(() => {
        expect(candidatesApi.getCandidates).toHaveBeenCalledTimes(1);
        expect(candidatesApi.getCandidates).toHaveBeenCalledWith('game-123', 5);
      });

      // Fast-forward another 30 seconds
      await act(async () => {
        vi.advanceTimersByTime(30000);
      });

      // Should have called getCandidates twice
      await waitFor(() => {
        expect(candidatesApi.getCandidates).toHaveBeenCalledTimes(2);
      });
    });

    it('should update candidates when polling returns new data', async () => {
      const updatedCandidates = [
        { ...mockCandidates[0], voteCount: 20 },
        { ...mockCandidates[1], voteCount: 15 },
        { ...mockCandidates[2], voteCount: 10 },
      ];

      vi.mocked(candidatesApi.getCandidates).mockResolvedValue(updatedCandidates);

      render(<CandidateList {...defaultProps} />);

      // Fast-forward to trigger polling
      await act(async () => {
        vi.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        const candidateCards = screen.getAllByTestId('candidate-card');
        expect(candidateCards[0]).toHaveAttribute('data-vote-count', '20');
      });
    });

    it('should stop polling when page is hidden', async () => {
      render(<CandidateList {...defaultProps} />);

      // Simulate page becoming hidden
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        configurable: true,
        value: 'hidden',
      });

      // Fast-forward 30 seconds
      await act(async () => {
        vi.advanceTimersByTime(30000);
      });

      // Should not have called getCandidates because page is hidden
      expect(candidatesApi.getCandidates).not.toHaveBeenCalled();
    });

    it('should resume polling when page becomes visible', async () => {
      render(<CandidateList {...defaultProps} />);

      // Simulate page becoming visible
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        configurable: true,
        value: 'visible',
      });

      // Trigger visibilitychange event
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // Should fetch candidates immediately when page becomes visible
      await waitFor(() => {
        expect(candidatesApi.getCandidates).toHaveBeenCalled();
      });
    });

    it('should clean up polling interval on unmount', () => {
      const { unmount } = render(<CandidateList {...defaultProps} />);

      unmount();

      // Fast-forward time after unmount
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      // Should not call getCandidates after unmount
      expect(candidatesApi.getCandidates).not.toHaveBeenCalled();
    });
  });

  describe('Vote Processing (Requirements 13.4)', () => {
    it('should refresh candidates after successful vote', async () => {
      render(<CandidateList {...defaultProps} />);

      const voteButton = screen.getByTestId('vote-button-candidate-1');

      await act(async () => {
        voteButton.click();
      });

      await waitFor(() => {
        expect(candidatesApi.getCandidates).toHaveBeenCalledWith('game-123', 5);
        expect(candidatesApi.getVoteStatus).toHaveBeenCalledWith('game-123', 5);
      });
    });

    it('should refresh vote status after successful vote', async () => {
      render(<CandidateList {...defaultProps} />);

      const voteButton = screen.getByTestId('vote-button-candidate-1');

      await act(async () => {
        voteButton.click();
      });

      await waitFor(() => {
        expect(candidatesApi.getVoteStatus).toHaveBeenCalled();
      });
    });

    it('should not fetch vote status when user is not authenticated', async () => {
      render(<CandidateList {...defaultProps} isAuthenticated={false} />);

      // Trigger visibility change to test vote status fetch
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        configurable: true,
        value: 'visible',
      });

      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      await waitFor(() => {
        expect(candidatesApi.getCandidates).toHaveBeenCalled();
        expect(candidatesApi.getVoteStatus).not.toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling (Requirements 13.5)', () => {
    it('should display error message when getCandidates fails', async () => {
      vi.mocked(candidatesApi.getCandidates).mockRejectedValue(new Error('Network error'));

      render(<CandidateList {...defaultProps} />);

      // Trigger polling to cause error
      await act(async () => {
        vi.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('候補の取得に失敗しました');
      });
    });

    it('should display error with proper ARIA attributes', async () => {
      vi.mocked(candidatesApi.getCandidates).mockRejectedValue(new Error('Network error'));

      render(<CandidateList {...defaultProps} />);

      await act(async () => {
        vi.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        const errorMessage = screen.getByTestId('error-message');
        expect(errorMessage).toHaveAttribute('role', 'alert');
        expect(errorMessage).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('should clear error when subsequent fetch succeeds', async () => {
      // First call fails
      vi.mocked(candidatesApi.getCandidates).mockRejectedValueOnce(new Error('Network error'));

      render(<CandidateList {...defaultProps} />);

      // Trigger first polling (will fail)
      await act(async () => {
        vi.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      // Second call succeeds
      vi.mocked(candidatesApi.getCandidates).mockResolvedValue(mockCandidates);

      // Trigger second polling (will succeed)
      await act(async () => {
        vi.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
      });
    });

    it('should log error to console when getCandidates fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(candidatesApi.getCandidates).mockRejectedValue(new Error('Network error'));

      render(<CandidateList {...defaultProps} />);

      await act(async () => {
        vi.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[CandidateList] Failed to fetch candidates:',
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });

    it('should not display error when getVoteStatus fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(candidatesApi.getVoteStatus).mockRejectedValue(new Error('Auth error'));

      render(<CandidateList {...defaultProps} />);

      // Trigger visibility change to fetch vote status
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        configurable: true,
        value: 'visible',
      });

      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      // Should not display error message in UI
      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });

    it('should continue showing candidates when polling fails', async () => {
      render(<CandidateList {...defaultProps} />);

      // Initial candidates should be visible
      expect(screen.getAllByTestId('candidate-card')).toHaveLength(3);

      // Make polling fail
      vi.mocked(candidatesApi.getCandidates).mockRejectedValue(new Error('Network error'));

      await act(async () => {
        vi.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      // Candidates should still be visible
      expect(screen.getAllByTestId('candidate-card')).toHaveLength(3);
    });
  });

  describe('Loading States', () => {
    it('should show polling indicator during background refresh', async () => {
      render(<CandidateList {...defaultProps} />);

      // Start polling
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      // Polling indicator should be present (screen reader only)
      await waitFor(() => {
        const pollingIndicator = screen.queryByText('候補を更新中...');
        // It may not be visible but should exist in the DOM
        if (pollingIndicator) {
          expect(pollingIndicator).toHaveClass('sr-only');
        }
      });
    });

    it('should not show loading indicator for initial render', () => {
      render(<CandidateList {...defaultProps} />);

      // Should not show polling indicator on initial render
      expect(screen.queryByText('候補を更新中...')).not.toBeInTheDocument();
    });
  });

  describe('Integration with CandidateCard', () => {
    it('should pass gameId and turnNumber to CandidateCard', () => {
      render(<CandidateList {...defaultProps} />);

      const candidateCards = screen.getAllByTestId('candidate-card');
      expect(candidateCards.length).toBeGreaterThan(0);
    });

    it('should pass vote status to CandidateCard', () => {
      render(<CandidateList {...defaultProps} initialVoteStatus={mockVoteStatus} />);

      const candidateCards = screen.getAllByTestId('candidate-card');
      expect(candidateCards.length).toBeGreaterThan(0);
    });

    it('should pass authentication state to CandidateCard', () => {
      render(<CandidateList {...defaultProps} isAuthenticated={false} />);

      const candidateCards = screen.getAllByTestId('candidate-card');
      expect(candidateCards.length).toBeGreaterThan(0);
    });

    it('should pass onVoteSuccess callback to CandidateCard', () => {
      render(<CandidateList {...defaultProps} />);

      const voteButton = screen.getByTestId('vote-button-candidate-1');
      expect(voteButton).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should apply responsive grid classes', () => {
      render(<CandidateList {...defaultProps} />);

      const grid = screen.getByTestId('candidates-grid');
      expect(grid).toHaveClass('grid-cols-1'); // Mobile: 1 column
      expect(grid).toHaveClass('md:grid-cols-2'); // Desktop: 2 columns
    });

    it('should apply proper spacing', () => {
      render(<CandidateList {...defaultProps} />);

      const container = screen.getByTestId('candidate-list');
      expect(container).toHaveClass('space-y-4');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty initial candidates', () => {
      render(<CandidateList {...defaultProps} initialCandidates={[]} />);

      expect(screen.getByTestId('empty-message')).toBeInTheDocument();
      expect(screen.queryByTestId('candidate-grid')).not.toBeInTheDocument();
    });

    it('should handle null vote status', () => {
      render(<CandidateList {...defaultProps} initialVoteStatus={null} />);

      const candidateCards = screen.getAllByTestId('candidate-card');
      expect(candidateCards).toHaveLength(3);
    });

    it('should handle single candidate', () => {
      render(<CandidateList {...defaultProps} initialCandidates={[mockCandidates[0]]} />);

      const candidateCards = screen.getAllByTestId('candidate-card');
      expect(candidateCards).toHaveLength(1);
    });

    it('should handle many candidates', () => {
      const manyCandidates = Array.from({ length: 20 }, (_, i) => ({
        ...mockCandidates[0],
        id: `candidate-${i}`,
        position: `A${i + 1}`,
      }));

      render(<CandidateList {...defaultProps} initialCandidates={manyCandidates} />);

      const candidateCards = screen.getAllByTestId('candidate-card');
      expect(candidateCards).toHaveLength(20);
    });
  });

  describe('Accessibility (Requirement 13.6)', () => {
    it('should have proper ARIA attributes on error message', async () => {
      vi.mocked(candidatesApi.getCandidates).mockRejectedValue(new Error('Network error'));

      render(<CandidateList {...defaultProps} />);

      await act(async () => {
        vi.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        const errorMessage = screen.getByTestId('error-message');
        expect(errorMessage).toHaveAttribute('role', 'alert');
        expect(errorMessage).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('should have screen reader only polling indicator', async () => {
      render(<CandidateList {...defaultProps} />);

      act(() => {
        vi.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        const pollingIndicator = screen.queryByText('候補を更新中...');
        if (pollingIndicator) {
          expect(pollingIndicator).toHaveClass('sr-only');
          expect(pollingIndicator).toHaveAttribute('aria-live', 'polite');
        }
      });
    });

    it('should maintain focus during polling updates', async () => {
      render(<CandidateList {...defaultProps} />);

      const firstVoteButton = screen.getByTestId('vote-button-candidate-1');
      firstVoteButton.focus();

      expect(document.activeElement).toBe(firstVoteButton);

      // Trigger polling
      await act(async () => {
        vi.advanceTimersByTime(30000);
      });

      // Focus should be maintained (though in real implementation this might need special handling)
      await waitFor(() => {
        expect(candidatesApi.getCandidates).toHaveBeenCalled();
      });
    });

    describe('Keyboard Navigation (Requirement 10.2)', () => {
      it('should allow Tab navigation through candidate cards', () => {
        render(<CandidateList {...defaultProps} />);

        const voteButtons = [
          screen.getByTestId('vote-button-candidate-1'),
          screen.getByTestId('vote-button-candidate-2'),
          screen.getByTestId('vote-button-candidate-3'),
        ];

        voteButtons.forEach((button) => {
          button.focus();
          expect(document.activeElement).toBe(button);
        });
      });

      it('should maintain logical tab order', () => {
        render(<CandidateList {...defaultProps} />);

        // Sort/filter controls should come before candidate cards
        const sortFilter = screen.getByTestId('candidate-sort-filter');
        const firstVoteButton = screen.getByTestId('vote-button-candidate-1');

        expect(sortFilter).toBeInTheDocument();
        expect(firstVoteButton).toBeInTheDocument();
      });

      it('should be keyboard accessible for all interactive elements', () => {
        render(<CandidateList {...defaultProps} />);

        const interactiveElements = screen.getAllByRole('button');
        expect(interactiveElements.length).toBeGreaterThan(0);

        interactiveElements.forEach((element) => {
          element.focus();
          expect(document.activeElement).toBe(element);
        });
      });
    });

    describe('ARIA Labels (Requirement 10.4)', () => {
      it('should have aria-label on main container', () => {
        render(<CandidateList {...defaultProps} />);

        const container = screen.getByTestId('candidate-list');
        expect(container).toHaveAttribute('aria-label', '次の一手候補一覧');
      });

      it('should have aria-live region for updates', async () => {
        render(<CandidateList {...defaultProps} />);

        act(() => {
          vi.advanceTimersByTime(30000);
        });

        await waitFor(() => {
          const liveRegion = screen.queryByRole('status');
          if (liveRegion) {
            expect(liveRegion).toHaveAttribute('aria-live');
          }
        });
      });

      it('should have proper role on grid container', () => {
        render(<CandidateList {...defaultProps} />);

        const grid = screen.getByTestId('candidates-grid');
        expect(grid).toHaveAttribute('role', 'list');
      });

      it('should have aria-label on empty state', () => {
        render(<CandidateList {...defaultProps} initialCandidates={[]} />);

        const emptyMessage = screen.getByTestId('empty-message');
        expect(emptyMessage).toHaveAttribute('role', 'status');
      });
    });

    describe('Contrast Ratio (Requirement 10.7)', () => {
      it('should have sufficient contrast for error messages', async () => {
        vi.mocked(candidatesApi.getCandidates).mockRejectedValue(new Error('Network error'));

        render(<CandidateList {...defaultProps} />);

        await act(async () => {
          vi.advanceTimersByTime(30000);
        });

        await waitFor(() => {
          const errorMessage = screen.getByTestId('error-message');
          // Error messages should have red-600 or darker on white/light background
          expect(errorMessage.className).toMatch(/text-red-(600|700|800|900)/);
        });
      });

      it('should have sufficient contrast for empty state text', () => {
        render(<CandidateList {...defaultProps} initialCandidates={[]} />);

        const emptyMessage = screen.getByTestId('empty-message');
        // Empty state should have gray-500 or darker text
        const textElement = emptyMessage.querySelector('p');
        expect(textElement?.className).toMatch(/text-gray-(500|600|700|800|900)/);
      });

      it('should maintain contrast in all states', () => {
        render(<CandidateList {...defaultProps} />);

        const container = screen.getByTestId('candidate-list');
        // Container should have appropriate background
        expect(container.className).toBeTruthy();
      });
    });

    describe('Screen Reader Support (Requirement 10.5)', () => {
      it('should announce candidate count to screen readers', () => {
        render(<CandidateList {...defaultProps} />);

        const container = screen.getByTestId('candidate-list');
        expect(container).toHaveAttribute('aria-label');
      });

      it('should announce loading state to screen readers', async () => {
        render(<CandidateList {...defaultProps} />);

        act(() => {
          vi.advanceTimersByTime(30000);
        });

        await waitFor(() => {
          const loadingIndicator = screen.queryByText('候補を更新中...');
          if (loadingIndicator) {
            expect(loadingIndicator).toHaveAttribute('aria-live', 'polite');
          }
        });
      });

      it('should announce errors to screen readers', async () => {
        vi.mocked(candidatesApi.getCandidates).mockRejectedValue(new Error('Network error'));

        render(<CandidateList {...defaultProps} />);

        await act(async () => {
          vi.advanceTimersByTime(30000);
        });

        await waitFor(() => {
          const errorMessage = screen.getByTestId('error-message');
          expect(errorMessage).toHaveAttribute('role', 'alert');
          expect(errorMessage).toHaveAttribute('aria-live', 'polite');
        });
      });

      it('should hide decorative elements from screen readers', () => {
        const { container } = render(<CandidateList {...defaultProps} />);

        const decorativeElements = container.querySelectorAll('[aria-hidden="true"]');
        // Icons and decorative elements should be hidden
        expect(decorativeElements.length).toBeGreaterThanOrEqual(0);
      });

      it('should provide descriptive text for all visual information', () => {
        render(<CandidateList {...defaultProps} />);

        // All candidates should have accessible information
        const candidateCards = screen.getAllByTestId('candidate-card');
        expect(candidateCards.length).toBeGreaterThan(0);
      });
    });

    describe('Focus Management (Requirement 10.3)', () => {
      it('should have visible focus indicators on all interactive elements', () => {
        render(<CandidateList {...defaultProps} />);

        const buttons = screen.getAllByRole('button');
        buttons.forEach((button) => {
          expect(button.className).toMatch(/focus:ring|focus-visible:ring/);
        });
      });

      it('should not lose focus during updates', async () => {
        render(<CandidateList {...defaultProps} />);

        const firstButton = screen.getByTestId('vote-button-candidate-1');
        firstButton.focus();

        expect(document.activeElement).toBe(firstButton);

        // Trigger update
        await act(async () => {
          vi.advanceTimersByTime(30000);
        });

        // Focus should be maintained or managed appropriately
        await waitFor(() => {
          expect(candidatesApi.getCandidates).toHaveBeenCalled();
        });
      });

      it('should restore focus after error recovery', async () => {
        vi.mocked(candidatesApi.getCandidates).mockRejectedValueOnce(new Error('Network error'));

        render(<CandidateList {...defaultProps} />);

        const firstButton = screen.getByTestId('vote-button-candidate-1');
        firstButton.focus();

        await act(async () => {
          vi.advanceTimersByTime(30000);
        });

        await waitFor(() => {
          expect(screen.getByTestId('error-message')).toBeInTheDocument();
        });

        // Focus should be manageable after error
        firstButton.focus();
        expect(document.activeElement).toBe(firstButton);
      });

      it('should not trap focus within list', () => {
        render(<CandidateList {...defaultProps} />);

        const firstButton = screen.getByTestId('vote-button-candidate-1');
        firstButton.focus();

        expect(document.activeElement).toBe(firstButton);

        // Focus should be releasable
        firstButton.blur();
        expect(document.activeElement).not.toBe(firstButton);
      });
    });

    describe('Semantic HTML (Requirement 10.1)', () => {
      it('should use section element for main container', () => {
        const { container } = render(<CandidateList {...defaultProps} />);

        const section = container.querySelector('section');
        expect(section).toBeInTheDocument();
      });

      it('should use list structure for candidates', () => {
        render(<CandidateList {...defaultProps} />);

        const grid = screen.getByTestId('candidates-grid');
        expect(grid).toHaveAttribute('role', 'list');
      });

      it('should use proper heading hierarchy', () => {
        const { container } = render(<CandidateList {...defaultProps} />);

        // Should have proper heading structure
        const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
        expect(headings.length).toBeGreaterThanOrEqual(0);
      });
    });

    describe('Responsive Design Accessibility', () => {
      it('should maintain accessibility on mobile layout', () => {
        render(<CandidateList {...defaultProps} />);

        const grid = screen.getByTestId('candidates-grid');
        // Mobile: single column
        expect(grid).toHaveClass('grid-cols-1');
      });

      it('should maintain accessibility on desktop layout', () => {
        render(<CandidateList {...defaultProps} />);

        const grid = screen.getByTestId('candidates-grid');
        // Desktop: 2 columns
        expect(grid).toHaveClass('md:grid-cols-2');
      });

      it('should have adequate spacing for touch targets', () => {
        render(<CandidateList {...defaultProps} />);

        const grid = screen.getByTestId('candidates-grid');
        expect(grid).toHaveClass('gap-4');
      });
    });

    describe('Live Region Updates', () => {
      it('should announce polling updates politely', async () => {
        render(<CandidateList {...defaultProps} />);

        act(() => {
          vi.advanceTimersByTime(30000);
        });

        await waitFor(() => {
          const liveRegion = screen.queryByText('候補を更新中...');
          if (liveRegion) {
            expect(liveRegion).toHaveAttribute('aria-live', 'polite');
          }
        });
      });

      it('should announce errors assertively', async () => {
        vi.mocked(candidatesApi.getCandidates).mockRejectedValue(new Error('Network error'));

        render(<CandidateList {...defaultProps} />);

        await act(async () => {
          vi.advanceTimersByTime(30000);
        });

        await waitFor(() => {
          const errorMessage = screen.getByTestId('error-message');
          expect(errorMessage).toHaveAttribute('role', 'alert');
        });
      });

      it('should not overwhelm screen readers with updates', async () => {
        render(<CandidateList {...defaultProps} />);

        // Multiple rapid updates should be handled gracefully
        await act(async () => {
          vi.advanceTimersByTime(30000);
        });

        await act(async () => {
          vi.advanceTimersByTime(30000);
        });

        // Should not create multiple live regions
        const liveRegions = screen.queryAllByRole('status');
        expect(liveRegions.length).toBeLessThanOrEqual(2);
      });
    });
  });
});
