import { describe, it, expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { vi } from 'vitest';
import * as fc from 'fast-check';
import type { GameSummary } from '@/types/game';
import type { SelectedTag } from './tag-utils';
import {
  buildTagSuggestions,
  matchesTags,
  filterSuggestions,
  getGameTags,
  parseTagsFromUrl,
  tagsToUrlParam,
  GAME_TYPE_LABEL_MAP,
} from './tag-utils';

// --- Arbitraries ---

const GAME_TYPES = ['OTHELLO', 'CHESS', 'GO', 'SHOGI'] as const;

const gameTypeArb = fc.constantFrom(...GAME_TYPES);

const gameStatusArb = fc.constantFrom('ACTIVE' as const, 'FINISHED' as const);

/** カスタムタグ生成（E2Eを含む可能性あり） */
const customTagArb = fc.oneof(
  fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0 && !s.includes(',')),
  fc.constant('E2E'),
  fc.constant('e2e')
);

/** E2Eを含まないカスタムタグ */
const nonE2ETagArb = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((s) => s.trim().length > 0 && !s.includes(',') && s.toUpperCase() !== 'E2E');

const gameSummaryArb = fc.record({
  gameId: fc.uuid(),
  gameType: gameTypeArb,
  status: gameStatusArb,
  aiSide: fc.constantFrom('BLACK' as const, 'WHITE' as const),
  currentTurn: fc.integer({ min: 0, max: 100 }),
  createdAt: fc.constant('2024-01-01T00:00:00Z'),
  updatedAt: fc.constant('2024-01-01T00:00:00Z'),
  tags: fc.array(customTagArb, { minLength: 0, maxLength: 5 }),
}) as fc.Arbitrary<GameSummary>;

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.clearAllMocks();
});

/**
 * Feature: 37-game-list-tag-search, Property 1: ANDフィルタリングの正確性
 *
 * **Validates: Requirements 3.3, 3.5**
 *
 * 任意の対局リストと任意の選択タグ集合に対して、フィルタリング結果に含まれる全ての対局は、
 * 選択された全てのタグを保持していなければならない。
 * また、選択タグが空の場合、フィルタリング結果は元の対局リスト全体と一致しなければならない。
 */
describe('Property 1: ANDフィルタリングの正確性', () => {
  const selectedTagArb: fc.Arbitrary<SelectedTag> = fc.oneof(
    gameTypeArb.map((gt) => ({
      label: GAME_TYPE_LABEL_MAP[gt] ?? gt,
      value: gt,
      type: 'gameType' as const,
    })),
    nonE2ETagArb.map((tag) => ({
      label: tag,
      value: tag,
      type: 'custom' as const,
    }))
  );

  it('フィルタリング結果の全対局が選択タグを全て保持する', () => {
    fc.assert(
      fc.property(
        fc.array(gameSummaryArb, { minLength: 0, maxLength: 10 }),
        fc.array(selectedTagArb, { minLength: 1, maxLength: 3 }),
        (games, selectedTags) => {
          const filtered = games.filter((g) => matchesTags(g, selectedTags));

          for (const game of filtered) {
            for (const tag of selectedTags) {
              if (tag.type === 'gameType') {
                expect(game.gameType).toBe(tag.value);
              } else {
                expect(game.tags).toContain(tag.value);
              }
            }
          }
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });

  it('空タグ時は全件一致', () => {
    fc.assert(
      fc.property(fc.array(gameSummaryArb, { minLength: 0, maxLength: 10 }), (games) => {
        const filtered = games.filter((g) => matchesTags(g, []));
        expect(filtered).toHaveLength(games.length);
      }),
      { numRuns: 15, endOnFailure: true }
    );
  });
});

/**
 * Feature: 37-game-list-tag-search, Property 2: タグ候補生成の正確性
 *
 * **Validates: Requirements 5.1, 5.4, 5.5**
 *
 * 任意の対局リストに対して、buildTagSuggestions が生成するタグ候補リストは以下を全て満たす:
 * - 候補に「E2E」タグが含まれないこと
 * - 候補に重複する値が存在しないこと
 * - 全ての候補が、入力対局リストの gameType または tags フィールドに由来すること
 */
describe('Property 2: タグ候補生成の正確性', () => {
  it('E2E除外、重複なし、全候補が入力データに由来', () => {
    fc.assert(
      fc.property(fc.array(gameSummaryArb, { minLength: 0, maxLength: 10 }), (games) => {
        const suggestions = buildTagSuggestions(games);

        // E2Eタグが含まれないこと
        for (const s of suggestions) {
          expect(s.value.toUpperCase()).not.toBe('E2E');
          expect(s.label.toUpperCase()).not.toBe('E2E');
        }

        // 重複する値が存在しないこと（type:value の組み合わせで一意）
        const keys = suggestions.map((s) => `${s.type}:${s.value}`);
        expect(new Set(keys).size).toBe(keys.length);

        // 全ての候補が入力データに由来すること
        const allGameTypes = new Set<string>(games.map((g) => g.gameType));
        const allCustomTags = new Set<string>(games.flatMap((g) => g.tags ?? []));

        for (const s of suggestions) {
          if (s.type === 'gameType') {
            expect(allGameTypes.has(s.value)).toBe(true);
          } else {
            expect(allCustomTags.has(s.value)).toBe(true);
          }
        }
      }),
      { numRuns: 15, endOnFailure: true }
    );
  });
});

/**
 * Feature: 37-game-list-tag-search, Property 3: 部分一致フィルタリングの正確性
 *
 * **Validates: Requirements 3.1**
 *
 * 任意のタグ候補リストと任意の検索文字列に対して、filterSuggestions の結果に含まれる
 * 全てのタグの表示名は、検索文字列を部分文字列として含んでいなければならない。
 */
describe('Property 3: 部分一致フィルタリングの正確性', () => {
  it('結果の全タグ表示名が検索文字列を部分文字列として含む', () => {
    fc.assert(
      fc.property(
        fc.array(gameSummaryArb, { minLength: 1, maxLength: 10 }),
        fc.string({ minLength: 1, maxLength: 10 }),
        (games, query) => {
          const suggestions = buildTagSuggestions(games);
          const filtered = filterSuggestions(suggestions, query);

          const lowerQuery = query.toLowerCase();
          for (const s of filtered) {
            expect(s.label.toLowerCase()).toContain(lowerQuery);
          }
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });
});

/**
 * Feature: 37-game-list-tag-search, Property 4: 対局カードタグ表示の正確性
 *
 * **Validates: Requirements 6.1, 6.2, 6.4**
 *
 * 任意の対局データに対して、getGameTags が返すタグリストは以下を全て満たす:
 * - 「E2E」タグが含まれないこと
 * - ゲーム種類タグ（gameType由来）とカスタムタグの両方が含まれること（存在する場合）
 * - 返却されるタグの数が最大3個であること
 */
describe('Property 4: 対局カードタグ表示の正確性', () => {
  it('E2E除外、gameType+カスタムタグ両方含む、最大3個', () => {
    // カスタムタグが少なくとも1つ非E2Eを含むGameSummaryを生成
    const gameWithCustomTagsArb = fc.record({
      gameId: fc.uuid(),
      gameType: gameTypeArb,
      status: gameStatusArb,
      aiSide: fc.constantFrom('BLACK' as const, 'WHITE' as const),
      currentTurn: fc.integer({ min: 0, max: 100 }),
      createdAt: fc.constant('2024-01-01T00:00:00Z'),
      updatedAt: fc.constant('2024-01-01T00:00:00Z'),
      tags: fc
        .array(nonE2ETagArb, { minLength: 1, maxLength: 5 })
        .chain((nonE2E) =>
          fc
            .array(fc.constantFrom('E2E', 'e2e'), { minLength: 0, maxLength: 2 })
            .map((e2eTags) => [...nonE2E, ...e2eTags])
        ),
    }) as fc.Arbitrary<GameSummary>;

    fc.assert(
      fc.property(gameWithCustomTagsArb, (game) => {
        const tags = getGameTags(game);

        // E2Eタグが含まれないこと
        for (const tag of tags) {
          expect(tag.value.toUpperCase()).not.toBe('E2E');
          expect(tag.label.toUpperCase()).not.toBe('E2E');
        }

        // 最大3個であること
        expect(tags.length).toBeLessThanOrEqual(3);

        // gameTypeタグが含まれること
        const hasGameType = tags.some((t) => t.type === 'gameType');
        expect(hasGameType).toBe(true);

        // カスタムタグが含まれること（非E2Eカスタムタグが存在する場合）
        const nonE2ECustomTags = (game.tags ?? []).filter((t) => t.toUpperCase() !== 'E2E');
        if (nonE2ECustomTags.length > 0) {
          const hasCustom = tags.some((t) => t.type === 'custom');
          expect(hasCustom).toBe(true);
        }
      }),
      { numRuns: 15, endOnFailure: true }
    );
  });
});

/**
 * Feature: 37-game-list-tag-search, Property 5: ゲーム種類ラベルマッピングの完全性
 *
 * **Validates: Requirements 2.3, 2.5**
 *
 * 既知の gameType 値（OTHELLO, CHESS, GO, SHOGI）全てに日本語表示名が存在し、
 * ゲーム種類タグとカスタムタグは異なるタグ種類（type フィールド）を持たなければならない。
 */
describe('Property 5: ゲーム種類ラベルマッピングの完全性', () => {
  it('既知gameType全てに日本語表示名が存在、タグ種類が区別される', () => {
    fc.assert(
      fc.property(gameTypeArb, (gameType) => {
        // 日本語表示名が存在すること
        const label = GAME_TYPE_LABEL_MAP[gameType];
        expect(label).toBeDefined();
        expect(typeof label).toBe('string');
        expect(label.length).toBeGreaterThan(0);

        // getGameTags でゲーム種類タグとカスタムタグが区別されること
        const game: GameSummary = {
          gameId: 'test-id',
          gameType,
          status: 'ACTIVE',
          aiSide: 'BLACK',
          currentTurn: 0,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          tags: ['custom-tag'],
        };

        const tags = getGameTags(game);
        const gameTypeTags = tags.filter((t) => t.type === 'gameType');
        const customTags = tags.filter((t) => t.type === 'custom');

        // ゲーム種類タグが存在すること
        expect(gameTypeTags.length).toBeGreaterThan(0);
        expect(gameTypeTags[0].type).toBe('gameType');

        // カスタムタグが存在すること
        expect(customTags.length).toBeGreaterThan(0);
        expect(customTags[0].type).toBe('custom');

        // タグ種類が異なること
        expect(gameTypeTags[0].type).not.toBe(customTags[0].type);
      }),
      { numRuns: 15, endOnFailure: true }
    );
  });
});

/**
 * Feature: 37-game-list-tag-search, Property 6: URLタグパラメータのラウンドトリップ
 *
 * **Validates: Requirements 8.1, 8.2**
 *
 * 任意のタグ配列に対して、tagsToUrlParam でURLパラメータに変換した後、
 * parseTagsFromUrl で復元した結果は、元のタグ配列と一致しなければならない。
 */
describe('Property 6: URLタグパラメータのラウンドトリップ', () => {
  it('tagsToUrlParam → parseTagsFromUrl で元のタグ配列と一致', () => {
    // URLパラメータとして安全なタグ文字列（カンマを含まない、空でない）
    const urlSafeTagArb = fc
      .string({ minLength: 1, maxLength: 20 })
      .filter((s) => s.trim().length > 0 && !s.includes(','));

    fc.assert(
      fc.property(fc.array(urlSafeTagArb, { minLength: 0, maxLength: 5 }), (tags) => {
        const urlParam = tagsToUrlParam(tags);

        if (tags.length === 0) {
          expect(urlParam).toBe('');
          const parsed = parseTagsFromUrl(new URLSearchParams());
          expect(parsed).toEqual([]);
        } else {
          const params = new URLSearchParams({ tags: urlParam });
          const parsed = parseTagsFromUrl(params);
          expect(parsed).toEqual(tags);
        }
      }),
      { numRuns: 15, endOnFailure: true }
    );
  });
});

/**
 * Feature: 37-game-list-tag-search, Property 7: ステータスフィルタとタグフィルタの直交性
 *
 * **Validates: Requirements 4.5**
 *
 * 任意の対局リスト、任意のステータス値、任意の選択タグ集合に対して、
 * ステータスフィルタリングとタグフィルタリングの適用順序に関わらず、結果は同一でなければならない。
 */
describe('Property 7: ステータスフィルタとタグフィルタの直交性', () => {
  /** シンプルなステータスフィルタ関数 */
  function filterByStatus(games: GameSummary[], status: 'ACTIVE' | 'FINISHED'): GameSummary[] {
    return games.filter((g) => g.status === status);
  }

  const selectedTagArb: fc.Arbitrary<SelectedTag> = fc.oneof(
    gameTypeArb.map((gt) => ({
      label: GAME_TYPE_LABEL_MAP[gt] ?? gt,
      value: gt,
      type: 'gameType' as const,
    })),
    nonE2ETagArb.map((tag) => ({
      label: tag,
      value: tag,
      type: 'custom' as const,
    }))
  );

  it('ステータスフィルタとタグフィルタの適用順序に関わらず結果が同一', () => {
    fc.assert(
      fc.property(
        fc.array(gameSummaryArb, { minLength: 0, maxLength: 10 }),
        gameStatusArb,
        fc.array(selectedTagArb, { minLength: 0, maxLength: 3 }),
        (games, status, selectedTags) => {
          // 順序1: ステータス → タグ
          const statusFirst = filterByStatus(games, status).filter((g) =>
            matchesTags(g, selectedTags)
          );

          // 順序2: タグ → ステータス
          const tagFirst = filterByStatus(
            games.filter((g) => matchesTags(g, selectedTags)),
            status
          );

          // gameId で比較（順序は同じはず）
          const ids1 = statusFirst.map((g) => g.gameId);
          const ids2 = tagFirst.map((g) => g.gameId);
          expect(ids1).toEqual(ids2);
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });
});
