import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { sortCandidates, filterCandidates } from './sort-filter';

/**
 * プロパティベーステスト: ソート・フィルター関数
 *
 * fast-check設定:
 * - numRuns: 10 (JSDOM環境での安定性のため)
 * - endOnFailure: true (最初の失敗で停止)
 */

// Arbitraries (テストデータ生成器)

/**
 * Candidate オブジェクトを生成する Arbitrary
 */
const candidateArbitrary = fc.record({
  id: fc.uuid(),
  voteCount: fc.nat({ max: 1000 }),
  createdAt: fc
    .integer({ min: Date.parse('2024-01-01'), max: Date.parse('2024-12-31') })
    .map((timestamp) => new Date(timestamp).toISOString()),
  source: fc.constantFrom('ai' as const, 'user' as const),
});

/**
 * Candidate 配列を生成する Arbitrary
 */
const candidatesArbitrary = fc.array(candidateArbitrary, { minLength: 0, maxLength: 20 });

/**
 * SortBy を生成する Arbitrary
 */
const sortByArbitrary = fc.constantFrom('voteCount' as const, 'createdAt' as const);

/**
 * SortOrder を生成する Arbitrary
 */
const sortOrderArbitrary = fc.constantFrom('asc' as const, 'desc' as const);

/**
 * Filter を生成する Arbitrary
 */
const filterArbitrary = fc.constantFrom(
  'all' as const,
  'my-vote' as const,
  'ai' as const,
  'user' as const
);

describe('sortCandidates - Property-Based Tests', () => {
  /**
   * **Property 1: 候補リストのソート順**
   * **Validates: Requirements 1.3, 16.1, 16.5**
   *
   * For any 候補リストとソート設定（sortBy, sortOrder）に対して、
   * ソート後のリストは指定された順序で並んでいる。
   * 投票数でソートする場合は voteCount で、
   * 作成日時でソートする場合は createdAt で、
   * 昇順または降順に並んでいる。
   */
  it('Property 1: ソート後のリストは指定された順序で並んでいる', () => {
    fc.assert(
      fc.property(
        candidatesArbitrary,
        sortByArbitrary,
        sortOrderArbitrary,
        (candidates, sortBy, sortOrder) => {
          const sorted = sortCandidates(candidates, sortBy, sortOrder);

          // 長さが保持されることを確認
          expect(sorted).toHaveLength(candidates.length);

          // 元の配列が変更されていないことを確認
          expect(candidates).toHaveLength(candidates.length);

          // ソート順が正しいことを確認
          for (let i = 0; i < sorted.length - 1; i++) {
            const current = sorted[i];
            const next = sorted[i + 1];

            let currentValue: number;
            let nextValue: number;

            if (sortBy === 'voteCount') {
              currentValue = current.voteCount;
              nextValue = next.voteCount;
            } else {
              // sortBy === 'createdAt'
              currentValue = new Date(current.createdAt).getTime();
              nextValue = new Date(next.createdAt).getTime();
            }

            if (sortOrder === 'asc') {
              // 昇順: 現在の値 <= 次の値
              expect(currentValue).toBeLessThanOrEqual(nextValue);
            } else {
              // 降順: 現在の値 >= 次の値
              expect(currentValue).toBeGreaterThanOrEqual(nextValue);
            }
          }
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('Property 1.1: ソートは元の配列を変更しない（不変性）', () => {
    fc.assert(
      fc.property(
        candidatesArbitrary,
        sortByArbitrary,
        sortOrderArbitrary,
        (candidates, sortBy, sortOrder) => {
          const original = JSON.parse(JSON.stringify(candidates));
          sortCandidates(candidates, sortBy, sortOrder);

          // 元の配列が変更されていないことを確認
          expect(candidates).toEqual(original);
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('Property 1.2: ソートは全ての要素を保持する', () => {
    fc.assert(
      fc.property(
        candidatesArbitrary,
        sortByArbitrary,
        sortOrderArbitrary,
        (candidates, sortBy, sortOrder) => {
          const sorted = sortCandidates(candidates, sortBy, sortOrder);

          // 全てのIDが保持されていることを確認
          const originalIds = candidates.map((c) => c.id).sort();
          const sortedIds = sorted.map((c) => c.id).sort();

          expect(sortedIds).toEqual(originalIds);
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('Property 1.3: 空の配列をソートすると空の配列が返る', () => {
    fc.assert(
      fc.property(sortByArbitrary, sortOrderArbitrary, (sortBy, sortOrder) => {
        const sorted = sortCandidates([], sortBy, sortOrder);

        expect(sorted).toEqual([]);
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('Property 1.4: 単一要素の配列をソートすると同じ要素が返る', () => {
    fc.assert(
      fc.property(
        candidateArbitrary,
        sortByArbitrary,
        sortOrderArbitrary,
        (candidate, sortBy, sortOrder) => {
          const sorted = sortCandidates([candidate], sortBy, sortOrder);

          expect(sorted).toHaveLength(1);
          expect(sorted[0]).toEqual(candidate);
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('Property 1.5: 同じ値を持つ候補のソートは安定している', () => {
    fc.assert(
      fc.property(
        fc.array(candidateArbitrary, { minLength: 2, maxLength: 10 }),
        sortByArbitrary,
        sortOrderArbitrary,
        (candidates, sortBy, sortOrder) => {
          // 全ての候補に同じ値を設定
          const sameCandidates = candidates.map((c, index) => ({
            ...c,
            voteCount: sortBy === 'voteCount' ? 10 : c.voteCount,
            createdAt: sortBy === 'createdAt' ? '2024-01-01T10:00:00Z' : c.createdAt,
            id: `id-${index}`, // 順序を追跡するためにIDを設定
          }));

          const sorted = sortCandidates(sameCandidates, sortBy, sortOrder);

          // 全ての要素が保持されていることを確認
          expect(sorted).toHaveLength(sameCandidates.length);
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });
});

describe('filterCandidates - Property-Based Tests', () => {
  /**
   * **Property 5: フィルター機能の正確性**
   * **Validates: Requirements 16.4, 16.6**
   *
   * For any 候補リストとフィルター設定に対して、
   * フィルター後のリストは指定された条件に一致する候補のみを含む。
   * 'my-vote'の場合は自分が投票した候補のみ、
   * 'ai'の場合はAI生成候補のみ、
   * 'user'の場合はユーザー投稿候補のみ、
   * 'all'の場合はすべての候補を含む。
   */
  it('Property 5: フィルター後のリストは指定された条件に一致する', () => {
    fc.assert(
      fc.property(candidatesArbitrary, filterArbitrary, (candidates, filter) => {
        // votedCandidateId を生成（候補が存在する場合はその中から選択）
        const votedCandidateId = candidates.length > 0 ? candidates[0].id : undefined;

        const filtered = filterCandidates(candidates, filter, votedCandidateId);

        // フィルター後の配列の長さは元の配列以下
        expect(filtered.length).toBeLessThanOrEqual(candidates.length);

        // フィルター条件に応じた検証
        if (filter === 'all') {
          // 'all' の場合は全ての候補が含まれる
          expect(filtered).toEqual(candidates);
        } else if (filter === 'my-vote') {
          // 'my-vote' の場合は投票した候補のみ
          expect(filtered.every((c) => c.id === votedCandidateId)).toBe(true);
          if (votedCandidateId && candidates.some((c) => c.id === votedCandidateId)) {
            expect(filtered).toHaveLength(1);
          } else {
            expect(filtered).toHaveLength(0);
          }
        } else if (filter === 'ai') {
          // 'ai' の場合はAI生成候補のみ
          expect(filtered.every((c) => c.source === 'ai')).toBe(true);
        } else if (filter === 'user') {
          // 'user' の場合はユーザー投稿候補のみ
          expect(filtered.every((c) => c.source === 'user')).toBe(true);
        }
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('Property 5.1: フィルターは元の配列を変更しない（不変性）', () => {
    fc.assert(
      fc.property(candidatesArbitrary, filterArbitrary, (candidates, filter) => {
        const original = JSON.parse(JSON.stringify(candidates));
        const votedCandidateId = candidates.length > 0 ? candidates[0].id : undefined;

        filterCandidates(candidates, filter, votedCandidateId);

        // 元の配列が変更されていないことを確認
        expect(candidates).toEqual(original);
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('Property 5.2: フィルター後の候補は元の配列のサブセット', () => {
    fc.assert(
      fc.property(candidatesArbitrary, filterArbitrary, (candidates, filter) => {
        const votedCandidateId = candidates.length > 0 ? candidates[0].id : undefined;
        const filtered = filterCandidates(candidates, filter, votedCandidateId);

        // フィルター後の全ての候補が元の配列に存在することを確認
        filtered.forEach((filteredCandidate) => {
          expect(candidates.some((c) => c.id === filteredCandidate.id)).toBe(true);
        });
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('Property 5.3: 空の配列をフィルターすると空の配列が返る', () => {
    fc.assert(
      fc.property(filterArbitrary, (filter) => {
        const filtered = filterCandidates([], filter, undefined);

        expect(filtered).toEqual([]);
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('Property 5.4: AI候補のみの配列を"user"でフィルターすると空配列', () => {
    fc.assert(
      fc.property(fc.array(candidateArbitrary, { minLength: 1, maxLength: 10 }), (candidates) => {
        // 全ての候補をAI生成に設定
        const aiCandidates = candidates.map((c) => ({ ...c, source: 'ai' as const }));

        const filtered = filterCandidates(aiCandidates, 'user');

        expect(filtered).toEqual([]);
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('Property 5.5: ユーザー候補のみの配列を"ai"でフィルターすると空配列', () => {
    fc.assert(
      fc.property(fc.array(candidateArbitrary, { minLength: 1, maxLength: 10 }), (candidates) => {
        // 全ての候補をユーザー投稿に設定
        const userCandidates = candidates.map((c) => ({ ...c, source: 'user' as const }));

        const filtered = filterCandidates(userCandidates, 'ai');

        expect(filtered).toEqual([]);
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('Property 5.6: "my-vote"フィルターで存在しないIDを指定すると空配列', () => {
    fc.assert(
      fc.property(candidatesArbitrary, (candidates) => {
        const nonExistentId = 'non-existent-id-12345';

        const filtered = filterCandidates(candidates, 'my-vote', nonExistentId);

        expect(filtered).toEqual([]);
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });
});

describe('sortCandidates + filterCandidates - Combined Properties', () => {
  it('Property: ソートとフィルターを組み合わせても不変性が保たれる', () => {
    fc.assert(
      fc.property(
        candidatesArbitrary,
        sortByArbitrary,
        sortOrderArbitrary,
        filterArbitrary,
        (candidates, sortBy, sortOrder, filter) => {
          const original = JSON.parse(JSON.stringify(candidates));
          const votedCandidateId = candidates.length > 0 ? candidates[0].id : undefined;

          // フィルター → ソート
          const filtered = filterCandidates(candidates, filter, votedCandidateId);
          const sorted = sortCandidates(filtered, sortBy, sortOrder);

          // 元の配列が変更されていないことを確認
          expect(candidates).toEqual(original);

          // ソート後の配列がフィルター条件を満たしていることを確認
          if (filter === 'ai') {
            expect(sorted.every((c) => c.source === 'ai')).toBe(true);
          } else if (filter === 'user') {
            expect(sorted.every((c) => c.source === 'user')).toBe(true);
          }
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('Property: フィルター → ソート と ソート → フィルター の結果は同じ（可換性）', () => {
    fc.assert(
      fc.property(
        candidatesArbitrary,
        sortByArbitrary,
        sortOrderArbitrary,
        fc.constantFrom('ai' as const, 'user' as const), // 'all' と 'my-vote' は除外（可換性が保証されないため）
        (candidates, sortBy, sortOrder, filter) => {
          // フィルター → ソート
          const filtered = filterCandidates(candidates, filter);
          const filterThenSort = sortCandidates(filtered, sortBy, sortOrder);

          // ソート → フィルター
          const sorted = sortCandidates(candidates, sortBy, sortOrder);
          const sortThenFilter = filterCandidates(sorted, filter);

          // 結果が同じであることを確認（IDの順序で比較）
          expect(filterThenSort.map((c) => c.id)).toEqual(sortThenFilter.map((c) => c.id));
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });
});
