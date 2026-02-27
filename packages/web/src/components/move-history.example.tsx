/**
 * Move History Component Examples
 *
 * このファイルは MoveHistory コンポーネントの使用例を示します。
 * 実際のアプリケーションでは使用されません。
 */

'use client';

import React, { useState } from 'react';
import { MoveHistory } from './move-history';
import type { Move } from '@/types/game';

// サンプルデータ
const sampleMoves: Move[] = [
  {
    turn: 1,
    player: 'BLACK',
    position: 'D3',
    timestamp: '2024-01-01T00:00:00Z',
  },
  {
    turn: 2,
    player: 'WHITE',
    position: 'C3',
    timestamp: '2024-01-01T00:01:00Z',
  },
  {
    turn: 3,
    player: 'BLACK',
    position: 'E3',
    timestamp: '2024-01-01T00:02:00Z',
  },
  {
    turn: 4,
    player: 'WHITE',
    position: 'F3',
    timestamp: '2024-01-01T00:03:00Z',
  },
  {
    turn: 5,
    player: 'BLACK',
    position: 'C4',
    timestamp: '2024-01-01T00:04:00Z',
  },
  {
    turn: 6,
    player: 'WHITE',
    position: 'D2',
    timestamp: '2024-01-01T00:05:00Z',
  },
];

/**
 * Example 1: 基本的な表示（表示のみ）
 */
export function BasicMoveHistoryExample() {
  return (
    <div className="p-4 max-w-md">
      <h2 className="text-xl font-bold mb-4">基本的な表示</h2>
      <MoveHistory moves={sampleMoves} />
    </div>
  );
}

/**
 * Example 2: インタラクティブモード（クリック可能）
 */
export function InteractiveMoveHistoryExample() {
  const [selectedTurn, setSelectedTurn] = useState<number | undefined>();

  const handleMoveClick = (turn: number) => {
    setSelectedTurn(turn);
    console.log(`ターン${turn}が選択されました`);
  };

  return (
    <div className="p-4 max-w-md">
      <h2 className="text-xl font-bold mb-4">インタラクティブモード</h2>
      <MoveHistory moves={sampleMoves} onMoveClick={handleMoveClick} selectedTurn={selectedTurn} />
      {selectedTurn && (
        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-900">選択中: ターン{selectedTurn}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Example 3: 空の状態
 */
export function EmptyMoveHistoryExample() {
  return (
    <div className="p-4 max-w-md">
      <h2 className="text-xl font-bold mb-4">空の状態</h2>
      <MoveHistory moves={[]} />
    </div>
  );
}

/**
 * Example 4: 少ない手数
 */
export function FewMoveHistoryExample() {
  const fewMoves: Move[] = [
    {
      turn: 1,
      player: 'BLACK',
      position: 'D3',
      timestamp: '2024-01-01T00:00:00Z',
    },
    {
      turn: 2,
      player: 'WHITE',
      position: 'C3',
      timestamp: '2024-01-01T00:01:00Z',
    },
  ];

  return (
    <div className="p-4 max-w-md">
      <h2 className="text-xl font-bold mb-4">少ない手数</h2>
      <MoveHistory moves={fewMoves} />
    </div>
  );
}

/**
 * Example 5: 多くの手数（スクロール可能）
 */
export function ManyMoveHistoryExample() {
  const manyMoves: Move[] = Array.from({ length: 30 }, (_, i) => ({
    turn: i + 1,
    player: i % 2 === 0 ? ('BLACK' as const) : ('WHITE' as const),
    position: `${String.fromCharCode(65 + (i % 8))}${(i % 8) + 1}`,
    timestamp: `2024-01-01T00:${String(i).padStart(2, '0')}:00Z`,
  }));

  return (
    <div className="p-4 max-w-md">
      <h2 className="text-xl font-bold mb-4">多くの手数（スクロール可能）</h2>
      <MoveHistory moves={manyMoves} />
    </div>
  );
}

/**
 * Example 6: 対局詳細画面での使用例
 */
export function GameDetailWithHistoryExample() {
  const [selectedTurn, setSelectedTurn] = useState<number | undefined>();

  const handleMoveClick = (turn: number) => {
    setSelectedTurn(turn);
    // 実際のアプリケーションでは、ここで盤面の状態を更新する
  };

  return (
    <div className="p-4 max-w-4xl">
      <h2 className="text-2xl font-bold mb-6">対局詳細画面</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 左側: 盤面 */}
        <div>
          <h3 className="text-lg font-semibold mb-3">盤面</h3>
          <div className="bg-gray-100 p-4 rounded-md">
            <p className="text-sm text-gray-600">
              {selectedTurn ? `ターン${selectedTurn}の盤面を表示` : '現在の盤面を表示'}
            </p>
          </div>
        </div>

        {/* 右側: 手の履歴 */}
        <div>
          <h3 className="text-lg font-semibold mb-3">手の履歴</h3>
          <MoveHistory
            moves={sampleMoves}
            onMoveClick={handleMoveClick}
            selectedTurn={selectedTurn}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * すべての例を表示するコンポーネント
 */
export function AllMoveHistoryExamples() {
  return (
    <div className="space-y-8 p-8 bg-gray-50">
      <h1 className="text-3xl font-bold mb-8">Move History Component Examples</h1>

      <div className="bg-white rounded-lg shadow-md">
        <BasicMoveHistoryExample />
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <InteractiveMoveHistoryExample />
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <EmptyMoveHistoryExample />
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <FewMoveHistoryExample />
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <ManyMoveHistoryExample />
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <GameDetailWithHistoryExample />
      </div>
    </div>
  );
}
