/**
 * Candidate Card Component
 *
 * Displays move candidate information with voting functionality.
 * Shows board preview with candidate move applied, description, and vote count.
 *
 * Requirements: 7.1-7.12
 */

'use client';

import React from 'react';
import { Board } from './board';
import type { Candidate } from '@/types/game';

interface CandidateCardProps {
  /** 候補の情報 */
  candidate: Candidate;
  /** ユーザーがこの候補に投票済みかどうか */
  isVoted: boolean;
  /** 投票ボタンクリック時のハンドラー */
  onVote: (candidateId: string) => void;
}

/**
 * Candidate Card Component
 */
export function CandidateCard({ candidate, isVoted, onVote }: CandidateCardProps) {
  const handleVote = () => {
    if (!isVoted) {
      onVote(candidate.candidateId);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* 盤面プレビュー */}
      <div className="bg-gray-100 p-4 flex justify-center">
        <Board boardState={candidate.resultingBoardState} cellSize={30} />
      </div>

      {/* 候補情報 */}
      <div className="p-4 space-y-3">
        {/* 手の位置 */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">{candidate.position}</h3>
          <span className="text-sm text-gray-600">{candidate.voteCount}票</span>
        </div>

        {/* 説明文 */}
        <p className="text-sm text-gray-700 line-clamp-3">{candidate.description}</p>

        {/* 投稿者 */}
        <p className="text-xs text-gray-500">投稿者: {candidate.username}</p>

        {/* 投票ボタン */}
        <button
          onClick={handleVote}
          disabled={isVoted}
          className={`
            w-full py-2 px-4 rounded font-medium transition-colors
            ${
              isVoted
                ? 'bg-green-100 text-green-700 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }
          `}
          aria-label={isVoted ? '投票済み' : `${candidate.position}に投票する`}
        >
          {isVoted ? '✓ 投票済み' : '投票する'}
        </button>
      </div>
    </div>
  );
}
