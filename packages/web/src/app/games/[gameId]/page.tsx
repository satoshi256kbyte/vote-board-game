/**
 * Game Detail Screen
 *
 * Displays game board, move history, candidates, and game information.
 * Server Component that fetches game data.
 *
 * Requirements: Task 10, Task 19 (OGP metadata)
 */

import React from 'react';
import { notFound } from 'next/navigation';
import { fetchGame, fetchCandidates, ApiError } from '@/lib/api/client';
import { Board } from '@/components/board';
import { MoveHistory } from '@/components/move-history';
import { CandidateCard } from '@/components/candidate-card';
import { ShareButton } from '@/components/share-button';
import Link from 'next/link';
import type { Metadata } from 'next';

interface GameDetailPageProps {
  params: Promise<{
    gameId: string;
  }>;
}

/**
 * Generate metadata for OGP
 */
export async function generateMetadata({ params }: GameDetailPageProps): Promise<Metadata> {
  const { gameId } = await params;

  try {
    const game = await fetchGame(gameId);

    // Calculate disc counts
    const blackCount = game.boardState.board.flat().filter((cell) => cell === 1).length;
    const whiteCount = game.boardState.board.flat().filter((cell) => cell === 2).length;

    const title = `オセロ対局 #${gameId.slice(0, 8)} - ターン${game.currentTurn}`;
    const description = `${game.status === 'ACTIVE' ? '進行中' : '終了'}の対局。黒: ${blackCount}, 白: ${whiteCount}`;

    // Generate OGP image URL with query parameters
    const ogImageUrl = new URL(
      `/api/og/game/${gameId}`,
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    );
    ogImageUrl.searchParams.set('turn', game.currentTurn.toString());
    ogImageUrl.searchParams.set('black', blackCount.toString());
    ogImageUrl.searchParams.set('white', whiteCount.toString());
    ogImageUrl.searchParams.set('status', game.status);

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [
          {
            url: ogImageUrl.toString(),
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImageUrl.toString()],
      },
    };
  } catch {
    // Fallback metadata if game fetch fails
    return {
      title: '対局詳細 - 投票ボードゲーム',
      description: 'オセロの対局を見る',
    };
  }
}

export default async function GameDetailPage({ params }: GameDetailPageProps) {
  const { gameId } = await params;
  let game;
  let candidates;

  try {
    [game, candidates] = await Promise.all([fetchGame(gameId), fetchCandidates(gameId)]);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) {
      notFound();
    }
    throw error;
  }

  // Calculate disc counts
  const blackCount = game.boardState.board.flat().filter((cell) => cell === 1).length;
  const whiteCount = game.boardState.board.flat().filter((cell) => cell === 2).length;

  // Determine current player
  const currentPlayer = game.currentTurn % 2 === 0 ? 'BLACK' : 'WHITE';
  const currentPlayerLabel = currentPlayer === 'BLACK' ? '黒' : '白';

  // Mock moves for now (will be implemented in backend)
  const moves: Array<{
    turn: number;
    player: 'BLACK' | 'WHITE';
    position: string;
    timestamp: string;
  }> = [];

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">
              オセロ対局 #{game.gameId.slice(0, 8)}
            </h1>
            <ShareButton
              title={`オセロ対局 #${game.gameId.slice(0, 8)}`}
              text={`ターン${game.currentTurn}の対局をチェック！`}
            />
          </div>

          {/* Game Status */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>ターン: {game.currentTurn}</span>
            <span>•</span>
            <span>ステータス: {game.status === 'ACTIVE' ? '進行中' : '終了'}</span>
            {game.winner && (
              <>
                <span>•</span>
                <span>
                  勝者:{' '}
                  {game.winner === 'AI'
                    ? 'AI'
                    : game.winner === 'COLLECTIVE'
                      ? '集合知'
                      : '引き分け'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Board and Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Board Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">盤面</h2>

              <div className="flex justify-center mb-4">
                <Board boardState={game.boardState} />
              </div>

              {/* Disc Counts */}
              <div className="flex justify-center gap-8 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-black" />
                  <span className="text-lg font-semibold">{blackCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white border-2 border-gray-300" />
                  <span className="text-lg font-semibold">{whiteCount}</span>
                </div>
              </div>

              {/* Current Turn */}
              {game.status === 'ACTIVE' && (
                <div className="text-center">
                  <p className="text-gray-700">
                    現在のターン: <span className="font-bold">{currentPlayerLabel}</span>
                  </p>
                </div>
              )}
            </div>

            {/* AI Commentary Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">AI解説</h2>
              <p className="text-gray-600">
                この対局のAI解説は準備中です。今後のアップデートで追加される予定です。
              </p>
            </div>

            {/* Move History */}
            {moves.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">手の履歴</h2>
                <MoveHistory moves={moves} />
              </div>
            )}
          </div>

          {/* Right Column: Candidates */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">次の一手候補</h2>
                {game.status === 'ACTIVE' && (
                  <Link
                    href={`/games/${game.gameId}/candidates/new`}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    候補を投稿
                  </Link>
                )}
              </div>

              {candidates.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  まだ候補がありません。
                  <br />
                  最初の候補を投稿しましょう！
                </p>
              ) : (
                <div className="space-y-4">
                  {candidates.map((candidate) => (
                    <CandidateCard
                      key={candidate.candidateId}
                      candidate={candidate}
                      isVoted={false}
                      onVote={(candidateId) => {
                        // TODO: Implement vote functionality
                        console.log('Vote for:', candidateId);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
