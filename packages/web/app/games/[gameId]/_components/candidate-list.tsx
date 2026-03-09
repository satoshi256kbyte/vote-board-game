/**
 * CandidateList Component
 *
 * Displays a list of move candidates with:
 * - Grid layout (responsive: 1 column mobile, 2 columns desktop)
 * - Sort and filter functionality
 * - 30-second polling updates
 * - Vote handling
 * - Loading states
 * - Error handling
 *
 * Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 4.4, 4.5, 4.6, 4.7,
 *               6.4, 6.5, 6.6, 7.1, 7.2, 7.3, 7.4, 7.5, 9.1, 9.2, 9.3, 9.4,
 *               16.5, 16.6
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { CandidateCard } from './candidate-card';
import { CandidateSortFilter } from '@/app/games/[gameId]/_components/candidate-sort-filter';
import { getCandidates, getVoteStatus } from '@/lib/api/candidates';
import type { Candidate, VoteStatus } from '@/lib/api/candidates';
import { sortCandidates, filterCandidates } from '@/lib/utils/sort-filter';
import type { SortBy, SortOrder, Filter } from '@/lib/utils/sort-filter';

export interface CandidateListProps {
  /** Initial candidates from server */
  initialCandidates: Candidate[];
  /** Initial vote status from server (null if not authenticated or hasn't voted) */
  initialVoteStatus: VoteStatus | null;
  /** Game ID */
  gameId: string;
  /** Turn number */
  turnNumber: number;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
}

/**
 * Map API Candidate to sort-filter Candidate interface
 * The API uses 'source' but sort-filter utility uses 'createdBy'
 */
function mapCandidateForSorting(candidate: Candidate) {
  return {
    ...candidate,
    createdBy: candidate.source,
  };
}

/**
 * CandidateList Component
 *
 * Manages the candidate list state, polling, sorting, filtering, and voting.
 */
export function CandidateList({
  initialCandidates,
  initialVoteStatus,
  gameId,
  turnNumber,
  isAuthenticated,
}: CandidateListProps) {
  // Get URL query parameters for initial sort/filter state
  const searchParams = useSearchParams();
  const initialSortBy = (searchParams.get('sortBy') as SortBy) || 'votes';
  const initialSortOrder = (searchParams.get('sortOrder') as SortOrder) || 'desc';
  const initialFilter = (searchParams.get('filter') as Filter) || 'all';

  // State management
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [voteStatus, setVoteStatus] = useState<VoteStatus | null>(initialVoteStatus);
  const [sortBy, setSortBy] = useState<SortBy>(initialSortBy);
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialSortOrder);
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch latest candidates from API
   */
  const fetchCandidates = useCallback(async () => {
    try {
      const updatedCandidates = await getCandidates(gameId, turnNumber);
      setCandidates(updatedCandidates);
      setError(null);
    } catch (err) {
      console.error('[CandidateList] Failed to fetch candidates:', err);
      setError('候補の取得に失敗しました');
    }
  }, [gameId, turnNumber]);

  /**
   * Fetch latest vote status from API
   */
  const fetchVoteStatus = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    try {
      const updatedVoteStatus = await getVoteStatus(gameId, turnNumber);
      setVoteStatus(updatedVoteStatus);
    } catch (err) {
      console.error('[CandidateList] Failed to fetch vote status:', err);
      // Don't show error for vote status fetch failures
      // User can still see candidates
    }
  }, [gameId, turnNumber, isAuthenticated]);

  /**
   * Handle successful vote
   * Refreshes both candidates and vote status
   */
  const handleVoteSuccess = useCallback(async () => {
    await Promise.all([fetchCandidates(), fetchVoteStatus()]);
  }, [fetchCandidates, fetchVoteStatus]);

  /**
   * Handle sort change
   */
  const handleSortChange = useCallback(
    (newSortBy: 'voteCount' | 'createdAt', newSortOrder: 'asc' | 'desc') => {
      // Map 'voteCount' to 'votes' for the sort-filter utility
      const mappedSortBy = newSortBy === 'voteCount' ? 'votes' : newSortBy;
      setSortBy(mappedSortBy as SortBy);
      setSortOrder(newSortOrder);
    },
    []
  );

  /**
   * Handle filter change
   */
  const handleFilterChange = useCallback((newFilter: Filter) => {
    setFilter(newFilter);
  }, []);

  /**
   * Process candidates: apply filter and sort
   */
  const processedCandidates = useMemo(() => {
    // Map candidates to include createdBy field for sorting/filtering
    const mappedCandidates = candidates.map(mapCandidateForSorting);

    // Apply filter
    let filtered = filterCandidates(mappedCandidates, filter, voteStatus?.candidateId);

    // Apply sort
    filtered = sortCandidates(filtered, sortBy, sortOrder);

    return filtered;
  }, [candidates, sortBy, sortOrder, filter, voteStatus]);

  /**
   * Set up polling interval
   * Polls every 30 seconds when page is visible
   */
  useEffect(() => {
    const pollInterval = setInterval(() => {
      // Only poll if page is visible (Page Visibility API)
      if (document.visibilityState === 'visible') {
        setIsPolling(true);
        fetchCandidates().finally(() => {
          setIsPolling(false);
        });
      }
    }, 30000); // 30 seconds

    return () => clearInterval(pollInterval);
  }, [fetchCandidates]);

  /**
   * Stop polling when page is in background
   * Resume when page becomes visible again
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refresh data when page becomes visible
        fetchCandidates();
        if (isAuthenticated) {
          fetchVoteStatus();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchCandidates, fetchVoteStatus, isAuthenticated]);

  return (
    <div className="space-y-4" data-testid="candidate-list">
      {/* Sort and Filter Controls */}
      <CandidateSortFilter
        sortBy={sortBy === 'votes' ? 'voteCount' : sortBy}
        sortOrder={sortOrder}
        filter={filter}
        onSortChange={handleSortChange}
        onFilterChange={handleFilterChange}
      />

      {/* Error Message */}
      {error && (
        <div
          className="rounded-lg bg-red-50 p-4 text-red-800"
          role="alert"
          aria-live="polite"
          data-testid="error-message"
        >
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Candidate Grid */}
      {processedCandidates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="candidate-grid">
          {processedCandidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              gameId={gameId}
              turnNumber={turnNumber}
              isAuthenticated={isAuthenticated}
              currentVotedCandidateId={voteStatus?.candidateId}
              onVoteSuccess={handleVoteSuccess}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500" data-testid="empty-message">
          <p>まだ候補がありません</p>
        </div>
      )}

      {/* Polling Indicator (optional, subtle) */}
      {isPolling && (
        <div className="sr-only" aria-live="polite">
          候補を更新中...
        </div>
      )}
    </div>
  );
}
