import { Check } from 'lucide-react';

interface VoteStatusIndicatorProps {
  className?: string;
}

export function VoteStatusIndicator({ className = '' }: VoteStatusIndicatorProps) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1.5 text-sm font-medium text-green-800 ${className}`}
      role="status"
      aria-label="投票済み"
    >
      <Check className="h-4 w-4" aria-hidden="true" />
      <span>投票済み</span>
    </div>
  );
}
