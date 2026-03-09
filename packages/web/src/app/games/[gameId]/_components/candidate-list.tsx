/**
 * CandidateList Component - Client Component
 *
 * Displays a list of move candidates with:
 * - Grid layout (responsive)
 * - Sort and filter functionality
 * - 30-second polling for updates
 * - Vote handling
 * - Loading and error states
 *
 * Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 4.4, 4.5, 4.6, 4.7, 6.4, 6.5, 6.6, 7.1, 7.2, 7.3, 7.4, 7.5, 9.1, 9.2, 9.3, 9.4, 16.5, 16.6
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { CandidateCard } from './candidate-card';
import { CandidateSortFilter } from './candidate-sort-filter';
import { getCandidates, getVoteStatus } from '@/lib/api/candidates';
import { sortCandidates, filterCandidates } from '@/lib/utils/sort-filter';
import type { Candidate, VoteStatus } from '@/lib/api/candidates';
import type { SortBy, SortOrder, Filter } from '@/lib/utils/sort-filter';

export interface CandidateListProps {
  /** Initial candidates data from server */
  initialCandidates: Candidate[];
  /** Initial vote status from server (null if not authenticated) */
  initialVoteStatus: VoteStatus | null;
  /** The game ID */
  gameId: string;
  /** The turn number */
  turnNumber: number;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
}

/**
 * CandidateList Component
 *
 * Client component that manages candidate list state, polling, and voting.
 */
export function CandidateList({
  initialCandidates,
  initialVoteStatus,
  gameId,
  turnNumber,
  isAuthenticated,
}: CandidateListProps) {
  // State
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [voteStatus, setVoteStatus] = useState<VoteStatus | null>(initialVoteStatus);
  const [sortBy, setSortBy] = useState<SortBy>('voteCount');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filter, setFilter] = useState<Filter>('all');
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get current voted candidate ID
  const currentVotedCandidateId = voteStatus?.candidateId || undefined;

  // Sort and filter candidates
  const displayedCandidates = useMemo(() => {
    const filtered = filterCandidates(candidates, filter, currentVotedCandidateId);
    return sortCandidates(filtered, sortBy, sortOrder);
  }, [candidates, filter, sortBy, sortOrder, currentVotedCandidateId]);

  // Polling function
  const pollCandidates = useCallback(async () => {
    if (isPolling) return; // Prevent concurrent polling

    setIsPolling(true);
    try {
      const updatedCandidates = await getCandidates(gameId, turnNumber);
      setCandidates(updatedCandidates);
      setError(null);

      // Also update vote status if authenticated
      if (isAuthenticated) {
        try {
          const updatedVoteStatus = await getVoteStatus(gameId, turnNumber);
          setVoteStatus(updatedVoteStatus);
        } catch (voteError) {
          // Vote status fetch failure should not block polling
          console.error('[CandidateList] Failed to fetch vote status during polling:', voteError);
        }
      }
    } catch (err) {
      console.error('[CandidateList] Failed to fetch candidates:', err);
      setError('候補の取得に失敗しました');
    } finally {
      setIsPolling(false);
    }
  }, [gameId, turnNumber, isAuthenticated, isPolling]);

  // Set up polling interval (30 seconds)
  useEffect(() => {
    // Only poll when page is visible
    if (typeof document === 'undefined') return;

    let intervalId: NodeJS.Timeout | null = null;

    const startPolling = () => {
      intervalId = setInterval(() => {
        if (document.visibilityState === 'visible') {
          pollCandidates();
        }
      }, 30000); // 30 seconds
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    // Start polling
    startPolling();

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startPolling();
        // Poll immediately when page becomes visible
        pollCandidates();
      } else {
        stopPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pollCandidates]);

  // Handle vote success (refresh data)
  const handleVoteSuccess = useCallback(() => {
    pollCandidates();
  }, [pollCandidates]);

  // Handle sort change
  const handleSortChange = useCallback((newSortBy: SortBy, newSortOrder: SortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  }, []);

  // Handle filter change
  const handleFilterChange = useCallback((newFilter: Filter) => {
    setFilter(newFilter);
  }, []);

  return (
    <div className="space-y-4" data-testid="candidate-list" aria-label="次の一手候補一覧">
      {/* Error message */}
      {error && (
        <div
          className="bg-red-50 border border-red-200 rounded-lg p-4"
          role="alert"
          aria-live="polite"
          data-testid="error-message"
        >
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Sort and filter controls */}
      <CandidateSortFilter
        sortBy={sortBy}
        sortOrder={sortOrder}
        filter={filter}
        onSortChange={handleSortChange}
        onFilterChange={handleFilterChange}
      />

      {/* Candidates grid */}
      {displayedCandidates.length === 0 ? (
        <div
          className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center"
          role="status"
          data-testid="empty-message"
        >
          <p className="text-gray-500">まだ候補がありません</p>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          data-testid="candidates-grid"
          role="list"
        >
          {displayedCandidates.map((candidate: Candidate) => (
            <div key={candidate.id} role="listitem">
              <CandidateCard
                candidate={candidate}
                gameId={gameId}
                turnNumber={turnNumber}
                isAuthenticated={isAuthenticated}
                currentVotedCandidateId={currentVotedCandidateId}
                onVoteSuccess={handleVoteSuccess}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
