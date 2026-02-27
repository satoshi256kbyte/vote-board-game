/**
 * Board Component Example
 *
 * This file demonstrates how to use the Board component.
 * It can be used for visual testing and documentation.
 */

import React from 'react';
import { Board } from './board';
import type { BoardState } from '@/types/game';

/**
 * Example: Initial Othello board state
 */
export function InitialBoardExample() {
  const initialState: BoardState = {
    board: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 2, 1, 0, 0, 0],
      [0, 0, 0, 1, 2, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">初期盤面</h2>
      <Board boardState={initialState} />
    </div>
  );
}

/**
 * Example: Interactive board with click handler
 */
export function InteractiveBoardExample() {
  const [boardState, setBoardState] = React.useState<BoardState>({
    board: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 2, 1, 0, 0, 0],
      [0, 0, 0, 1, 2, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
  });

  const [highlightedCell, setHighlightedCell] = React.useState<
    | {
        row: number;
        col: number;
      }
    | undefined
  >();

  const handleCellClick = (row: number, col: number) => {
    console.log(`Clicked cell: row=${row}, col=${col}`);
    setHighlightedCell({ row, col });

    // Example: Toggle cell state (for demonstration only)
    const newBoard = boardState.board.map((r, rIdx) =>
      r.map((cell, cIdx) => {
        if (rIdx === row && cIdx === col) {
          return cell === 0 ? 1 : cell === 1 ? 2 : 0;
        }
        return cell;
      })
    );

    setBoardState({ board: newBoard });
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">インタラクティブ盤面</h2>
      <p className="text-sm text-gray-600 mb-4">セルをクリックして石を配置できます</p>
      <Board
        boardState={boardState}
        onCellClick={handleCellClick}
        highlightedCell={highlightedCell}
      />
    </div>
  );
}

/**
 * Example: Custom cell size
 */
export function CustomSizeBoardExample() {
  const initialState: BoardState = {
    board: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 2, 1, 0, 0, 0],
      [0, 0, 0, 1, 2, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">カスタムサイズ盤面</h2>
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">小 (30px)</h3>
          <Board boardState={initialState} cellSize={30} />
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">中 (40px - デフォルト)</h3>
          <Board boardState={initialState} cellSize={40} />
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">大 (50px)</h3>
          <Board boardState={initialState} cellSize={50} />
        </div>
      </div>
    </div>
  );
}
