/**
 * ResponseParser プロパティベーステスト
 *
 * Feature: ai-move-execution
 * Property 3: AIレスポンスのラウンドトリップ (Validates: Requirements 4.7)
 * Property 4: 合法手バリデーション (Validates: Requirements 4.3, 4.4)
 * Property 5: description の切り詰め (Validates: Requirements 4.5, 4.6)
 * Property 6: フォールバック手選択 (Validates: Requirements 5.1, 5.2)
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  parseAIMoveResponse,
  truncateDescription,
  formatAIMoveResponse,
} from '../response-parser.js';
import type { Position } from '../../../lib/othello/index.js';

const positionArb: fc.Arbitrary<Position> = fc.record({
  row: fc.integer({ min: 0, max: 7 }),
  col: fc.integer({ min: 0, max: 7 }),
});

const uniquePositionsArb = fc.uniqueArray(positionArb, {
  minLength: 1,
  maxLength: 10,
  comparator: (a, b) => a.row === b.row && a.col === b.col,
});

const shortDescriptionArb = fc.string({ minLength: 0, maxLength: 200 });

// Feature: ai-move-execution, Property 3: AIレスポンスのラウンドトリップ
describe('Feature: ai-move-execution, Property 3: AIレスポンスのラウンドトリップ', () => {
  it('有効なレスポンスをパース→フォーマット→再パースすると元と等価', () => {
    fc.assert(
      fc.property(positionArb, shortDescriptionArb, (position, description) => {
        const posStr = `${position.row},${position.col}`;
        const legalMoves: Position[] = [position];

        // 初回パース
        const responseText = formatAIMoveResponse(posStr, description);
        const first = parseAIMoveResponse(responseText, legalMoves);
        expect(first.success).toBe(true);

        // フォーマットし直して再パース
        const reformatted = formatAIMoveResponse(first.position!, first.description!);
        const second = parseAIMoveResponse(reformatted, legalMoves);

        expect(second.success).toBe(true);
        expect(second.position).toBe(first.position);
        expect(second.description).toBe(first.description);
      }),
      { numRuns: 15, endOnFailure: true }
    );
  });
});

// Feature: ai-move-execution, Property 4: 合法手バリデーション
describe('Feature: ai-move-execution, Property 4: 合法手バリデーション', () => {
  it('合法手に含まれるpositionは採用され、含まれないpositionはフォールバック', () => {
    fc.assert(
      fc.property(
        uniquePositionsArb,
        positionArb,
        shortDescriptionArb,
        (legalMoves, testPos, desc) => {
          const posStr = `${testPos.row},${testPos.col}`;
          const responseText = JSON.stringify({ position: posStr, description: desc || 'テスト' });
          const result = parseAIMoveResponse(responseText, legalMoves);

          const isLegal = legalMoves.some((m) => m.row === testPos.row && m.col === testPos.col);

          if (isLegal) {
            expect(result.success).toBe(true);
            expect(result.position).toBe(posStr);
          } else {
            expect(result.success).toBe(false);
          }
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });
});

// Feature: ai-move-execution, Property 5: description の切り詰め
describe('Feature: ai-move-execution, Property 5: description の切り詰め', () => {
  it('任意の文字列に対して結果が200文字以内、200文字以内なら変更なし', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = truncateDescription(input);
        expect(result.length).toBeLessThanOrEqual(200);
        if (input.length <= 200) {
          expect(result).toBe(input);
        }
      }),
      { numRuns: 15, endOnFailure: true }
    );
  });
});

// Feature: ai-move-execution, Property 6: フォールバック手選択
describe('Feature: ai-move-execution, Property 6: フォールバック手選択', () => {
  it('不正なJSONレスポンスではパースが失敗する', () => {
    fc.assert(
      fc.property(
        uniquePositionsArb,
        fc.string().filter((s) => {
          try {
            JSON.parse(s);
            return false;
          } catch {
            return true;
          }
        }),
        (legalMoves, invalidJson) => {
          const result = parseAIMoveResponse(invalidJson, legalMoves);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });
});
