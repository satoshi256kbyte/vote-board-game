/**
 * ゲーム共通ユーティリティ
 *
 * 複数サービスで共有される対局関連の純粋関数群。
 */

import type { GameEntity } from './dynamodb/types.js';
import type { Board } from './othello/index.js';
import { countDiscs, CellState } from './othello/index.js';

/**
 * 現在の手番がAI側かどうかを判定する
 *
 * 偶数ターン → 黒の手番（先手）
 * 奇数ターン → 白の手番（後手）
 * aiSide と一致すれば AI の手番
 */
export function isAITurn(game: GameEntity): boolean {
  const currentColor = game.currentTurn % 2 === 0 ? 'BLACK' : 'WHITE';
  return currentColor === game.aiSide;
}

/**
 * 盤面と AI 側の色から勝者を判定する
 *
 * AI 側の石数と集合知側の石数を比較し、勝者を返す。
 */
export function determineWinner(
  board: Board,
  aiSide: 'BLACK' | 'WHITE'
): 'AI' | 'COLLECTIVE' | 'DRAW' {
  const aiColor = aiSide === 'BLACK' ? CellState.Black : CellState.White;
  const collectiveColor = aiSide === 'BLACK' ? CellState.White : CellState.Black;
  const aiCount = countDiscs(board, aiColor);
  const collectiveCount = countDiscs(board, collectiveColor);

  if (aiCount > collectiveCount) {
    return 'AI';
  } else if (collectiveCount > aiCount) {
    return 'COLLECTIVE';
  } else {
    return 'DRAW';
  }
}
