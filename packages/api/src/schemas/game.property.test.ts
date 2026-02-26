import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { getGamesQuerySchema, createGameSchema, gameIdParamSchema } from './game.js';

/**
 * Feature: game-api
 * Property 18: Error Responses Have Required Structure
 *
 * **Validates: Requirements 5.1, 6.5**
 *
 * 任意のエラー条件（バリデーション、not found、内部エラー）に対して、
 * エラーレスポンスは error、message、および（バリデーションエラーの場合）
 * details.fields フィールドを含むべきです。
 */
describe('Property 18: Error Responses Have Required Structure', () => {
  describe('getGamesQuerySchema validation errors', () => {
    it('should return structured error for invalid status values', () => {
      fc.assert(
        fc.property(
          // ACTIVE または FINISHED 以外の文字列を生成
          fc
            .string({ minLength: 1, maxLength: 20 })
            .filter((s) => s !== 'ACTIVE' && s !== 'FINISHED'),
          (invalidStatus) => {
            const result = getGamesQuerySchema.safeParse({ status: invalidStatus });

            // バリデーションは失敗すべき
            expect(result.success).toBe(false);

            if (!result.success) {
              // Zod エラーオブジェクトの構造を検証
              expect(result.error).toBeDefined();
              expect(result.error.issues).toBeDefined();
              expect(Array.isArray(result.error.issues)).toBe(true);
              expect(result.error.issues.length).toBeGreaterThan(0);

              // 各 issue が必要なフィールドを持つことを確認
              result.error.issues.forEach((issue) => {
                expect(issue).toHaveProperty('message');
                expect(issue).toHaveProperty('path');
                expect(typeof issue.message).toBe('string');
                expect(Array.isArray(issue.path)).toBe(true);
              });

              // status フィールドのエラーが存在することを確認
              const statusError = result.error.issues.find((issue) => issue.path[0] === 'status');
              expect(statusError).toBeDefined();
            }

            return true;
          }
        ),
        { numRuns: 20, endOnFailure: true }
      );
    });

    it('should return structured error for invalid limit values', () => {
      fc.assert(
        fc.property(
          // 1未満または100超過の整数を生成
          fc.oneof(
            fc.integer({ max: 0 }), // 0以下
            fc.integer({ min: 101, max: 1000 }) // 101以上
          ),
          (invalidLimit) => {
            const result = getGamesQuerySchema.safeParse({ limit: invalidLimit });

            // バリデーションは失敗すべき
            expect(result.success).toBe(false);

            if (!result.success) {
              // Zod エラーオブジェクトの構造を検証
              expect(result.error).toBeDefined();
              expect(result.error.issues).toBeDefined();
              expect(Array.isArray(result.error.issues)).toBe(true);
              expect(result.error.issues.length).toBeGreaterThan(0);

              // limit フィールドのエラーが存在することを確認
              const limitError = result.error.issues.find((issue) => issue.path[0] === 'limit');
              expect(limitError).toBeDefined();

              if (limitError) {
                expect(limitError.message).toBeDefined();
                expect(typeof limitError.message).toBe('string');
              }
            }

            return true;
          }
        ),
        { numRuns: 20, endOnFailure: true }
      );
    });

    it('should return structured error for non-numeric limit values', () => {
      fc.assert(
        fc.property(
          // 数値に変換できない文字列を生成
          fc
            .string({ minLength: 1, maxLength: 20 })
            .filter((s) => isNaN(Number(s)) || s.trim() === ''),
          (invalidLimit) => {
            const result = getGamesQuerySchema.safeParse({ limit: invalidLimit });

            // バリデーションは失敗すべき
            expect(result.success).toBe(false);

            if (!result.success) {
              // Zod エラーオブジェクトの構造を検証
              expect(result.error).toBeDefined();
              expect(result.error.issues).toBeDefined();
              expect(Array.isArray(result.error.issues)).toBe(true);
              expect(result.error.issues.length).toBeGreaterThan(0);

              // エラーメッセージが存在することを確認
              result.error.issues.forEach((issue) => {
                expect(issue.message).toBeDefined();
                expect(typeof issue.message).toBe('string');
              });
            }

            return true;
          }
        ),
        { numRuns: 20, endOnFailure: true }
      );
    });
  });

  describe('createGameSchema validation errors', () => {
    it('should return structured error for missing gameType field', () => {
      fc.assert(
        fc.property(
          fc.record({
            aiSide: fc.constantFrom('BLACK', 'WHITE'),
          }),
          (data) => {
            const result = createGameSchema.safeParse(data);

            // バリデーションは失敗すべき
            expect(result.success).toBe(false);

            if (!result.success) {
              // Zod エラーオブジェクトの構造を検証
              expect(result.error).toBeDefined();
              expect(result.error.issues).toBeDefined();
              expect(Array.isArray(result.error.issues)).toBe(true);
              expect(result.error.issues.length).toBeGreaterThan(0);

              // gameType フィールドのエラーが存在することを確認
              const gameTypeError = result.error.issues.find(
                (issue) => issue.path[0] === 'gameType'
              );
              expect(gameTypeError).toBeDefined();

              if (gameTypeError) {
                expect(gameTypeError.message).toBeDefined();
                expect(typeof gameTypeError.message).toBe('string');
              }
            }

            return true;
          }
        ),
        { numRuns: 10, endOnFailure: true }
      );
    });

    it('should return structured error for missing aiSide field', () => {
      fc.assert(
        fc.property(
          fc.record({
            gameType: fc.constant('OTHELLO'),
          }),
          (data) => {
            const result = createGameSchema.safeParse(data);

            // バリデーションは失敗すべき
            expect(result.success).toBe(false);

            if (!result.success) {
              // Zod エラーオブジェクトの構造を検証
              expect(result.error).toBeDefined();
              expect(result.error.issues).toBeDefined();
              expect(Array.isArray(result.error.issues)).toBe(true);
              expect(result.error.issues.length).toBeGreaterThan(0);

              // aiSide フィールドのエラーが存在することを確認
              const aiSideError = result.error.issues.find((issue) => issue.path[0] === 'aiSide');
              expect(aiSideError).toBeDefined();

              if (aiSideError) {
                expect(aiSideError.message).toBeDefined();
                expect(typeof aiSideError.message).toBe('string');
              }
            }

            return true;
          }
        ),
        { numRuns: 10, endOnFailure: true }
      );
    });

    it('should return structured error for invalid gameType', () => {
      fc.assert(
        fc.property(
          // OTHELLO 以外の文字列を生成
          fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s !== 'OTHELLO'),
          (invalidGameType) => {
            const result = createGameSchema.safeParse({
              gameType: invalidGameType,
              aiSide: 'BLACK',
            });

            // バリデーションは失敗すべき
            expect(result.success).toBe(false);

            if (!result.success) {
              // Zod エラーオブジェクトの構造を検証
              expect(result.error).toBeDefined();
              expect(result.error.issues).toBeDefined();
              expect(Array.isArray(result.error.issues)).toBe(true);
              expect(result.error.issues.length).toBeGreaterThan(0);

              // gameType フィールドのエラーが存在することを確認
              const gameTypeError = result.error.issues.find(
                (issue) => issue.path[0] === 'gameType'
              );
              expect(gameTypeError).toBeDefined();

              if (gameTypeError) {
                expect(gameTypeError.message).toBeDefined();
                expect(typeof gameTypeError.message).toBe('string');
              }
            }

            return true;
          }
        ),
        { numRuns: 20, endOnFailure: true }
      );
    });

    it('should return structured error for invalid aiSide', () => {
      fc.assert(
        fc.property(
          // BLACK または WHITE 以外の文字列を生成
          fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s !== 'BLACK' && s !== 'WHITE'),
          (invalidAiSide) => {
            const result = createGameSchema.safeParse({
              gameType: 'OTHELLO',
              aiSide: invalidAiSide,
            });

            // バリデーションは失敗すべき
            expect(result.success).toBe(false);

            if (!result.success) {
              // Zod エラーオブジェクトの構造を検証
              expect(result.error).toBeDefined();
              expect(result.error.issues).toBeDefined();
              expect(Array.isArray(result.error.issues)).toBe(true);
              expect(result.error.issues.length).toBeGreaterThan(0);

              // aiSide フィールドのエラーが存在することを確認
              const aiSideError = result.error.issues.find((issue) => issue.path[0] === 'aiSide');
              expect(aiSideError).toBeDefined();

              if (aiSideError) {
                expect(aiSideError.message).toBeDefined();
                expect(typeof aiSideError.message).toBe('string');
              }
            }

            return true;
          }
        ),
        { numRuns: 20, endOnFailure: true }
      );
    });
  });

  describe('gameIdParamSchema validation errors', () => {
    it('should return structured error for invalid UUID format', () => {
      fc.assert(
        fc.property(
          // UUID v4 形式でない文字列を生成
          fc.oneof(
            // 短すぎる文字列
            fc.string({ minLength: 1, maxLength: 10 }),
            // 長すぎる文字列
            fc.string({ minLength: 50, maxLength: 100 }),
            // ハイフンなしの文字列（32文字の16進数）
            fc.constant('0123456789abcdef0123456789abcdef'),
            // 無効な文字を含む文字列
            fc.constant('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'),
            // ハイフンの位置が間違っている
            fc.constant('012345678-9abc-def0-1234-56789abcdef')
          ),
          (invalidGameId) => {
            const result = gameIdParamSchema.safeParse({ gameId: invalidGameId });

            // バリデーションは失敗すべき
            expect(result.success).toBe(false);

            if (!result.success) {
              // Zod エラーオブジェクトの構造を検証
              expect(result.error).toBeDefined();
              expect(result.error.issues).toBeDefined();
              expect(Array.isArray(result.error.issues)).toBe(true);
              expect(result.error.issues.length).toBeGreaterThan(0);

              // gameId フィールドのエラーが存在することを確認
              const gameIdError = result.error.issues.find((issue) => issue.path[0] === 'gameId');
              expect(gameIdError).toBeDefined();

              if (gameIdError) {
                expect(gameIdError.message).toBeDefined();
                expect(typeof gameIdError.message).toBe('string');
                // UUID エラーメッセージを確認
                expect(gameIdError.message.toLowerCase()).toContain('uuid');
              }
            }

            return true;
          }
        ),
        { numRuns: 20, endOnFailure: true }
      );
    });

    it('should return structured error for missing gameId field', () => {
      fc.assert(
        fc.property(fc.constant({}), (data) => {
          const result = gameIdParamSchema.safeParse(data);

          // バリデーションは失敗すべき
          expect(result.success).toBe(false);

          if (!result.success) {
            // Zod エラーオブジェクトの構造を検証
            expect(result.error).toBeDefined();
            expect(result.error.issues).toBeDefined();
            expect(Array.isArray(result.error.issues)).toBe(true);
            expect(result.error.issues.length).toBeGreaterThan(0);

            // gameId フィールドのエラーが存在することを確認
            const gameIdError = result.error.issues.find((issue) => issue.path[0] === 'gameId');
            expect(gameIdError).toBeDefined();

            if (gameIdError) {
              expect(gameIdError.message).toBeDefined();
              expect(typeof gameIdError.message).toBe('string');
            }
          }

          return true;
        }),
        { numRuns: 10, endOnFailure: true }
      );
    });
  });

  describe('Valid inputs should pass validation', () => {
    it('should accept valid getGamesQuery parameters', () => {
      fc.assert(
        fc.property(
          fc.record({
            status: fc.constantFrom('ACTIVE', 'FINISHED'),
            limit: fc.integer({ min: 1, max: 100 }),
            cursor: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
          }),
          (data) => {
            const result = getGamesQuerySchema.safeParse(data);

            // バリデーションは成功すべき
            expect(result.success).toBe(true);

            return true;
          }
        ),
        { numRuns: 20, endOnFailure: true }
      );
    });

    it('should accept valid createGame request', () => {
      fc.assert(
        fc.property(
          fc.record({
            gameType: fc.constant('OTHELLO'),
            aiSide: fc.constantFrom('BLACK', 'WHITE'),
          }),
          (data) => {
            const result = createGameSchema.safeParse(data);

            // バリデーションは成功すべき
            expect(result.success).toBe(true);

            if (result.success) {
              expect(result.data.gameType).toBe('OTHELLO');
              expect(['BLACK', 'WHITE']).toContain(result.data.aiSide);
            }

            return true;
          }
        ),
        { numRuns: 20, endOnFailure: true }
      );
    });

    it('should accept valid UUID v4 gameId', () => {
      fc.assert(
        fc.property(fc.uuid(), (gameId) => {
          const result = gameIdParamSchema.safeParse({ gameId });

          // バリデーションは成功すべき
          expect(result.success).toBe(true);

          if (result.success) {
            expect(result.data.gameId).toBe(gameId);
          }

          return true;
        }),
        { numRuns: 20, endOnFailure: true }
      );
    });
  });

  describe('Default values', () => {
    it('should apply default status value when not provided', () => {
      fc.assert(
        fc.property(fc.constant({}), (data) => {
          const result = getGamesQuerySchema.safeParse(data);

          // バリデーションは成功すべき
          expect(result.success).toBe(true);

          if (result.success) {
            // デフォルト値が適用されることを確認
            expect(result.data.status).toBe('ACTIVE');
            expect(result.data.limit).toBe(20);
          }

          return true;
        }),
        { numRuns: 10, endOnFailure: true }
      );
    });

    it('should apply default limit value when not provided', () => {
      fc.assert(
        fc.property(
          fc.record({
            status: fc.constantFrom('ACTIVE', 'FINISHED'),
          }),
          (data) => {
            const result = getGamesQuerySchema.safeParse(data);

            // バリデーションは成功すべき
            expect(result.success).toBe(true);

            if (result.success) {
              // デフォルト値が適用されることを確認
              expect(result.data.limit).toBe(20);
            }

            return true;
          }
        ),
        { numRuns: 10, endOnFailure: true }
      );
    });
  });
});
