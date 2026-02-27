/**
 * Candidate Post Screen
 *
 * Form for posting a new move candidate with interactive board.
 * Client Component with move validation.
 *
 * Requirements: Task 11
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchGame, createCandidate, ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/hooks/use-auth';
import { Board } from '@/components/board';
import type { Game } from '@/types/game';

interface CandidatePostPageProps {
  params: {
    gameId: string;
  };
}

const MAX_DESCRIPTION_LENGTH = 200;

export default function CandidatePostPage({ params }: CandidatePostPageProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=/games/${params.gameId}/candidates/new`);
    }
  }, [authLoading, isAuthenticated, router, params.gameId]);

  // Fetch game data
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;

    const loadGame = async () => {
      try {
        const gameData = await fetchGame(params.gameId);
        setGame(gameData);
      } catch (err) {
        if (err instanceof ApiError && err.statusCode === 404) {
          setError('対局が見つかりません');
        } else {
          setError('対局の読み込みに失敗しました');
        }
      } finally {
        setLoading(false);
      }
    };

    loadGame();
  }, [params.gameId, isAuthenticated, authLoading]);

  const handleCellClick = (row: number, col: number) => {
    // Basic validation: check if cell is empty
    if (game && game.boardState.board[row][col] === 0) {
      setSelectedCell({ row, col });
      setError(null);
    } else {
      setError('そのマスには既に石が置かれています');
    }
  };

  const convertPositionToNotation = (row: number, col: number): string => {
    const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const rows = ['1', '2', '3', '4', '5', '6', '7', '8'];
    return `${columns[col]}${rows[row]}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedCell) {
      setError('手を選択してください');
      return;
    }

    if (!description.trim()) {
      setError('説明を入力してください');
      return;
    }

    if (description.length > MAX_DESCRIPTION_LENGTH) {
      setError(`説明は${MAX_DESCRIPTION_LENGTH}文字以内で入力してください`);
      return;
    }

    setIsSubmitting(true);

    try {
      const position = convertPositionToNotation(selectedCell.row, selectedCell.col);
      await createCandidate(params.gameId, {
        position,
        description: description.trim(),
      });

      // Redirect to game detail page
      router.push(`/games/${params.gameId}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 400) {
          setError('不正な手です。オセロのルールに従った手を選択してください。');
        } else {
          setError(err.message);
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('候補の投稿に失敗しました');
      }
      setIsSubmitting(false);
    }
  };

  // Show loading state
  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="h-96 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="space-y-4">
                <div className="h-10 bg-gray-200 rounded animate-pulse" />
                <div className="h-32 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Show error if game not found
  if (!game) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <p className="text-red-600">{error || '対局が見つかりません'}</p>
          </div>
        </div>
      </main>
    );
  }

  const characterCount = description.length;
  const position = selectedCell
    ? convertPositionToNotation(selectedCell.row, selectedCell.col)
    : null;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">次の一手候補を投稿</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Board */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">盤面</h2>
              <p className="text-sm text-gray-600 mb-4">
                空いているマスをクリックして手を選択してください
              </p>

              <div className="flex justify-center">
                <Board
                  boardState={game.boardState}
                  onCellClick={handleCellClick}
                  highlightedCell={selectedCell || undefined}
                />
              </div>

              {selectedCell && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    選択した手: <span className="font-bold">{position}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Right Column: Form */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">候補の説明</h2>

              {/* Description Textarea */}
              <div className="mb-4">
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  説明（必須）
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={6}
                  maxLength={MAX_DESCRIPTION_LENGTH}
                  placeholder="この手の狙いや効果を説明してください（最大200文字）"
                  required
                />
                <div className="mt-1 flex justify-between text-sm">
                  <span className="text-gray-500">どういう手か、なぜそうするのか、効果など</span>
                  <span
                    className={`${characterCount > MAX_DESCRIPTION_LENGTH ? 'text-red-600' : 'text-gray-500'}`}
                  >
                    {characterCount}/{MAX_DESCRIPTION_LENGTH}
                  </span>
                </div>
              </div>

              {/* Preview Section */}
              {showPreview && selectedCell && description && (
                <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
                  <h3 className="text-sm font-bold text-gray-900 mb-2">プレビュー</h3>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="font-semibold">手:</span> {position}
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold">説明:</span> {description}
                    </p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  disabled={!selectedCell || !description || isSubmitting}
                  className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  {showPreview ? 'プレビューを閉じる' : 'プレビュー'}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={!selectedCell || !description || isSubmitting}
                  className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? '投稿中...' : '投稿'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
