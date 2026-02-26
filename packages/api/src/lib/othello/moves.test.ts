/**
 * Unit tests for moves module
 *
 * Tests disc placement, flipping in single/multiple directions, immutability,
 * and move record creation.
 */

import { describe, it, expect } from 'vitest';
import { flipDiscs, executeMove, createMove } from './moves';
import { CellState, Player, Position } from './types';
import { createInitialBoard, getCellState } from './board';

describe('moves module', () => {
  describe('flipDiscs', () => {
    it('should flip a single disc', () => {
      const board = createInitialBoard();
      const positions: Position[] = [{ row: 3, col: 3 }];
      const player = CellState.Black;

      const newBoard = flipDiscs(board, positions, player);

      expect(getCellState(newBoard, { row: 3, col: 3 })).toBe(CellState.Black);
    });

    it('should flip multiple discs', () => {
      const board = createInitialBoard();
      const positions: Position[] = [
        { row: 3, col: 3 },
        { row: 4, col: 4 },
      ];
      const player = CellState.Black;

      const newBoard = flipDiscs(board, positions, player);

      expect(getCellState(newBoard, { row: 3, col: 3 })).toBe(CellState.Black);
      expect(getCellState(newBoard, { row: 4, col: 4 })).toBe(CellState.Black);
    });

    it('should not modify the original board (immutability)', () => {
      const board = createInitialBoard();
      const positions: Position[] = [{ row: 3, col: 3 }];
      const player = CellState.Black;

      const originalWhiteAt33 = getCellState(board, { row: 3, col: 3 });
      flipDiscs(board, positions, player);

      // Original board should remain unchanged
      expect(getCellState(board, { row: 3, col: 3 })).toBe(originalWhiteAt33);
    });

    it('should handle empty positions array', () => {
      const board = createInitialBoard();
      const positions: Position[] = [];
      const player = CellState.Black;

      const newBoard = flipDiscs(board, positions, player);

      // Board should be unchanged when no positions to flip
      expect(newBoard).toEqual(board);
    });

    it('should flip discs to White player', () => {
      const board = createInitialBoard();
      const positions: Position[] = [{ row: 3, col: 4 }];
      const player = CellState.White;

      const newBoard = flipDiscs(board, positions, player);

      expect(getCellState(newBoard, { row: 3, col: 4 })).toBe(CellState.White);
    });
  });

  describe('executeMove', () => {
    it('should place disc at specified position', () => {
      const board = createInitialBoard();
      const position: Position = { row: 2, col: 3 };
      const player = CellState.Black;
      const flippedPositions: Position[] = [{ row: 3, col: 3 }];

      const newBoard = executeMove(board, position, player, flippedPositions);

      expect(getCellState(newBoard, position)).toBe(CellState.Black);
    });

    it('should flip discs in a single direction', () => {
      const board = createInitialBoard();
      const position: Position = { row: 2, col: 3 };
      const player = CellState.Black;
      const flippedPositions: Position[] = [{ row: 3, col: 3 }];

      const newBoard = executeMove(board, position, player, flippedPositions);

      // Check that the disc was placed
      expect(getCellState(newBoard, position)).toBe(CellState.Black);
      // Check that the opponent disc was flipped
      expect(getCellState(newBoard, { row: 3, col: 3 })).toBe(CellState.Black);
    });

    it('should flip discs in multiple directions', () => {
      // Create a custom board where a move can flip in multiple directions
      const board: CellState[][] = Array.from({ length: 8 }, () =>
        Array.from({ length: 8 }, () => CellState.Empty)
      );

      // Set up a position where Black can flip in multiple directions
      board[3][3] = CellState.White; // Will be flipped
      board[3][4] = CellState.White; // Will be flipped
      board[3][5] = CellState.Black; // Anchor for horizontal flip
      board[4][3] = CellState.White; // Will be flipped
      board[5][3] = CellState.Black; // Anchor for vertical flip

      const position: Position = { row: 3, col: 2 };
      const player = CellState.Black;
      const flippedPositions: Position[] = [
        { row: 3, col: 3 }, // Horizontal
        { row: 3, col: 4 }, // Horizontal
        { row: 4, col: 3 }, // Vertical
      ];

      const newBoard = executeMove(board, position, player, flippedPositions);

      // Check that the disc was placed
      expect(getCellState(newBoard, position)).toBe(CellState.Black);
      // Check that all opponent discs were flipped
      expect(getCellState(newBoard, { row: 3, col: 3 })).toBe(CellState.Black);
      expect(getCellState(newBoard, { row: 3, col: 4 })).toBe(CellState.Black);
      expect(getCellState(newBoard, { row: 4, col: 3 })).toBe(CellState.Black);
    });

    it('should not modify the original board (immutability)', () => {
      const board = createInitialBoard();
      const position: Position = { row: 2, col: 3 };
      const player = CellState.Black;
      const flippedPositions: Position[] = [{ row: 3, col: 3 }];

      const originalEmptyAt23 = getCellState(board, position);
      const originalWhiteAt33 = getCellState(board, { row: 3, col: 3 });

      executeMove(board, position, player, flippedPositions);

      // Original board should remain unchanged
      expect(getCellState(board, position)).toBe(originalEmptyAt23);
      expect(getCellState(board, { row: 3, col: 3 })).toBe(originalWhiteAt33);
    });

    it('should handle move with no flips', () => {
      const board = createInitialBoard();
      const position: Position = { row: 0, col: 0 };
      const player = CellState.Black;
      const flippedPositions: Position[] = [];

      const newBoard = executeMove(board, position, player, flippedPositions);

      // Only the disc should be placed, no flips
      expect(getCellState(newBoard, position)).toBe(CellState.Black);
      // Other positions should remain unchanged
      expect(getCellState(newBoard, { row: 3, col: 3 })).toBe(CellState.White);
      expect(getCellState(newBoard, { row: 3, col: 4 })).toBe(CellState.Black);
    });

    it('should execute move for White player', () => {
      const board = createInitialBoard();
      const position: Position = { row: 2, col: 4 };
      const player = CellState.White;
      const flippedPositions: Position[] = [{ row: 3, col: 4 }];

      const newBoard = executeMove(board, position, player, flippedPositions);

      expect(getCellState(newBoard, position)).toBe(CellState.White);
      expect(getCellState(newBoard, { row: 3, col: 4 })).toBe(CellState.White);
    });

    it('should flip discs in diagonal direction', () => {
      // Create a board with diagonal flip opportunity
      const board: CellState[][] = Array.from({ length: 8 }, () =>
        Array.from({ length: 8 }, () => CellState.Empty)
      );

      board[3][3] = CellState.White; // Will be flipped
      board[4][4] = CellState.White; // Will be flipped
      board[5][5] = CellState.Black; // Anchor

      const position: Position = { row: 2, col: 2 };
      const player = CellState.Black;
      const flippedPositions: Position[] = [
        { row: 3, col: 3 },
        { row: 4, col: 4 },
      ];

      const newBoard = executeMove(board, position, player, flippedPositions);

      expect(getCellState(newBoard, position)).toBe(CellState.Black);
      expect(getCellState(newBoard, { row: 3, col: 3 })).toBe(CellState.Black);
      expect(getCellState(newBoard, { row: 4, col: 4 })).toBe(CellState.Black);
    });
  });

  describe('createMove', () => {
    it('should create move record with complete data', () => {
      const position: Position = { row: 2, col: 3 };
      const player: Player = CellState.Black;
      const flippedPositions: Position[] = [{ row: 3, col: 3 }];

      const move = createMove(position, player, flippedPositions);

      expect(move.position).toEqual(position);
      expect(move.player).toBe(player);
      expect(move.flippedPositions).toEqual(flippedPositions);
    });

    it('should create move record with multiple flipped positions', () => {
      const position: Position = { row: 2, col: 3 };
      const player: Player = CellState.Black;
      const flippedPositions: Position[] = [
        { row: 3, col: 3 },
        { row: 3, col: 4 },
        { row: 4, col: 3 },
      ];

      const move = createMove(position, player, flippedPositions);

      expect(move.position).toEqual(position);
      expect(move.player).toBe(player);
      expect(move.flippedPositions).toEqual(flippedPositions);
      expect(move.flippedPositions.length).toBe(3);
    });

    it('should create move record with no flipped positions', () => {
      const position: Position = { row: 0, col: 0 };
      const player: Player = CellState.White;
      const flippedPositions: Position[] = [];

      const move = createMove(position, player, flippedPositions);

      expect(move.position).toEqual(position);
      expect(move.player).toBe(player);
      expect(move.flippedPositions).toEqual([]);
      expect(move.flippedPositions.length).toBe(0);
    });

    it('should create move record for White player', () => {
      const position: Position = { row: 5, col: 4 };
      const player: Player = CellState.White;
      const flippedPositions: Position[] = [{ row: 4, col: 4 }];

      const move = createMove(position, player, flippedPositions);

      expect(move.position).toEqual(position);
      expect(move.player).toBe(CellState.White);
      expect(move.flippedPositions).toEqual(flippedPositions);
    });

    it('should preserve immutability of input arrays', () => {
      const position: Position = { row: 2, col: 3 };
      const player: Player = CellState.Black;
      const flippedPositions: Position[] = [{ row: 3, col: 3 }];

      const move = createMove(position, player, flippedPositions);

      // Modifying the original array should not affect the move record
      flippedPositions.push({ row: 4, col: 4 });

      expect(move.flippedPositions.length).toBe(1);
    });
  });
});
