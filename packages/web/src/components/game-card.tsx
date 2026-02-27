/**
 * Game Card Component
 *
 * Displays game summary information in a card format.
 * Shows board thumbnail, game metadata, and navigation to game detail.
 *
 * Requirements: 2.1-2.10
 */

import React from 'react';
import Link from 'next/link';
import { Board } from './board';
import type { GameSummary, BoardState } from '@/types/game';

interface GameCardProps {
  /** ゲームのサマリー情報 */
  game: GameSummary;
  /** 盤面の状態（サムネイル表示用） */
  boardState: BoardState;
  /** 参加者数 */
  participantCount: number;
  /** 投票締切日時（ISO 8601形式） */
  votingDeadline: string;
}

/**
 * ゲームタイプを日本語表示に変換
 */
const getGameTypeLabel = (gameType: string): string => {
  switch (gameType) {
    case 'OTHELLO':
      return 'オセロ';
    case 'CHESS':
      return 'チェス';
    case 'GO':
      return '囲碁';
    case 'SHOGI':
      return '将棋';
    default:
      return gameType;
  }
};

/**
 * ゲームモードを日本語表示に変換
 */
const getGameModeLabel = (): string => {
  return 'AI vs 集合知';
};

/**
 * 日時をフォーマット
 */
const formatDeadline = (isoString: string): string => {
  const date = new Date(isoString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
};

/**
 * Game Card Component
 */
export function GameCard({ game, boardState, participantCount, votingDeadline }: GameCardProps) {
  const gameTypeLabel = getGameTypeLabel(game.gameType);
  const gameModeLabel = getGameModeLabel();
  const deadlineLabel = formatDeadline(votingDeadline);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* 盤面サムネイル */}
      <div className="bg-gray-100 p-4 flex justify-center">
        <Board boardState={boardState} cellSize={30} />
      </div>

      {/* ゲーム情報 */}
      <div className="p-4 space-y-3">
        {/* ゲームタイトル */}
        <h3 className="text-lg font-bold text-gray-900">
          {gameTypeLabel} - {gameModeLabel}
        </h3>

        {/* メタデータ */}
        <div className="space-y-1 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>ターン数:</span>
            <span className="font-medium">{game.currentTurn}</span>
          </div>
          <div className="flex justify-between">
            <span>参加者数:</span>
            <span className="font-medium">{participantCount}人</span>
          </div>
          <div className="flex justify-between">
            <span>投票締切:</span>
            <span className="font-medium">{deadlineLabel}</span>
          </div>
        </div>

        {/* 詳細を見るボタン */}
        <Link
          href={`/games/${game.gameId}`}
          className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
        >
          詳細を見る
        </Link>
      </div>
    </div>
  );
}
