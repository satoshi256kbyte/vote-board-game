/**
 * Candidate Submission Page
 *
 * Server Component for the candidate submission page.
 * Fetches game data and renders the CandidateForm component.
 *
 * Requirements: 1.1-1.4, 2.1-2.3, 4.1, 4.2
 */

import { notFound } from 'next/navigation';
import { CandidateForm } from '@/components/candidate-form';
import type { BoardState } from '@/types/game';

interface PageProps {
  params: {
    gameId: string;
  };
  searchParams: {
    turnNumber?: string;
  };
}

/**
 * Fetch game data from API
 */
async function fetchGame(gameId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const url = `${baseUrl}/api/games/${gameId}`;

  try {
    const response = await fetch(url, {
      cache: 'no-store',
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error('Failed to fetch game');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching game:', error);
    return null;
  }
}

/**
 * Candidate Submission Page
 *
 * Allows authenticated users to submit move candidates for a game.
 */
export default async function CandidateSubmissionPage({ params, searchParams }: PageProps) {
  const gameId = params.gameId;
  const turnNumber = searchParams.turnNumber ? parseInt(searchParams.turnNumber, 10) : undefined;

  // Fetch game data
  const game = await fetchGame(gameId);

  if (!game) {
    notFound();
  }

  // Determine current turn number
  const currentTurnNumber = turnNumber ?? game.currentTurn;

  // Board state is returned as a parsed object from the API
  const currentBoardState: BoardState = game.boardState as BoardState;

  // Determine current player (opposite of AI side)
  const currentPlayer: 'black' | 'white' = game.aiSide === 'BLACK' ? 'white' : 'black';

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">候補を投稿</h1>
      <CandidateForm
        gameId={gameId}
        turnNumber={currentTurnNumber}
        currentBoardState={currentBoardState}
        currentPlayer={currentPlayer}
      />
    </div>
  );
}
