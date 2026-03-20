'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { parseTagsFromUrl, tagsToUrlParam } from '@/lib/utils/tag-utils';

interface UseTagUrlSyncOptions {
  /** 選択済みタグ */
  selectedTags: string[];
  /** タグ変更時のコールバック */
  onTagsChange: (tags: string[]) => void;
}

/**
 * URLクエリパラメータとタグ状態の同期フック
 *
 * - selectedTags が変更されたら URL を更新
 * - 初回ロード時に URL からタグを復元し onTagsChange で通知
 * - 内部トリガーの URL 更新で onTagsChange が再発火しないよう ref で制御
 */
export function useTagUrlSync({ selectedTags, onTagsChange }: UseTagUrlSyncOptions): void {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isInternalUpdate = useRef(false);
  const isInitialized = useRef(false);

  // 初回ロード時: URL からタグを復元
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const tagsFromUrl = parseTagsFromUrl(searchParams);
    if (tagsFromUrl.length > 0) {
      isInternalUpdate.current = true;
      onTagsChange(tagsFromUrl);
    }
  }, [searchParams, onTagsChange]);

  // selectedTags → URL 同期
  const syncTagsToUrl = useCallback(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    const tagParam = tagsToUrlParam(selectedTags);

    if (tagParam) {
      params.set('tags', tagParam);
    } else {
      params.delete('tags');
    }

    const newQuery = params.toString();
    const newUrl = newQuery ? `?${newQuery}` : window.location.pathname;
    router.push(newUrl, { scroll: false });
  }, [selectedTags, searchParams, router]);

  useEffect(() => {
    syncTagsToUrl();
  }, [syncTagsToUrl]);
}
