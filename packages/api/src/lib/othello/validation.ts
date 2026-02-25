/**
 * Validation module for Othello game logic
 *
 * This module provides functions for validating moves according to Othello rules.
 * A move is valid if it places a disc on an empty cell and flips at least one
 * opponent disc in any direction.
 */

import {
  Board,
  CellState,
  Direction,
  DIRECTIONS,
  Player,
  Position,
  ValidationResult,
} from './types';
import { getCellState, isValidPosition } from './board';

/**
 * Checks a single direction for flippable discs
 *
 * Starting from the given position, moves in the specified direction and checks
 * if there is a valid line of opponent discs followed by the player's own disc.
 *
 * @param board - The game board
 * @param position - The starting position (where the new disc would be placed)
 * @param direction - The direction to check
 * @param player - The player making the move
 * @returns An array of positions that would be flipped in this direction
 */
export function checkDirection(
  board: Board,
  position: Position,
  direction: Direction,
  player: Player
): readonly Position[] {
  const opponent = player === CellState.Black ? CellState.White : CellState.Black;
  const flippedPositions: Position[] = [];

  // Start from the next position in the direction
  let currentRow = position.row + direction.rowDelta;
  let currentCol = position.col + direction.colDelta;

  // First, collect all consecutive opponent discs
  while (
    currentRow >= 0 &&
    currentRow <= 7 &&
    currentCol >= 0 &&
    currentCol <= 7 &&
    board[currentRow][currentCol] === opponent
  ) {
    flippedPositions.push({ row: currentRow, col: currentCol });
    currentRow += direction.rowDelta;
    currentCol += direction.colDelta;
  }

  // Check if the line ends with the player's own disc
  // If not, or if we found no opponent discs, this direction is invalid
  if (
    flippedPositions.length === 0 ||
    currentRow < 0 ||
    currentRow > 7 ||
    currentCol < 0 ||
    currentCol > 7 ||
    board[currentRow][currentCol] !== player
  ) {
    return [];
  }

  return flippedPositions;
}

/**
 * Finds all positions that would be flipped by a move
 *
 * Checks all 8 directions from the given position and collects all opponent
 * discs that would be flipped.
 *
 * @param board - The game board
 * @param position - The position where the disc would be placed
 * @param player - The player making the move
 * @returns An array of all positions that would be flipped
 */
export function findFlippedPositions(
  board: Board,
  position: Position,
  player: Player
): readonly Position[] {
  const allFlippedPositions: Position[] = [];

  // Check all 8 directions
  for (const direction of DIRECTIONS) {
    const flippedInDirection = checkDirection(board, position, direction, player);
    allFlippedPositions.push(...flippedInDirection);
  }

  return allFlippedPositions;
}

/**
 * Validates if a move is legal according to Othello rules
 *
 * A move is valid if:
 * 1. The position is within board boundaries
 * 2. The cell is empty
 * 3. At least one opponent disc would be flipped
 *
 * @param board - The game board
 * @param position - The position where the disc would be placed
 * @param player - The player making the move
 * @returns A validation result with valid flag, optional reason, and flipped positions
 */
export function validateMove(board: Board, position: Position, player: Player): ValidationResult {
  // Check if position is within bounds
  if (!isValidPosition(position)) {
    return {
      valid: false,
      reason: 'Position is out of bounds',
    };
  }

  // Check if cell is empty
  const cellState = getCellState(board, position);
  if (cellState !== CellState.Empty) {
    return {
      valid: false,
      reason: 'Cell is already occupied',
    };
  }

  // Find all positions that would be flipped
  const flippedPositions = findFlippedPositions(board, position, player);

  // Move is valid only if at least one disc would be flipped
  if (flippedPositions.length === 0) {
    return {
      valid: false,
      reason: 'Move would not flip any discs',
    };
  }

  return {
    valid: true,
    flippedPositions,
  };
}

/**
 * Gets all legal moves for a player
 *
 * Checks all empty positions on the board and returns those where the player
 * can make a valid move.
 *
 * @param board - The game board
 * @param player - The player to check moves for
 * @returns An array of all positions where the player can legally place a disc
 */
export function getLegalMoves(board: Board, player: Player): readonly Position[] {
  const legalMoves: Position[] = [];

  // Check all positions on the board
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const position = { row, col };
      const result = validateMove(board, position, player);
      if (result.valid) {
        legalMoves.push(position);
      }
    }
  }

  return legalMoves;
}

/**
 * Checks if a player has any legal moves
 *
 * @param board - The game board
 * @param player - The player to check
 * @returns true if the player has at least one legal move, false otherwise
 */
export function hasLegalMoves(board: Board, player: Player): boolean {
  // Check all positions on the board
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const position = { row, col };
      const result = validateMove(board, position, player);
      if (result.valid) {
        return true;
      }
    }
  }

  return false;
}
