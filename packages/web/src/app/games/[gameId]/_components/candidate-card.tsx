/**
 * CandidateCard Component
 *
 * Displays a single move candidate card with:
 * - Move position
 * - Board preview
 * - Description
 * - Poster username
 * - Vote count
 * - Voting deadline
 * - Status badge
 * - Vote button or status indicator
 * - Creation date
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 18.1, 18.2, 18.3, 18.4, 18.5, 20.1, 20.2, 20.3, 20.4
 */

'use client';

import { useMemo } from 'react';
import { BoardPreview } from './board-preview';
import { VoteButton } from './vote-button';
import { VoteStatusIndicator } from './vote-status-indicator';
import { calculateTimeRemaining } from '@/lib/utils/time-remaining';
import type { Candidate } from '@/lib/api/candidates';

export interface CandidateCardProps {
  /** The candidate data */
  candidate: Candidate;
  /** The game ID */
  gameId: string;
  /** The turn number */
  turnNumber: number;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** The candidate ID the user has currently voted for (if any) */
  currentVotedCandidateId?: string;
  /** Callback when vote is successfully submitted */
  onVoteSuccess: () => void;
}

/**
 * Format date to Japanese locale string
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * CandidateCard Component
 *
 * Displays a card for a single move candidate with all relevant information
 * and voting functionality.
 */
export function CandidateCard({
  candidate,
  gameId,
  turnNumber,
  isAuthenticated,
  currentVotedCandidateId,
  onVoteSuccess,
}: CandidateCardProps) {
  // Calculate time remaining until deadline
  const timeRemaining = useMemo(
    () => calculateTimeRemaining(candidate.deadline),
    [candidate.deadline]
  );

  // Check if user has voted for this candidate
  const isVotedForThis = currentVotedCandidateId === candidate.id;

  // Determine if voting is closed
  const isClosed = candidate.status === 'closed' || timeRemaining.isExpired;

  return (
    <article
      className="relative border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow bg-white focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      data-testid="candidate-card"
      role="article"
      aria-label={`候補 ${candidate.position}`}
    >
      {/* Status Badge */}
      <div className="absolute top-2 right-2" data-testid="status-badge">
        {isClosed ? (
          <span
            className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800"
            aria-label="締切済み"
          >
            締切済み
          </span>
        ) : (
          <span
            className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800"
            aria-label="投票受付中"
          >
            投票受付中
          </span>
        )}
      </div>

      {/* Move Position */}
      <h3 className="text-xl font-bold mb-3 pr-24 text-gray-900" data-testid="candidate-position">
        {candidate.position}
      </h3>

      {/* Board Preview */}
      <div className="mb-4">
        <BoardPreview
          boardState={candidate.boardState}
          highlightPosition={candidate.position}
          cellSize={30}
        />
      </div>

      {/* Description */}
      <p
        className="text-gray-700 mb-4 line-clamp-3"
        data-testid="candidate-description"
        id={`description-${candidate.id}`}
      >
        {candidate.description}
      </p>

      {/* Metadata */}
      <div className="space-y-2 text-sm mb-4">
        {/* Poster Username */}
        <div className="flex items-center gap-2 text-gray-600">
          <span className="font-medium">投稿者:</span>
          <span data-testid="candidate-poster">{candidate.postedByUsername}</span>
        </div>

        {/* Vote Count */}
        <div
          className="flex items-center gap-2 text-gray-600"
          aria-label={`投票数 ${candidate.voteCount}`}
        >
          <span className="font-medium">投票数:</span>
          <span className="font-semibold text-gray-900" data-testid="candidate-vote-count">
            {candidate.voteCount}
          </span>
        </div>

        {/* Voting Deadline */}
        <div className="flex items-center gap-2 text-gray-600">
          <span className="font-medium">締切:</span>
          <time
            className={timeRemaining.colorClass}
            data-testid="candidate-deadline"
            dateTime={candidate.deadline}
          >
            {timeRemaining.displayText}
          </time>
        </div>

        {/* Creation Date */}
        <div className="flex items-center gap-2 text-gray-600">
          <span className="font-medium">投稿日時:</span>
          <time data-testid="candidate-created-at" dateTime={candidate.createdAt}>
            {formatDate(candidate.createdAt)}
          </time>
        </div>
      </div>

      {/* Vote Button or Status Indicator */}
      <div className="mt-4">
        {isVotedForThis ? (
          <VoteStatusIndicator />
        ) : (
          <VoteButton
            candidateId={candidate.id}
            gameId={gameId}
            turnNumber={turnNumber}
            isAuthenticated={isAuthenticated && !isClosed}
            currentVotedCandidateId={currentVotedCandidateId}
            onVoteSuccess={onVoteSuccess}
          />
        )}
      </div>
    </article>
  );
}
