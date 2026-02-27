/**
 * Loading State for Game List Screen
 *
 * Displays skeleton loaders while fetching games.
 *
 * Requirements: 1.9, 13.1
 */

import React from 'react';

/**
 * Game Card Skeleton
 */
function GameCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
      {/* 盤面サムネイル */}
      <div className="bg-gray-200 h-64" />

      {/* ゲーム情報 */}
      <div className="p-4 space-y-3">
        {/* タイトル */}
        <div className="h-6 bg-gray-200 rounded w-3/4" />

        {/* メタデータ */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded" />
        </div>

        {/* ボタン */}
        <div className="h-10 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

/**
 * Loading Component
 */
export default function Loading() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="h-9 bg-gray-200 rounded w-64 animate-pulse" />
          <div className="mt-2 h-6 bg-gray-200 rounded w-96 animate-pulse" />
        </div>

        {/* タブ */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex space-x-8">
            <div className="h-10 w-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-20 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>

        {/* ゲームカードのスケルトン */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <GameCardSkeleton />
          <GameCardSkeleton />
          <GameCardSkeleton />
          <GameCardSkeleton />
          <GameCardSkeleton />
          <GameCardSkeleton />
        </div>
      </div>
    </main>
  );
}
