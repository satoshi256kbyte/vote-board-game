/**
 * Moves module for Othello game logic
 */

import { Board, CellState, Move, Player, Position } from './types';
import { setCellState } from './board';
import { findFlippedPositions } from './validation';

export function flipDiscs(board: Board, positions: readonly Position[], player: Player): Board {
  let newBoard = board;

  for (const position of positions) {
    newBoard = setCellState(newBoard, position, player);
  }

  return newBoard;
}

export function executeMove(
  board: Board,
  position: Position,
  player: Player,
  flippedPositions?: readonly Position[]
): Board {
  const positionsToFlip = flippedPositions ?? findFlippedPositions(board, position, player);
  let newBoard = setCellState(board, position, player);
  newBoard = flipDiscs(newBoard, positionsToFlip, player);
  return newBoard;
}

export function createMove(
  position: Position,
  player: Player,
  flippedPositions: readonly Position[]
): Move {
  return {
    position,
    player,
    flippedPositions,
  };
}
