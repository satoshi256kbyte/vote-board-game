/**
 * Game List Component
 *
 * Client component that handles status filtering tabs, tag search, and pagination.
 * Displays games in grid layout (desktop) / single column (mobile).
 *
 * Requirements: 1.1, 1.3-1.11, 3.3, 3.5, 4.1, 4.4, 4.5, 8.1, 8.2, 8.3
 */

'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GameCard } from './game-card';
import { TagSearchInput } from '@/components/tag-search-input';
import { SelectedTagChips } from '@/components/selected-tag-chips';
import { useTagFilter } from '@/lib/hooks/use-tag-filter';
import { useTagUrlSync } from '@/lib/hooks/use-tag-url-sync';
import { parseTagsFromUrl } from '@/lib/utils/tag-utils';
import type { GameSummary, GameStatus } from '@/types/game';

interface GameListProps {
  /** 初期表示するゲームのリスト */
  initialGames: GameSummary[];
  /** 初期表示するステータス */
  initialStatus: GameStatus;
  /** 次のページのカーソル */
  initialNextCursor?: string;
}

/**
 * Game List Component
 */
export function GameList({ initialGames, initialStatus, initialNextCursor }: GameListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<GameStatus>(initialStatus);

  // Parse initial tags from URL for useTagFilter
  const initialTagsFromUrl = parseTagsFromUrl(searchParams);

  // Tag filter hook
  const { filteredGames, selectedTags, suggestions, addTag, removeTag, resultCount } = useTagFilter(
    { games: initialGames, initialTags: initialTagsFromUrl }
  );

  // Sync tag state with URL
  useTagUrlSync({
    selectedTags: selectedTags.map((t) => t.label),
    onTagsChange: () => {
      // Initial URL restoration is handled by initialTagsFromUrl above
    },
  });

  const handleTabChange = (status: GameStatus) => {
    setActiveTab(status);
    router.push(`/?status=${status}`);
  };

  const handleLoadMore = () => {
    if (initialNextCursor) {
      router.push(`/?status=${activeTab}&cursor=${initialNextCursor}`);
    }
  };

  return (
    <div>
      {/* ステータスフィルタータブ */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => handleTabChange('ACTIVE')}
            data-testid="tab-active"
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === 'ACTIVE'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
            aria-current={activeTab === 'ACTIVE' ? 'page' : undefined}
          >
            進行中
          </button>
          <button
            onClick={() => handleTabChange('FINISHED')}
            data-testid="tab-finished"
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === 'FINISHED'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
            aria-current={activeTab === 'FINISHED' ? 'page' : undefined}
          >
            終了
          </button>
        </nav>
      </div>

      {/* タグ検索エリア */}
      <div className="mb-6 space-y-3">
        <TagSearchInput
          suggestions={suggestions}
          selectedTags={selectedTags.map((t) => t.value)}
          onTagSelect={addTag}
        />
        <SelectedTagChips tags={selectedTags} onRemove={removeTag} resultCount={resultCount} />
      </div>

      {/* ゲームリスト */}
      {initialGames.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">対局がありません</p>
        </div>
      ) : filteredGames.length === 0 && selectedTags.length > 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">該当する対局がありません</p>
        </div>
      ) : (
        <>
          {/* グリッドレイアウト: デスクトップ3列、タブレット2列、モバイル1列 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGames.map((game) => (
              <GameCard
                key={game.gameId}
                game={game}
                boardState={{ board: Array(8).fill(Array(8).fill(0)) }}
                participantCount={0}
                votingDeadline={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()}
                onTagClick={addTag}
              />
            ))}
          </div>

          {/* ページネーション */}
          {initialNextCursor && (
            <div className="mt-8 text-center">
              <button
                onClick={handleLoadMore}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded transition-colors"
              >
                さらに読み込む
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
