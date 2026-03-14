import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommentaryRepository } from './commentary.js';
import type { CommentaryEntity } from '../types.js';
import { QueryCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = 'test-table';

function createMockDocClient() {
  return {
    send: vi.fn(),
  } as unknown as DynamoDBDocumentClient & { send: ReturnType<typeof vi.fn> };
}

describe('CommentaryRepository', () => {
  let repository: CommentaryRepository;
  let mockDocClient: ReturnType<typeof createMockDocClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDocClient = createMockDocClient();
    repository = new CommentaryRepository(mockDocClient, TABLE_NAME);
  });

  describe('listByGame', () => {
    it('指定されたgameIdの全解説を取得する', async () => {
      const mockCommentaries: CommentaryEntity[] = [
        {
          PK: 'GAME#game-1',
          SK: 'COMMENTARY#1',
          entityType: 'COMMENTARY',
          gameId: 'game-1',
          turnNumber: 1,
          content: '序盤の展開です。',
          generatedBy: 'AI',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        {
          PK: 'GAME#game-1',
          SK: 'COMMENTARY#2',
          entityType: 'COMMENTARY',
          gameId: 'game-1',
          turnNumber: 2,
          content: '中盤に入りました。',
          generatedBy: 'AI',
          createdAt: '2024-01-01T01:00:00.000Z',
        },
      ];

      mockDocClient.send.mockResolvedValueOnce({ Items: mockCommentaries });

      const result = await repository.listByGame('game-1');

      expect(result).toEqual(mockCommentaries);
      expect(result).toHaveLength(2);
      expect(mockDocClient.send).toHaveBeenCalledTimes(1);

      const command = mockDocClient.send.mock.calls[0][0];
      expect(command).toBeInstanceOf(QueryCommand);
      expect(command.input.TableName).toBe(TABLE_NAME);
      expect(command.input.KeyConditionExpression).toBe('PK = :pk AND begins_with(SK, :sk)');
      expect(command.input.ExpressionAttributeValues).toEqual({
        ':pk': 'GAME#game-1',
        ':sk': 'COMMENTARY#',
      });
    });

    it('解説が存在しない場合は空配列を返す', async () => {
      mockDocClient.send.mockResolvedValueOnce({ Items: [] });

      const result = await repository.listByGame('game-empty');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('Itemsがundefinedの場合は空配列を返す', async () => {
      mockDocClient.send.mockResolvedValueOnce({});

      const result = await repository.listByGame('game-no-items');

      expect(result).toEqual([]);
    });
  });

  describe('getByGameAndTurn', () => {
    it('指定されたgameIdとturnNumberの解説を取得する', async () => {
      const mockCommentary: CommentaryEntity = {
        PK: 'GAME#game-1',
        SK: 'COMMENTARY#3',
        entityType: 'COMMENTARY',
        gameId: 'game-1',
        turnNumber: 3,
        content: '白が有利な展開です。',
        generatedBy: 'AI',
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      mockDocClient.send.mockResolvedValueOnce({ Item: mockCommentary });

      const result = await repository.getByGameAndTurn('game-1', 3);

      expect(result).toEqual(mockCommentary);
      expect(mockDocClient.send).toHaveBeenCalledTimes(1);

      const command = mockDocClient.send.mock.calls[0][0];
      expect(command).toBeInstanceOf(GetCommand);
      expect(command.input.TableName).toBe(TABLE_NAME);
      expect(command.input.Key).toEqual({
        PK: 'GAME#game-1',
        SK: 'COMMENTARY#3',
      });
    });

    it('解説が存在しない場合はnullを返す', async () => {
      mockDocClient.send.mockResolvedValueOnce({ Item: undefined });

      const result = await repository.getByGameAndTurn('game-1', 99);

      expect(result).toBeNull();
    });

    it('空のレスポンスの場合はnullを返す', async () => {
      mockDocClient.send.mockResolvedValueOnce({});

      const result = await repository.getByGameAndTurn('game-1', 99);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('解説エンティティを作成する', async () => {
      mockDocClient.send.mockResolvedValueOnce({});

      const result = await repository.create({
        gameId: 'game-1',
        turnNumber: 5,
        content: 'AIが角を取りました。',
        generatedBy: 'AI',
      });

      expect(result.PK).toBe('GAME#game-1');
      expect(result.SK).toBe('COMMENTARY#5');
      expect(result.entityType).toBe('COMMENTARY');
      expect(result.gameId).toBe('game-1');
      expect(result.turnNumber).toBe(5);
      expect(result.content).toBe('AIが角を取りました。');
      expect(result.generatedBy).toBe('AI');

      expect(mockDocClient.send).toHaveBeenCalledTimes(1);
      const command = mockDocClient.send.mock.calls[0][0];
      expect(command).toBeInstanceOf(PutCommand);
      expect(command.input.TableName).toBe(TABLE_NAME);
    });

    it('entityTypeが"COMMENTARY"に設定される', async () => {
      mockDocClient.send.mockResolvedValueOnce({});

      const result = await repository.create({
        gameId: 'game-2',
        turnNumber: 1,
        content: '対局開始です。',
        generatedBy: 'AI',
      });

      expect(result.entityType).toBe('COMMENTARY');
    });

    it('createdAtがISO 8601形式で設定される', async () => {
      mockDocClient.send.mockResolvedValueOnce({});

      const result = await repository.create({
        gameId: 'game-3',
        turnNumber: 10,
        content: '終盤の攻防です。',
        generatedBy: 'AI',
      });

      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      expect(result.createdAt).toMatch(iso8601Regex);
    });

    it('PKが"GAME#<gameId>"形式で設定される', async () => {
      mockDocClient.send.mockResolvedValueOnce({});

      const result = await repository.create({
        gameId: 'uuid-abc-123',
        turnNumber: 7,
        content: '解説テスト',
        generatedBy: 'AI',
      });

      expect(result.PK).toBe('GAME#uuid-abc-123');
    });

    it('SKが"COMMENTARY#<turnNumber>"形式で設定される', async () => {
      mockDocClient.send.mockResolvedValueOnce({});

      const result = await repository.create({
        gameId: 'game-4',
        turnNumber: 15,
        content: '解説テスト',
        generatedBy: 'AI',
      });

      expect(result.SK).toBe('COMMENTARY#15');
    });

    it('DynamoDBエラーの場合はエラーをスローする', async () => {
      const dynamoError = new Error('DynamoDB service error');
      dynamoError.name = 'ServiceUnavailable';
      mockDocClient.send.mockRejectedValueOnce(dynamoError);

      await expect(
        repository.create({
          gameId: 'game-err',
          turnNumber: 1,
          content: 'エラーテスト',
          generatedBy: 'AI',
        })
      ).rejects.toThrow('DynamoDB service error');
    });
  });
});
