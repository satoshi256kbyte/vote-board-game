/**
 * Game Create Screen
 *
 * Form for creating a new game with validation.
 * MVP: Only OTHELLO game type and AI_VS_COLLECTIVE mode are supported.
 *
 * Requirements: Task 9
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createGame, ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/hooks/use-auth';
import type { PlayerColor } from '@/types/game';

export default function NewGamePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [aiSide, setAiSide] = useState<PlayerColor>('BLACK');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/games/new');
    }
  }, [authLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const game = await createGame({
        gameType: 'OTHELLO',
        aiSide,
      });

      // Redirect to game detail page
      router.push(`/games/${game.gameId}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('対局の作成に失敗しました');
      }
      setIsSubmitting(false);
    }
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse mb-8" />
          <div className="bg-white rounded-lg shadow p-6">
            <div className="space-y-6">
              <div className="h-6 bg-gray-200 rounded w-32 animate-pulse" />
              <div className="h-10 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Don't render form if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">新しい対局を作成</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
          {/* Game Type Selection */}
          <div className="mb-6">
            <label htmlFor="gameType" className="block text-sm font-medium text-gray-700 mb-2">
              ゲームの種類
            </label>
            <select
              id="gameType"
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
              disabled
              value="OTHELLO"
            >
              <option value="OTHELLO">オセロ</option>
              <option value="CHESS" disabled>
                チェス（未対応）
              </option>
              <option value="GO" disabled>
                囲碁（未対応）
              </option>
              <option value="SHOGI" disabled>
                将棋（未対応）
              </option>
            </select>
            <p className="mt-1 text-sm text-gray-500">MVPではオセロのみ対応しています</p>
          </div>

          {/* Game Mode Selection */}
          <div className="mb-6">
            <label htmlFor="gameMode" className="block text-sm font-medium text-gray-700 mb-2">
              対局モード
            </label>
            <select
              id="gameMode"
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
              disabled
              value="AI_VS_COLLECTIVE"
            >
              <option value="AI_VS_COLLECTIVE">AI vs 集合知</option>
              <option value="COLLECTIVE_VS_COLLECTIVE" disabled>
                集合知 vs 集合知（未対応）
              </option>
            </select>
            <p className="mt-1 text-sm text-gray-500">MVPではAI vs 集合知のみ対応しています</p>
          </div>

          {/* First Player Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AIが担当する色（先手/後手）
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="aiSide"
                  value="BLACK"
                  checked={aiSide === 'BLACK'}
                  onChange={(e) => setAiSide(e.target.value as PlayerColor)}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">黒（先手）- AIが先に打つ</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="aiSide"
                  value="WHITE"
                  checked={aiSide === 'WHITE'}
                  onChange={(e) => setAiSide(e.target.value as PlayerColor)}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">白（後手）- 集合知が先に打つ</span>
              </label>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={isSubmitting}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed min-w-[120px]"
            >
              {isSubmitting ? '作成中...' : '対局を作成'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
