'use client';

/**
 * TagDropdown Component
 *
 * タグ候補のドロップダウンリスト。
 * キーボード操作（上下矢印キーで移動、Enterで選択、Escapeで閉じる）に対応。
 *
 * Requirements: 3.1, 7.2, 7.3
 */

import React, { useEffect, useRef } from 'react';
import type { TagSuggestion } from '@/lib/utils/tag-utils';

interface TagDropdownProps {
  /** フィルタリング済みタグ候補 */
  items: TagSuggestion[];
  /** 現在ハイライトされているインデックス */
  highlightedIndex: number;
  /** タグ選択時のコールバック */
  onSelect: (tag: string) => void;
  /** ドロップダウンの表示状態 */
  isOpen: boolean;
}

/**
 * TagDropdown - タグ候補のドロップダウンリスト
 */
export function TagDropdown({ items, highlightedIndex, onSelect, isOpen }: TagDropdownProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const highlightedRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (highlightedRef.current) {
      highlightedRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  if (!isOpen) {
    return null;
  }

  if (items.length === 0) {
    return (
      <div
        className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow-md"
        role="listbox"
      >
        <p className="px-3 py-2 text-center text-sm text-gray-500">候補なし</p>
      </div>
    );
  }

  return (
    <ul
      ref={listRef}
      role="listbox"
      className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-white shadow-md"
    >
      {items.map((item, index) => {
        const isHighlighted = index === highlightedIndex;
        return (
          <li
            key={`${item.type}:${item.value}`}
            ref={isHighlighted ? highlightedRef : undefined}
            role="option"
            aria-selected={isHighlighted}
            className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm ${
              isHighlighted ? 'bg-gray-100' : 'hover:bg-gray-100'
            }`}
            onClick={() => onSelect(item.value)}
          >
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                item.type === 'gameType' ? 'bg-indigo-500' : 'bg-gray-400'
              }`}
              aria-hidden="true"
            />
            {item.label}
          </li>
        );
      })}
    </ul>
  );
}
