/**
 * Core type definitions for Othello game logic
 *
 * This module defines all types used throughout the Othello game implementation.
 * All types follow immutable patterns using readonly modifiers.
 */

/**
 * Represents a disc color or empty cell
 */
export enum CellState {
  Empty = 0,
  Black = 1,
  White = 2,
}

/**
 * Represents a player color
 */
export type Player = CellState.Black | CellState.White;

/**
 * Board position (0-7 for both row and column)
 */
export interface Position {
  readonly row: number;
  readonly col: number;
}

/**
 * Direction vector for checking lines
 */
export interface Direction {
  readonly rowDelta: number;
  readonly colDelta: number;
}

/**
 * The 8 possible directions from any cell
 */
export const DIRECTIONS: readonly Direction[] = [
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
 * Immutable 8x8 game board
 */
export type Board = readonly (readonly CellState[])[];

/**
 * Game status
 */
export enum GameStatus {
  InProgress = 'in_progress',
  Finished = 'finished',
}

/**
 * A move in the game
 */
export interface Move {
  readonly position: Position;
  readonly player: Player;
  readonly flippedPositions: readonly Position[];
}

/**
 * Complete game state
 */
export interface GameState {
  readonly board: Board;
  readonly currentPlayer: Player;
  readonly status: GameStatus;
  readonly history: readonly Move[];
  readonly blackScore: number;
  readonly whiteScore: number;
}

/**
 * Result of a move validation
 */
export interface ValidationResult {
  readonly valid: boolean;
  readonly reason?: string;
  readonly flippedPositions?: readonly Position[];
}

/**
 * Serialized game state for storage
 */
export interface SerializedGameState {
  readonly board: number[][];
  readonly currentPlayer: number;
  readonly status: string;
  readonly history: Array<{
    readonly position: { readonly row: number; readonly col: number };
    readonly player: number;
    readonly flippedPositions: Array<{ readonly row: number; readonly col: number }>;
  }>;
}

/**
 * Game result
 */
export interface GameResult {
  readonly winner: Player | null; // null indicates draw
  readonly blackScore: number;
  readonly whiteScore: number;
}
