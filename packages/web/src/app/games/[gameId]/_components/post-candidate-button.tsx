'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface PostCandidateButtonProps {
  gameId: string;
  isAuthenticated: boolean;
}

export function PostCandidateButton({ gameId, isAuthenticated }: PostCandidateButtonProps) {
  if (!isAuthenticated) {
    const tooltipId = `tooltip-${gameId}`;
    return (
      <div className="relative inline-block group">
        <Button
          disabled
          variant="default"
          className="cursor-not-allowed bg-gray-200 text-gray-500 min-h-[44px] px-4 py-2"
          data-testid="post-candidate-button-disabled"
          aria-disabled="true"
          aria-describedby={tooltipId}
          role="button"
          tabIndex={-1}
        >
          候補を投稿
        </Button>
        <div
          id={tooltipId}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap text-gray-700"
        >
          ログインして投稿
        </div>
      </div>
    );
  }

  return (
    <Button
      asChild
      variant="default"
      className="bg-primary text-white min-h-[44px] px-4 py-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      data-testid="post-candidate-button"
    >
      <Link href={`/games/${gameId}/candidates/new`} aria-label="候補を投稿">
        候補を投稿
      </Link>
    </Button>
  );
}
