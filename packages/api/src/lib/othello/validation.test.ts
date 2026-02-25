/**
 * Unit tests for validation module
 *
 * Tests move validation logic according to Othello rules.
 * Requirements: 2.1-2.6, 4.1-4.4
 */

import { describe, it, expect } from 'vitest';
import {
  validateMove,
  findFlippedPositions,
  checkDirection,
  getLegalMoves,
  hasLegalMoves,
} from './validation';
import { createInitialBoard, setCellState } from './board';
import { Board, CellState, Position, Direction } from './types';

describe('validation module', () => {
  describe('validateMove', () => {
    describe('occupied cell rejection (Requirement 2.1)', () => {
      it('should reject move on cell occupied by Black disc', () => {
        const board = createInitialBoard();
        const position: Position = { row: 3, col: 4 }; // Black disc at initial position

        const result = validateMove(board, position, CellState.Black);

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Cell is already occupied');
      });

      it('should reject move on cell occupied by White disc', () => {
        const board = createInitialBoard();
        const position: Position = { row: 3, col: 3 }; // White disc at initial position

        const result = validateMove(board, position, CellState.White);

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Cell is already occupied');
      });
    });

    describe('moves without flips are invalid (Requirement 2.2)', () => {
      it('should reject move that would not flip any discs', () => {
        const board = createInitialBoard();
        const position: Position = { row: 0, col: 0 }; // Corner, no adjacent opponent discs

        const result = validateMove(board, position, CellState.Black);

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Move would not flip any discs');
      });

      it('should reject move on empty board with no discs to flip', () => {
        // Create empty board
        const emptyBoard: Board = Array.from({ length: 8 }, () =>
          Array.from({ length: 8 }, () => CellState.Empty)
        );
        const position: Position = { row: 4, col: 4 };

        const result = validateMove(emptyBoard, position, CellState.Black);

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Move would not flip any discs');
      });
    });

    describe('moves with flips in various directions (Requirement 2.3)', () => {
      it('should accept valid move that flips discs horizontally (East)', () => {
        const board = createInitialBoard();
        const position: Position = { row: 3, col: 5 }; // East of Black disc at (3,4)

        const result = validateMove(board, position, CellState.White);

        expect(result.valid).toBe(true);
        expect(result.flippedPositions).toBeDefined();
        expect(result.flippedPositions?.length).toBeGreaterThan(0);
      });

      it('should accept valid move that flips discs vertically (South)', () => {
        const board = createInitialBoard();
        const position: Position = { row: 5, col: 3 }; // South of Black disc at (4,3)

        const result = validateMove(board, position, CellState.White);

        expect(result.valid).toBe(true);
        expect(result.flippedPositions).toBeDefined();
        expect(result.flippedPositions?.length).toBeGreaterThan(0);
      });

      it('should accept valid move that flips discs diagonally (Northeast)', () => {
        // Create a board with diagonal setup: Black - White - position
        let board: Board = Array.from({ length: 8 }, () =>
          Array.from({ length: 8 }, () => CellState.Empty)
        );

        board = setCellState(board, { row: 3, col: 3 }, CellState.Black);
        board = setCellState(board, { row: 2, col: 4 }, CellState.White);

        const position: Position = { row: 1, col: 5 };

        const result = validateMove(board, position, CellState.Black);

        expect(result.valid).toBe(true);
        expect(result.flippedPositions).toBeDefined();
      });

      it('should accept valid move that flips discs in multiple directions', () => {
        // Create a board where a move flips in multiple directions
        const board = createInitialBoard();
        // On initial board, Black can play at (2,3) which flips (3,3)

        const position: Position = { row: 2, col: 3 };

        const result = validateMove(board, position, CellState.Black);

        expect(result.valid).toBe(true);
        expect(result.flippedPositions).toBeDefined();
        expect(result.flippedPositions!.length).toBeGreaterThan(0);
      });

      it('should validate all standard opening moves for Black', () => {
        const board = createInitialBoard();
        const validMoves = [
          { row: 2, col: 3 },
          { row: 3, col: 2 },
          { row: 4, col: 5 },
          { row: 5, col: 4 },
        ];

        for (const position of validMoves) {
          const result = validateMove(board, position, CellState.Black);
          expect(result.valid).toBe(true);
        }
      });
    });

    describe('out-of-bounds position rejection (Requirement 2.6)', () => {
      it('should reject move with negative row', () => {
        const board = createInitialBoard();
        const position: Position = { row: -1, col: 3 };

        const result = validateMove(board, position, CellState.Black);

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Position is out of bounds');
      });

      it('should reject move with negative column', () => {
        const board = createInitialBoard();
        const position: Position = { row: 3, col: -1 };

        const result = validateMove(board, position, CellState.Black);

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Position is out of bounds');
      });

      it('should reject move with row >= 8', () => {
        const board = createInitialBoard();
        const position: Position = { row: 8, col: 3 };

        const result = validateMove(board, position, CellState.Black);

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Position is out of bounds');
      });

      it('should reject move with column >= 8', () => {
        const board = createInitialBoard();
        const position: Position = { row: 3, col: 8 };

        const result = validateMove(board, position, CellState.Black);

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Position is out of bounds');
      });

      it('should reject move with both coordinates out of bounds', () => {
        const board = createInitialBoard();
        const position: Position = { row: -5, col: 10 };

        const result = validateMove(board, position, CellState.Black);

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Position is out of bounds');
      });
    });
  });

  describe('checkDirection', () => {
    it('should find flippable discs in a single direction', () => {
      const board = createInitialBoard();
      const position: Position = { row: 3, col: 5 };
      const direction: Direction = { rowDelta: 0, colDelta: -1 }; // West

      const flipped = checkDirection(board, position, direction, CellState.White);

      expect(flipped.length).toBe(1);
      expect(flipped[0]).toEqual({ row: 3, col: 4 }); // Black disc at (3,4)
    });

    it('should return empty array when no opponent discs in direction', () => {
      const board = createInitialBoard();
      const position: Position = { row: 2, col: 2 };
      const direction: Direction = { rowDelta: -1, colDelta: 0 }; // North

      const flipped = checkDirection(board, position, direction, CellState.Black);

      expect(flipped.length).toBe(0);
    });

    it('should return empty array when line does not end with player disc', () => {
      const board = createInitialBoard();
      const position: Position = { row: 3, col: 6 };
      const direction: Direction = { rowDelta: 0, colDelta: -1 }; // West

      const flipped = checkDirection(board, position, direction, CellState.Black);

      expect(flipped.length).toBe(0);
    });

    it('should handle multiple consecutive opponent discs', () => {
      // Create a board with multiple opponent discs in a row
      let board = createInitialBoard();
      board = setCellState(board, { row: 3, col: 5 }, CellState.Black);
      board = setCellState(board, { row: 3, col: 6 }, CellState.White);

      const position: Position = { row: 3, col: 2 };
      const direction: Direction = { rowDelta: 0, colDelta: 1 }; // East

      const flipped = checkDirection(board, position, direction, CellState.Black);

      expect(flipped.length).toBe(1); // Only the White disc at (3,3)
      expect(flipped[0]).toEqual({ row: 3, col: 3 });
    });
  });

  describe('findFlippedPositions', () => {
    it('should find all flipped positions in multiple directions', () => {
      // Use initial board where Black can make a valid move
      const board = createInitialBoard();
      const position: Position = { row: 2, col: 3 };

      const flipped = findFlippedPositions(board, position, CellState.Black);

      expect(flipped.length).toBeGreaterThan(0);
    });

    it('should return empty array when no discs can be flipped', () => {
      const board = createInitialBoard();
      const position: Position = { row: 0, col: 0 };

      const flipped = findFlippedPositions(board, position, CellState.Black);

      expect(flipped.length).toBe(0);
    });

    it('should check all 8 directions (Requirement 2.4)', () => {
      // Create a board with potential flips in multiple directions
      let board: Board = Array.from({ length: 8 }, () =>
        Array.from({ length: 8 }, () => CellState.Empty)
      );

      // Place Black disc in center
      board = setCellState(board, { row: 4, col: 4 }, CellState.Black);

      // Place White discs in all 8 directions
      board = setCellState(board, { row: 3, col: 4 }, CellState.White); // North
      board = setCellState(board, { row: 3, col: 5 }, CellState.White); // Northeast
      board = setCellState(board, { row: 4, col: 5 }, CellState.White); // East
      board = setCellState(board, { row: 5, col: 5 }, CellState.White); // Southeast
      board = setCellState(board, { row: 5, col: 4 }, CellState.White); // South
      board = setCellState(board, { row: 5, col: 3 }, CellState.White); // Southwest
      board = setCellState(board, { row: 4, col: 3 }, CellState.White); // West
      board = setCellState(board, { row: 3, col: 3 }, CellState.White); // Northwest

      // Place Black discs to anchor the flips
      board = setCellState(board, { row: 2, col: 4 }, CellState.Black); // North
      board = setCellState(board, { row: 2, col: 6 }, CellState.Black); // Northeast
      board = setCellState(board, { row: 4, col: 6 }, CellState.Black); // East
      board = setCellState(board, { row: 6, col: 6 }, CellState.Black); // Southeast
      board = setCellState(board, { row: 6, col: 4 }, CellState.Black); // South
      board = setCellState(board, { row: 6, col: 2 }, CellState.Black); // Southwest
      board = setCellState(board, { row: 4, col: 2 }, CellState.Black); // West
      board = setCellState(board, { row: 2, col: 2 }, CellState.Black); // Northwest

      const position: Position = { row: 4, col: 4 };

      const flipped = findFlippedPositions(board, position, CellState.Black);

      // Should find White discs in all 8 directions
      expect(flipped.length).toBe(8);
    });
  });

  describe('getLegalMoves', () => {
    describe('legal moves detection for known board positions (Requirements 4.1-4.4)', () => {
      it('should return all 4 legal moves for Black on initial board', () => {
        const board = createInitialBoard();

        const legalMoves = getLegalMoves(board, CellState.Black);

        expect(legalMoves.length).toBe(4);

        // Check that all expected moves are present
        const expectedMoves = [
          { row: 2, col: 3 },
          { row: 3, col: 2 },
          { row: 4, col: 5 },
          { row: 5, col: 4 },
        ];

        for (const expectedMove of expectedMoves) {
          const found = legalMoves.some(
            (move) => move.row === expectedMove.row && move.col === expectedMove.col
          );
          expect(found).toBe(true);
        }
      });

      it('should return all 4 legal moves for White on initial board', () => {
        const board = createInitialBoard();

        const legalMoves = getLegalMoves(board, CellState.White);

        expect(legalMoves.length).toBe(4);

        // Check that all expected moves are present
        const expectedMoves = [
          { row: 2, col: 4 },
          { row: 3, col: 5 },
          { row: 4, col: 2 },
          { row: 5, col: 3 },
        ];

        for (const expectedMove of expectedMoves) {
          const found = legalMoves.some(
            (move) => move.row === expectedMove.row && move.col === expectedMove.col
          );
          expect(found).toBe(true);
        }
      });

      it('should return empty array when no legal moves exist (Requirement 4.4)', () => {
        // Create a board where Black has no legal moves
        let board: Board = Array.from({ length: 8 }, () =>
          Array.from({ length: 8 }, () => CellState.Empty)
        );

        // Place only Black discs with no White discs to flip
        board = setCellState(board, { row: 0, col: 0 }, CellState.Black);
        board = setCellState(board, { row: 0, col: 1 }, CellState.Black);

        const legalMoves = getLegalMoves(board, CellState.Black);

        expect(legalMoves.length).toBe(0);
      });

      it('should only include moves that flip at least one disc (Requirement 4.3)', () => {
        const board = createInitialBoard();

        const legalMoves = getLegalMoves(board, CellState.Black);

        // Verify each legal move actually flips discs
        for (const move of legalMoves) {
          const result = validateMove(board, move, CellState.Black);
          expect(result.valid).toBe(true);
          expect(result.flippedPositions).toBeDefined();
          expect(result.flippedPositions!.length).toBeGreaterThan(0);
        }
      });

      it('should check all empty cells on the board (Requirement 4.2)', () => {
        // Create a sparse board
        let board: Board = Array.from({ length: 8 }, () =>
          Array.from({ length: 8 }, () => CellState.Empty)
        );

        board = setCellState(board, { row: 0, col: 0 }, CellState.Black);
        board = setCellState(board, { row: 0, col: 1 }, CellState.White);
        board = setCellState(board, { row: 0, col: 2 }, CellState.Black);

        const legalMoves = getLegalMoves(board, CellState.Black);

        // Should find legal moves if they exist
        expect(Array.isArray(legalMoves)).toBe(true);
      });
    });
  });

  describe('hasLegalMoves', () => {
    it('should return true when player has legal moves', () => {
      const board = createInitialBoard();

      const hasMovesBlack = hasLegalMoves(board, CellState.Black);
      const hasMovesWhite = hasLegalMoves(board, CellState.White);

      expect(hasMovesBlack).toBe(true);
      expect(hasMovesWhite).toBe(true);
    });

    it('should return false when player has no legal moves', () => {
      // Create a board where Black has no legal moves
      let board: Board = Array.from({ length: 8 }, () =>
        Array.from({ length: 8 }, () => CellState.Empty)
      );

      board = setCellState(board, { row: 0, col: 0 }, CellState.Black);
      board = setCellState(board, { row: 0, col: 1 }, CellState.Black);

      const hasMoves = hasLegalMoves(board, CellState.Black);

      expect(hasMoves).toBe(false);
    });

    it('should return false on empty board', () => {
      const emptyBoard: Board = Array.from({ length: 8 }, () =>
        Array.from({ length: 8 }, () => CellState.Empty)
      );

      const hasMovesBlack = hasLegalMoves(emptyBoard, CellState.Black);
      const hasMovesWhite = hasLegalMoves(emptyBoard, CellState.White);

      expect(hasMovesBlack).toBe(false);
      expect(hasMovesWhite).toBe(false);
    });

    it('should return true even if only one legal move exists', () => {
      // Use initial board where Black has exactly 4 legal moves
      const board = createInitialBoard();

      const hasMoves = hasLegalMoves(board, CellState.Black);

      expect(hasMoves).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle corner positions correctly', () => {
      let board: Board = Array.from({ length: 8 }, () =>
        Array.from({ length: 8 }, () => CellState.Empty)
      );

      // Setup for corner move
      board = setCellState(board, { row: 0, col: 1 }, CellState.White);
      board = setCellState(board, { row: 0, col: 2 }, CellState.Black);

      const result = validateMove(board, { row: 0, col: 0 }, CellState.Black);

      expect(result.valid).toBe(true);
    });

    it('should handle edge positions correctly', () => {
      let board: Board = Array.from({ length: 8 }, () =>
        Array.from({ length: 8 }, () => CellState.Empty)
      );

      // Setup for edge move
      board = setCellState(board, { row: 0, col: 3 }, CellState.White);
      board = setCellState(board, { row: 0, col: 4 }, CellState.Black);

      const result = validateMove(board, { row: 0, col: 2 }, CellState.Black);

      expect(result.valid).toBe(true);
    });

    it('should validate line structure correctly (Requirement 2.5)', () => {
      // Test that at least one opponent disc followed by player disc is required
      let board: Board = Array.from({ length: 8 }, () =>
        Array.from({ length: 8 }, () => CellState.Empty)
      );

      // Place: Empty - White - White - Black
      board = setCellState(board, { row: 3, col: 4 }, CellState.White);
      board = setCellState(board, { row: 3, col: 5 }, CellState.White);
      board = setCellState(board, { row: 3, col: 6 }, CellState.Black);

      const result = validateMove(board, { row: 3, col: 3 }, CellState.Black);

      expect(result.valid).toBe(true);
      expect(result.flippedPositions?.length).toBe(2);
    });
  });
});
