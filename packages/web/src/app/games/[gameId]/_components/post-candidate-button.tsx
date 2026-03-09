'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface PostCandidateButtonProps {
  gameId: string;
  isAuthenticated: boolean;
}

export function PostCandidateButton({ gameId, isAuthenticated }: PostCandidateButtonProps) {
  if (!isAuthenticated) {
    return (
      <div className="relative inline-block group">
        <Button
          disabled
          variant="default"
          className="cursor-not-allowed"
          data-testid="post-candidate-button-disabled"
        >
          候補を投稿
        </Button>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
          ログインして投稿
        </div>
      </div>
    );
  }

  return (
    <Button asChild variant="default" data-testid="post-candidate-button">
      <Link href={`/games/${gameId}/candidates/new`}>候補を投稿</Link>
    </Button>
  );
}
