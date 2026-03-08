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

import { postCandidateBodySchema, postCandidateParamSchema } from './candidate.js';

describe('postCandidateBodySchema', () => {
  describe('有効なリクエストボディ', () => {
    it('should validate valid position and description', () => {
      const result = postCandidateBodySchema.safeParse({
        position: '2,3',
        description: '攻撃的な手。相手の陣地を削る。',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.position).toBe('2,3');
        expect(result.data.description).toBe('攻撃的な手。相手の陣地を削る。');
      }
    });

    it('should accept boundary positions 0,0 and 7,7', () => {
      expect(
        postCandidateBodySchema.safeParse({ position: '0,0', description: 'test' }).success
      ).toBe(true);
      expect(
        postCandidateBodySchema.safeParse({ position: '7,7', description: 'test' }).success
      ).toBe(true);
    });

    it('should accept description with exactly 1 character', () => {
      const result = postCandidateBodySchema.safeParse({ position: '3,4', description: 'a' });
      expect(result.success).toBe(true);
    });

    it('should accept description with exactly 200 characters', () => {
      const result = postCandidateBodySchema.safeParse({
        position: '3,4',
        description: 'a'.repeat(200),
      });
      expect(result.success).toBe(true);
    });
  });

  describe('無効な position', () => {
    it('should reject non-numeric position like "a,b"', () => {
      const result = postCandidateBodySchema.safeParse({ position: 'a,b', description: 'test' });
      expect(result.success).toBe(false);
    });

    it('should reject out-of-range position "8,0"', () => {
      const result = postCandidateBodySchema.safeParse({ position: '8,0', description: 'test' });
      expect(result.success).toBe(false);
    });

    it('should reject negative position "-1,3"', () => {
      const result = postCandidateBodySchema.safeParse({ position: '-1,3', description: 'test' });
      expect(result.success).toBe(false);
    });

    it('should reject empty string position', () => {
      const result = postCandidateBodySchema.safeParse({ position: '', description: 'test' });
      expect(result.success).toBe(false);
    });

    it('should reject position without comma', () => {
      const result = postCandidateBodySchema.safeParse({ position: '23', description: 'test' });
      expect(result.success).toBe(false);
    });

    it('should reject position with spaces', () => {
      const result = postCandidateBodySchema.safeParse({ position: '2, 3', description: 'test' });
      expect(result.success).toBe(false);
    });
  });

  describe('無効な description', () => {
    it('should reject empty string description', () => {
      const result = postCandidateBodySchema.safeParse({ position: '2,3', description: '' });
      expect(result.success).toBe(false);
    });

    it('should reject description with 201 characters', () => {
      const result = postCandidateBodySchema.safeParse({
        position: '2,3',
        description: 'a'.repeat(201),
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('postCandidateParamSchema', () => {
  describe('有効なパラメータ', () => {
    it('should validate valid UUID v4 gameId and turnNumber', () => {
      const result = postCandidateParamSchema.safeParse({
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
      const result = postCandidateParamSchema.safeParse({
        gameId: '550e8400-e29b-41d4-a716-446655440000',
        turnNumber: '0',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('無効なパラメータ', () => {
    it('should reject non-UUID gameId', () => {
      const result = postCandidateParamSchema.safeParse({
        gameId: 'not-a-uuid',
        turnNumber: '1',
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative turnNumber', () => {
      const result = postCandidateParamSchema.safeParse({
        gameId: '550e8400-e29b-41d4-a716-446655440000',
        turnNumber: '-1',
      });
      expect(result.success).toBe(false);
    });

    it('should reject decimal turnNumber', () => {
      const result = postCandidateParamSchema.safeParse({
        gameId: '550e8400-e29b-41d4-a716-446655440000',
        turnNumber: '1.5',
      });
      expect(result.success).toBe(false);
    });
  });
});
