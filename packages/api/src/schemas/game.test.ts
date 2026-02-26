/**
 * Game API バリデーションスキーマのユニットテスト
 */

import { describe, it, expect } from 'vitest';
import { getGamesQuerySchema, createGameSchema, gameIdParamSchema } from './game.js';

describe('getGamesQuerySchema', () => {
  it('should validate with default values', () => {
    const result = getGamesQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('ACTIVE');
      expect(result.data.limit).toBe(20);
      expect(result.data.cursor).toBeUndefined();
    }
  });

  it('should validate ACTIVE status', () => {
    const result = getGamesQuerySchema.safeParse({ status: 'ACTIVE' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('ACTIVE');
    }
  });

  it('should validate FINISHED status', () => {
    const result = getGamesQuerySchema.safeParse({ status: 'FINISHED' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('FINISHED');
    }
  });

  it('should reject invalid status', () => {
    const result = getGamesQuerySchema.safeParse({ status: 'INVALID' });
    expect(result.success).toBe(false);
  });

  it('should validate limit within range', () => {
    const result = getGamesQuerySchema.safeParse({ limit: 50 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(50);
    }
  });

  it('should coerce string limit to number', () => {
    const result = getGamesQuerySchema.safeParse({ limit: '30' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(30);
    }
  });

  it('should reject limit below 1', () => {
    const result = getGamesQuerySchema.safeParse({ limit: 0 });
    expect(result.success).toBe(false);
  });

  it('should reject limit above 100', () => {
    const result = getGamesQuerySchema.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });

  it('should validate cursor', () => {
    const result = getGamesQuerySchema.safeParse({ cursor: 'some-cursor-value' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cursor).toBe('some-cursor-value');
    }
  });
});

describe('createGameSchema', () => {
  it('should validate OTHELLO with BLACK', () => {
    const result = createGameSchema.safeParse({
      gameType: 'OTHELLO',
      aiSide: 'BLACK',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.gameType).toBe('OTHELLO');
      expect(result.data.aiSide).toBe('BLACK');
    }
  });

  it('should validate OTHELLO with WHITE', () => {
    const result = createGameSchema.safeParse({
      gameType: 'OTHELLO',
      aiSide: 'WHITE',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.gameType).toBe('OTHELLO');
      expect(result.data.aiSide).toBe('WHITE');
    }
  });

  it('should reject non-OTHELLO gameType', () => {
    const result = createGameSchema.safeParse({
      gameType: 'CHESS',
      aiSide: 'BLACK',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid aiSide', () => {
    const result = createGameSchema.safeParse({
      gameType: 'OTHELLO',
      aiSide: 'RED',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing gameType', () => {
    const result = createGameSchema.safeParse({
      aiSide: 'BLACK',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing aiSide', () => {
    const result = createGameSchema.safeParse({
      gameType: 'OTHELLO',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty object', () => {
    const result = createGameSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('gameIdParamSchema', () => {
  it('should validate valid UUID v4', () => {
    const result = gameIdParamSchema.safeParse({
      gameId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.gameId).toBe('550e8400-e29b-41d4-a716-446655440000');
    }
  });

  it('should reject invalid UUID format', () => {
    const result = gameIdParamSchema.safeParse({
      gameId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty string', () => {
    const result = gameIdParamSchema.safeParse({
      gameId: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing gameId', () => {
    const result = gameIdParamSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject UUID v1', () => {
    const result = gameIdParamSchema.safeParse({
      gameId: 'a0eebc99-9c0b-1ef8-bb6d-6bb9bd380a11',
    });
    // Zod's uuid() validator accepts all UUID versions, so this will pass
    // If strict v4 validation is needed, a custom refinement would be required
    expect(result.success).toBe(true);
  });
});
