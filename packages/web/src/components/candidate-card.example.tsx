/**
 * CandidateCard Component Examples
 *
 * This file demonstrates various usage patterns for the CandidateCard component.
 */

'use client';

import React, { useState } from 'react';
import { CandidateCard } from './candidate-card';
import type { Candidate } from '@/types/game';

/**
 * サンプル候補データ
 */
const sampleCandidates: Candidate[] = [
  {
    candidateId: 'candidate-1',
    gameId: 'game-1',
    position: 'C4',
    description:
      'この手は中央を制圧し、次のターンで有利な展開を作ります。黒石を増やしながら、相手の選択肢を制限できます。',
    userId: 'user-1',
    username: 'プレイヤー1',
    voteCount: 15,
    resultingBoardState: {
      board: [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 0, 0, 0, 0],
        [0, 0, 0, 1, 1, 0, 0, 0],
        [0, 0, 0, 1, 2, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
      ],
    },
    createdAt: '2024-01-01T10:00:00Z',
  },
  {
    candidateId: 'candidate-2',
    gameId: 'game-1',
    position: 'D3',
    description: '守りを固めつつ、次の攻撃の準備をする手です。',
    userId: 'user-2',
    username: 'プレイヤー2',
    voteCount: 8,
    resultingBoardState: {
      board: [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 0, 0, 0, 0],
        [0, 0, 0, 1, 1, 0, 0, 0],
        [0, 0, 0, 1, 2, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
      ],
    },
    createdAt: '2024-01-01T10:15:00Z',
  },
  {
    candidateId: 'candidate-3',
    gameId: 'game-1',
    position: 'E3',
    description: '攻撃的な手。リスクはあるが、成功すれば大きなアドバンテージを得られます。',
    userId: 'user-3',
    username: 'プレイヤー3',
    voteCount: 3,
    resultingBoardState: {
      board: [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 2, 1, 0, 0, 0],
        [0, 0, 0, 1, 2, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
      ],
    },
    createdAt: '2024-01-01T10:30:00Z',
  },
];

/**
 * Example 1: 基本的な使用
 */
export function BasicExample() {
  const [votedCandidateId, setVotedCandidateId] = useState<string | null>(null);

  const handleVote = (candidateId: string) => {
    console.log('Voted for candidate:', candidateId);
    setVotedCandidateId(candidateId);
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">基本的な使用</h2>
      <div className="max-w-md">
        <CandidateCard
          candidate={sampleCandidates[0]}
          isVoted={votedCandidateId === sampleCandidates[0].candidateId}
          onVote={handleVote}
        />
      </div>
    </div>
  );
}

/**
 * Example 2: グリッドレイアウト
 */
export function GridLayoutExample() {
  const [votedCandidateId, setVotedCandidateId] = useState<string | null>(null);

  const handleVote = (candidateId: string) => {
    console.log('Voted for candidate:', candidateId);
    setVotedCandidateId(candidateId);
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">グリッドレイアウト</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sampleCandidates.map((candidate) => (
          <CandidateCard
            key={candidate.candidateId}
            candidate={candidate}
            isVoted={votedCandidateId === candidate.candidateId}
            onVote={handleVote}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Example 3: 投票済み状態
 */
export function VotedStateExample() {
  const handleVote = (candidateId: string) => {
    console.log('This should not be called:', candidateId);
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">投票済み状態</h2>
      <div className="max-w-md">
        <CandidateCard candidate={sampleCandidates[0]} isVoted={true} onVote={handleVote} />
      </div>
    </div>
  );
}

/**
 * Example 4: 複数候補の比較
 */
export function ComparisonExample() {
  const [votedCandidateId, setVotedCandidateId] = useState<string | null>(null);

  const handleVote = (candidateId: string) => {
    console.log('Voted for candidate:', candidateId);
    setVotedCandidateId(candidateId);
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">複数候補の比較</h2>
      <p className="text-gray-600 mb-4">投票数順に並べられた候補</p>
      <div className="space-y-4 max-w-2xl">
        {[...sampleCandidates]
          .sort((a, b) => b.voteCount - a.voteCount)
          .map((candidate, index) => (
            <div key={candidate.candidateId}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg font-bold text-gray-700">#{index + 1}</span>
                <span className="text-sm text-gray-500">{candidate.voteCount}票</span>
              </div>
              <CandidateCard
                candidate={candidate}
                isVoted={votedCandidateId === candidate.candidateId}
                onVote={handleVote}
              />
            </div>
          ))}
      </div>
    </div>
  );
}

/**
 * Example 5: レスポンシブレイアウト
 */
export function ResponsiveExample() {
  const [votedCandidateId, setVotedCandidateId] = useState<string | null>(null);

  const handleVote = (candidateId: string) => {
    console.log('Voted for candidate:', candidateId);
    setVotedCandidateId(candidateId);
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">レスポンシブレイアウト</h2>
      <p className="text-gray-600 mb-4">画面サイズに応じてカラム数が変わります</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sampleCandidates.map((candidate) => (
          <CandidateCard
            key={candidate.candidateId}
            candidate={candidate}
            isVoted={votedCandidateId === candidate.candidateId}
            onVote={handleVote}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * All Examples
 */
export function AllExamples() {
  return (
    <div className="space-y-8">
      <BasicExample />
      <hr />
      <GridLayoutExample />
      <hr />
      <VotedStateExample />
      <hr />
      <ComparisonExample />
      <hr />
      <ResponsiveExample />
    </div>
  );
}
