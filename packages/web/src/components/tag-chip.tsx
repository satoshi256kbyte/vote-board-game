'use client';

/**
 * TagChip Component
 *
 * タグを視覚的に表現するバッジ型UIコンポーネント。
 * ゲーム種類タグ（色付き背景）とカスタムタグ（アウトライン）を視覚的に区別する。
 *
 * Requirements: 2.3, 6.3, 7.5
 */

import React from 'react';
import { X } from 'lucide-react';
import type { TagType } from '@/lib/utils/tag-utils';

interface TagChipProps {
  /** タグの表示名 */
  label: string;
  /** タグの種類（スタイル切り替え用） */
  type: TagType;
  /** クリック時のコールバック（対局カード内で使用） */
  onClick?: () => void;
  /** 削除ボタン表示（選択済みタグで使用） */
  onRemove?: () => void;
}

/**
 * TagChip - 個別のタグチップコンポーネント
 */
export function TagChip({ label, type, onClick, onRemove }: TagChipProps) {
  const isClickable = !!onClick;

  const baseStyles =
    'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium';

  const typeStyles =
    type === 'gameType' ? 'bg-indigo-100 text-indigo-800' : 'border border-gray-300 text-gray-700';

  const interactiveStyles = isClickable ? 'cursor-pointer hover:opacity-80' : '';

  return (
    <span
      role="option"
      aria-selected={!!onRemove}
      className={`${baseStyles} ${typeStyles} ${interactiveStyles}`}
      onClick={isClickable ? onClick : undefined}
      data-testid={`tag-chip-${label}`}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`${label}を削除`}
          className="inline-flex items-center justify-center rounded-full hover:bg-black/10 p-0.5"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
