'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * VoteButton component props
 *
 * Handles voting and vote change actions for move candidates
 */
export interface VoteButtonProps {
  /** The candidate ID to vote for */
  candidateId: string;
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
 * VoteButton Component
 *
 * Displays voting button with different states:
 * - "投票する" when user hasn't voted
 * - "投票を変更" when user has voted for another candidate
 * - Disabled with tooltip when unauthenticated
 * - Loading indicator during submission
 * - Confirmation dialog for vote changes
 *
 * Requirements: 4.1, 4.2, 4.3, 4.8, 4.9, 6.1, 6.2, 6.3, 10.2, 10.3
 */
export function VoteButton({
  candidateId,
  gameId,
  turnNumber,
  isAuthenticated,
  currentVotedCandidateId,
  onVoteSuccess,
}: VoteButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine if user has voted for this candidate
  const isVotedForThis = currentVotedCandidateId === candidateId;

  // Determine if user has voted for another candidate
  const hasVotedOther = currentVotedCandidateId && currentVotedCandidateId !== candidateId;

  // Don't show button if user has already voted for this candidate
  if (isVotedForThis) {
    return null;
  }

  /**
   * Handle vote button click
   * Shows confirmation dialog if changing vote, otherwise votes directly
   */
  const handleClick = () => {
    if (hasVotedOther) {
      setShowConfirmDialog(true);
    } else {
      handleVote();
    }
  };

  /**
   * Handle vote submission
   * Calls the appropriate API based on whether it's a new vote or vote change
   */
  const handleVote = async () => {
    setIsLoading(true);
    setShowConfirmDialog(false);
    setError(null);

    try {
      // Import API functions dynamically to avoid circular dependencies
      const { createVote, changeVote } = await import('@/lib/api/candidates');

      if (hasVotedOther) {
        await changeVote(gameId, turnNumber, candidateId);
      } else {
        await createVote(gameId, turnNumber, candidateId);
      }

      // Notify parent component of successful vote
      onVoteSuccess();
    } catch (err) {
      console.error('[VoteButton] Vote failed:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(hasVotedOther ? '投票の変更に失敗しました' : '投票に失敗しました');
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle confirmation dialog cancel
   */
  const handleCancel = () => {
    setShowConfirmDialog(false);
  };

  /**
   * Handle ESC key press to close dialog
   */
  useEffect(() => {
    if (!showConfirmDialog) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowConfirmDialog(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showConfirmDialog]);

  return (
    <>
      {/* Vote Button */}
      <div className="relative group">
        <Button
          onClick={handleClick}
          disabled={!isAuthenticated || isLoading}
          className="w-full min-h-[44px]"
          variant={hasVotedOther ? 'outline' : 'default'}
          aria-label={hasVotedOther ? '投票を変更' : '投票する'}
          data-testid={hasVotedOther ? 'vote-change-button' : 'vote-button'}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              <span>{hasVotedOther ? '変更中...' : '投票中...'}</span>
            </>
          ) : hasVotedOther ? (
            '投票を変更'
          ) : (
            '投票する'
          )}
        </Button>

        {/* Tooltip for unauthenticated users */}
        {!isAuthenticated && (
          <div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10"
            role="tooltip"
            aria-label="ログインして投票"
          >
            ログインして投票
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 mt-1" role="alert" data-testid="error-message">
          {error}
        </p>
      )}

      {/* Confirmation Dialog for Vote Change */}
      {showConfirmDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          data-testid="vote-change-dialog"
        >
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h2 id="confirm-dialog-title" className="text-lg font-semibold mb-4">
              投票を変更しますか？
            </h2>
            <p className="text-gray-700 mb-6">現在の投票を取り消して、この候補に投票しますか？</p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
                data-testid="cancel-button"
              >
                キャンセル
              </Button>
              <Button onClick={handleVote} disabled={isLoading} data-testid="confirm-button">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>処理中...</span>
                  </>
                ) : (
                  '変更する'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
