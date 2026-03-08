/**
 * 候補一覧取得API パスパラメータバリデーションスキーマのユニットテスト
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

import { describe, it, expect } from 'vitest';
import { getCandidatesParamSchema } from './candidate.js';

describe('getCandidatesParamSchema', () => {
  describe('有効なパラメータ', () => {
    it('should validate valid UUID v4 gameId and positive turnNumber', () => {
      const result = getCandidatesParamSchema.safeParse({
        gameId: '550e8400-e29b-41d4-a716-446655440000',
        turnNumber: '5',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.gameId).toBe('550e8400-e29b-41d4-a716-446655440000');
        expect(result.data.turnNumber).toBe(5);
      }
    });

    it('should accept turnNumber 0', () => {
      const result = getCandidatesParamSchema.safeParse({
        gameId: '550e8400-e29b-41d4-a716-446655440000',
        turnNumber: '0',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.turnNumber).toBe(0);
      }
    });

    it('should coerce string turnNumber to number', () => {
      const result = getCandidatesParamSchema.safeParse({
        gameId: '550e8400-e29b-41d4-a716-446655440000',
        turnNumber: '10',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.turnNumber).toBe(10);
      }
    });
  });

  describe('無効なgameId', () => {
    it('should reject non-UUID gameId', () => {
      const result = getCandidatesParamSchema.safeParse({
        gameId: 'not-a-uuid',
        turnNumber: '1',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty string gameId', () => {
      const result = getCandidatesParamSchema.safeParse({
        gameId: '',
        turnNumber: '1',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing gameId', () => {
      const result = getCandidatesParamSchema.safeParse({
        turnNumber: '1',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('無効なturnNumber', () => {
    it('should reject negative turnNumber', () => {
      const result = getCandidatesParamSchema.safeParse({
        gameId: '550e8400-e29b-41d4-a716-446655440000',
        turnNumber: '-1',
      });
      expect(result.success).toBe(false);
    });

    it('should reject decimal turnNumber', () => {
      const result = getCandidatesParamSchema.safeParse({
        gameId: '550e8400-e29b-41d4-a716-446655440000',
        turnNumber: '1.5',
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-numeric string turnNumber', () => {
      const result = getCandidatesParamSchema.safeParse({
        gameId: '550e8400-e29b-41d4-a716-446655440000',
        turnNumber: 'abc',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing turnNumber', () => {
      const result = getCandidatesParamSchema.safeParse({
        gameId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(false);
    });
  });
});
