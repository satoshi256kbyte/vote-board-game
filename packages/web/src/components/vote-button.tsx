'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { VoteStatusIndicator } from '@/components/vote-status-indicator';
import { VoteConfirmDialog } from '@/components/vote-confirm-dialog';
import { createVote, changeVote } from '@/lib/api/votes';
import { ApiError } from '@/lib/api/client';

export interface VoteButtonProps {
  candidateId: string;
  gameId: string;
  turnNumber: number;
  isVoted: boolean;
  hasVotedOther: boolean;
  isAuthenticated: boolean;
  onVoteSuccess: () => void;
  voteCount: number;
  currentCandidatePosition?: string;
  newCandidatePosition?: string;
}

export function VoteButton({
  candidateId,
  gameId,
  turnNumber,
  isVoted,
  hasVotedOther,
  isAuthenticated,
  onVoteSuccess,
  voteCount,
  currentCandidatePosition = '',
  newCandidatePosition = '',
}: VoteButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // 投票済みの場合は VoteStatusIndicator を表示
  if (isVoted) {
    return <VoteStatusIndicator voteCount={voteCount} isVoted={true} />;
  }

  // 未認証の場合は無効化されたボタンとツールチップを表示
  if (!isAuthenticated) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-block">
              <Button
                disabled
                className="min-h-[44px] w-full sm:w-auto"
                data-testid="vote-button"
                aria-label="ログインして投票"
              >
                投票する
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent role="tooltip">
            <p>ログインして投票</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // 投票処理
  const handleVote = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await createVote(gameId, turnNumber, candidateId);
      onVoteSuccess();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('投票に失敗しました。もう一度お試しください。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 投票変更処理
  const handleVoteChange = () => {
    setIsDialogOpen(true);
  };

  const handleConfirmVoteChange = async () => {
    setIsDialogOpen(false);
    setIsLoading(true);
    setError(null);

    try {
      await changeVote(gameId, turnNumber, candidateId);
      onVoteSuccess();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('投票の変更に失敗しました。もう一度お試しください。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelVoteChange = () => {
    setIsDialogOpen(false);
  };

  // 他候補に投票済みの場合は「投票を変更」ボタンを表示
  if (hasVotedOther) {
    return (
      <>
        <div className="space-y-2">
          <Button
            variant="outline"
            onClick={handleVoteChange}
            disabled={isLoading}
            className="min-h-[44px] w-full sm:w-auto"
            data-testid="vote-change-button"
            aria-label="投票を変更"
          >
            {isLoading ? '変更中...' : '投票を変更'}
          </Button>
          {error && (
            <p className="text-sm text-red-600" role="alert" data-testid="error-message">
              {error}
            </p>
          )}
        </div>

        <VoteConfirmDialog
          isOpen={isDialogOpen}
          onConfirm={handleConfirmVoteChange}
          onCancel={handleCancelVoteChange}
          currentCandidatePosition={currentCandidatePosition}
          newCandidatePosition={newCandidatePosition}
        />
      </>
    );
  }

  // 未投票の場合は「投票する」ボタンを表示
  return (
    <div className="space-y-2">
      <Button
        onClick={handleVote}
        disabled={isLoading}
        className="min-h-[44px] w-full sm:w-auto"
        data-testid="vote-button"
        aria-label="投票する"
      >
        {isLoading ? '投票中...' : '投票する'}
      </Button>
      {error && (
        <p className="text-sm text-red-600" role="alert" data-testid="error-message">
          {error}
        </p>
      )}
    </div>
  );
}
