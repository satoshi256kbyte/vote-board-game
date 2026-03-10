import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface VoteStatusIndicatorProps {
  voteCount: number;
  isVoted: boolean;
  className?: string;
}

export function VoteStatusIndicator({ voteCount, isVoted, className }: VoteStatusIndicatorProps) {
  if (!isVoted) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm font-medium text-green-700',
        className
      )}
      data-testid="vote-status-indicator"
      role="status"
      aria-label={`投票済み、投票数: ${voteCount}`}
    >
      <Check className="h-4 w-4" aria-hidden="true" />
      <span>投票済み</span>
      <span className="ml-1 text-green-600">({voteCount}票)</span>
    </div>
  );
}
