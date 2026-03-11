/**
 * Legal moves calculation wrapper for Othello game
 *
 * This module provides wrapper functions for calculating legal moves in the Othello game.
 * It wraps the existing Othello game logic (spec 13) to work with the web frontend's
 * data structures.
 *
 * The implementation uses the same algorithm as the API package's Othello logic,
 * checking all 8 directions from each empty cell to find valid moves.
 */

/**
 * Board state type for the web frontend
 * 8x8 array where each cell is 'empty', 'black', or 'white'
 */
export type BoardState = Array<Array<'empty' | 'black' | 'white'>>;

/**
 * Position on the board (0-7 for both row and column)
 */
export interface Position {
  readonly row: number;
  readonly col: number;
}

/**
 * Direction vector for checking lines
 */
interface Direction {
  readonly rowDelta: number;
  readonly colDelta: number;
}

/**
 * The 8 possible directions from any cell
 */
const DIRECTIONS: readonly Direction[] = [
  { rowDelta: -1, colDelta: 0 }, // North
  { rowDelta: -1, colDelta: 1 }, // Northeast
  { rowDelta: 0, colDelta: 1 }, // East
  { rowDelta: 1, colDelta: 1 }, // Southeast
  { rowDelta: 1, colDelta: 0 }, // South
  { rowDelta: 1, colDelta: -1 }, // Southwest
  { rowDelta: 0, colDelta: -1 }, // West
  { rowDelta: -1, colDelta: -1 }, // Northwest
];

/**
 * Checks if a position is within board boundaries
 */
function isValidPosition(position: Position): boolean {
  return position.row >= 0 && position.row <= 7 && position.col >= 0 && position.col <= 7;
}

/**
 * Checks a single direction for flippable discs
 *
 * @param boardState - The game board
 * @param position - The starting position (where the new disc would be placed)
 * @param direction - The direction to check
 * @param player - The player making the move
 * @returns An array of positions that would be flipped in this direction
 */
function checkDirection(
  boardState: BoardState,
  position: Position,
  direction: Direction,
  player: 'black' | 'white'
): Position[] {
  const opponent = player === 'black' ? 'white' : 'black';
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
    boardState[currentRow][currentCol] === opponent
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
    boardState[currentRow][currentCol] !== player
  ) {
    return [];
  }

  return flippedPositions;
}

/**
 * Finds all positions that would be flipped by a move
 *
 * @param boardState - The game board
 * @param position - The position where the disc would be placed
 * @param player - The player making the move
 * @returns An array of all positions that would be flipped
 */
function findFlippedPositions(
  boardState: BoardState,
  position: Position,
  player: 'black' | 'white'
): Position[] {
  const allFlippedPositions: Position[] = [];

  // Check all 8 directions
  for (const direction of DIRECTIONS) {
    const flippedInDirection = checkDirection(boardState, position, direction, player);
    allFlippedPositions.push(...flippedInDirection);
  }

  return allFlippedPositions;
}

/**
 * Calculates all legal moves for the current player
 *
 * A move is legal if:
 * 1. The position is within board boundaries
 * 2. The cell is empty
 * 3. At least one opponent disc would be flipped
 *
 * @param boardState - Current board state
 * @param currentPlayer - Current player ('black' or 'white')
 * @returns Array of positions where the player can legally place a disc
 */
export function calculateLegalMoves(
  boardState: BoardState,
  currentPlayer: 'black' | 'white'
): Position[] {
  const legalMoves: Position[] = [];

  // Check all positions on the board
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const position = { row, col };

      // Skip if cell is not empty
      if (boardState[row][col] !== 'empty') {
        continue;
      }

      // Check if this move would flip any discs
      const flippedPositions = findFlippedPositions(boardState, position, currentPlayer);

      if (flippedPositions.length > 0) {
        legalMoves.push(position);
      }
    }
  }

  return legalMoves;
}

/**
 * Checks if a specific move is legal
 *
 * A move is legal if:
 * 1. The position is within board boundaries
 * 2. The cell is empty
 * 3. At least one opponent disc would be flipped
 *
 * @param boardState - Current board state
 * @param position - Position to check
 * @param currentPlayer - Current player ('black' or 'white')
 * @returns true if the move is legal, false otherwise
 */
export function isLegalMove(
  boardState: BoardState,
  position: Position,
  currentPlayer: 'black' | 'white'
): boolean {
  // Check if position is within bounds
  if (!isValidPosition(position)) {
    return false;
  }

  // Check if cell is empty
  if (boardState[position.row][position.col] !== 'empty') {
    return false;
  }

  // Find all positions that would be flipped
  const flippedPositions = findFlippedPositions(boardState, position, currentPlayer);

  // Move is valid only if at least one disc would be flipped
  return flippedPositions.length > 0;
}
