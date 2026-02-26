/**
 * Property-based tests for validation module
 *
 * These tests use fast-check to verify properties that should hold
 * across all possible inputs and executions.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validateMove,
  findFlippedPositions,
  checkDirection,
  getLegalMoves,
  hasLegalMoves,
} from './validation';
import { createInitialBoard, setCellState, getEmptyPositions } from './board';
import { Board, CellState, Position, DIRECTIONS } from './types';

// Custom arbitraries for property tests

/**
 * Generates a valid position (0-7 for both row and col)
 */
const validPositionArbitrary = fc.record({
  row: fc.integer({ min: 0, max: 7 }),
  col: fc.integer({ min: 0, max: 7 }),
});

/**
 * Generates an out-of-bounds position
 */
const outOfBoundsPositionArbitrary = fc.oneof(
  fc.record({
    row: fc.integer({ max: -1 }),
    col: fc.integer({ min: 0, max: 7 }),
  }),
  fc.record({
    row: fc.integer({ min: 8 }),
    col: fc.integer({ min: 0, max: 7 }),
  }),
  fc.record({
    row: fc.integer({ min: 0, max: 7 }),
    col: fc.integer({ max: -1 }),
  }),
  fc.record({
    row: fc.integer({ min: 0, max: 7 }),
    col: fc.integer({ min: 8 }),
  })
);

/**
 * Generates a player (Black or White)
 */
const playerArbitrary = fc.constantFrom(CellState.Black, CellState.White);

/**
 * Generates a simple board with some discs placed
 */
const simpleBoardArbitrary = fc
  .array(
    fc.record({
      position: validPositionArbitrary,
      state: fc.constantFrom(CellState.Black, CellState.White),
    }),
    { minLength: 2, maxLength: 20 }
  )
  .map((placements) => {
    let board: Board = Array.from({ length: 8 }, () =>
      Array.from({ length: 8 }, () => CellState.Empty)
    );

    for (const { position, state } of placements) {
      board = setCellState(board, position, state);
    }

    return board;
  });

describe('validation property tests', () => {
  /**
   * Property 2: Occupied cells reject moves
   * Validates: Requirements 2.1
   *
   * For any board state and any occupied position, attempting to place a disc
   * at that position should be rejected as invalid.
   */
  it('Property 2: Occupied cells reject moves', () => {
    fc.assert(
      fc.property(simpleBoardArbitrary, playerArbitrary, (board, player) => {
        // Find all occupied positions
        const occupiedPositions: Position[] = [];
        for (let row = 0; row < 8; row++) {
          for (let col = 0; col < 8; col++) {
            if (board[row][col] !== CellState.Empty) {
              occupiedPositions.push({ row, col });
            }
          }
        }

        // Test each occupied position
        for (const position of occupiedPositions) {
          const result = validateMove(board, position, player);
          expect(result.valid).toBe(false);
          expect(result.reason).toBe('Cell is already occupied');
        }
      }),
      { numRuns: 15, endOnFailure: true }
    );
  });

  /**
   * Property 3: Moves without flips are invalid
   * Validates: Requirements 2.2
   *
   * For any board state, player, and position where no opponent discs would be flipped,
   * the move should be rejected as invalid.
   */
  it('Property 3: Moves without flips are invalid', () => {
    fc.assert(
      fc.property(
        simpleBoardArbitrary,
        validPositionArbitrary,
        playerArbitrary,
        (board, position, player) => {
          // Check if the position is empty
          if (board[position.row][position.col] !== CellState.Empty) {
            return; // Skip occupied cells
          }

          // Find flipped positions
          const flippedPositions = findFlippedPositions(board, position, player);

          // If no flips, move should be invalid
          if (flippedPositions.length === 0) {
            const result = validateMove(board, position, player);
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('Move would not flip any discs');
          }
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });

  /**
   * Property 4: Moves with flips are valid
   * Validates: Requirements 2.3
   *
   * For any board state, player, and empty position where at least one opponent disc
   * would be flipped in any direction, the move should be accepted as valid.
   */
  it('Property 4: Moves with flips are valid', () => {
    fc.assert(
      fc.property(
        simpleBoardArbitrary,
        validPositionArbitrary,
        playerArbitrary,
        (board, position, player) => {
          // Check if the position is empty
          if (board[position.row][position.col] !== CellState.Empty) {
            return; // Skip occupied cells
          }

          // Find flipped positions
          const flippedPositions = findFlippedPositions(board, position, player);

          // If there are flips, move should be valid
          if (flippedPositions.length > 0) {
            const result = validateMove(board, position, player);
            expect(result.valid).toBe(true);
            expect(result.flippedPositions).toBeDefined();
            expect(result.flippedPositions?.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });

  /**
   * Property 5: All eight directions are checked
   * Validates: Requirements 2.4
   *
   * For any board state and position, if a valid flip sequence exists in any of the
   * 8 directions (N, NE, E, SE, S, SW, W, NW), the validation should detect it.
   */
  it('Property 5: All eight directions are checked', () => {
    fc.assert(
      fc.property(fc.constantFrom(...DIRECTIONS), playerArbitrary, (direction, player) => {
        // Create a board with a flip opportunity in the specified direction
        let board: Board = Array.from({ length: 8 }, () =>
          Array.from({ length: 8 }, () => CellState.Empty)
        );

        const opponent = player === CellState.Black ? CellState.White : CellState.Black;

        // Place discs to create a flip opportunity in the given direction
        const startPos = { row: 4, col: 4 };

        // Place opponent disc in the direction
        const opponentPos = {
          row: startPos.row + direction.rowDelta,
          col: startPos.col + direction.colDelta,
        };

        // Place player disc beyond the opponent
        const playerPos = {
          row: opponentPos.row + direction.rowDelta,
          col: opponentPos.col + direction.colDelta,
        };

        // Check if positions are valid
        if (
          opponentPos.row >= 0 &&
          opponentPos.row <= 7 &&
          opponentPos.col >= 0 &&
          opponentPos.col <= 7 &&
          playerPos.row >= 0 &&
          playerPos.row <= 7 &&
          playerPos.col >= 0 &&
          playerPos.col <= 7
        ) {
          board = setCellState(board, opponentPos, opponent);
          board = setCellState(board, playerPos, player);

          // Validate the move at startPos
          const result = validateMove(board, startPos, player);

          // Should be valid because there's a flip in this direction
          expect(result.valid).toBe(true);
          expect(result.flippedPositions).toBeDefined();
          expect(result.flippedPositions!.length).toBeGreaterThan(0);

          // Verify the opponent disc is in the flipped positions
          const flippedOpponent = result.flippedPositions!.some(
            (pos) => pos.row === opponentPos.row && pos.col === opponentPos.col
          );
          expect(flippedOpponent).toBe(true);
        }
      }),
      { numRuns: 16, endOnFailure: true }
    );
  });

  /**
   * Property 6: Direction checking validates line structure
   * Validates: Requirements 2.5
   *
   * For any board state, player, position, and direction, a flip is valid in that
   * direction only if there is at least one consecutive opponent disc followed by
   * the player's own disc.
   */
  it('Property 6: Direction checking validates line structure', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...DIRECTIONS),
        playerArbitrary,
        fc.integer({ min: 1, max: 3 }),
        (direction, player, opponentCount) => {
          // Create a board with a specific line structure
          let board: Board = Array.from({ length: 8 }, () =>
            Array.from({ length: 8 }, () => CellState.Empty)
          );

          const opponent = player === CellState.Black ? CellState.White : CellState.Black;
          const startPos = { row: 3, col: 3 };

          // Place opponent discs in the direction
          const opponentPositions: Position[] = [];
          for (let i = 1; i <= opponentCount; i++) {
            const pos = {
              row: startPos.row + direction.rowDelta * i,
              col: startPos.col + direction.colDelta * i,
            };

            if (pos.row >= 0 && pos.row <= 7 && pos.col >= 0 && pos.col <= 7) {
              board = setCellState(board, pos, opponent);
              opponentPositions.push(pos);
            } else {
              return; // Skip if out of bounds
            }
          }

          // Place player disc at the end
          const playerPos = {
            row: startPos.row + direction.rowDelta * (opponentCount + 1),
            col: startPos.col + direction.colDelta * (opponentCount + 1),
          };

          if (playerPos.row < 0 || playerPos.row > 7 || playerPos.col < 0 || playerPos.col > 7) {
            return; // Skip if out of bounds
          }

          board = setCellState(board, playerPos, player);

          // Check this direction
          const flipped = checkDirection(board, startPos, direction, player);

          // Should flip all opponent discs
          expect(flipped.length).toBe(opponentPositions.length);

          // Verify all opponent positions are in the flipped list
          for (const opponentPos of opponentPositions) {
            const found = flipped.some(
              (pos) => pos.row === opponentPos.row && pos.col === opponentPos.col
            );
            expect(found).toBe(true);
          }
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });

  /**
   * Property 7: Out-of-bounds positions are invalid
   * Validates: Requirements 2.6
   *
   * For any position where row < 0 or row > 7 or col < 0 or col > 7,
   * the move should be rejected as invalid.
   */
  it('Property 7: Out-of-bounds positions are invalid', () => {
    fc.assert(
      fc.property(outOfBoundsPositionArbitrary, playerArbitrary, (position, player) => {
        const board = createInitialBoard();

        const result = validateMove(board, position, player);

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Position is out of bounds');
      }),
      { numRuns: 20, endOnFailure: true }
    );
  });

  /**
   * Property 12: Legal moves detection is complete and accurate
   * Validates: Requirements 4.1, 4.2, 4.3
   *
   * For any board state and player, the set of legal moves should include all and
   * only those empty positions where placing a disc would flip at least one opponent disc.
   */
  it('Property 12: Legal moves detection is complete and accurate', () => {
    fc.assert(
      fc.property(simpleBoardArbitrary, playerArbitrary, (board, player) => {
        const legalMoves = getLegalMoves(board, player);

        // Get all empty positions
        const emptyPositions = getEmptyPositions(board);

        // Verify each legal move is actually valid
        for (const move of legalMoves) {
          const result = validateMove(board, move, player);
          expect(result.valid).toBe(true);
          expect(result.flippedPositions).toBeDefined();
          expect(result.flippedPositions!.length).toBeGreaterThan(0);
        }

        // Verify all valid moves are included in legal moves
        for (const emptyPos of emptyPositions) {
          const result = validateMove(board, emptyPos, player);
          const isInLegalMoves = legalMoves.some(
            (move) => move.row === emptyPos.row && move.col === emptyPos.col
          );

          if (result.valid) {
            expect(isInLegalMoves).toBe(true);
          } else {
            expect(isInLegalMoves).toBe(false);
          }
        }

        // Verify legal moves count is <= empty positions count
        expect(legalMoves.length).toBeLessThanOrEqual(emptyPositions.length);
      }),
      { numRuns: 15, endOnFailure: true }
    );
  });

  /**
   * Property 13: No legal moves returns empty list
   * Validates: Requirements 4.4
   *
   * For any board state where a player has no valid moves (all empty positions fail
   * to flip any opponent discs), getLegalMoves() should return an empty list.
   */
  it('Property 13: No legal moves returns empty list', () => {
    fc.assert(
      fc.property(playerArbitrary, (player) => {
        // Create a board where the player has no legal moves
        let board: Board = Array.from({ length: 8 }, () =>
          Array.from({ length: 8 }, () => CellState.Empty)
        );

        // Place only player's discs with no opponent discs to flip
        board = setCellState(board, { row: 0, col: 0 }, player);
        board = setCellState(board, { row: 0, col: 1 }, player);
        board = setCellState(board, { row: 1, col: 0 }, player);

        const legalMoves = getLegalMoves(board, player);

        // Should return empty list
        expect(legalMoves.length).toBe(0);

        // Verify hasLegalMoves returns false
        const hasMoves = hasLegalMoves(board, player);
        expect(hasMoves).toBe(false);
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });
});
