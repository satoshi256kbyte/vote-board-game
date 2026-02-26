/**
 * Game state module for Othello game logic
 *
 * This module provides functions for managing game state, including
 * initialization, turn management, and game end detection.
 */

import { Board, CellState, GameState, GameStatus, Move, Player, Position } from './types';
import { createInitialBoard, countDiscs, isBoardFull } from './board';
import { validateMove, hasLegalMoves, getLegalMoves } from './validation';
import { executeMove, createMove } from './moves';

/**
 * Creates initial game state with standard Othello starting position
 *
 * @returns A new game state with Black to move first
 */
export function createInitialGameState(): GameState {
  const board = createInitialBoard();

  return {
    board,
    currentPlayer: CellState.Black,
    status: GameStatus.InProgress,
    history: [],
    blackScore: 2,
    whiteScore: 2,
  };
}

/**
 * Switches the current player
 *
 * @param player - The current player
 * @returns The opposite player
 */
export function switchPlayer(player: Player): Player {
  return player === CellState.Black ? CellState.White : CellState.Black;
}

/**
 * Checks if the game should end
 *
 * Game ends when:
 * - Both players have no legal moves
 * - Board is full
 * - Only one color remains
 *
 * @param board - The game board
 * @param currentPlayer - The current player
 * @returns true if the game should end, false otherwise
 */
export function shouldEndGame(board: Board, currentPlayer: Player): boolean {
  // Check if board is full
  if (isBoardFull(board)) {
    return true;
  }

  // Check if only one color remains
  const blackCount = countDiscs(board, CellState.Black);
  const whiteCount = countDiscs(board, CellState.White);
  if (blackCount === 0 || whiteCount === 0) {
    return true;
  }

  // Check if both players have no legal moves
  const currentHasMoves = hasLegalMoves(board, currentPlayer);
  const opponentHasMoves = hasLegalMoves(board, switchPlayer(currentPlayer));

  return !currentHasMoves && !opponentHasMoves;
}

/**
 * Updates game status based on current board state
 *
 * @param gameState - The current game state
 * @returns Updated game state with correct status
 */
export function updateGameStatus(gameState: GameState): GameState {
  if (shouldEndGame(gameState.board, gameState.currentPlayer)) {
    return {
      ...gameState,
      status: GameStatus.Finished,
    };
  }

  return gameState;
}

/**
 * Processes a turn, including automatic pass if player has no legal moves
 *
 * @param gameState - The current game state
 * @returns Updated game state after processing the turn
 */
export function processTurn(gameState: GameState): GameState {
  // If current player has no legal moves, pass to opponent
  if (!hasLegalMoves(gameState.board, gameState.currentPlayer)) {
    const nextPlayer = switchPlayer(gameState.currentPlayer);

    // Check if game should end (both players have no moves)
    if (!hasLegalMoves(gameState.board, nextPlayer)) {
      return {
        ...gameState,
        status: GameStatus.Finished,
      };
    }

    // Pass to opponent
    return {
      ...gameState,
      currentPlayer: nextPlayer,
    };
  }

  return gameState;
}

/**
 * Makes a move and updates game state
 *
 * @param gameState - The current game state
 * @param position - The position where the disc will be placed
 * @returns Updated game state after the move, or the original state if move is invalid
 */
export function makeMove(gameState: GameState, position: Position): GameState {
  // Reject moves on finished games
  if (gameState.status === GameStatus.Finished) {
    return gameState;
  }

  // Validate the move
  const validationResult = validateMove(gameState.board, position, gameState.currentPlayer);
  if (!validationResult.valid || !validationResult.flippedPositions) {
    return gameState;
  }

  // Execute the move
  const newBoard = executeMove(
    gameState.board,
    position,
    gameState.currentPlayer,
    validationResult.flippedPositions
  );

  // Create move record
  const move = createMove(position, gameState.currentPlayer, validationResult.flippedPositions);

  // Update scores
  const blackScore = countDiscs(newBoard, CellState.Black);
  const whiteScore = countDiscs(newBoard, CellState.White);

  // Create new game state with move applied
  let newGameState: GameState = {
    board: newBoard,
    currentPlayer: switchPlayer(gameState.currentPlayer),
    status: gameState.status,
    history: [...gameState.history, move],
    blackScore,
    whiteScore,
  };

  // Process turn (handle automatic pass)
  newGameState = processTurn(newGameState);

  // Update game status
  newGameState = updateGameStatus(newGameState);

  return newGameState;
}
