'use client';

/**
 * TagSearchInput Component
 *
 * タグ検索用のコンボボックス入力コンポーネント。
 * shadcn/ui の Input ベース、Lucide React の Search アイコン付き。
 * テキスト入力でタグ候補をフィルタリングし、TagDropdown で表示する。
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 7.1, 7.2, 7.3, 7.4
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { TagDropdown } from '@/components/tag-dropdown';
import { filterSuggestions } from '@/lib/utils/tag-utils';
import type { TagSuggestion } from '@/lib/utils/tag-utils';

interface TagSearchInputProps {
  /** タグ候補リスト */
  suggestions: TagSuggestion[];
  /** 選択済みタグ */
  selectedTags: string[];
  /** タグ選択時のコールバック */
  onTagSelect: (tag: string) => void;
  /** プレースホルダーテキスト */
  placeholder?: string;
}

export function TagSearchInput({
  suggestions,
  selectedTags,
  onTagSelect,
  placeholder = 'タグで検索...',
}: TagSearchInputProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filter out already-selected tags, then apply query filter
  const filteredItems = useMemo(() => {
    const available = suggestions.filter((s) => !selectedTags.includes(s.value));
    return filterSuggestions(available, query);
  }, [suggestions, selectedTags, query]);

  const handleSelect = useCallback(
    (value: string) => {
      onTagSelect(value);
      setQuery('');
      setIsOpen(false);
      setHighlightedIndex(0);
    },
    [onTagSelect]
  );

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(true);
    setHighlightedIndex(0);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          setIsOpen(true);
          e.preventDefault();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            filteredItems.length === 0 ? 0 : (prev + 1) % filteredItems.length
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            filteredItems.length === 0
              ? 0
              : (prev - 1 + filteredItems.length) % filteredItems.length
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredItems.length > 0 && highlightedIndex < filteredItems.length) {
            handleSelect(filteredItems[highlightedIndex].value);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setQuery('');
          setHighlightedIndex(0);
          break;
      }
    },
    [isOpen, filteredItems, highlightedIndex, handleSelect]
  );

  const handleFocus = useCallback(() => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setIsOpen(true);
  }, []);

  const handleBlur = useCallback(() => {
    // Small delay to allow click on dropdown items
    blurTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      setQuery('');
      setHighlightedIndex(0);
    }, 200);
  }, []);

  const listboxId = 'tag-search-listbox';

  return (
    <div className="relative">
      <Search
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
        aria-hidden="true"
      />
      <Input
        ref={inputRef}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        aria-autocomplete="list"
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="pl-9"
      />
      <TagDropdown
        items={filteredItems}
        highlightedIndex={highlightedIndex}
        onSelect={handleSelect}
        isOpen={isOpen}
      />
    </div>
  );
}
