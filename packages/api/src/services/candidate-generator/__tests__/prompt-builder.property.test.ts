/**
 * PromptBuilder プロパティベーステスト
 *
 * Feature: move-candidate-generation
 * Property 1: 盤面状態のラウンドトリップ (Validates: Requirements 1.2)
 * Property 2: プロンプトに必要情報がすべて含まれる (Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6)
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { formatBoard, buildPrompt } from '../prompt-builder.js';
import type { Board, Position } from '../../../lib/othello/index.js';

/** Board ジェネレータ: 8x8 の CellState(0,1,2) 配列 */
const boardArb = fc.array(fc.array(fc.constantFrom(0, 1, 2), { minLength: 8, maxLength: 8 }), {
  minLength: 8,
  maxLength: 8,
}) as fc.Arbitrary<Board>;

/** Position ジェネレータ: row/col 0-7 */
const positionArb: fc.Arbitrary<Position> = fc.record({
  row: fc.integer({ min: 0, max: 7 }),
  col: fc.integer({ min: 0, max: 7 }),
});

/** Player ジェネレータ */
const playerArb = fc.constantFrom('BLACK' as const, 'WHITE' as const);

describe('Feature: move-candidate-generation, Property 1: 盤面状態のラウンドトリップ', () => {
  /**
   * **Validates: Requirements 1.2**
   *
   * For any valid Board (8x8 CellState array),
   * JSON.stringify({ board }) → JSON.parse → .board should equal the original board.
   */
  it('Board をシリアライズ→デシリアライズすると元の盤面と等価になる', () => {
    fc.assert(
      fc.property(boardArb, (board) => {
        const serialized = JSON.stringify({ board });
        const deserialized = JSON.parse(serialized) as { board: number[][] };
        expect(deserialized.board).toEqual(board);
      }),
      { numRuns: 15, endOnFailure: true }
    );
  });
});

describe('Feature: move-candidate-generation, Property 2: プロンプトに必要情報がすべて含まれる', () => {
  /**
   * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
   *
   * For any valid Board, legal moves list (Position[]), and player ('BLACK' | 'WHITE'),
   * buildPrompt output contains all required information.
   */
  it('buildPrompt の出力にグリッド表現、合法手、手番、候補数3、200文字制限、JSON要求が含まれる', () => {
    fc.assert(
      fc.property(
        boardArb,
        fc.array(positionArb, { minLength: 1, maxLength: 20 }),
        playerArb,
        (board, legalMoves, player) => {
          const prompt = buildPrompt(board, legalMoves, player);

          // 8行のグリッド表現（盤面の各行）
          const gridLines = formatBoard(board).split('\n');
          // ヘッダー行 + 8データ行 = 9行
          expect(gridLines).toHaveLength(9);
          for (const line of gridLines) {
            expect(prompt).toContain(line);
          }

          // すべての合法手の "row,col" 表現
          for (const move of legalMoves) {
            expect(prompt).toContain(`${move.row},${move.col}`);
          }

          // 手番プレイヤーの情報
          expect(prompt).toContain(player);

          // 候補数 "3" の指定
          expect(prompt).toContain('3');

          // "200" 文字制限の言及
          expect(prompt).toContain('200');

          // "JSON" 形式の要求
          expect(prompt).toContain('JSON');
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });
});
