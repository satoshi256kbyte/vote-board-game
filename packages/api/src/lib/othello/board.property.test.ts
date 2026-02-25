/**
 * Property-based tests for board module
 *
 * These tests use fast-check to verify properties that should hold
 * across all possible inputs and executions.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createInitialBoard } from './board';
import { CellState } from './types';

describe('board property tests', () => {
  /**
   * Property 1: Board initialization creates correct structure
   * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
   *
   * For any call to createInitialBoard(), the resulting board should have:
   * - Exactly 8 rows
   * - Exactly 8 columns
   * - Exactly 4 discs placed (White at (3,3), Black at (3,4), Black at (4,3), White at (4,4))
   * - All other 60 cells should be empty
   */
  it('Property 1: Board initialization creates correct structure', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const board = createInitialBoard();

        // Check board dimensions (Requirement 1.1)
        expect(board).toHaveLength(8);
        for (let i = 0; i < 8; i++) {
          expect(board[i]).toHaveLength(8);
        }

        // Check initial disc placement (Requirements 1.2, 1.3, 1.4, 1.5)
        expect(board[3][3]).toBe(CellState.White); // Requirement 1.2
        expect(board[3][4]).toBe(CellState.Black); // Requirement 1.3
        expect(board[4][3]).toBe(CellState.Black); // Requirement 1.4
        expect(board[4][4]).toBe(CellState.White); // Requirement 1.5

        // Count all discs and empty cells (Requirement 1.6)
        let emptyCount = 0;
        let blackCount = 0;
        let whiteCount = 0;

        for (let row = 0; row < 8; row++) {
          for (let col = 0; col < 8; col++) {
            const cell = board[row][col];
            if (cell === CellState.Empty) {
              emptyCount++;
            } else if (cell === CellState.Black) {
              blackCount++;
            } else if (cell === CellState.White) {
              whiteCount++;
            }
          }
        }

        // Verify exactly 4 discs and 60 empty cells
        expect(blackCount).toBe(2);
        expect(whiteCount).toBe(2);
        expect(emptyCount).toBe(60);

        // Verify all other cells are empty (Requirement 1.6)
        for (let row = 0; row < 8; row++) {
          for (let col = 0; col < 8; col++) {
            // Skip the 4 initial disc positions
            if (
              (row === 3 && col === 3) ||
              (row === 3 && col === 4) ||
              (row === 4 && col === 3) ||
              (row === 4 && col === 4)
            ) {
              continue;
            }
            expect(board[row][col]).toBe(CellState.Empty);
          }
        }
      }),
      { numRuns: 20, endOnFailure: true }
    );
  });
});
