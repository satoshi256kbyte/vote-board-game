/**
 * Unit tests for board module
 */

import { describe, it, expect } from 'vitest';
import {
  createInitialBoard,
  getCellState,
  setCellState,
  isValidPosition,
  getEmptyPositions,
  countDiscs,
  isBoardFull,
} from './board';
import { CellState } from './types';

describe('board module', () => {
  describe('createInitialBoard', () => {
    it('should create an 8x8 board', () => {
      const board = createInitialBoard();
      expect(board).toHaveLength(8);
      expect(board[0]).toHaveLength(8);
    });

    it('should place White disc at position (3,3)', () => {
      const board = createInitialBoard();
      expect(board[3][3]).toBe(CellState.White);
    });

    it('should place Black disc at position (3,4)', () => {
      const board = createInitialBoard();
      expect(board[3][4]).toBe(CellState.Black);
    });

    it('should place Black disc at position (4,3)', () => {
      const board = createInitialBoard();
      expect(board[4][3]).toBe(CellState.Black);
    });

    it('should place White disc at position (4,4)', () => {
      const board = createInitialBoard();
      expect(board[4][4]).toBe(CellState.White);
    });

    it('should leave all other cells empty', () => {
      const board = createInitialBoard();
      let emptyCount = 0;
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          if (board[row][col] === CellState.Empty) {
            emptyCount++;
          }
        }
      }
      expect(emptyCount).toBe(60); // 64 - 4 initial discs
    });
  });

  describe('getCellState', () => {
    it('should return the correct cell state', () => {
      const board = createInitialBoard();
      expect(getCellState(board, { row: 3, col: 3 })).toBe(CellState.White);
      expect(getCellState(board, { row: 3, col: 4 })).toBe(CellState.Black);
      expect(getCellState(board, { row: 0, col: 0 })).toBe(CellState.Empty);
    });
  });

  describe('setCellState', () => {
    it('should set a cell state and return a new board', () => {
      const board = createInitialBoard();
      const newBoard = setCellState(board, { row: 0, col: 0 }, CellState.Black);

      expect(getCellState(newBoard, { row: 0, col: 0 })).toBe(CellState.Black);
      expect(getCellState(board, { row: 0, col: 0 })).toBe(CellState.Empty); // Original unchanged
    });

    it('should not modify the original board (immutability)', () => {
      const board = createInitialBoard();
      const originalState = getCellState(board, { row: 2, col: 2 });
      setCellState(board, { row: 2, col: 2 }, CellState.White);

      expect(getCellState(board, { row: 2, col: 2 })).toBe(originalState);
    });
  });

  describe('isValidPosition', () => {
    it('should return true for valid positions', () => {
      expect(isValidPosition({ row: 0, col: 0 })).toBe(true);
      expect(isValidPosition({ row: 7, col: 7 })).toBe(true);
      expect(isValidPosition({ row: 3, col: 4 })).toBe(true);
    });

    it('should return false for out-of-bounds positions', () => {
      expect(isValidPosition({ row: -1, col: 0 })).toBe(false);
      expect(isValidPosition({ row: 0, col: -1 })).toBe(false);
      expect(isValidPosition({ row: 8, col: 0 })).toBe(false);
      expect(isValidPosition({ row: 0, col: 8 })).toBe(false);
      expect(isValidPosition({ row: -1, col: -1 })).toBe(false);
      expect(isValidPosition({ row: 8, col: 8 })).toBe(false);
    });
  });

  describe('getEmptyPositions', () => {
    it('should return all empty positions on initial board', () => {
      const board = createInitialBoard();
      const emptyPositions = getEmptyPositions(board);

      expect(emptyPositions).toHaveLength(60);
    });

    it('should not include occupied positions', () => {
      const board = createInitialBoard();
      const emptyPositions = getEmptyPositions(board);

      const occupiedPositions = [
        { row: 3, col: 3 },
        { row: 3, col: 4 },
        { row: 4, col: 3 },
        { row: 4, col: 4 },
      ];

      for (const pos of occupiedPositions) {
        expect(emptyPositions).not.toContainEqual(pos);
      }
    });

    it('should return empty array for full board', () => {
      let board = createInitialBoard();
      // Fill the board
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          if (board[row][col] === CellState.Empty) {
            board = setCellState(board, { row, col }, CellState.Black);
          }
        }
      }

      const emptyPositions = getEmptyPositions(board);
      expect(emptyPositions).toHaveLength(0);
    });
  });

  describe('countDiscs', () => {
    it('should count Black discs correctly on initial board', () => {
      const board = createInitialBoard();
      expect(countDiscs(board, CellState.Black)).toBe(2);
    });

    it('should count White discs correctly on initial board', () => {
      const board = createInitialBoard();
      expect(countDiscs(board, CellState.White)).toBe(2);
    });

    it('should return 0 when no discs of that color exist', () => {
      const board = Array.from({ length: 8 }, () =>
        Array.from({ length: 8 }, () => CellState.Empty)
      );
      expect(countDiscs(board, CellState.Black)).toBe(0);
      expect(countDiscs(board, CellState.White)).toBe(0);
    });

    it('should count correctly after adding discs', () => {
      let board = createInitialBoard();
      board = setCellState(board, { row: 0, col: 0 }, CellState.Black);
      board = setCellState(board, { row: 0, col: 1 }, CellState.Black);

      expect(countDiscs(board, CellState.Black)).toBe(4);
      expect(countDiscs(board, CellState.White)).toBe(2);
    });
  });

  describe('isBoardFull', () => {
    it('should return false for initial board', () => {
      const board = createInitialBoard();
      expect(isBoardFull(board)).toBe(false);
    });

    it('should return true for completely filled board', () => {
      let board = createInitialBoard();
      // Fill all empty cells
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          if (board[row][col] === CellState.Empty) {
            board = setCellState(board, { row, col }, CellState.Black);
          }
        }
      }

      expect(isBoardFull(board)).toBe(true);
    });

    it('should return false if even one cell is empty', () => {
      let board = createInitialBoard();
      // Fill all but one cell
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          if (board[row][col] === CellState.Empty && !(row === 0 && col === 0)) {
            board = setCellState(board, { row, col }, CellState.Black);
          }
        }
      }

      expect(isBoardFull(board)).toBe(false);
    });
  });
});
