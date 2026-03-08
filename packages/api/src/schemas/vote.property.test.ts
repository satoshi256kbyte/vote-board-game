/**
 * 投票スキーマ プロパティベーステスト
 *
 * POST スキーマ:
 * Property 2: 不正な candidateId に対するバリデーションエラー検証
 * Property 3: 不正なパスパラメータに対するバリデーションエラー検証
 *
 * PUT スキーマ (Feature: 21-vote-change-api):
 * Property 2: リクエストバリデーション - 不正な candidateId / gameId / turnNumber に対するバリデーションエラー検証
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  postVoteBodySchema,
  postVoteParamSchema,
  putVoteBodySchema,
  putVoteParamSchema,
} from './vote.js';

describe('postVoteBodySchema - プロパティテスト', () => {
  it('Property 2: 不正な candidateId はバリデーションエラーになる', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string().filter((s) => {
            // UUID v4 形式でない文字列のみ
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            return !uuidRegex.test(s);
          }),
          fc.integer(),
          fc.boolean(),
          fc.constant(null),
          fc.constant(undefined)
        ),
        (invalidCandidateId) => {
          const result = postVoteBodySchema.safeParse({ candidateId: invalidCandidateId });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });
});

describe('postVoteParamSchema - プロパティテスト', () => {
  it('Property 3: 不正な gameId はバリデーションエラーになる', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          return !uuidRegex.test(s);
        }),
        (invalidGameId) => {
          const result = postVoteParamSchema.safeParse({
            gameId: invalidGameId,
            turnNumber: '1',
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('Property 3: 負の turnNumber はバリデーションエラーになる', () => {
    fc.assert(
      fc.property(fc.integer({ max: -1 }), (negativeTurn) => {
        const result = postVoteParamSchema.safeParse({
          gameId: '550e8400-e29b-41d4-a716-446655440000',
          turnNumber: String(negativeTurn),
        });
        expect(result.success).toBe(false);
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });
});

/**
 * Feature: 21-vote-change-api, Property 2: リクエストバリデーション
 *
 * 不正な candidateId / gameId / turnNumber に対するバリデーションエラー検証
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
 */
describe('putVoteBodySchema - プロパティテスト', () => {
  it('Property 2: 不正な candidateId はバリデーションエラーになる', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string().filter((s) => {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            return !uuidRegex.test(s);
          }),
          fc.integer(),
          fc.boolean(),
          fc.constant(null),
          fc.constant(undefined)
        ),
        (invalidCandidateId) => {
          const result = putVoteBodySchema.safeParse({
            candidateId: invalidCandidateId,
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('Property 2: 空文字列の candidateId はバリデーションエラーになる', () => {
    const result = putVoteBodySchema.safeParse({ candidateId: '' });
    expect(result.success).toBe(false);
  });

  it('Property 2: candidateId が未指定の場合はバリデーションエラーになる', () => {
    const result = putVoteBodySchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('putVoteParamSchema - プロパティテスト', () => {
  it('Property 2: 不正な gameId はバリデーションエラーになる', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          return !uuidRegex.test(s);
        }),
        (invalidGameId) => {
          const result = putVoteParamSchema.safeParse({
            gameId: invalidGameId,
            turnNumber: '1',
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('Property 2: 負の turnNumber はバリデーションエラーになる', () => {
    fc.assert(
      fc.property(fc.integer({ max: -1 }), (negativeTurn) => {
        const result = putVoteParamSchema.safeParse({
          gameId: '550e8400-e29b-41d4-a716-446655440000',
          turnNumber: String(negativeTurn),
        });
        expect(result.success).toBe(false);
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('Property 2: 小数の turnNumber はバリデーションエラーになる', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 100, noNaN: true }).filter((n) => !Number.isInteger(n)),
        (decimalTurn) => {
          const result = putVoteParamSchema.safeParse({
            gameId: '550e8400-e29b-41d4-a716-446655440000',
            turnNumber: String(decimalTurn),
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });
});
