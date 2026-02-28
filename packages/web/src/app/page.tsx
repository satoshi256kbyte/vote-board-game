/**
 * Game List Screen (Top Page)
 *
 * Displays all games with filtering by status (進行中/終了).
 * Uses Client Component for dynamic routing with static export.
 *
 * Requirements: 1.1-1.12
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchGames, ApiError } from '@/lib/api/client';
import { GameList } from '@/components/game-list';
import type { GameStatus, GameSummary } from '@/types/game';

export default function Home() {
  const searchParams = useSearchParams();
  const status = (searchParams.get('status') as GameStatus) || 'ACTIVE';
  const cursor = searchParams.get('cursor') || undefined;

  const [games, setGames] = useState<GameSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadGames = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchGames({
          status,
          limit: 20,
          cursor,
        });

        setGames(result.games);
        setNextCursor(result.nextCursor);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('ネットワークエラーが発生しました');
        }
      } finally {
        setLoading(false);
      }
    };

    loadGames();
  }, [status, cursor]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="h-9 bg-gray-200 rounded w-64 animate-pulse" />
            <div className="mt-2 h-6 bg-gray-200 rounded w-96 animate-pulse" />
          </div>
          <div className="mb-6 border-b border-gray-200">
            <div className="flex space-x-8">
              <div className="h-10 w-20 bg-gray-200 rounded animate-pulse" />
              <div className="h-10 w-20 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">投票対局</h1>
          </div>
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">投票対局</h1>
          <p className="mt-2 text-gray-600">AI vs 集合知で次の一手を決める投票型ボードゲーム</p>
        </div>

        <GameList initialGames={games} initialStatus={status} initialNextCursor={nextCursor} />
      </div>
    </main>
  );
}
