/**
 * ResponseParser プロパティベーステスト
 *
 * Feature: game-commentary-generation
 * Property 3: 解説文の長さ不変条件 (Validates: Requirements 4.5)
 * Property 4: 解説パースのラウンドトリップ (Validates: Requirements 4.7)
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { truncateContent, parseCommentaryResponse } from '../response-parser.js';

describe('Feature: game-commentary-generation, Property 3: 解説文の長さ不変条件', () => {
  /**
   * **Validates: Requirements 4.5**
   *
   * For any string, `truncateContent` result is <= 500 characters.
   * If the original string is <= 500 chars, the result equals the original.
   */
  it('任意の文字列に対して truncateContent の結果が500文字以内である', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = truncateContent(input);

        // 結果は常に500文字以内
        expect(result.length).toBeLessThanOrEqual(500);

        // 元の文字列が500文字以内なら結果は元の文字列と等しい
        if (input.length <= 500) {
          expect(result).toBe(input);
        }
      }),
      { numRuns: 15, endOnFailure: true }
    );
  });
});

describe('Feature: game-commentary-generation, Property 4: 解説パースのラウンドトリップ', () => {
  /**
   * **Validates: Requirements 4.7**
   *
   * For any valid commentary (non-empty string <= 500 chars),
   * formatting as `{ content }` JSON and re-parsing with `parseCommentaryResponse`
   * yields equivalent content.
   */
  it('有効な解説文をJSON形式にフォーマットし再パースして等価性を検証', () => {
    const validCommentaryArb = fc
      .string({ minLength: 1, maxLength: 500 })
      .filter((s) => s.trim().length > 0);

    fc.assert(
      fc.property(validCommentaryArb, (commentary) => {
        // JSON形式にフォーマット
        const responseText = JSON.stringify({ content: commentary });

        // 再パース
        const result = parseCommentaryResponse(responseText);

        // パース成功であること
        expect(result.commentary).not.toBeNull();

        // 元の解説文と等価であること（trimされる可能性を考慮）
        expect(result.commentary!.content).toBe(commentary.trim());
      }),
      { numRuns: 15, endOnFailure: true }
    );
  });
});
