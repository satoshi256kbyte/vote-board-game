/**
 * ゲーム共通ユーティリティ
 *
 * 複数サービスで共有される対局関連の純粋関数群。
 */

import type { GameEntity } from './dynamodb/types.js';

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
