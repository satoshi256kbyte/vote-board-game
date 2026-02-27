/**
 * Board Component
 *
 * Displays an 8x8 Othello board with discs.
 * Supports both display-only and interactive modes.
 *
 * Requirements: 5.1-5.13
 */

import React from 'react';
import type { BoardState } from '@/types/game';

interface BoardProps {
  /** 盤面の状態（8x8配列: 0=空, 1=黒, 2=白） */
  boardState: BoardState;
  /** セルのサイズ（px）。デフォルト: デスクトップ40px、モバイル30px */
  cellSize?: number;
  /** セルクリック時のハンドラー（インタラクティブモード用） */
  onCellClick?: (row: number, col: number) => void;
  /** ハイライトするセル（インタラクティブモード用） */
  highlightedCell?: { row: number; col: number };
}

/**
 * 列のラベル（A-H）
 */
const COLUMN_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

/**
 * 行のラベル（1-8）
 */
const ROW_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8'];

/**
 * セルの値を色名に変換
 */
const getCellColor = (value: number): string => {
  if (value === 1) return '黒';
  if (value === 2) return '白';
  return '空';
};

/**
 * Board Component
 */
export function Board({ boardState, cellSize, onCellClick, highlightedCell }: BoardProps) {
  // レスポンシブなセルサイズ（デフォルト: デスクトップ40px、モバイル30px）
  const defaultCellSize = typeof window !== 'undefined' && window.innerWidth < 768 ? 30 : 40;
  const size = cellSize ?? defaultCellSize;

  const isInteractive = !!onCellClick;

  const handleCellClick = (row: number, col: number) => {
    if (isInteractive && onCellClick) {
      onCellClick(row, col);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, row: number, col: number) => {
    if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onCellClick?.(row, col);
    }
  };

  return (
    <div className="inline-block" role="grid" aria-label="オセロの盤面">
      {/* 列ラベル（上部） */}
      <div className="flex" style={{ marginLeft: `${size}px` }}>
        {COLUMN_LABELS.map((label) => (
          <div
            key={label}
            className="flex items-center justify-center text-sm font-medium text-gray-700"
            style={{ width: `${size}px`, height: `${size * 0.6}px` }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* 盤面 */}
      <div className="flex">
        {/* 行ラベル（左側） */}
        <div className="flex flex-col">
          {ROW_LABELS.map((label) => (
            <div
              key={label}
              className="flex items-center justify-center text-sm font-medium text-gray-700"
              style={{ width: `${size * 0.6}px`, height: `${size}px` }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* グリッド */}
        <div
          className="border-2 border-black"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(8, ${size}px)`,
            gridTemplateRows: `repeat(8, ${size}px)`,
            backgroundColor: '#10b981', // green-500
          }}
        >
          {boardState.board.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const isHighlighted =
                highlightedCell?.row === rowIndex && highlightedCell?.col === colIndex;
              const cellColor = getCellColor(cell);
              const position = `${COLUMN_LABELS[colIndex]}${ROW_LABELS[rowIndex]}`;

              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  role="gridcell"
                  aria-label={`${position}: ${cellColor}`}
                  tabIndex={isInteractive ? 0 : undefined}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                  onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                  className={`
                    border border-black
                    flex items-center justify-center
                    ${isInteractive ? 'cursor-pointer hover:bg-green-600' : ''}
                    ${isHighlighted ? 'bg-yellow-300' : ''}
                  `}
                  style={{
                    width: `${size}px`,
                    height: `${size}px`,
                  }}
                >
                  {cell === 1 && (
                    <div
                      className="rounded-full bg-black"
                      style={{
                        width: `${size * 0.8}px`,
                        height: `${size * 0.8}px`,
                      }}
                      aria-hidden="true"
                    />
                  )}
                  {cell === 2 && (
                    <div
                      className="rounded-full bg-white border-2 border-gray-300"
                      style={{
                        width: `${size * 0.8}px`,
                        height: `${size * 0.8}px`,
                      }}
                      aria-hidden="true"
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
