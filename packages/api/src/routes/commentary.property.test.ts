/**
 * Commentary API Routes プロパティベーステスト
 *
 * Feature: ai-content-display
 * Property 8: 解説 API は turnNumber 昇順でソートされたデータを返す
 * Property 9: 解説 API レスポンスは必須フィールドをすべて含む
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fc from 'fast-check';
import { Hono } from 'hono';
import { createCommentaryRouter } from './commentary.js';

// 解説エンティティの型
interface CommentaryEntity {
  PK: string;
  SK: string;
  entityType: string;
  gameId: string;
  turnNumber: number;
  content: string;
  generatedBy: string;
  createdAt: string;
}

describe('Commentary API Property Tests', () => {
  let app: Hono;
  let mockCommentaryRepo: {
    listByGame: ReturnType<typeof vi.fn>;
  };
  let mockGameRepo: {
    getById: ReturnType<typeof vi.fn>;
  };

  const gameId = '123e4567-e89b-12d3-a456-426614174000';
  const mockGame = {
    PK: `GAME#${gameId}`,
    SK: `GAME#${gameId}`,
    entityType: 'GAME',
    gameId,
    gameType: 'OTHELLO',
    status: 'ACTIVE',
    aiSide: 'BLACK',
    currentTurn: 5,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:05:00.000Z',
  };

  beforeEach(() => {
    mockCommentaryRepo = {
      listByGame: vi.fn(),
    };
    mockGameRepo = {
      getById: vi.fn(),
    };

    app = new Hono();
    app.route('/api', createCommentaryRouter(mockCommentaryRepo as never, mockGameRepo as never));
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.clearAllMocks();
  });

  // 解説エンティティのアービトラリ生成
  const commentaryEntityArb = (turn: number): fc.Arbitrary<CommentaryEntity> =>
    fc.record({
      PK: fc.constant(`GAME#${gameId}`),
      SK: fc.constant(`COMMENTARY#${turn}`),
      entityType: fc.constant('COMMENTARY'),
      gameId: fc.constant(gameId),
      turnNumber: fc.constant(turn),
      content: fc.string({ minLength: 1, maxLength: 500 }).filter((s) => s.trim().length > 0),
      generatedBy: fc.constant('AI'),
      createdAt: fc.constant(new Date().toISOString()),
    });

  // ランダムな turnNumber の配列を生成し、それぞれの解説エンティティを作成
  const commentaryListArb: fc.Arbitrary<CommentaryEntity[]> = fc
    .uniqueArray(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 10 })
    .chain((turnNumbers) => fc.tuple(...turnNumbers.map((turn) => commentaryEntityArb(turn))));

  // fc.property でサンプルを収集し、順次 async テストを実行するヘルパー
  function collectSamples<T>(arb: fc.Arbitrary<T>, numRuns = 10): T[] {
    const samples: T[] = [];
    fc.assert(
      fc.property(arb, (sample) => {
        samples.push(sample);
      }),
      { numRuns, endOnFailure: true }
    );
    return samples;
  }

  /**
   * Property 8: 解説 API は turnNumber 昇順でソートされたデータを返す
   * **Validates: Requirements 8.2**
   *
   * Feature: ai-content-display, Property 8: 解説 API は turnNumber 昇順でソートされたデータを返す
   */
  describe('Property 8: 解説 API は turnNumber 昇順でソートされたデータを返す', () => {
    it('任意の解説セットに対して、レスポンスは turnNumber 昇順でソートされる', async () => {
      const samples = collectSamples(commentaryListArb, 10);

      for (const commentaries of samples) {
        mockGameRepo.getById.mockReset();
        mockCommentaryRepo.listByGame.mockReset();
        mockGameRepo.getById.mockResolvedValue(mockGame);
        mockCommentaryRepo.listByGame.mockResolvedValue(commentaries);

        const res = await app.request(`/api/games/${gameId}/commentary`);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(Array.isArray(data.commentaries)).toBe(true);

        // turnNumber 昇順であることを検証
        for (let i = 0; i < data.commentaries.length - 1; i++) {
          expect(data.commentaries[i].turnNumber).toBeLessThan(data.commentaries[i + 1].turnNumber);
        }
      }
    });

    it('空の解説配列でもソート済み（空配列）として返される', async () => {
      mockGameRepo.getById.mockResolvedValue(mockGame);
      mockCommentaryRepo.listByGame.mockResolvedValue([]);

      const res = await app.request(`/api/games/${gameId}/commentary`);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.commentaries).toEqual([]);
    });
  });

  /**
   * Property 9: 解説 API レスポンスは必須フィールドをすべて含む
   * **Validates: Requirements 8.4**
   *
   * Feature: ai-content-display, Property 9: 解説 API レスポンスは必須フィールドをすべて含む
   */
  describe('Property 9: 解説 API レスポンスは必須フィールドをすべて含む', () => {
    it('任意の解説データに対して、各要素は turnNumber, content, generatedBy, createdAt を含む', async () => {
      const samples = collectSamples(commentaryListArb, 10);

      for (const commentaries of samples) {
        mockGameRepo.getById.mockReset();
        mockCommentaryRepo.listByGame.mockReset();
        mockGameRepo.getById.mockResolvedValue(mockGame);
        mockCommentaryRepo.listByGame.mockResolvedValue(commentaries);

        const res = await app.request(`/api/games/${gameId}/commentary`);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(Array.isArray(data.commentaries)).toBe(true);

        // 各要素が必須フィールドを含むことを検証
        for (const commentary of data.commentaries) {
          expect(typeof commentary.turnNumber).toBe('number');
          expect(typeof commentary.content).toBe('string');
          expect(typeof commentary.generatedBy).toBe('string');
          expect(typeof commentary.createdAt).toBe('string');

          // 内部フィールドが含まれないことも検証
          expect(commentary).not.toHaveProperty('PK');
          expect(commentary).not.toHaveProperty('SK');
          expect(commentary).not.toHaveProperty('entityType');
          expect(commentary).not.toHaveProperty('gameId');

          // 必須フィールドのみ4つであることを検証
          expect(Object.keys(commentary)).toHaveLength(4);
        }
      }
    });

    it('各フィールドの値が入力データと一致する', async () => {
      const samples = collectSamples(commentaryListArb, 10);

      for (const commentaries of samples) {
        mockGameRepo.getById.mockReset();
        mockCommentaryRepo.listByGame.mockReset();
        mockGameRepo.getById.mockResolvedValue(mockGame);
        mockCommentaryRepo.listByGame.mockResolvedValue(commentaries);

        const res = await app.request(`/api/games/${gameId}/commentary`);
        const data = await res.json();

        expect(res.status).toBe(200);

        const sortedInput = [...commentaries].sort((a, b) => a.turnNumber - b.turnNumber);

        expect(data.commentaries).toHaveLength(sortedInput.length);

        for (let i = 0; i < data.commentaries.length; i++) {
          expect(data.commentaries[i].turnNumber).toBe(sortedInput[i].turnNumber);
          expect(data.commentaries[i].content).toBe(sortedInput[i].content);
          expect(data.commentaries[i].generatedBy).toBe(sortedInput[i].generatedBy);
          expect(data.commentaries[i].createdAt).toBe(sortedInput[i].createdAt);
        }
      }
    });
  });
});
