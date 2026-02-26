/**
 * Unit tests for game-state module
 *
 * Tests game state initialization, player switching, automatic pass,
 * game end detection, and move rejection on finished games.
 */

import { describe, it, expect } from 'vitest';
import {
  createInitialGameState,
  switchPlayer,
  shouldEndGame,
  updateGameStatus,
  processTurn,
  makeMove,
} from './game-state';
import { CellState, GameStatus, Position } from './types';
import { createInitialBoard } from './board';

describe('game-state module', () => {
  describe('createInitialGameState', () => {
    it('should create initial game state with standard starting position', () => {
      const gameState = createInitialGameState();

      expect(gameState.currentPlayer).toBe(CellState.Black);
      expect(gameState.status).toBe(GameStatus.InProgress);
      expect(gameState.history).toEqual([]);
      expect(gameState.blackScore).toBe(2);
      expect(gameState.whiteScore).toBe(2);
      expect(gameState.board).toBeDefined();
    });

    it('should have Black player start first', () => {
      const gameState = createInitialGameState();
      expect(gameState.currentPlayer).toBe(CellState.Black);
    });

    it('should have empty history', () => {
      const gameState = createInitialGameState();
      expect(gameState.history.length).toBe(0);
    });
  });

  describe('switchPlayer', () => {
    it('should switch from Black to White', () => {
      const nextPlayer = switchPlayer(CellState.Black);
      expect(nextPlayer).toBe(CellState.White);
    });

    it('should switch from White to Black', () => {
      const nextPlayer = switchPlayer(CellState.White);
      expect(nextPlayer).toBe(CellState.Black);
    });
  });

  describe('shouldEndGame', () => {
    it('should return true when board is full', () => {
      // Create a full board
      const fullBoard = Array.from({ length: 8 }, () =>
        Array.from({ length: 8 }, () => CellState.Black)
      );

      const result = shouldEndGame(fullBoard, CellState.Black);
      expect(result).toBe(true);
    });

    it('should return true when only Black discs remain', () => {
      const board = Array.from({ length: 8 }, () =>
        Array.from({ length: 8 }, () => CellState.Empty)
      );
      board[0][0] = CellState.Black;
      board[0][1] = CellState.Black;

      const result = shouldEndGame(board, CellState.Black);
      expect(result).toBe(true);
    });

    it('should return true when only White discs remain', () => {
      const board = Array.from({ length: 8 }, () =>
        Array.from({ length: 8 }, () => CellState.Empty)
      );
      board[0][0] = CellState.White;
      board[0][1] = CellState.White;

      const result = shouldEndGame(board, CellState.White);
      expect(result).toBe(true);
    });

    it('should return false for initial board state', () => {
      const board = createInitialBoard();
      const result = shouldEndGame(board, CellState.Black);
      expect(result).toBe(false);
    });
  });

  describe('updateGameStatus', () => {
    it('should set status to finished when game should end', () => {
      const fullBoard = Array.from({ length: 8 }, () =>
        Array.from({ length: 8 }, () => CellState.Black)
      );

      const gameState = {
        board: fullBoard,
        currentPlayer: CellState.Black,
        status: GameStatus.InProgress,
        history: [],
        blackScore: 64,
        whiteScore: 0,
      };

      const updated = updateGameStatus(gameState);
      expect(updated.status).toBe(GameStatus.Finished);
    });

    it('should keep status as in_progress when game continues', () => {
      const gameState = createInitialGameState();
      const updated = updateGameStatus(gameState);
      expect(updated.status).toBe(GameStatus.InProgress);
    });
  });

  describe('processTurn', () => {
    it('should pass turn when current player has no legal moves', () => {
      // Create a simple board where Black has no moves
      const board = Array.from({ length: 8 }, () =>
        Array.from({ length: 8 }, () => CellState.Empty)
      );
      // Only White discs, Black has no moves
      board[3][3] = CellState.White;
      board[3][4] = CellState.White;
      board[4][3] = CellState.White;

      const gameState = {
        board,
        currentPlayer: CellState.Black,
        status: GameStatus.InProgress,
        history: [],
        blackScore: 0,
        whiteScore: 3,
      };

      const updated = processTurn(gameState);
      // Since Black has no moves and White also has no moves (no Black discs to flip),
      // the game should end
      expect(updated.status).toBe(GameStatus.Finished);
    });

    it('should end game when both players have no legal moves', () => {
      // Create a board where neither player has moves
      const board = Array.from({ length: 8 }, () =>
        Array.from({ length: 8 }, () => CellState.Empty)
      );
      board[0][0] = CellState.Black;
      board[7][7] = CellState.White;

      const gameState = {
        board,
        currentPlayer: CellState.Black,
        status: GameStatus.InProgress,
        history: [],
        blackScore: 1,
        whiteScore: 1,
      };

      const updated = processTurn(gameState);
      expect(updated.status).toBe(GameStatus.Finished);
    });

    it('should not change state when current player has legal moves', () => {
      const gameState = createInitialGameState();
      const updated = processTurn(gameState);
      expect(updated.currentPlayer).toBe(gameState.currentPlayer);
      expect(updated.status).toBe(gameState.status);
    });
  });

  describe('makeMove', () => {
    it('should execute valid move and switch player', () => {
      const gameState = createInitialGameState();
      const position: Position = { row: 2, col: 3 };

      const updated = makeMove(gameState, position);

      expect(updated.currentPlayer).toBe(CellState.White);
      expect(updated.history.length).toBe(1);
      expect(updated.blackScore).toBeGreaterThan(gameState.blackScore);
    });

    it('should reject invalid move', () => {
      const gameState = createInitialGameState();
      const position: Position = { row: 0, col: 0 };

      const updated = makeMove(gameState, position);

      expect(updated).toEqual(gameState);
    });

    it('should reject move on finished game', () => {
      const gameState = {
        ...createInitialGameState(),
        status: GameStatus.Finished,
      };
      const position: Position = { row: 2, col: 3 };

      const updated = makeMove(gameState, position);

      expect(updated).toEqual(gameState);
    });

    it('should update scores after move', () => {
      const gameState = createInitialGameState();
      const position: Position = { row: 2, col: 3 };

      const updated = makeMove(gameState, position);

      expect(updated.blackScore).toBe(4);
      expect(updated.whiteScore).toBe(1);
    });

    it('should add move to history', () => {
      const gameState = createInitialGameState();
      const position: Position = { row: 2, col: 3 };

      const updated = makeMove(gameState, position);

      expect(updated.history.length).toBe(1);
      expect(updated.history[0].position).toEqual(position);
      expect(updated.history[0].player).toBe(CellState.Black);
    });

    it('should handle automatic pass when next player has no moves', () => {
      // Create a scenario where after a move, the next player has no legal moves
      const board = Array.from({ length: 8 }, () =>
        Array.from({ length: 8 }, () => CellState.Empty)
      );
      board[3][3] = CellState.White;
      board[3][4] = CellState.Black;
      board[4][3] = CellState.Black;
      board[4][4] = CellState.Black;
      board[2][3] = CellState.Empty;

      const gameState = {
        board,
        currentPlayer: CellState.Black,
        status: GameStatus.InProgress,
        history: [],
        blackScore: 3,
        whiteScore: 1,
      };

      const position: Position = { row: 2, col: 3 };
      const updated = makeMove(gameState, position);

      // After Black's move, if White has no moves, it should pass back to Black
      // or end the game if Black also has no moves
      expect(
        updated.status === GameStatus.Finished || updated.currentPlayer === CellState.Black
      ).toBe(true);
    });
  });
});
