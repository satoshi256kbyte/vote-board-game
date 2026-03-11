/**
 * Property-based tests for legal moves calculation
 *
 * Feature: board-move-selection-ui
 * Tests Property 2 from the design document
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateLegalMoves, isLegalMove, type BoardState, type Position } from './legal-moves';

/**
 * Arbitrary generator for cell states
 */
const cellStateArbitrary = fc.constantFrom('empty' as const, 'black' as const, 'white' as const);

/**
 * Arbitrary generator for board states
 * Generates random 8x8 boards with various configurations
 */
const boardStateArbitrary: fc.Arbitrary<BoardState> = fc.array(
  fc.array(cellStateArbitrary, { minLength: 8, maxLength: 8 }),
  { minLength: 8, maxLength: 8 }
);

/**
 * Arbitrary generator for valid positions (0-7 for both row and col)
 */
const positionArbitrary: fc.Arbitrary<Position> = fc.record({
  row: fc.integer({ min: 0, max: 7 }),
  col: fc.integer({ min: 0, max: 7 }),
});

/**
 * Arbitrary generator for players
 */
const playerArbitrary = fc.constantFrom('black' as const, 'white' as const);

describe('Legal moves calculation - Property-based tests', () => {
  /**
   * Property 2: 合法手の計算と表示
   * Validates: Requirements 2.1, 2.3, 2.6
   *
   * For any board state and player, legal moves are correctly calculated,
   * Valid_Move_Indicator is displayed only on legal move cells,
   * and not displayed on illegal move cells
   */
  describe('Property 2: 合法手の計算と表示', () => {
    it('should only return positions within board boundaries', () => {
      fc.assert(
        fc.property(boardStateArbitrary, playerArbitrary, (boardState, player) => {
          const legalMoves = calculateLegalMoves(boardState, player);

          // All legal moves must be within bounds
          for (const move of legalMoves) {
            expect(move.row).toBeGreaterThanOrEqual(0);
            expect(move.row).toBeLessThanOrEqual(7);
            expect(move.col).toBeGreaterThanOrEqual(0);
            expect(move.col).toBeLessThanOrEqual(7);
          }
        }),
        { numRuns: 20, endOnFailure: true }
      );
    });

    it('should only return empty cell positions', () => {
      fc.assert(
        fc.property(boardStateArbitrary, playerArbitrary, (boardState, player) => {
          const legalMoves = calculateLegalMoves(boardState, player);

          // All legal moves must be on empty cells
          for (const move of legalMoves) {
            expect(boardState[move.row][move.col]).toBe('empty');
          }
        }),
        { numRuns: 20, endOnFailure: true }
      );
    });

    it('should have isLegalMove return true for all calculated legal moves', () => {
      fc.assert(
        fc.property(boardStateArbitrary, playerArbitrary, (boardState, player) => {
          const legalMoves = calculateLegalMoves(boardState, player);

          // Every position returned by calculateLegalMoves should be validated as legal by isLegalMove
          for (const move of legalMoves) {
            expect(isLegalMove(boardState, move, player)).toBe(true);
          }
        }),
        { numRuns: 20, endOnFailure: true }
      );
    });

    it('should have isLegalMove return false for occupied cells', () => {
      fc.assert(
        fc.property(
          boardStateArbitrary,
          positionArbitrary,
          playerArbitrary,
          (boardState, position, player) => {
            // If the cell is occupied, isLegalMove should return false
            if (boardState[position.row][position.col] !== 'empty') {
              expect(isLegalMove(boardState, position, player)).toBe(false);
            }
          }
        ),
        { numRuns: 20, endOnFailure: true }
      );
    });

    it('should not include positions where isLegalMove returns false', () => {
      fc.assert(
        fc.property(boardStateArbitrary, playerArbitrary, (boardState, player) => {
          const legalMoves = calculateLegalMoves(boardState, player);

          // Check all empty cells on the board
          for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
              const position = { row, col };
              const isInLegalMoves = legalMoves.some((m) => m.row === row && m.col === col);
              const isLegal = isLegalMove(boardState, position, player);

              // If isLegalMove returns false, the position should not be in legalMoves
              if (!isLegal) {
                expect(isInLegalMoves).toBe(false);
              }
            }
          }
        }),
        { numRuns: 15, endOnFailure: true }
      );
    });

    it('should return consistent results across multiple calls with same input', () => {
      fc.assert(
        fc.property(boardStateArbitrary, playerArbitrary, (boardState, player) => {
          const legalMoves1 = calculateLegalMoves(boardState, player);
          const legalMoves2 = calculateLegalMoves(boardState, player);

          // Results should be identical
          expect(legalMoves1).toHaveLength(legalMoves2.length);

          // Check that all moves in first result are in second result
          for (const move1 of legalMoves1) {
            const found = legalMoves2.some(
              (move2) => move2.row === move1.row && move2.col === move1.col
            );
            expect(found).toBe(true);
          }
        }),
        { numRuns: 15, endOnFailure: true }
      );
    });

    it('should return empty array when board is completely filled', () => {
      fc.assert(
        fc.property(playerArbitrary, (player) => {
          // Create a completely filled board
          const filledBoard: BoardState = Array(8)
            .fill(null)
            .map(() => Array(8).fill(player === 'black' ? 'white' : 'black'));

          const legalMoves = calculateLegalMoves(filledBoard, player);

          // No legal moves should exist on a filled board
          expect(legalMoves).toHaveLength(0);
        }),
        { numRuns: 10, endOnFailure: true }
      );
    });

    it('should have no duplicate positions in legal moves', () => {
      fc.assert(
        fc.property(boardStateArbitrary, playerArbitrary, (boardState, player) => {
          const legalMoves = calculateLegalMoves(boardState, player);

          // Check for duplicates
          const seen = new Set<string>();
          for (const move of legalMoves) {
            const key = `${move.row},${move.col}`;
            expect(seen.has(key)).toBe(false);
            seen.add(key);
          }
        }),
        { numRuns: 20, endOnFailure: true }
      );
    });
  });

  describe('Property 2: Edge cases and boundary conditions', () => {
    it('should handle initial board state correctly', () => {
      // Initial Othello board setup
      const initialBoard: BoardState = [
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'white', 'black', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'black', 'white', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
      ];

      const blackMoves = calculateLegalMoves(initialBoard, 'black');
      const whiteMoves = calculateLegalMoves(initialBoard, 'white');

      // Initial board should have exactly 4 legal moves for each player
      expect(blackMoves).toHaveLength(4);
      expect(whiteMoves).toHaveLength(4);
    });

    it('should handle corner positions correctly', () => {
      fc.assert(
        fc.property(boardStateArbitrary, playerArbitrary, (boardState, player) => {
          const legalMoves = calculateLegalMoves(boardState, player);

          // Check corner positions
          const corners = [
            { row: 0, col: 0 },
            { row: 0, col: 7 },
            { row: 7, col: 0 },
            { row: 7, col: 7 },
          ];

          for (const corner of corners) {
            const isInLegalMoves = legalMoves.some(
              (m) => m.row === corner.row && m.col === corner.col
            );
            const isLegal = isLegalMove(boardState, corner, player);

            // Consistency check
            expect(isInLegalMoves).toBe(isLegal);
          }
        }),
        { numRuns: 15, endOnFailure: true }
      );
    });

    it('should handle edge positions correctly', () => {
      fc.assert(
        fc.property(boardStateArbitrary, playerArbitrary, (boardState, player) => {
          const legalMoves = calculateLegalMoves(boardState, player);

          // Check all edge positions
          const edges: Position[] = [];
          for (let i = 0; i < 8; i++) {
            edges.push({ row: 0, col: i }); // Top edge
            edges.push({ row: 7, col: i }); // Bottom edge
            edges.push({ row: i, col: 0 }); // Left edge
            edges.push({ row: i, col: 7 }); // Right edge
          }

          for (const edge of edges) {
            const isInLegalMoves = legalMoves.some((m) => m.row === edge.row && m.col === edge.col);
            const isLegal = isLegalMove(boardState, edge, player);

            // Consistency check
            expect(isInLegalMoves).toBe(isLegal);
          }
        }),
        { numRuns: 10, endOnFailure: true }
      );
    });
  });
});
