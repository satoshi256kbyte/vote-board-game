/**
 * 候補投稿API スキーマ プロパティベーステスト
 *
 * Property 2: リクエストボディのバリデーション (Requirements: 2.3, 2.4, 2.5, 2.6, 2.7)
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { postCandidateBodySchema, postCandidateParamSchema } from './candidate.js';

describe('Property 2: リクエストボディのバリデーション', () => {
  it('有効な position と description はバリデーションを通過する', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 7 }),
        fc.integer({ min: 0, max: 7 }),
        fc.string({ minLength: 1, maxLength: 200 }).filter((s) => s.trim().length > 0),
        (row, col, description) => {
          const result = postCandidateBodySchema.safeParse({
            position: `${row},${col}`,
            description,
          });
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });

  it('範囲外の row/col はバリデーションエラーになる', () => {
    const outOfRangeArb = fc.oneof(
      fc.integer({ min: 8, max: 100 }),
      fc.integer({ min: -100, max: -1 })
    );

    fc.assert(
      fc.property(outOfRangeArb, fc.integer({ min: 0, max: 7 }), (badVal, goodVal) => {
        const result1 = postCandidateBodySchema.safeParse({
          position: `${badVal},${goodVal}`,
          description: 'テスト',
        });
        expect(result1.success).toBe(false);

        const result2 = postCandidateBodySchema.safeParse({
          position: `${goodVal},${badVal}`,
          description: 'テスト',
        });
        expect(result2.success).toBe(false);
      }),
      { numRuns: 15, endOnFailure: true }
    );
  });

  it('不正な position 形式はバリデーションエラーになる', () => {
    const invalidPositionArb = fc.oneof(
      fc.string({ minLength: 1, maxLength: 10 }).filter((s) => !/^[0-7],[0-7]$/.test(s)),
      fc.constant(''),
      fc.constant('a,b'),
      fc.constant('1.5,2'),
      fc.constant('1, 2'),
      fc.constant('12')
    );

    fc.assert(
      fc.property(invalidPositionArb, (invalidPosition) => {
        const result = postCandidateBodySchema.safeParse({
          position: invalidPosition,
          description: 'テスト',
        });
        expect(result.success).toBe(false);
      }),
      { numRuns: 15, endOnFailure: true }
    );
  });

  it('空の description はバリデーションエラーになる', () => {
    const result = postCandidateBodySchema.safeParse({
      position: '2,3',
      description: '',
    });
    expect(result.success).toBe(false);
  });

  it('201文字以上の description はバリデーションエラーになる', () => {
    fc.assert(
      fc.property(fc.integer({ min: 201, max: 500 }), (len) => {
        const result = postCandidateBodySchema.safeParse({
          position: '2,3',
          description: 'a'.repeat(len),
        });
        expect(result.success).toBe(false);
      }),
      { numRuns: 15, endOnFailure: true }
    );
  });
});

describe('Property 3: パスパラメータのバリデーション', () => {
  it('有効な UUID と非負整数はバリデーションを通過する', () => {
    fc.assert(
      fc.property(fc.uuid(), fc.nat({ max: 100 }), (gameId, turnNumber) => {
        const result = postCandidateParamSchema.safeParse({
          gameId,
          turnNumber: String(turnNumber),
        });
        expect(result.success).toBe(true);
      }),
      { numRuns: 15, endOnFailure: true }
    );
  });

  it('非UUID の gameId はバリデーションエラーになる', () => {
    const nonUuidArb = fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s));

    fc.assert(
      fc.property(nonUuidArb, (invalidGameId) => {
        const result = postCandidateParamSchema.safeParse({
          gameId: invalidGameId,
          turnNumber: '0',
        });
        expect(result.success).toBe(false);
      }),
      { numRuns: 15, endOnFailure: true }
    );
  });

  it('負の turnNumber はバリデーションエラーになる', () => {
    fc.assert(
      fc.property(fc.integer({ min: -1000, max: -1 }), (negativeTurn) => {
        const result = postCandidateParamSchema.safeParse({
          gameId: '550e8400-e29b-41d4-a716-446655440000',
          turnNumber: String(negativeTurn),
        });
        expect(result.success).toBe(false);
      }),
      { numRuns: 15, endOnFailure: true }
    );
  });
});
