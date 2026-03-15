'use client';

import { useState } from 'react';
import type { Commentary } from '@/lib/api/commentary';

/**
 * CommentarySection Props
 *
 * Requirements: 4, 5, 6, 9
 */
export interface CommentarySectionProps {
  /** 解説データの配列（turnNumber 昇順） */
  commentaries: Commentary[];
  /** データ取得中かどうか */
  isLoading: boolean;
  /** エラーメッセージ（取得失敗時） */
  error: string | null;
  /** 対局のステータス */
  gameStatus: 'ACTIVE' | 'FINISHED';
  /** 現在のターン番号 */
  currentTurn: number;
}

/**
 * 日付をフォーマットする
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

/**
 * CommentarySection Component
 *
 * 対局の AI 解説を表示するセクション。
 * ターン選択 UI で過去のターンの解説も閲覧可能。
 *
 * Requirements: 4.1-4.8, 5.1-5.8, 6.1-6.6, 9.2-9.8
 */
export function CommentarySection({
  commentaries,
  isLoading,
  error,
  gameStatus: _gameStatus,
  currentTurn: _currentTurn,
}: CommentarySectionProps) {
  // Default to the latest turn (last element in the sorted array)
  const [selectedIndex, setSelectedIndex] = useState<number>(
    commentaries.length > 0 ? commentaries.length - 1 : 0
  );

  // Keep selectedIndex in bounds when commentaries change
  const safeIndex = commentaries.length > 0 ? Math.min(selectedIndex, commentaries.length - 1) : 0;

  const selectedCommentary = commentaries.length > 0 ? commentaries[safeIndex] : null;

  const isFirstTurn = safeIndex === 0;
  const isLastTurn = commentaries.length === 0 || safeIndex === commentaries.length - 1;
  const showTurnNavigation = commentaries.length >= 2;

  const handlePrevTurn = () => {
    if (!isFirstTurn) {
      setSelectedIndex(safeIndex - 1);
    }
  };

  const handleNextTurn = () => {
    if (!isLastTurn) {
      setSelectedIndex(safeIndex + 1);
    }
  };

  return (
    <section
      className="rounded-lg border border-blue-200 bg-blue-50 p-6"
      aria-labelledby="commentary-heading"
    >
      <h2 id="commentary-heading" className="mb-4 text-xl font-bold text-gray-900">
        AI解説
      </h2>

      {isLoading ? (
        <div className="animate-pulse space-y-3" data-testid="commentary-skeleton">
          <div className="h-4 w-3/4 rounded bg-blue-200" />
          <div className="h-4 w-full rounded bg-blue-200" />
          <div className="h-4 w-5/6 rounded bg-blue-200" />
          <div className="h-4 w-2/3 rounded bg-blue-200" />
        </div>
      ) : error ? (
        <p className="text-red-700" role="alert">
          解説の取得に失敗しました
        </p>
      ) : commentaries.length === 0 ? (
        <p className="text-gray-600">この対局の AI 解説はまだありません</p>
      ) : (
        <>
          {showTurnNavigation && (
            <nav className="mb-4 flex items-center justify-between" aria-label="ターン選択">
              <button
                type="button"
                onClick={handlePrevTurn}
                disabled={isFirstTurn}
                aria-disabled={isFirstTurn}
                className={`rounded px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  isFirstTurn
                    ? 'cursor-not-allowed bg-gray-200 text-gray-400'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                前のターン
              </button>
              <span className="text-sm font-medium text-gray-700">
                ターン {selectedCommentary?.turnNumber}
              </span>
              <button
                type="button"
                onClick={handleNextTurn}
                disabled={isLastTurn}
                aria-disabled={isLastTurn}
                className={`rounded px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  isLastTurn
                    ? 'cursor-not-allowed bg-gray-200 text-gray-400'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                次のターン
              </button>
            </nav>
          )}

          {selectedCommentary && (
            <article className="space-y-2">
              <p className="leading-relaxed text-gray-800">{selectedCommentary.content}</p>
              <p className="text-sm text-gray-500">{formatDate(selectedCommentary.createdAt)}</p>
            </article>
          )}
        </>
      )}
    </section>
  );
}
