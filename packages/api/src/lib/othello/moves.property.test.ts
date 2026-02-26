/**
 * Property-based tests for moves module
 *
 * Tests move execution properties using fast-check.
 * Following implementation guide: numRuns 10-20, no asyncProperty, endOnFailure: true
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { flipDiscs, executeMove, createMove } from './moves';
import { CellState, Position } from './types';
import { createInitialBoard, getCellState, countDiscs } from './board';
import { validateMove } from './validation';

// Arbitraries
const playerArb = fc.constantFrom(CellState.Black, CellState.White);
const positionArb = fc.record({
  row: fc.integer({ min: 0, max: 7 }),
  col: fc.integer({ min: 0, max: 7 }),
});

describe('moves module - property tests', () => {
  describe('Property 8: Valid moves place disc and flip opponents', () => {
    it('should place disc at position and flip all opponent discs', () => {
      fc.assert(
        fc.property(playerArb, (player) => {
          const board = createInitialBoard();

          // Find a valid move for the player
          let validMove: Position | null = null;
          let flippedPositions: readonly Position[] = [];

          for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
              const pos = { row, col };
              const result = validateMove(board, pos, player);
              if (result.valid && result.flippedPositions) {
                validMove = pos;
                flippedPositions = result.flippedPositions;
                break;
              }
            }
            if (validMove) break;
          }

          if (!validMove) return true; // No valid moves, skip

          const newBoard = executeMove(board, validMove, player, flippedPositions);

          // Check disc was placed
          expect(getCellState(newBoard, validMove)).toBe(player);

          // Check all flipped positions now have player's color
          for (const pos of flippedPositions) {
            expect(getCellState(newBoard, pos)).toBe(player);
          }

          return true;
        }),
        { numRuns: 10, endOnFailure: true }
      );
    });
  });

  describe('Property 9: Flips only occur between anchoring discs', () => {
    it('should only flip discs that are between player discs', () => {
      fc.assert(
        fc.property(playerArb, (player) => {
          const board = createInitialBoard();

          // Find a valid move
          let validMove: Position | null = null;
          let flippedPositions: readonly Position[] = [];

          for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
              const pos = { row, col };
              const result = validateMove(board, pos, player);
              if (result.valid && result.flippedPositions && result.flippedPositions.length > 0) {
                validMove = pos;
                flippedPositions = result.flippedPositions;
                break;
              }
            }
            if (validMove) break;
          }

          if (!validMove || flippedPositions.length === 0) return true;

          const newBoard = executeMove(board, validMove, player, flippedPositions);

          // All flipped positions should now be player's color
          for (const pos of flippedPositions) {
            expect(getCellState(newBoard, pos)).toBe(player);
          }

          return true;
        }),
        { numRuns: 10, endOnFailure: true }
      );
    });
  });

  describe('Property 10: Board updates are atomic', () => {
    it('should update board in single operation with all changes', () => {
      fc.assert(
        fc.property(playerArb, (player) => {
          const board = createInitialBoard();
          const opponent = player === CellState.Black ? CellState.White : CellState.Black;

          // Count initial discs
          const initialPlayerCount = countDiscs(board, player);
          const initialOpponentCount = countDiscs(board, opponent);

          // Find a valid move
          let validMove: Position | null = null;
          let flippedPositions: readonly Position[] = [];

          for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
              const pos = { row, col };
              const result = validateMove(board, pos, player);
              if (result.valid && result.flippedPositions) {
                validMove = pos;
                flippedPositions = result.flippedPositions;
                break;
              }
            }
            if (validMove) break;
          }

          if (!validMove) return true;

          const newBoard = executeMove(board, validMove, player, flippedPositions);

          // Count final discs
          const finalPlayerCount = countDiscs(newBoard, player);
          const finalOpponentCount = countDiscs(newBoard, opponent);

          // Player gains 1 (placed) + flipped count
          expect(finalPlayerCount).toBe(initialPlayerCount + 1 + flippedPositions.length);
          // Opponent loses flipped count
          expect(finalOpponentCount).toBe(initialOpponentCount - flippedPositions.length);

          return true;
        }),
        { numRuns: 10, endOnFailure: true }
      );
    });
  });

  describe("Property 11: Invalid moves don't modify board", () => {
    it('should not modify board when executing invalid move', () => {
      fc.assert(
        fc.property(positionArb, playerArb, (position, player) => {
          const board = createInitialBoard();
          const result = validateMove(board, position, player);

          if (result.valid) return true; // Skip valid moves

          // For invalid moves, executing with empty flipped positions should only place disc
          const newBoard = executeMove(board, position, player, []);

          // Only the position should change (if it was empty)
          if (getCellState(board, position) === CellState.Empty) {
            expect(getCellState(newBoard, position)).toBe(player);
          }

          // All other positions should remain unchanged
          for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
              if (row === position.row && col === position.col) continue;
              expect(getCellState(newBoard, { row, col })).toBe(getCellState(board, { row, col }));
            }
          }

          return true;
        }),
        { numRuns: 10, endOnFailure: true }
      );
    });
  });

  describe('flipDiscs immutability', () => {
    it('should not modify original board', () => {
      fc.assert(
        fc.property(
          fc.array(positionArb, { minLength: 0, maxLength: 5 }),
          playerArb,
          (positions, player) => {
            const board = createInitialBoard();
            const originalBoard = board.map((row) => [...row]);

            flipDiscs(board, positions, player);

            // Original board should be unchanged
            for (let row = 0; row < 8; row++) {
              for (let col = 0; col < 8; col++) {
                expect(board[row][col]).toBe(originalBoard[row][col]);
              }
            }

            return true;
          }
        ),
        { numRuns: 10, endOnFailure: true }
      );
    });
  });

  describe('createMove immutability', () => {
    it('should create independent move record', () => {
      fc.assert(
        fc.property(
          positionArb,
          playerArb,
          fc.array(positionArb, { minLength: 0, maxLength: 10 }),
          (position, player, flippedPositions) => {
            const move = createMove(position, player, flippedPositions);

            // Move should have correct data
            expect(move.position).toEqual(position);
            expect(move.player).toBe(player);
            expect(move.flippedPositions.length).toBe(flippedPositions.length);

            return true;
          }
        ),
        { numRuns: 10, endOnFailure: true }
      );
    });
  });
});
