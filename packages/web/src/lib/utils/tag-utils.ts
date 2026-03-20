/**
 * タグ関連ユーティリティ関数
 * 対局一覧のタグ検索・フィルタリング機能で使用する
 */

import type { GameSummary } from '@/types/game';

/** gameType値から表示名へのマッピング */
export const GAME_TYPE_LABEL_MAP: Record<string, string> = {
  OTHELLO: 'オセロ',
  CHESS: 'チェス',
  GO: '囲碁',
  SHOGI: '将棋',
};

/** タグの種類 */
export type TagType = 'gameType' | 'custom';

/** タグ候補 */
export interface TagSuggestion {
  /** タグの表示名 */
  label: string;
  /** タグの内部値（gameType値 or カスタムタグ値） */
  value: string;
  /** タグの種類 */
  type: TagType;
}

/** 選択済みタグ */
export interface SelectedTag {
  label: string;
  value: string;
  type: TagType;
}

/** タグ情報（対局カード表示用） */
export interface TagInfo {
  label: string;
  value: string;
  type: TagType;
}

/** E2Eタグを判定する */
function isE2ETag(tag: string): boolean {
  return tag.toUpperCase() === 'E2E';
}

/**
 * 対局データからタグ候補リストを生成（E2E除外、重複排除）
 *
 * gameType仮想タグとカスタムタグの両方を含む候補リストを返す。
 * E2Eタグは除外し、重複する値は排除する。
 */
export function buildTagSuggestions(games: GameSummary[]): TagSuggestion[] {
  const seen = new Set<string>();
  const suggestions: TagSuggestion[] = [];

  for (const game of games) {
    // gameType仮想タグ
    const gameTypeLabel = GAME_TYPE_LABEL_MAP[game.gameType];
    if (gameTypeLabel && !seen.has(`gameType:${game.gameType}`)) {
      seen.add(`gameType:${game.gameType}`);
      suggestions.push({
        label: gameTypeLabel,
        value: game.gameType,
        type: 'gameType',
      });
    }

    // カスタムタグ
    const tags = game.tags ?? [];
    for (const tag of tags) {
      if (!isE2ETag(tag) && !seen.has(`custom:${tag}`)) {
        seen.add(`custom:${tag}`);
        suggestions.push({
          label: tag,
          value: tag,
          type: 'custom',
        });
      }
    }
  }

  return suggestions;
}

/**
 * 対局がタグ条件に一致するか判定（AND条件）
 *
 * selectedTagsが空の場合、全ての対局が一致する。
 * gameTypeタグはgame.gameTypeと照合し、カスタムタグはgame.tagsと照合する。
 */
export function matchesTags(game: GameSummary, selectedTags: SelectedTag[]): boolean {
  if (selectedTags.length === 0) {
    return true;
  }

  return selectedTags.every((tag) => {
    if (tag.type === 'gameType') {
      return game.gameType === tag.value;
    }
    // custom tag
    const gameTags = game.tags ?? [];
    return gameTags.includes(tag.value);
  });
}

/**
 * タグ候補を入力テキストで部分一致フィルタリング
 *
 * 検索文字列が空の場合、全候補を返す。
 * タグの表示名（label）に対して部分一致で検索する。
 */
export function filterSuggestions(suggestions: TagSuggestion[], query: string): TagSuggestion[] {
  if (!query) {
    return suggestions;
  }

  const lowerQuery = query.toLowerCase();
  return suggestions.filter((s) => s.label.toLowerCase().includes(lowerQuery));
}

/**
 * 対局からタグ一覧を取得（gameType仮想タグ + カスタムタグ、E2E除外、最大3個）
 *
 * gameType仮想タグを先頭に配置し、その後にカスタムタグを追加する。
 * E2Eタグは除外し、最大3個まで返す。
 */
export function getGameTags(game: GameSummary): TagInfo[] {
  const tags: TagInfo[] = [];

  // gameType仮想タグ
  const gameTypeLabel = GAME_TYPE_LABEL_MAP[game.gameType];
  if (gameTypeLabel) {
    tags.push({
      label: gameTypeLabel,
      value: game.gameType,
      type: 'gameType',
    });
  }

  // カスタムタグ（E2E除外）
  const customTags = (game.tags ?? []).filter((tag) => !isE2ETag(tag));
  for (const tag of customTags) {
    tags.push({
      label: tag,
      value: tag,
      type: 'custom',
    });
  }

  return tags.slice(0, 3);
}

/**
 * URLクエリパラメータからタグ配列をパース
 *
 * ?tags=オセロ,タグ名 形式のURLパラメータからタグ表示名の配列を返す。
 * 空文字列のタグは除外する。
 */
export function parseTagsFromUrl(params: URLSearchParams): string[] {
  const tagsParam = params.get('tags');
  if (!tagsParam) {
    return [];
  }

  return tagsParam
    .split(',')
    .map((tag) => decodeURIComponent(tag.trim()))
    .filter((tag) => tag.length > 0);
}

/**
 * タグ配列をURLクエリパラメータに変換
 *
 * タグ表示名の配列をカンマ区切りの文字列に変換する。
 * 空配列の場合は空文字列を返す。
 */
export function tagsToUrlParam(tags: string[]): string {
  if (tags.length === 0) {
    return '';
  }

  return tags.map((tag) => encodeURIComponent(tag)).join(',');
}
