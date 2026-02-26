/**
 * Othello game logic public API
 *
 * This module exports all public functions and types for the Othello game logic.
 */

// Export enums as values
export { CellState, GameStatus } from './types';

// Types
export type {
  Player,
  Position,
  Direction,
  Board,
  Move,
  GameState,
  ValidationResult,
  SerializedGameState,
  GameResult,
} from './types';

export { DIRECTIONS } from './types';

// Board operations
export {
  createInitialBoard,
  getCellState,
  setCellState,
  isValidPosition,
  getEmptyPositions,
  countDiscs,
  isBoardFull,
} from './board';

// Validation
export {
  checkDirection,
  findFlippedPositions,
  validateMove,
  getLegalMoves,
  hasLegalMoves,
} from './validation';

// Moves
export { flipDiscs, executeMove, createMove } from './moves';

// Game state management
export {
  createInitialGameState,
  switchPlayer,
  shouldEndGame,
  updateGameStatus,
  processTurn,
  makeMove,
} from './game-state';
