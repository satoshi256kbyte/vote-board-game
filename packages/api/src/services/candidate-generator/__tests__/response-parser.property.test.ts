/**
 * ResponseParser プロパティベーステスト
 *
 * Feature: move-candidate-generation
 * Property 3: パース結果は合法手のみを含む (Validates: Requirements 4.3, 4.4)
 * Property 4: 説明文の長さ不変条件 (Validates: Requirements 4.5, 4.6)
 * Property 5: 候補パースのラウンドトリップ (Validates: Requirements 4.8)
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { parseAIResponse, truncateDescription } from '../response-parser.js';
import type { Position } from '../../../lib/othello/index.js';

/** Position ジェネレータ: row/col 0-7 */
const positionArb: fc.Arbitrary<Position> = fc.record({
  row: fc.integer({ min: 0, max: 7 }),
  col: fc.integer({ min: 0, max: 7 }),
});

/** ユニークな Position 配列ジェネレータ */
const uniquePositionsArb = fc.uniqueArray(positionArb, {
  minLength: 1,
  maxLength: 10,
  comparator: (a, b) => a.row === b.row && a.col === b.col,
});

/** 200文字以内の description ジェネレータ */
const shortDescriptionArb = fc.string({ minLength: 0, maxLength: 200 });

describe('Feature: move-candidate-generation, Property 3: パース結果は合法手のみを含む', () => {
  /**
   * **Validates: Requirements 4.3, 4.4**
   *
   * For any legal moves list (Position[]) and AI response string,
   * parseAIResponse candidates' positions are all in the legal moves list.
   */
  it('パース結果の各positionが合法手リストに含まれる', () => {
    fc.assert(
      fc.property(
        uniquePositionsArb,
        fc.integer({ min: 1, max: 3 }),
        shortDescriptionArb,
        (legalMoves, candidateCount, desc) => {
          // 合法手からランダムに候補を選んでJSON文字列を構築
          const selectedMoves = legalMoves.slice(0, Math.min(candidateCount, legalMoves.length));
          const candidates = selectedMoves.map((move) => ({
            position: `${move.row},${move.col}`,
            description: desc || 'テスト説明',
          }));
          const responseText = JSON.stringify({ candidates });

          const result = parseAIResponse(responseText, legalMoves);

          // パース結果の各positionが合法手に含まれることを検証
          const legalMoveStrings = legalMoves.map((m) => `${m.row},${m.col}`);
          for (const candidate of result.candidates) {
            expect(legalMoveStrings).toContain(candidate.position);
          }
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });
});

describe('Feature: move-candidate-generation, Property 4: 説明文の長さ不変条件', () => {
  /**
   * **Validates: Requirements 4.5, 4.6**
   *
   * For any string, truncateDescription result is <= 200 chars.
   * If original is <= 200 chars, result equals original.
   */
  it('任意の文字列に対して truncateDescription の結果が200文字以内である', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = truncateDescription(input);

        // 結果は常に200文字以内
        expect(result.length).toBeLessThanOrEqual(200);

        // 元の文字列が200文字以内なら結果は元の文字列と等しい
        if (input.length <= 200) {
          expect(result).toBe(input);
        }
      }),
      { numRuns: 15, endOnFailure: true }
    );
  });
});

describe('Feature: move-candidate-generation, Property 5: 候補パースのラウンドトリップ', () => {
  /**
   * **Validates: Requirements 4.8**
   *
   * For any valid ParsedCandidate (position in "row,col" format, description <= 200 chars),
   * format as AI response JSON and re-parse with parseAIResponse → result equals original.
   */
  it('有効な ParsedCandidate をJSON形式にフォーマットし再パースして等価性を検証', () => {
    fc.assert(
      fc.property(positionArb, shortDescriptionArb, (position, description) => {
        const original = {
          position: `${position.row},${position.col}`,
          description,
        };

        // 合法手リストに対象positionを含める
        const legalMoves: Position[] = [position];

        // AIレスポンスJSON形式にフォーマット
        const responseText = JSON.stringify({
          candidates: [{ position: original.position, description: original.description }],
        });

        // 再パース
        const result = parseAIResponse(responseText, legalMoves);

        // 元の候補と等価であることを検証
        expect(result.candidates).toHaveLength(1);
        expect(result.candidates[0].position).toBe(original.position);
        expect(result.candidates[0].description).toBe(original.description);
      }),
      { numRuns: 15, endOnFailure: true }
    );
  });
});
