/**
 * Game Detail Screen
 *
 * Displays game board, move history, candidates, and game information.
 * Client Component that fetches game data with error handling and retry logic.
 *
 * Requirements: Task 10, Task 19 (OGP metadata)
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchGame, fetchCandidates, ApiError } from '@/lib/api/client';
import { Board } from '@/components/board';
import { MoveHistory } from '@/components/move-history';
import { CandidateCard } from '@/components/candidate-card';
import { ShareButton } from '@/components/share-button';
import Link from 'next/link';
import type { Game, Candidate } from '@/types/game';

export default function GameDetailPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;

  const [game, setGame] = useState<Game | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    let retryTimeout: NodeJS.Timeout;

    const loadGameData = async () => {
      try {
        console.log('[GameDetailPage] Fetching game:', gameId, 'retry:', retryCount);
        console.log('[GameDetailPage] API URL:', process.env.NEXT_PUBLIC_API_URL);
        const gameData = await fetchGame(gameId);

        if (!mounted) return;

        console.log('[GameDetailPage] Game fetched successfully:', gameData.gameId);
        setGame(gameData);
        setError(null);

        // Fetch candidates
        try {
          const candidatesData = await fetchCandidates(gameId);
          if (mounted) {
            setCandidates(candidatesData);
          }
        } catch (err) {
          console.error('[GameDetailPage] Failed to fetch candidates:', err);
          // Candidates fetch failure should not block the page
          if (mounted) {
            setCandidates([]);
          }
        }

        if (mounted) {
          setLoading(false);
        }
      } catch (err) {
        console.error('[GameDetailPage] Failed to fetch game:', {
          gameId,
          error: err instanceof Error ? err.message : 'Unknown error',
          isApiError: err instanceof ApiError,
          statusCode: err instanceof ApiError ? err.statusCode : undefined,
          retryCount,
        });

        if (!mounted) return;

        if (err instanceof ApiError && err.statusCode === 404) {
          console.log('[GameDetailPage] Game not found (404)');
          router.push('/404');
          return;
        }

        // Retry logic for eventual consistency issues
        if (retryCount < 5) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff
          console.log(`[GameDetailPage] Retrying in ${delay}ms...`);
          retryTimeout = setTimeout(() => {
            if (mounted) {
              setRetryCount((prev) => prev + 1);
            }
          }, delay);
        } else {
          setError(
            err instanceof ApiError ? err.message : '対局の読み込み中にエラーが発生しました。'
          );
          setLoading(false);
        }
      }
    };

    loadGameData();

    return () => {
      mounted = false;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [gameId, router, retryCount]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-8" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
                  <div className="aspect-square bg-gray-200 rounded" />
                </div>
              </div>
              <div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="h-6 bg-gray-200 rounded w-40 mb-4" />
                  <div className="space-y-4">
                    <div className="h-24 bg-gray-200 rounded" />
                    <div className="h-24 bg-gray-200 rounded" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !game) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">エラーが発生しました</h1>
          <p className="text-gray-600 mb-8">
            {error || '対局の読み込み中にエラーが発生しました。'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                setRetryCount(0);
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              再試行
            </button>
            <Link
              href="/"
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              対局一覧に戻る
            </Link>
          </div>
        </div>
      </main>
    );
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
                    data-testid="post-candidate-button"
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
