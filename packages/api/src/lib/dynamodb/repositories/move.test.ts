import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MoveRepository } from './move.js';
import type { MoveEntity } from '../types.js';
import { QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = 'test-table';

function createMockDocClient() {
  return {
    send: vi.fn(),
  } as unknown as DynamoDBDocumentClient & { send: ReturnType<typeof vi.fn> };
}

describe('MoveRepository', () => {
  let repository: MoveRepository;
  let mockDocClient: ReturnType<typeof createMockDocClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDocClient = createMockDocClient();
    repository = new MoveRepository(mockDocClient, TABLE_NAME);
  });

  describe('create', () => {
    it('MoveEntityを作成しPK/SKが正しい形式で設定される', async () => {
      mockDocClient.send.mockResolvedValueOnce({});

      const result = await repository.create({
        gameId: 'game-1',
        turnNumber: 5,
        side: 'BLACK',
        position: '3,4',
        playedBy: 'AI',
        candidateId: '',
      });

      expect(result.PK).toBe('GAME#game-1');
      expect(result.SK).toBe('MOVE#5');
      expect(result.entityType).toBe('MOVE');
      expect(result.gameId).toBe('game-1');
      expect(result.turnNumber).toBe(5);
      expect(result.side).toBe('BLACK');
      expect(result.position).toBe('3,4');
      expect(result.playedBy).toBe('AI');
      expect(result.candidateId).toBe('');

      const command = mockDocClient.send.mock.calls[0][0];
      expect(command).toBeInstanceOf(PutCommand);
      expect(command.input.TableName).toBe(TABLE_NAME);
    });

    it('createdAtがISO 8601形式で設定される', async () => {
      mockDocClient.send.mockResolvedValueOnce({});

      const result = await repository.create({
        gameId: 'game-2',
        turnNumber: 1,
        side: 'WHITE',
        position: '0,0',
        playedBy: 'COLLECTIVE',
        candidateId: 'cand-1',
      });

      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      expect(result.createdAt).toMatch(iso8601Regex);
    });

    it('DynamoDBエラーの場合はエラーをスローする', async () => {
      mockDocClient.send.mockRejectedValueOnce(new Error('DynamoDB service error'));

      await expect(
        repository.create({
          gameId: 'game-err',
          turnNumber: 1,
          side: 'BLACK',
          position: '2,3',
          playedBy: 'AI',
          candidateId: '',
        })
      ).rejects.toThrow('DynamoDB service error');
    });
  });

  describe('listByGame', () => {
    it('指定されたgameIdの全手履歴を取得する', async () => {
      const mockMoves: MoveEntity[] = [
        {
          PK: 'GAME#game-1',
          SK: 'MOVE#0',
          entityType: 'MOVE',
          gameId: 'game-1',
          turnNumber: 0,
          side: 'BLACK',
          position: '2,3',
          playedBy: 'COLLECTIVE',
          candidateId: 'cand-1',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        {
          PK: 'GAME#game-1',
          SK: 'MOVE#1',
          entityType: 'MOVE',
          gameId: 'game-1',
          turnNumber: 1,
          side: 'WHITE',
          position: '4,5',
          playedBy: 'AI',
          candidateId: '',
          createdAt: '2024-01-02T00:00:00.000Z',
        },
      ];

      mockDocClient.send.mockResolvedValueOnce({ Items: mockMoves });

      const result = await repository.listByGame('game-1');

      expect(result).toEqual(mockMoves);
      expect(result).toHaveLength(2);

      const command = mockDocClient.send.mock.calls[0][0];
      expect(command).toBeInstanceOf(QueryCommand);
      expect(command.input.KeyConditionExpression).toBe('PK = :pk AND begins_with(SK, :sk)');
      expect(command.input.ExpressionAttributeValues).toEqual({
        ':pk': 'GAME#game-1',
        ':sk': 'MOVE#',
      });
    });

    it('手履歴が存在しない場合は空配列を返す', async () => {
      mockDocClient.send.mockResolvedValueOnce({ Items: [] });

      const result = await repository.listByGame('game-empty');
      expect(result).toEqual([]);
    });

    it('Itemsがundefinedの場合は空配列を返す', async () => {
      mockDocClient.send.mockResolvedValueOnce({});

      const result = await repository.listByGame('game-no-items');
      expect(result).toEqual([]);
    });
  });
});
