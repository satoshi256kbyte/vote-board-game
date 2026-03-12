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
import { BoardState, Position } from '@/lib/utils/legal-moves';

interface MovePreviewProps {
  /** 現在の盤面状態（8x8配列: "0"=空, "1"=黒, "2"=白） */
  boardState: string[][];
  /** 選択された位置 */
  selectedPosition: { row: number; col: number };
  /** 現在のプレイヤー */
  currentPlayer: 'black' | 'white';
}

/**
 * Direction vector for checking lines
 */
interface Direction {
  readonly rowDelta: number;
  readonly colDelta: number;
}

/**
 * The 8 possible directions from any cell
 */
const DIRECTIONS: readonly Direction[] = [
  { rowDelta: -1, colDelta: 0 }, // North
  { rowDelta: -1, colDelta: 1 }, // Northeast
  { rowDelta: 0, colDelta: 1 }, // East
  { rowDelta: 1, colDelta: 1 }, // Southeast
  { rowDelta: 1, colDelta: 0 }, // South
  { rowDelta: 1, colDelta: -1 }, // Southwest
  { rowDelta: 0, colDelta: -1 }, // West
  { rowDelta: -1, colDelta: -1 }, // Northwest
];

/**
 * 文字列配列の盤面をBoardState型に変換
 *
 * @param boardState - 文字列配列の盤面（"0", "1", "2"）
 * @returns BoardState型の盤面（'empty', 'black', 'white'）
 */
function convertBoardState(boardState: string[][]): BoardState {
  return boardState.map((row) =>
    row.map((cell) => {
      if (cell === '1') return 'black';
      if (cell === '2') return 'white';
      return 'empty';
    })
  );
}

/**
 * BoardState型の盤面を文字列配列に変換
 *
 * @param board - BoardState型の盤面（'empty', 'black', 'white'）
 * @returns 文字列配列の盤面（"0", "1", "2"）
 */
function convertToStringBoard(board: BoardState): string[][] {
  return board.map((row) =>
    row.map((cell) => {
      if (cell === 'black') return '1';
      if (cell === 'white') return '2';
      return '0';
    })
  );
}

/**
 * Checks a single direction for flippable discs
 *
 * @param boardState - The game board
 * @param position - The starting position (where the new disc would be placed)
 * @param direction - The direction to check
 * @param player - The player making the move
 * @returns An array of positions that would be flipped in this direction
 */
function checkDirection(
  boardState: BoardState,
  position: Position,
  direction: Direction,
  player: 'black' | 'white'
): Position[] {
  const opponent = player === 'black' ? 'white' : 'black';
  const flippedPositions: Position[] = [];

  // Start from the next position in the direction
  let currentRow = position.row + direction.rowDelta;
  let currentCol = position.col + direction.colDelta;

  // First, collect all consecutive opponent discs
  while (
    currentRow >= 0 &&
    currentRow <= 7 &&
    currentCol >= 0 &&
    currentCol <= 7 &&
    boardState[currentRow][currentCol] === opponent
  ) {
    flippedPositions.push({ row: currentRow, col: currentCol });
    currentRow += direction.rowDelta;
    currentCol += direction.colDelta;
  }

  // Check if the line ends with the player's own disc
  // If not, or if we found no opponent discs, this direction is invalid
  if (
    flippedPositions.length === 0 ||
    currentRow < 0 ||
    currentRow > 7 ||
    currentCol < 0 ||
    currentCol > 7 ||
    boardState[currentRow][currentCol] !== player
  ) {
    return [];
  }

  return flippedPositions;
}

/**
 * Finds all positions that would be flipped by a move
 *
 * @param boardState - The game board
 * @param position - The position where the disc would be placed
 * @param player - The player making the move
 * @returns An array of all positions that would be flipped
 */
function findFlippedPositions(
  boardState: BoardState,
  position: Position,
  player: 'black' | 'white'
): Position[] {
  const allFlippedPositions: Position[] = [];

  // Check all 8 directions
  for (const direction of DIRECTIONS) {
    const flippedInDirection = checkDirection(boardState, position, direction, player);
    allFlippedPositions.push(...flippedInDirection);
  }

  return allFlippedPositions;
}

/**
 * Applies a move to the board and returns the new board state
 *
 * @param boardState - The current board state
 * @param position - The position where the disc is placed
 * @param player - The player making the move
 * @param flippedPositions - The positions that will be flipped
 * @returns The new board state after applying the move
 */
function applyMove(
  boardState: BoardState,
  position: Position,
  player: 'black' | 'white',
  flippedPositions: Position[]
): BoardState {
  // Create a deep copy of the board
  const newBoard: BoardState = boardState.map((row) => [...row]);

  // Place the new disc
  newBoard[position.row][position.col] = player;

  // Flip all opponent discs
  for (const pos of flippedPositions) {
    newBoard[pos.row][pos.col] = player;
  }

  return newBoard;
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
  // 盤面をBoardState型に変換
  const convertedBoard = useMemo(() => convertBoardState(boardState), [boardState]);

  // 裏返される石を計算
  const flippedPositions = useMemo(() => {
    return findFlippedPositions(convertedBoard, selectedPosition, currentPlayer);
  }, [convertedBoard, selectedPosition, currentPlayer]);

  // 手を適用した盤面を計算
  const previewBoard = useMemo(() => {
    if (flippedPositions.length === 0) {
      // 無効な手の場合は元の盤面を返す
      return boardState;
    }

    // 手を適用
    const newBoard = applyMove(convertedBoard, selectedPosition, currentPlayer, flippedPositions);

    // 文字列配列に変換
    return convertToStringBoard(newBoard);
  }, [convertedBoard, selectedPosition, currentPlayer, flippedPositions, boardState]);

  // 裏返される石の数
  const flippedCount = flippedPositions.length;

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
