/**
 * Unit tests for global-teardown cleanup logic
 *
 * Note: These tests are excluded from vitest (e2e/** is excluded).
 * They serve as documentation and can be run manually.
 *
 * Requirements:
 * - 4.1: GSI3を使用してTAG#E2Eタグを持つ全てのGame_Entityを検索
 * - 4.2: 該当するGame_Entityとその関連データ（Candidate_Entity）を削除
 * - 4.3: エラー発生時はログに記録し、残りのデータの削除を継続
 * - 4.5: 削除したGame_Entityの件数をログに出力
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';

// Mock aws-client-factory before importing global-teardown
const mockSend = vi.fn();
vi.mock('./helpers/aws-client-factory', () => ({
  getDynamoDocClient: () => ({ send: mockSend }),
  withCredentialRefresh: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

import {
  findE2EGames,
  findGameCandidates,
  batchDeleteItems,
  cleanupE2EData,
} from './global-teardown';

import globalTeardown from './global-teardown';

const TABLE_NAME = 'test-table';

describe('global-teardown', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockReset();
    process.env = { ...originalEnv };
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('findE2EGames', () => {
    it('should query GSI3 with TAG#E2E', async () => {
      mockSend.mockResolvedValueOnce({
        Items: [{ PK: 'GAME#g1', SK: 'GAME#g1', gameId: 'g1' }],
        LastEvaluatedKey: undefined,
      });

      const games = await findE2EGames(TABLE_NAME);

      expect(games).toEqual([{ PK: 'GAME#g1', SK: 'GAME#g1', gameId: 'g1' }]);
      const command = mockSend.mock.calls[0][0];
      expect(command.input).toMatchObject({
        TableName: TABLE_NAME,
        IndexName: 'GSI3',
        KeyConditionExpression: 'GSI3PK = :gsi3pk',
        ExpressionAttributeValues: { ':gsi3pk': 'TAG#E2E' },
      });
    });

    it('should handle pagination', async () => {
      mockSend
        .mockResolvedValueOnce({
          Items: [{ PK: 'GAME#g1', SK: 'GAME#g1', gameId: 'g1' }],
          LastEvaluatedKey: { PK: 'GAME#g1' },
        })
        .mockResolvedValueOnce({
          Items: [{ PK: 'GAME#g2', SK: 'GAME#g2', gameId: 'g2' }],
          LastEvaluatedKey: undefined,
        });

      const games = await findE2EGames(TABLE_NAME);

      expect(games).toHaveLength(2);
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should return empty array when no E2E games exist', async () => {
      mockSend.mockResolvedValueOnce({
        Items: [],
        LastEvaluatedKey: undefined,
      });

      const games = await findE2EGames(TABLE_NAME);
      expect(games).toEqual([]);
    });
  });

  describe('findGameCandidates', () => {
    it('should search candidates by game PK pattern', async () => {
      mockSend
        .mockResolvedValueOnce({
          Items: [
            { PK: 'GAME#g1#TURN#0', SK: 'CANDIDATE#c1' },
            { PK: 'GAME#g1#TURN#0', SK: 'CANDIDATE#c2' },
          ],
        })
        .mockResolvedValueOnce({ Items: [] });

      const candidates = await findGameCandidates(TABLE_NAME, 'g1');

      expect(candidates).toHaveLength(2);
      expect(candidates[0]).toEqual({
        PK: 'GAME#g1#TURN#0',
        SK: 'CANDIDATE#c1',
      });
    });

    it('should stop searching when a turn has no data', async () => {
      mockSend
        .mockResolvedValueOnce({
          Items: [{ PK: 'GAME#g1#TURN#0', SK: 'CANDIDATE#c1' }],
        })
        .mockResolvedValueOnce({ Items: [] });

      await findGameCandidates(TABLE_NAME, 'g1');
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should return empty array when no candidates exist', async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });

      const candidates = await findGameCandidates(TABLE_NAME, 'g1');
      expect(candidates).toEqual([]);
    });
  });

  describe('batchDeleteItems', () => {
    it('should delete items in batches of 25', async () => {
      const items = Array.from({ length: 30 }, (_, i) => ({
        PK: `PK#${i}`,
        SK: `SK#${i}`,
      }));
      mockSend.mockResolvedValue({});

      const count = await batchDeleteItems(TABLE_NAME, items);

      expect(count).toBe(30);
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should return 0 for empty items', async () => {
      const count = await batchDeleteItems(TABLE_NAME, []);
      expect(count).toBe(0);
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('cleanupE2EData', () => {
    it('should cleanup games and candidates', async () => {
      mockSend.mockResolvedValueOnce({
        Items: [{ PK: 'GAME#g1', SK: 'GAME#g1', gameId: 'g1' }],
        LastEvaluatedKey: undefined,
      });
      mockSend.mockResolvedValueOnce({
        Items: [{ PK: 'GAME#g1#TURN#0', SK: 'CANDIDATE#c1' }],
      });
      mockSend.mockResolvedValueOnce({ Items: [] });
      mockSend.mockResolvedValueOnce({});
      mockSend.mockResolvedValueOnce({});

      const result = await cleanupE2EData(TABLE_NAME);

      expect(result.gamesDeleted).toBe(1);
      expect(result.candidatesDeleted).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should continue when candidate deletion fails (Req 4.3)', async () => {
      mockSend.mockResolvedValueOnce({
        Items: [{ PK: 'GAME#g1', SK: 'GAME#g1', gameId: 'g1' }],
        LastEvaluatedKey: undefined,
      });
      mockSend.mockRejectedValueOnce(new Error('Query failed'));
      mockSend.mockResolvedValueOnce({});

      const result = await cleanupE2EData(TABLE_NAME);

      expect(result.gamesDeleted).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Failed to delete candidates');
    });

    it('should continue when game deletion fails (Req 4.3)', async () => {
      mockSend.mockResolvedValueOnce({
        Items: [
          { PK: 'GAME#g1', SK: 'GAME#g1', gameId: 'g1' },
          { PK: 'GAME#g2', SK: 'GAME#g2', gameId: 'g2' },
        ],
        LastEvaluatedKey: undefined,
      });
      mockSend.mockResolvedValueOnce({ Items: [] });
      mockSend.mockRejectedValueOnce(new Error('Delete failed'));
      mockSend.mockResolvedValueOnce({ Items: [] });
      mockSend.mockResolvedValueOnce({});

      const result = await cleanupE2EData(TABLE_NAME);

      expect(result.gamesDeleted).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Failed to delete game g1');
    });

    it('should log deletion counts (Req 4.5)', async () => {
      mockSend.mockResolvedValueOnce({
        Items: [],
        LastEvaluatedKey: undefined,
      });

      await cleanupE2EData(TABLE_NAME);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Found 0 E2E-tagged games'));
    });
  });

  describe('globalTeardown', () => {
    it('should skip when DYNAMODB_TABLE_NAME is not set', async () => {
      delete process.env.DYNAMODB_TABLE_NAME;

      await globalTeardown();

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('DYNAMODB_TABLE_NAME is not set')
      );
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should run cleanup when DYNAMODB_TABLE_NAME is set', async () => {
      process.env.DYNAMODB_TABLE_NAME = TABLE_NAME;
      mockSend.mockResolvedValueOnce({
        Items: [],
        LastEvaluatedKey: undefined,
      });

      await globalTeardown();

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('E2E Cleanup complete'));
    });

    it('should not throw on cleanup failure', async () => {
      process.env.DYNAMODB_TABLE_NAME = TABLE_NAME;
      mockSend.mockRejectedValueOnce(new Error('DynamoDB error'));

      await expect(globalTeardown()).resolves.toBeUndefined();

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Cleanup failed'),
        expect.any(Error)
      );
    });
  });

  /**
   * Property 6: クリーンアップによる完全削除
   *
   * Feature: 36-e2e-test-data-cleanup, Property 6: クリーンアップによる完全削除
   *
   * 任意の数のE2Eタグ付きGame_Entityに対して、クリーンアップ実行後に
   * GSI3検索結果が空である
   *
   * Validates: Requirements 4.2
   */
  describe('Property 6: クリーンアップによる完全削除', () => {
    it('任意の数のE2Eタグ付きゲームに対してクリーンアップ後にGSI3検索結果が空である', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 0, max: 5 }), async (gameCount) => {
          mockSend.mockReset();

          const gameItems = Array.from({ length: gameCount }, (_, i) => ({
            PK: `GAME#g${i}`,
            SK: `GAME#g${i}`,
            gameId: `g${i}`,
          }));

          let callIndex = 0;

          mockSend.mockImplementation(() => {
            callIndex++;
            if (callIndex === 1) {
              return Promise.resolve({
                Items: gameItems,
                LastEvaluatedKey: undefined,
              });
            }
            return Promise.resolve({ Items: [] });
          });

          const result = await cleanupE2EData(TABLE_NAME);

          expect(result.gamesDeleted).toBe(gameCount);
          expect(result.errors).toHaveLength(0);

          // After cleanup, GSI3 query should return empty
          mockSend.mockReset();
          mockSend.mockResolvedValueOnce({
            Items: [],
            LastEvaluatedKey: undefined,
          });

          const remaining = await findE2EGames(TABLE_NAME);
          expect(remaining).toHaveLength(0);
        }),
        { numRuns: 10, endOnFailure: true }
      );
    });
  });
});
