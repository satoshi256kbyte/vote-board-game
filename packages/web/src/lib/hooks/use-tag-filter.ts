'use client';

import { useState, useMemo, useCallback } from 'react';
import type { GameSummary } from '@/types/game';
import type { TagSuggestion, SelectedTag } from '@/lib/utils/tag-utils';
import { buildTagSuggestions, matchesTags } from '@/lib/utils/tag-utils';

interface UseTagFilterOptions {
  /** 全対局データ */
  games: GameSummary[];
  /** 初期選択タグ（URLから復元） */
  initialTags?: string[];
}

interface UseTagFilterReturn {
  /** フィルタリング済み対局リスト */
  filteredGames: GameSummary[];
  /** 選択済みタグ */
  selectedTags: SelectedTag[];
  /** タグ候補リスト（選択済みタグを除外） */
  suggestions: TagSuggestion[];
  /** タグ追加 */
  addTag: (tagValue: string) => void;
  /** タグ削除 */
  removeTag: (tagValue: string) => void;
  /** 全タグクリア */
  clearTags: () => void;
  /** フィルタリング結果件数 */
  resultCount: number;
}

/**
 * タグフィルタリングのコアロジックを提供するカスタムフック
 *
 * 対局データからタグ候補を生成し、選択されたタグでフィルタリングを行う。
 * initialTags が指定された場合、タグ候補から一致するものを初期選択状態として復元する。
 */
export function useTagFilter({ games, initialTags }: UseTagFilterOptions): UseTagFilterReturn {
  const allSuggestions = useMemo(() => buildTagSuggestions(games), [games]);

  const [selectedTags, setSelectedTags] = useState<SelectedTag[]>(() => {
    if (!initialTags || initialTags.length === 0) {
      return [];
    }
    return initialTags
      .map((tagLabel) => {
        const found = allSuggestions.find((s) => s.label === tagLabel);
        return found ? { label: found.label, value: found.value, type: found.type } : null;
      })
      .filter((tag): tag is SelectedTag => tag !== null);
  });

  const filteredGames = useMemo(
    () => games.filter((game) => matchesTags(game, selectedTags)),
    [games, selectedTags]
  );

  const suggestions = useMemo(() => {
    const selectedValues = new Set(selectedTags.map((t) => t.value));
    return allSuggestions.filter((s) => !selectedValues.has(s.value));
  }, [allSuggestions, selectedTags]);

  const addTag = useCallback(
    (tagValue: string) => {
      const suggestion = allSuggestions.find((s) => s.value === tagValue);
      if (!suggestion) return;

      setSelectedTags((prev) => {
        if (prev.some((t) => t.value === tagValue)) return prev;
        return [
          ...prev,
          { label: suggestion.label, value: suggestion.value, type: suggestion.type },
        ];
      });
    },
    [allSuggestions]
  );

  const removeTag = useCallback((tagValue: string) => {
    setSelectedTags((prev) => prev.filter((t) => t.value !== tagValue));
  }, []);

  const clearTags = useCallback(() => {
    setSelectedTags([]);
  }, []);

  return {
    filteredGames,
    selectedTags,
    suggestions,
    addTag,
    removeTag,
    clearTags,
    resultCount: filteredGames.length,
  };
}
