/**
 * Commentary API Client プロパティベーステスト
 *
 * Feature: ai-content-display
 * Property 3: 解説 API レスポンスのマッピングはすべてのフィールドを保持する
 *
 * **Validates: Requirements 3.2, 3.3**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { getCommentaries } from './commentary';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Commentary API Client - Property-based tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.clearAllMocks();
  });

  // 解説データのアービトラリ生成
  // fc.date は shrinking 時に Invalid Date を生成する可能性があるため、タイムスタンプ整数から生成
  const commentaryArb = fc.record({
    turnNumber: fc.integer({ min: 1, max: 100 }),
    content: fc.string({ minLength: 1, maxLength: 500 }).filter((s) => s.trim().length > 0),
    generatedBy: fc.constantFrom('AI', 'SYSTEM'),
    createdAt: fc
      .integer({ min: 1704067200000, max: 1767225599000 })
      .map((ts) => new Date(ts).toISOString()),
  });

  // 解説配列のアービトラリ生成
  const commentaryListArb = fc.array(commentaryArb, { minLength: 1, maxLength: 10 });

  // fc.property でサンプルを収集し、順次 async テストを実行するヘルパー
  function collectSamples<T>(arb: fc.Arbitrary<T>, numRuns = 10): T[] {
    const samples: T[] = [];
    fc.assert(
      fc.property(arb, (sample) => {
        samples.push(sample);
      }),
      { numRuns, endOnFailure: true }
    );
    return samples;
  }

  /**
   * Property 3: 解説 API レスポンスのマッピングはすべてのフィールドを保持する
   * **Validates: Requirements 3.2, 3.3**
   *
   * Feature: ai-content-display, Property 3: 解説 API レスポンスのマッピングはすべてのフィールドを保持する
   */
  describe('Property 3: 解説 API レスポンスのマッピングはすべてのフィールドを保持する', () => {
    it('任意の有効な API レスポンスに対して、マッピング結果はすべてのフィールドの値を正確に保持する', async () => {
      const samples = collectSamples(commentaryListArb, 10);

      for (const commentaries of samples) {
        mockFetch.mockClear();
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ commentaries }),
        });

        const result = await getCommentaries('test-game-id');

        // 配列の長さが一致する
        expect(result).toHaveLength(commentaries.length);

        // 各要素のすべてのフィールドが正確に保持される
        for (let i = 0; i < result.length; i++) {
          expect(result[i].turnNumber).toBe(commentaries[i].turnNumber);
          expect(result[i].content).toBe(commentaries[i].content);
          expect(result[i].generatedBy).toBe(commentaries[i].generatedBy);
          expect(result[i].createdAt).toBe(commentaries[i].createdAt);
        }
      }
    });

    it('任意の有効な API レスポンスに対して、各要素は正確に4つのフィールドを持つ', async () => {
      const samples = collectSamples(commentaryListArb, 10);

      for (const commentaries of samples) {
        mockFetch.mockClear();
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ commentaries }),
        });

        const result = await getCommentaries('test-game-id');

        for (const item of result) {
          expect(typeof item.turnNumber).toBe('number');
          expect(typeof item.content).toBe('string');
          expect(typeof item.generatedBy).toBe('string');
          expect(typeof item.createdAt).toBe('string');
          expect(Object.keys(item)).toHaveLength(4);
        }
      }
    });
  });
});
