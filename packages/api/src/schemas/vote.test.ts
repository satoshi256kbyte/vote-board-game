/**
 * 投票API バリデーションスキーマのユニットテスト
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { describe, it, expect } from 'vitest';
import { postVoteBodySchema, postVoteParamSchema } from './vote.js';

describe('postVoteBodySchema', () => {
  describe('有効なリクエストボディ', () => {
    it('有効なUUID v4のcandidateIdを受け入れる', () => {
      const result = postVoteBodySchema.safeParse({
        candidateId: '789e0123-e89b-12d3-a456-426614174002',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.candidateId).toBe('789e0123-e89b-12d3-a456-426614174002');
      }
    });
  });

  describe('無効なcandidateId', () => {
    it('非UUID形式のcandidateIdを拒否する', () => {
      const result = postVoteBodySchema.safeParse({
        candidateId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('空文字列のcandidateIdを拒否する', () => {
      const result = postVoteBodySchema.safeParse({
        candidateId: '',
      });
      expect(result.success).toBe(false);
    });

    it('candidateIdが未指定の場合を拒否する', () => {
      const result = postVoteBodySchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('数値のcandidateIdを拒否する', () => {
      const result = postVoteBodySchema.safeParse({
        candidateId: 12345,
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('postVoteParamSchema', () => {
  describe('有効なパラメータ', () => {
    it('有効なUUID gameIdと正のturnNumberを受け入れる', () => {
      const result = postVoteParamSchema.safeParse({
        gameId: '550e8400-e29b-41d4-a716-446655440000',
        turnNumber: '5',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.gameId).toBe('550e8400-e29b-41d4-a716-446655440000');
        expect(result.data.turnNumber).toBe(5);
      }
    });

    it('turnNumber 0を受け入れる', () => {
      const result = postVoteParamSchema.safeParse({
        gameId: '550e8400-e29b-41d4-a716-446655440000',
        turnNumber: '0',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.turnNumber).toBe(0);
      }
    });

    it('文字列のturnNumberを数値に変換する', () => {
      const result = postVoteParamSchema.safeParse({
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
    it('非UUID形式のgameIdを拒否する', () => {
      const result = postVoteParamSchema.safeParse({
        gameId: 'not-a-uuid',
        turnNumber: '1',
      });
      expect(result.success).toBe(false);
    });

    it('空文字列のgameIdを拒否する', () => {
      const result = postVoteParamSchema.safeParse({
        gameId: '',
        turnNumber: '1',
      });
      expect(result.success).toBe(false);
    });

    it('gameIdが未指定の場合を拒否する', () => {
      const result = postVoteParamSchema.safeParse({
        turnNumber: '1',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('無効なturnNumber', () => {
    it('負のturnNumberを拒否する', () => {
      const result = postVoteParamSchema.safeParse({
        gameId: '550e8400-e29b-41d4-a716-446655440000',
        turnNumber: '-1',
      });
      expect(result.success).toBe(false);
    });

    it('小数のturnNumberを拒否する', () => {
      const result = postVoteParamSchema.safeParse({
        gameId: '550e8400-e29b-41d4-a716-446655440000',
        turnNumber: '1.5',
      });
      expect(result.success).toBe(false);
    });

    it('非数値のturnNumberを拒否する', () => {
      const result = postVoteParamSchema.safeParse({
        gameId: '550e8400-e29b-41d4-a716-446655440000',
        turnNumber: 'abc',
      });
      expect(result.success).toBe(false);
    });

    it('turnNumberが未指定の場合を拒否する', () => {
      const result = postVoteParamSchema.safeParse({
        gameId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(false);
    });
  });
});
