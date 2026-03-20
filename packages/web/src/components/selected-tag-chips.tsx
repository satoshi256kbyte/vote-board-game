'use client';

/**
 * SelectedTagChips Component
 *
 * 選択済みタグをチップ一覧で表示し、各チップに削除ボタン（×）を付与する。
 * aria-live="polite" でフィルタリング結果件数をスクリーンリーダーに通知する。
 *
 * Requirements: 3.2, 3.4, 7.5, 7.6
 */

import React from 'react';
import { TagChip } from '@/components/tag-chip';
import type { SelectedTag } from '@/lib/utils/tag-utils';

interface SelectedTagChipsProps {
  /** 選択済みタグリスト */
  tags: SelectedTag[];
  /** タグ削除時のコールバック */
  onRemove: (tag: string) => void;
  /** フィルタリング結果件数（スクリーンリーダー通知用） */
  resultCount?: number;
}

/**
 * SelectedTagChips - 選択済みタグのチップ一覧コンポーネント
 */
export function SelectedTagChips({ tags, onRemove, resultCount }: SelectedTagChipsProps) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {tags.map((tag) => (
        <TagChip
          key={`${tag.type}:${tag.value}`}
          label={tag.label}
          type={tag.type}
          onRemove={() => onRemove(tag.value)}
        />
      ))}
      <span aria-live="polite" className="text-sm text-gray-500">
        {resultCount !== undefined && `${resultCount}件の対局`}
      </span>
    </div>
  );
}
