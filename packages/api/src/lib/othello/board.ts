/**
 * Board module for Othello game logic
 *
 * This module provides functions for board initialization and basic board operations.
 * All functions follow immutable patterns, returning new board instances rather than
 * modifying existing ones.
 */

import { Board, CellState, Player, Position } from './types';

/**
 * Creates a new Othello board with the standard initial configuration
 *
 * The initial board has:
 * - White disc at position (3,3)
 * - Black disc at position (3,4)
 * - Black disc at position (4,3)
 * - White disc at position (4,4)
 * - All other cells empty
 *
 * @returns A new 8x8 board with the standard Othello starting position
 */
export function createInitialBoard(): Board {
  // Create an 8x8 board filled with empty cells
  const board: CellState[][] = Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => CellState.Empty)
  );

  // Place the four initial discs in the center
  board[3][3] = CellState.White;
  board[3][4] = CellState.Black;
  board[4][3] = CellState.Black;
  board[4][4] = CellState.White;

  return board;
}

/**
 * Gets the cell state at a specific position
 *
 * @param board - The game board
 * @param position - The position to check
 * @returns The cell state at the specified position
 */
export function getCellState(board: Board, position: Position): CellState {
  return board[position.row][position.col];
}

/**
 * Sets a cell state at a specific position (returns new board)
 *
 * This function is immutable - it returns a new board with the updated cell
 * rather than modifying the existing board.
 *
 * @param board - The game board
 * @param position - The position to update
 * @param state - The new cell state
 * @returns A new board with the updated cell state
 */
export function setCellState(board: Board, position: Position, state: CellState): Board {
  return board.map((row, rowIndex) =>
    rowIndex === position.row
      ? row.map((cell, colIndex) => (colIndex === position.col ? state : cell))
      : row
  );
}

/**
 * Checks if a position is within board boundaries
 *
 * @param position - The position to check
 * @returns true if the position is within bounds (0-7 for both row and col), false otherwise
 */
export function isValidPosition(position: Position): boolean {
  return position.row >= 0 && position.row <= 7 && position.col >= 0 && position.col <= 7;
}

/**
 * Gets all empty positions on the board
 *
 * @param board - The game board
 * @returns An array of all positions that contain empty cells
 */
export function getEmptyPositions(board: Board): readonly Position[] {
  const emptyPositions: Position[] = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (board[row][col] === CellState.Empty) {
        emptyPositions.push({ row, col });
      }
    }
  }

  return emptyPositions;
}

/**
 * Counts discs of a specific color
 *
 * @param board - The game board
 * @param player - The player color to count
 * @returns The number of discs of the specified color on the board
 */
export function countDiscs(board: Board, player: Player): number {
  let count = 0;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (board[row][col] === player) {
        count++;
      }
    }
  }

  return count;
}

/**
 * Checks if the board is full
 *
 * @param board - The game board
 * @returns true if all cells are occupied, false otherwise
 */
export function isBoardFull(board: Board): boolean {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (board[row][col] === CellState.Empty) {
        return false;
      }
    }
  }

  return true;
}
