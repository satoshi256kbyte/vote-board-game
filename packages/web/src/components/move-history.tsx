/**
 * Move History Component
 *
 * Displays a scrollable list of moves in chronological order (newest first).
 * Supports clicking on moves to view board state at that turn.
 *
 * Requirements: 6.1-6.10
 */

'use client';

import React from 'react';
import type { Move } from '@/types/game';

interface MoveHistoryProps {
  /** 手の履歴配列 */
  moves: Move[];
  /** 手がクリックされた時のハンドラー（オプション） */
  onMoveClick?: (turn: number) => void;
  /** 現在選択されているターン番号（オプション） */
  selectedTurn?: number;
}

/**
 * プレイヤーの色を日本語に変換
 */
const getPlayerColorLabel = (player: 'BLACK' | 'WHITE'): string => {
  return player === 'BLACK' ? '黒' : '白';
};

/**
 * Move History Component
 */
export function MoveHistory({ moves, onMoveClick, selectedTurn }: MoveHistoryProps) {
  // 新しい順にソート（降順）
  const sortedMoves = [...moves].sort((a, b) => b.turn - a.turn);

  const handleMoveClick = (turn: number) => {
    if (onMoveClick) {
      onMoveClick(turn);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, turn: number) => {
    if (onMoveClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onMoveClick(turn);
    }
  };

  if (moves.length === 0) {
    return <div className="text-center text-gray-500 py-4">まだ手が打たれていません</div>;
  }

  return (
    <div
      className="max-h-96 overflow-y-auto border border-gray-300 rounded-md"
      role="list"
      aria-label="手の履歴"
    >
      {sortedMoves.map((move) => {
        const isSelected = selectedTurn === move.turn;
        const isInteractive = !!onMoveClick;

        return (
          <div
            key={move.turn}
            role="listitem"
            tabIndex={isInteractive ? 0 : undefined}
            onClick={() => handleMoveClick(move.turn)}
            onKeyDown={(e) => handleKeyDown(e, move.turn)}
            className={`
              px-4 py-3 border-b border-gray-200 last:border-b-0
              flex items-center justify-between
              ${isInteractive ? 'cursor-pointer hover:bg-gray-50' : ''}
              ${isSelected ? 'bg-blue-100 hover:bg-blue-100' : ''}
              transition-colors
            `}
            aria-label={`ターン${move.turn}: ${getPlayerColorLabel(move.player)}が${move.position}に打った手`}
            aria-current={isSelected ? 'true' : undefined}
          >
            <div className="flex items-center gap-3">
              {/* ターン番号 */}
              <div className="text-sm font-semibold text-gray-700 min-w-[3rem]">
                {move.turn}手目
              </div>

              {/* プレイヤーの色 */}
              <div className="flex items-center gap-2">
                <div
                  className={`
                    w-6 h-6 rounded-full
                    ${move.player === 'BLACK' ? 'bg-black' : 'bg-white border-2 border-gray-300'}
                  `}
                  aria-hidden="true"
                />
                <span className="text-sm text-gray-600">{getPlayerColorLabel(move.player)}</span>
              </div>

              {/* 手の位置 */}
              <div className="text-base font-bold text-gray-900">{move.position}</div>
            </div>

            {/* 選択インジケーター */}
            {isSelected && <div className="text-blue-600 text-sm font-medium">選択中</div>}
          </div>
        );
      })}
    </div>
  );
}
