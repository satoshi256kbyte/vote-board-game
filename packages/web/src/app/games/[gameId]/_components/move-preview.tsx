/**
 * MovePreview Component
 *
 * Displays a preview of the board after applying the selected move.
 * Shows which discs will be flipped and the resulting board state.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

'use client';

import React, { useMemo } from 'react';
import { BoardPreview } from './board-preview';
import { CellState } from '@vote-board-game/api/lib/othello/types';
import { validateMove } from '@vote-board-game/api/lib/othello/validation';
import { executeMove } from '@vote-board-game/api/lib/othello/moves';

interface MovePreviewProps {
  /** 現在の盤面状態（8x8配列: "0"=空, "1"=黒, "2"=白） */
  boardState: string[][];
  /** 選択された位置 */
  selectedPosition: { row: number; col: number };
  /** 現在のプレイヤー */
  currentPlayer: 'black' | 'white';
}

/**
 * 文字列配列の盤面を数値配列に変換
 *
 * @param boardState - 文字列配列の盤面（"0", "1", "2"）
 * @returns 数値配列の盤面（0, 1, 2）
 */
function convertBoardState(boardState: string[][]): readonly (readonly CellState[])[] {
  return boardState.map((row) => row.map((cell) => parseInt(cell, 10) as CellState));
}

/**
 * 数値配列の盤面を文字列配列に変換
 *
 * @param board - 数値配列の盤面（0, 1, 2）
 * @returns 文字列配列の盤面（"0", "1", "2"）
 */
function convertToStringBoard(board: readonly (readonly CellState[])[]): string[][] {
  return board.map((row) => row.map((cell) => cell.toString()));
}

/**
 * プレイヤー文字列をCellStateに変換
 *
 * @param player - プレイヤー文字列（"black" | "white"）
 * @returns CellState（Black | White）
 */
function playerToCellState(player: 'black' | 'white'): CellState.Black | CellState.White {
  return player === 'black' ? CellState.Black : CellState.White;
}

/**
 * 列インデックスをラベルに変換（0 -> "A", 1 -> "B", ...）
 */
function colToLabel(col: number): string {
  return String.fromCharCode(65 + col); // 65 is 'A'
}

/**
 * 行インデックスをラベルに変換（0 -> "1", 1 -> "2", ...）
 */
function rowToLabel(row: number): string {
  return (row + 1).toString();
}

/**
 * 位置を文字列に変換（例: row=2, col=3 -> "D3"）
 */
function positionToString(position: { row: number; col: number }): string {
  return `${colToLabel(position.col)}${rowToLabel(position.row)}`;
}

/**
 * MovePreview Component
 *
 * 選択した手を適用した盤面のプレビューを表示します。
 * 裏返される石を視覚的に示し、選択されたセルをハイライト表示します。
 */
export function MovePreview({ boardState, selectedPosition, currentPlayer }: MovePreviewProps) {
  // 盤面を数値配列に変換
  const numericBoard = useMemo(() => convertBoardState(boardState), [boardState]);

  // プレイヤーをCellStateに変換
  const player = useMemo(() => playerToCellState(currentPlayer), [currentPlayer]);

  // 手を検証して裏返される石を取得
  const validationResult = useMemo(() => {
    return validateMove(numericBoard, selectedPosition, player);
  }, [numericBoard, selectedPosition, player]);

  // 手を適用した盤面を計算
  const previewBoard = useMemo(() => {
    if (!validationResult.valid || !validationResult.flippedPositions) {
      // 無効な手の場合は元の盤面を返す
      return boardState;
    }

    // 手を適用
    const newBoard = executeMove(
      numericBoard,
      selectedPosition,
      player,
      validationResult.flippedPositions
    );

    // 文字列配列に変換
    return convertToStringBoard(newBoard);
  }, [numericBoard, selectedPosition, player, validationResult, boardState]);

  // 裏返される石の数
  const flippedCount = validationResult.flippedPositions?.length ?? 0;

  // 選択位置を文字列に変換（例: "D3"）
  const highlightPosition = useMemo(() => positionToString(selectedPosition), [selectedPosition]);

  return (
    <div className="flex flex-col gap-4">
      {/* プレビュー説明 */}
      <div className="text-sm text-gray-700">
        <p className="font-medium mb-1">手のプレビュー</p>
        <p className="text-gray-600">
          {highlightPosition}に{currentPlayer === 'black' ? '黒石' : '白石'}を置いた場合
        </p>
        {flippedCount > 0 && <p className="text-gray-600 mt-1">{flippedCount}個の石が裏返ります</p>}
      </div>

      {/* 盤面プレビュー */}
      <BoardPreview boardState={previewBoard} highlightPosition={highlightPosition} cellSize={30} />
    </div>
  );
}
