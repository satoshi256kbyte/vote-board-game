/**
 * PromptBuilder プロパティベーステスト
 *
 * Feature: game-commentary-generation
 * Property 1: 盤面状態のラウンドトリップ (Validates: Requirements 1.2)
 * Property 2: プロンプトに必要情報がすべて含まれる (Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.9, 3.10)
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { formatBoard, buildCommentaryPrompt } from '../prompt-builder.js';
import type { Board } from '../../../lib/othello/index.js';
import type { MoveEntity } from '../../../lib/dynamodb/types.js';

/** Board ジェネレータ: 8x8 の CellState(0,1,2) 配列 */
const boardArb = fc.array(fc.array(fc.constantFrom(0, 1, 2), { minLength: 8, maxLength: 8 }), {
  minLength: 8,
  maxLength: 8,
}) as fc.Arbitrary<Board>;

/** Player ジェネレータ */
const playerArb = fc.constantFrom('BLACK' as const, 'WHITE' as const);

/** MoveEntity ジェネレータ */
const moveEntityArb = (turnNumber: number): fc.Arbitrary<MoveEntity> =>
  fc.record({
    PK: fc.constant(`GAME#test-game`),
    SK: fc.constant(`MOVE#${String(turnNumber).padStart(4, '0')}`),
    entityType: fc.constant('MOVE' as const),
    createdAt: fc.constant(new Date().toISOString()),
    gameId: fc.constant('test-game'),
    turnNumber: fc.constant(turnNumber),
    side: fc.constantFrom('BLACK' as const, 'WHITE' as const),
    position: fc
      .tuple(fc.integer({ min: 0, max: 7 }), fc.integer({ min: 0, max: 7 }))
      .map(([r, c]) => `${r},${c}`),
    playedBy: fc.constantFrom('AI' as const, 'COLLECTIVE' as const),
    candidateId: fc.constant('candidate-1'),
  });

/** MoveEntity[] ジェネレータ: 1〜5手の手履歴 */
const movesArb = fc
  .integer({ min: 1, max: 5 })
  .chain((count) => fc.tuple(...Array.from({ length: count }, (_, i) => moveEntityArb(i + 1))));

/** discCount ジェネレータ */
const discCountArb = fc.record({
  black: fc.integer({ min: 0, max: 64 }),
  white: fc.integer({ min: 0, max: 64 }),
});

describe('Feature: game-commentary-generation, Property 1: 盤面状態のラウンドトリップ', () => {
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

describe('Feature: game-commentary-generation, Property 2: プロンプトに必要情報がすべて含まれる', () => {
  /**
   * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.9, 3.10**
   *
   * For any valid Board, MoveEntity[], discCount, currentPlayer, aiSide,
   * buildCommentaryPrompt output contains all required information.
   */
  it('buildCommentaryPrompt の出力にグリッド表現、手履歴、石数、手番、AI側/集合知側、500文字制限、JSON要求、戦略分析要求、形勢判断要求が含まれる', () => {
    fc.assert(
      fc.property(
        boardArb,
        movesArb,
        discCountArb,
        playerArb,
        playerArb,
        (board, moves, discCount, currentPlayer, aiSide) => {
          const prompt = buildCommentaryPrompt(board, moves, discCount, currentPlayer, aiSide);

          // 8行のグリッド表現（盤面の各行）
          const gridLines = formatBoard(board).split('\n');
          expect(gridLines).toHaveLength(9); // ヘッダー行 + 8データ行
          for (const line of gridLines) {
            expect(prompt).toContain(line);
          }

          // 手履歴の各手の情報（ターン番号、位置、手番）
          for (const move of moves) {
            expect(prompt).toContain(`ターン${move.turnNumber}`);
            expect(prompt).toContain(move.position);
          }

          // 黒・白それぞれの石数
          expect(prompt).toContain(`${discCount.black}`);
          expect(prompt).toContain(`${discCount.white}`);

          // 現在の手番情報
          expect(prompt).toContain(currentPlayer);

          // AI側と集合知側の色情報
          expect(prompt).toContain(`AI側: ${aiSide}`);
          const collectiveSide = aiSide === 'BLACK' ? 'WHITE' : 'BLACK';
          expect(prompt).toContain(`集合知側: ${collectiveSide}`);

          // "500" 文字制限の言及
          expect(prompt).toContain('500');

          // "JSON" 形式の要求
          expect(prompt).toContain('JSON');

          // 直近の手の分析要求（戦略）
          expect(prompt).toContain('戦略');

          // 形勢判断の要求
          expect(prompt).toContain('形勢');
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });
});
