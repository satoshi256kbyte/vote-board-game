/**
 * Unit tests for legal moves calculation wrapper
 */

import { describe, it, expect } from 'vitest';
import { calculateLegalMoves, isLegalMove, type BoardState } from './legal-moves';

describe('legal-moves', () => {
  describe('calculateLegalMoves', () => {
    it('should return 4 legal moves for Black on initial board', () => {
      // Initial Othello board setup
      const boardState: BoardState = [
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'white', 'black', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'black', 'white', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
      ];

      const legalMoves = calculateLegalMoves(boardState, 'black');

      expect(legalMoves).toHaveLength(4);
      expect(legalMoves).toContainEqual({ row: 2, col: 3 });
      expect(legalMoves).toContainEqual({ row: 3, col: 2 });
      expect(legalMoves).toContainEqual({ row: 4, col: 5 });
      expect(legalMoves).toContainEqual({ row: 5, col: 4 });
    });

    it('should return 4 legal moves for White on initial board', () => {
      const boardState: BoardState = [
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'white', 'black', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'black', 'white', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
      ];

      const legalMoves = calculateLegalMoves(boardState, 'white');

      expect(legalMoves).toHaveLength(4);
      expect(legalMoves).toContainEqual({ row: 2, col: 4 });
      expect(legalMoves).toContainEqual({ row: 3, col: 5 });
      expect(legalMoves).toContainEqual({ row: 4, col: 2 });
      expect(legalMoves).toContainEqual({ row: 5, col: 3 });
    });

    it('should return empty array when no legal moves exist', () => {
      // Board where Black has no legal moves
      const boardState: BoardState = [
        ['black', 'black', 'black', 'black', 'black', 'black', 'black', 'black'],
        ['black', 'white', 'white', 'white', 'white', 'white', 'white', 'black'],
        ['black', 'white', 'white', 'white', 'white', 'white', 'white', 'black'],
        ['black', 'white', 'white', 'white', 'white', 'white', 'white', 'black'],
        ['black', 'white', 'white', 'white', 'white', 'white', 'white', 'black'],
        ['black', 'white', 'white', 'white', 'white', 'white', 'white', 'black'],
        ['black', 'white', 'white', 'white', 'white', 'white', 'white', 'black'],
        ['black', 'black', 'black', 'black', 'black', 'black', 'black', 'black'],
      ];

      const legalMoves = calculateLegalMoves(boardState, 'black');

      expect(legalMoves).toHaveLength(0);
    });

    it('should return empty array when all cells are filled', () => {
      // Board completely filled with discs
      const boardState: BoardState = [
        ['black', 'black', 'black', 'black', 'white', 'white', 'white', 'white'],
        ['black', 'black', 'black', 'black', 'white', 'white', 'white', 'white'],
        ['black', 'black', 'black', 'black', 'white', 'white', 'white', 'white'],
        ['black', 'black', 'black', 'black', 'white', 'white', 'white', 'white'],
        ['white', 'white', 'white', 'white', 'black', 'black', 'black', 'black'],
        ['white', 'white', 'white', 'white', 'black', 'black', 'black', 'black'],
        ['white', 'white', 'white', 'white', 'black', 'black', 'black', 'black'],
        ['white', 'white', 'white', 'white', 'black', 'black', 'black', 'black'],
      ];

      const legalMovesBlack = calculateLegalMoves(boardState, 'black');
      const legalMovesWhite = calculateLegalMoves(boardState, 'white');

      expect(legalMovesBlack).toHaveLength(0);
      expect(legalMovesWhite).toHaveLength(0);
    });
  });

  describe('isLegalMove', () => {
    it('should return true for legal moves on initial board', () => {
      const boardState: BoardState = [
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'white', 'black', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'black', 'white', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
      ];

      expect(isLegalMove(boardState, { row: 2, col: 3 }, 'black')).toBe(true);
      expect(isLegalMove(boardState, { row: 3, col: 2 }, 'black')).toBe(true);
      expect(isLegalMove(boardState, { row: 4, col: 5 }, 'black')).toBe(true);
      expect(isLegalMove(boardState, { row: 5, col: 4 }, 'black')).toBe(true);
    });

    it('should return true for legal moves in corner positions', () => {
      // Board where corner move (0,0) is legal for black
      // Black can place at (0,0) and flip white at (1,1)
      const boardState: BoardState = [
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'white', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'black', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'white', 'black', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'black', 'white', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
      ];

      expect(isLegalMove(boardState, { row: 0, col: 0 }, 'black')).toBe(true);
    });

    it('should return true for legal moves in edge positions', () => {
      // Board where edge move (0,3) is legal for black
      // Black can place at (0,3) and flip white at (1,3)
      const boardState: BoardState = [
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'white', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'black', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'white', 'black', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'black', 'white', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
      ];

      expect(isLegalMove(boardState, { row: 0, col: 3 }, 'black')).toBe(true);
    });

    it('should return false for illegal moves', () => {
      const boardState: BoardState = [
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'white', 'black', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'black', 'white', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
      ];

      // Empty cell but doesn't flip any discs
      expect(isLegalMove(boardState, { row: 0, col: 0 }, 'black')).toBe(false);

      // Occupied cell
      expect(isLegalMove(boardState, { row: 3, col: 3 }, 'black')).toBe(false);
      expect(isLegalMove(boardState, { row: 3, col: 4 }, 'black')).toBe(false);
    });

    it('should return false for out of bounds positions', () => {
      const boardState: BoardState = [
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'white', 'black', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'black', 'white', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
      ];

      expect(isLegalMove(boardState, { row: -1, col: 0 }, 'black')).toBe(false);
      expect(isLegalMove(boardState, { row: 0, col: -1 }, 'black')).toBe(false);
      expect(isLegalMove(boardState, { row: 8, col: 0 }, 'black')).toBe(false);
      expect(isLegalMove(boardState, { row: 0, col: 8 }, 'black')).toBe(false);
    });
  });
});
