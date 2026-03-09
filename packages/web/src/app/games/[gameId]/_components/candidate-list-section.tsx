/**
 * Candidate List Section - Server Component
 *
 * Fetches initial candidate data and vote status server-side,
 * then passes to the CandidateList client component.
 *
 * Requirements: 1.2, 5.5, 8.1, 8.5, 11.2
 */

import { getCandidates, getVoteStatus } from '@/lib/api/candidates';
import type { Candidate, VoteStatus } from '@/lib/api/candidates';
import { CandidateList } from '@/app/games/[gameId]/_components/candidate-list';
import Link from 'next/link';

interface CandidateListSectionProps {
  gameId: string;
  turnNumber: number;
  isAuthenticated: boolean;
}

/**
 * Server Component that fetches initial data and renders the candidate list
 *
 * @param props - Component props
 * @param props.gameId - The game ID
 * @param props.turnNumber - The current turn number
 * @param props.isAuthenticated - Whether the user is authenticated
 */
export async function CandidateListSection({
  gameId,
  turnNumber,
  isAuthenticated,
}: CandidateListSectionProps) {
  let candidates: Candidate[] = [];
  let voteStatus: VoteStatus | null = null;
  let error: string | null = null;

  try {
    // Fetch candidates (always available)
    candidates = await getCandidates(gameId, turnNumber);

    // Fetch vote status only if authenticated
    if (isAuthenticated) {
      try {
        voteStatus = await getVoteStatus(gameId, turnNumber);
      } catch (voteError) {
        // Vote status fetch failure should not block the page
        // User might not have voted yet, or there might be a temporary error
        console.warn('[CandidateListSection] Failed to fetch vote status:', voteError);
        voteStatus = null;
      }
    }
  } catch (err) {
    console.error('[CandidateListSection] Failed to fetch candidates:', err);

    // Handle specific error cases
    if (err instanceof Error) {
      if (err.message.includes('404') || err.message.includes('見つかりません')) {
        error = '対局が見つかりません';
      } else if (err.message.includes('network') || err.message.includes('ネットワーク')) {
        error = 'ネットワークエラーが発生しました';
      } else {
        error = '候補の取得に失敗しました';
      }
    } else {
      error = '候補の取得に失敗しました';
    }
  }

  // Error state
  if (error) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">次の一手候補</h2>
          {isAuthenticated && (
            <Link
              href={`/games/${gameId}/candidates/new`}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              data-testid="post-candidate-button"
            >
              候補を投稿
            </Link>
          )}
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </section>
    );
  }

  // Empty state
  if (candidates.length === 0) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">次の一手候補</h2>
          {isAuthenticated && (
            <Link
              href={`/games/${gameId}/candidates/new`}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              data-testid="post-candidate-button"
            >
              候補を投稿
            </Link>
          )}
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600 mb-2">まだ候補がありません</p>
          <p className="text-sm text-gray-500">最初の候補を投稿しましょう！</p>
        </div>
      </section>
    );
  }

  // Success state - render CandidateList component
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">次の一手候補</h2>
        {isAuthenticated && (
          <Link
            href={`/games/${gameId}/candidates/new`}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            data-testid="post-candidate-button"
          >
            候補を投稿
          </Link>
        )}
      </div>
      <CandidateList
        initialCandidates={candidates}
        initialVoteStatus={voteStatus}
        gameId={gameId}
        turnNumber={turnNumber}
        isAuthenticated={isAuthenticated}
      />
    </section>
  );
}
