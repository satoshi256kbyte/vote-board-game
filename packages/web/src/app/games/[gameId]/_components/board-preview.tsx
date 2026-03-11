/**
 * BoardPreview Component
 *
 * Displays a preview of the Othello board with a highlighted candidate move.
 * Reuses the existing Board component from spec 15.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 3.7, 3.8
 */

'use client';

import React, { useMemo } from 'react';
import { Board } from '@/components/board';
import type { BoardState } from '@/types/game';

interface BoardPreviewProps {
  /** 盤面の状態（8x8配列: 0=空, 1=黒, 2=白） */
  boardState?: string[][];
  /** ハイライトする手の位置（例: "D3"） */
  highlightPosition?: string;
  /** セルのサイズ（px）。デフォルト: モバイル30px、デスクトップ40px */
  cellSize?: number;
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
 * 位置文字列（例: "D3"）を行・列インデックスに変換
 *
 * @param position - 位置文字列（例: "D3"）
 * @returns 行・列インデックス、または無効な場合はundefined
 */
function parsePosition(position: string): { row: number; col: number } | undefined {
  if (!position || position.length < 2) {
    return undefined;
  }

  const col = position.charAt(0).toUpperCase();
  const row = position.substring(1);

  const colIndex = COLUMN_LABELS.indexOf(col);
  const rowIndex = ROW_LABELS.indexOf(row);

  if (colIndex === -1 || rowIndex === -1) {
    return undefined;
  }

  return { row: rowIndex, col: colIndex };
}

/**
 * 文字列配列の盤面を数値配列に変換
 *
 * @param boardState - 文字列配列の盤面（"0", "1", "2"）
 * @returns 数値配列の盤面（0, 1, 2）
 */
function convertBoardState(boardState: string[][] | undefined | null): number[][] {
  if (!boardState || boardState.length === 0) {
    return Array(8)
      .fill(null)
      .map(() => Array(8).fill(0));
  }
  return boardState.map((row) => row.map((cell) => parseInt(cell, 10)));
}

/**
 * 盤面の黒石と白石の数を計算
 *
 * @param board - 盤面の数値配列
 * @returns 黒石と白石の数
 */
function countStones(board: number[][]): { black: number; white: number } {
  let black = 0;
  let white = 0;

  for (const row of board) {
    for (const cell of row) {
      if (cell === 1) {
        black++;
      } else if (cell === 2) {
        white++;
      }
    }
  }

  return { black, white };
}

/**
 * BoardPreview Component
 *
 * 候補の手を適用した盤面のプレビューを表示します。
 * 既存のBoardコンポーネントを再利用し、候補の手の位置をハイライト表示します。
 */
export function BoardPreview({ boardState, highlightPosition, cellSize }: BoardPreviewProps) {
  // 文字列配列を数値配列に変換
  const numericBoard = useMemo(() => convertBoardState(boardState), [boardState]);

  // ハイライト位置を行・列インデックスに変換
  const highlightedCell = useMemo(() => {
    if (!highlightPosition) {
      return undefined;
    }
    return parsePosition(highlightPosition);
  }, [highlightPosition]);

  // 石の数を計算
  const stoneCounts = useMemo(() => countStones(numericBoard), [numericBoard]);

  // BoardStateオブジェクトを作成
  const boardStateObj: BoardState = useMemo(
    () => ({
      board: numericBoard,
    }),
    [numericBoard]
  );

  return (
    <div className="flex flex-col items-center gap-3">
      {/* 盤面 */}
      <Board
        boardState={boardStateObj}
        cellSize={cellSize}
        highlightedCell={highlightedCell}
        onCellClick={undefined} // プレビューモードなのでクリック不可
      />

      {/* 石の数 */}
      <div className="flex gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-black" aria-hidden="true" />
          <span className="font-medium">黒: {stoneCounts.black}</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded-full bg-white border-2 border-gray-300"
            aria-hidden="true"
          />
          <span className="font-medium">白: {stoneCounts.white}</span>
        </div>
      </div>
    </div>
  );
}
