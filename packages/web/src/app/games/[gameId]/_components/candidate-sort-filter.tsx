'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowUpDown, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * CandidateSortFilter component props
 */
export interface CandidateSortFilterProps {
  /** Current sort field */
  sortBy: 'voteCount' | 'createdAt';
  /** Current sort order */
  sortOrder: 'asc' | 'desc';
  /** Current filter */
  filter: 'all' | 'my-vote' | 'ai' | 'user';
  /** Callback when sort changes */
  onSortChange: (sortBy: 'voteCount' | 'createdAt', sortOrder: 'asc' | 'desc') => void;
  /** Callback when filter changes */
  onFilterChange: (filter: 'all' | 'my-vote' | 'ai' | 'user') => void;
}

/**
 * CandidateSortFilter Component
 *
 * Provides sort and filter controls for the candidate list.
 * - Sort options: 投票数 (voteCount), 作成日時 (createdAt)
 * - Sort order: 昇順 (asc), 降順 (desc)
 * - Filter options: 全て (all), 自分の投票 (my-vote), AI生成 (ai), ユーザー投稿 (user)
 * - Syncs with URL query parameters
 *
 * Requirements: 16.2, 16.3, 16.4, 16.7
 */
export function CandidateSortFilter({
  sortBy,
  sortOrder,
  filter,
  onSortChange,
  onFilterChange,
}: CandidateSortFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  /**
   * Update URL query parameters
   */
  const updateQueryParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      params.set(key, value);
    });

    router.push(`?${params.toString()}`, { scroll: false });
  };

  /**
   * Handle sort field change
   */
  const handleSortByChange = (newSortBy: string) => {
    const sortByValue = newSortBy as 'voteCount' | 'createdAt';
    onSortChange(sortByValue, sortOrder);
    updateQueryParams({ sortBy: sortByValue });
  };

  /**
   * Handle sort order change
   */
  const handleSortOrderChange = (newSortOrder: string) => {
    const sortOrderValue = newSortOrder as 'asc' | 'desc';
    onSortChange(sortBy, sortOrderValue);
    updateQueryParams({ sortOrder: sortOrderValue });
  };

  /**
   * Handle filter change
   */
  const handleFilterChange = (newFilter: string) => {
    const filterValue = newFilter as 'all' | 'my-vote' | 'ai' | 'user';
    onFilterChange(filterValue);
    updateQueryParams({ filter: filterValue });
  };

  /**
   * Get display text for sort field
   */
  const getSortByLabel = () => {
    switch (sortBy) {
      case 'voteCount':
        return '投票数';
      case 'createdAt':
        return '作成日時';
      default:
        return '投票数';
    }
  };

  /**
   * Get display text for sort order
   */
  const getSortOrderLabel = () => {
    return sortOrder === 'desc' ? '降順' : '昇順';
  };

  /**
   * Get display text for filter
   */
  const getFilterLabel = () => {
    switch (filter) {
      case 'all':
        return '全て';
      case 'my-vote':
        return '自分の投票';
      case 'ai':
        return 'AI生成';
      case 'user':
        return 'ユーザー投稿';
      default:
        return '全て';
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mb-4" data-testid="candidate-sort-filter">
      {/* Sort Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="min-h-[44px]"
            aria-label="ソート設定"
            data-testid="sort-dropdown-trigger"
          >
            <ArrowUpDown className="mr-2 h-4 w-4" aria-hidden="true" />
            <span>
              {getSortByLabel()} ({getSortOrderLabel()})
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>ソート項目</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={sortBy} onValueChange={handleSortByChange}>
            <DropdownMenuRadioItem value="voteCount" data-testid="sort-by-votes">
              投票数
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="createdAt" data-testid="sort-by-created">
              作成日時
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>

          <DropdownMenuSeparator />

          <DropdownMenuLabel>並び順</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={sortOrder} onValueChange={handleSortOrderChange}>
            <DropdownMenuRadioItem value="desc" data-testid="sort-order-desc">
              降順
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="asc" data-testid="sort-order-asc">
              昇順
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Filter Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="min-h-[44px]"
            aria-label="フィルター設定"
            data-testid="filter-dropdown-trigger"
          >
            <Filter className="mr-2 h-4 w-4" aria-hidden="true" />
            <span>{getFilterLabel()}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>フィルター</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={filter} onValueChange={handleFilterChange}>
            <DropdownMenuRadioItem value="all" data-testid="filter-all">
              全て
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="my-vote" data-testid="filter-my-vote">
              自分の投票
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="ai" data-testid="filter-ai">
              AI生成
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="user" data-testid="filter-user">
              ユーザー投稿
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
