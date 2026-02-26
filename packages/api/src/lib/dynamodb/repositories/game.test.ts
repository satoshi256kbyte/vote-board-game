import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameRepository } from './game.js';
import type { GameEntity } from '../types.js';
import { PutCommand, GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

// DynamoDBクライアントをモック
vi.mock('../../dynamodb.js', () => ({
  docClient: {
    send: vi.fn(),
  },
  TABLE_NAME: 'test-table',
}));

// モックされたdocClientを取得
import { docClient } from '../../dynamodb.js';
const mockSend = docClient.send as ReturnType<typeof vi.fn>;

describe('GameRepository', () => {
  let repository: GameRepository;

  beforeEach(() => {
    // モックをリセット
    vi.clearAllMocks();
    repository = new GameRepository();
  });

  describe('create', () => {
    describe('成功ケース', () => {
      it('有効なパラメータでゲームを作成する', async () => {
        // Arrange
        const params = {
          gameId: 'game-123',
          gameType: 'OTHELLO' as const,
          aiSide: 'BLACK' as const,
        };

        mockSend.mockResolvedValueOnce({});

        // Act
        const result = await repository.create(params);

        // Assert
        expect(result).toMatchObject({
          PK: 'GAME#game-123',
          SK: 'GAME#game-123',
          gameId: 'game-123',
          gameType: 'OTHELLO',
          status: 'ACTIVE',
          aiSide: 'BLACK',
          currentTurn: 0,
          entityType: 'GAME',
        });
        expect(result.createdAt).toBeDefined();
        expect(result.updatedAt).toBeDefined();
        expect(result.createdAt).toBe(result.updatedAt);
        expect(result.GSI1PK).toBe('GAME#STATUS#ACTIVE');
        expect(result.GSI1SK).toBeDefined();
        expect(result.boardState).toBe(JSON.stringify({ board: [] }));

        // DynamoDBクライアントが正しく呼ばれたことを確認
        expect(mockSend).toHaveBeenCalledTimes(1);
        const putCommand = mockSend.mock.calls[0][0];
        expect(putCommand).toBeInstanceOf(PutCommand);
        expect(putCommand.input.TableName).toBe('test-table');
      });

      it('createdAtとupdatedAtがISO 8601形式である', async () => {
        // Arrange
        const params = {
          gameId: 'game-456',
          gameType: 'OTHELLO' as const,
          aiSide: 'WHITE' as const,
        };

        mockSend.mockResolvedValueOnce({});

        // Act
        const result = await repository.create(params);

        // Assert
        const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
        expect(result.createdAt).toMatch(iso8601Regex);
        expect(result.updatedAt).toMatch(iso8601Regex);
      });

      it('PKとSKが正しい形式で設定される', async () => {
        // Arrange
        const params = {
          gameId: 'uuid-789',
          gameType: 'OTHELLO' as const,
          aiSide: 'BLACK' as const,
        };

        mockSend.mockResolvedValueOnce({});

        // Act
        const result = await repository.create(params);

        // Assert
        expect(result.PK).toBe('GAME#uuid-789');
        expect(result.SK).toBe('GAME#uuid-789');
      });

      it('entityTypeが"GAME"に設定される', async () => {
        // Arrange
        const params = {
          gameId: 'test-id',
          gameType: 'OTHELLO' as const,
          aiSide: 'WHITE' as const,
        };

        mockSend.mockResolvedValueOnce({});

        // Act
        const result = await repository.create(params);

        // Assert
        expect(result.entityType).toBe('GAME');
      });

      it('初期状態が正しく設定される', async () => {
        // Arrange
        const params = {
          gameId: 'test-id',
          gameType: 'OTHELLO' as const,
          aiSide: 'BLACK' as const,
        };

        mockSend.mockResolvedValueOnce({});

        // Act
        const result = await repository.create(params);

        // Assert
        expect(result.status).toBe('ACTIVE');
        expect(result.currentTurn).toBe(0);
        expect(result.boardState).toBe(JSON.stringify({ board: [] }));
      });
    });
  });

  describe('getById', () => {
    describe('成功ケース', () => {
      it('存在するゲームを取得する', async () => {
        // Arrange
        const gameId = 'existing-game-id';
        const mockGame: GameEntity = {
          PK: 'GAME#existing-game-id',
          SK: 'GAME#existing-game-id',
          GSI1PK: 'GAME#STATUS#ACTIVE',
          GSI1SK: '2024-01-01T00:00:00.000Z',
          gameId: 'existing-game-id',
          gameType: 'OTHELLO',
          status: 'ACTIVE',
          aiSide: 'BLACK',
          currentTurn: 5,
          boardState: JSON.stringify({ board: [] }),
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          entityType: 'GAME',
        };

        mockSend.mockResolvedValueOnce({
          Item: mockGame,
        });

        // Act
        const result = await repository.getById(gameId);

        // Assert
        expect(result).toEqual(mockGame);
        expect(mockSend).toHaveBeenCalledTimes(1);

        const getCommand = mockSend.mock.calls[0][0];
        expect(getCommand).toBeInstanceOf(GetCommand);
        expect(getCommand.input.TableName).toBe('test-table');
        expect(getCommand.input.Key).toEqual({
          PK: 'GAME#existing-game-id',
          SK: 'GAME#existing-game-id',
        });
      });

      it('FINISHEDステータスのゲームを取得する', async () => {
        // Arrange
        const gameId = 'finished-game';
        const mockGame: GameEntity = {
          PK: 'GAME#finished-game',
          SK: 'GAME#finished-game',
          GSI1PK: 'GAME#STATUS#FINISHED',
          GSI1SK: '2024-01-01T00:00:00.000Z',
          gameId: 'finished-game',
          gameType: 'OTHELLO',
          status: 'FINISHED',
          aiSide: 'WHITE',
          currentTurn: 60,
          boardState: JSON.stringify({ board: [] }),
          winner: 'AI',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T01:00:00.000Z',
          entityType: 'GAME',
        };

        mockSend.mockResolvedValueOnce({
          Item: mockGame,
        });

        // Act
        const result = await repository.getById(gameId);

        // Assert
        expect(result).toEqual(mockGame);
        expect(result?.winner).toBe('AI');
      });
    });

    describe('ゲームが存在しない場合', () => {
      it('存在しないゲームの場合はnullを返す', async () => {
        // Arrange
        const gameId = 'non-existent-game';

        mockSend.mockResolvedValueOnce({
          Item: undefined,
        });

        // Act
        const result = await repository.getById(gameId);

        // Assert
        expect(result).toBeNull();
        expect(mockSend).toHaveBeenCalledTimes(1);
      });

      it('空のレスポンスの場合はnullを返す', async () => {
        // Arrange
        const gameId = 'empty-response';

        mockSend.mockResolvedValueOnce({});

        // Act
        const result = await repository.getById(gameId);

        // Assert
        expect(result).toBeNull();
      });
    });

    describe('エラーケース', () => {
      it('DynamoDBエラーの場合はエラーをスローする', async () => {
        // Arrange
        const gameId = 'error-game';
        const dynamoError = new Error('DynamoDB service error');
        dynamoError.name = 'ServiceUnavailable';

        mockSend.mockRejectedValueOnce(dynamoError);

        // Act & Assert
        await expect(repository.getById(gameId)).rejects.toThrow('DynamoDB service error');
        expect(mockSend).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('listByStatus', () => {
    describe('成功ケース', () => {
      it('ACTIVEステータスのゲーム一覧を取得する', async () => {
        // Arrange
        const mockGames: GameEntity[] = [
          {
            PK: 'GAME#game-1',
            SK: 'GAME#game-1',
            GSI1PK: 'GAME#STATUS#ACTIVE',
            GSI1SK: '2024-01-02T00:00:00.000Z',
            gameId: 'game-1',
            gameType: 'OTHELLO',
            status: 'ACTIVE',
            aiSide: 'BLACK',
            currentTurn: 10,
            boardState: JSON.stringify({ board: [] }),
            createdAt: '2024-01-02T00:00:00.000Z',
            updatedAt: '2024-01-02T00:00:00.000Z',
            entityType: 'GAME',
          },
          {
            PK: 'GAME#game-2',
            SK: 'GAME#game-2',
            GSI1PK: 'GAME#STATUS#ACTIVE',
            GSI1SK: '2024-01-01T00:00:00.000Z',
            gameId: 'game-2',
            gameType: 'OTHELLO',
            status: 'ACTIVE',
            aiSide: 'WHITE',
            currentTurn: 5,
            boardState: JSON.stringify({ board: [] }),
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            entityType: 'GAME',
          },
        ];

        mockSend.mockResolvedValueOnce({
          Items: mockGames,
        });

        // Act
        const result = await repository.listByStatus('ACTIVE');

        // Assert
        expect(result.items).toEqual(mockGames);
        expect(result.items).toHaveLength(2);
        expect(result.lastEvaluatedKey).toBeUndefined();
        expect(mockSend).toHaveBeenCalledTimes(1);

        const queryCommand = mockSend.mock.calls[0][0];
        expect(queryCommand).toBeInstanceOf(QueryCommand);
        expect(queryCommand.input.TableName).toBe('test-table');
        expect(queryCommand.input.IndexName).toBe('GSI1');
        expect(queryCommand.input.KeyConditionExpression).toBe('GSI1PK = :gsi1pk');
        expect(queryCommand.input.ExpressionAttributeValues).toEqual({
          ':gsi1pk': 'GAME#STATUS#ACTIVE',
        });
        expect(queryCommand.input.ScanIndexForward).toBe(false);
      });

      it('FINISHEDステータスのゲーム一覧を取得する', async () => {
        // Arrange
        const mockGames: GameEntity[] = [
          {
            PK: 'GAME#game-3',
            SK: 'GAME#game-3',
            GSI1PK: 'GAME#STATUS#FINISHED',
            GSI1SK: '2024-01-01T00:00:00.000Z',
            gameId: 'game-3',
            gameType: 'OTHELLO',
            status: 'FINISHED',
            aiSide: 'BLACK',
            currentTurn: 60,
            boardState: JSON.stringify({ board: [] }),
            winner: 'COLLECTIVE',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T01:00:00.000Z',
            entityType: 'GAME',
          },
        ];

        mockSend.mockResolvedValueOnce({
          Items: mockGames,
        });

        // Act
        const result = await repository.listByStatus('FINISHED');

        // Assert
        expect(result.items).toEqual(mockGames);
        expect(result.items).toHaveLength(1);
        expect(mockSend).toHaveBeenCalledTimes(1);

        const queryCommand = mockSend.mock.calls[0][0];
        expect(queryCommand.input.ExpressionAttributeValues).toEqual({
          ':gsi1pk': 'GAME#STATUS#FINISHED',
        });
      });

      it('ページネーションカーソルを含むレスポンスを返す', async () => {
        // Arrange
        const mockGames: GameEntity[] = [
          {
            PK: 'GAME#game-1',
            SK: 'GAME#game-1',
            GSI1PK: 'GAME#STATUS#ACTIVE',
            GSI1SK: '2024-01-01T00:00:00.000Z',
            gameId: 'game-1',
            gameType: 'OTHELLO',
            status: 'ACTIVE',
            aiSide: 'BLACK',
            currentTurn: 10,
            boardState: JSON.stringify({ board: [] }),
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            entityType: 'GAME',
          },
        ];
        const mockLastEvaluatedKey = {
          PK: 'GAME#game-1',
          SK: 'GAME#game-1',
          GSI1PK: 'GAME#STATUS#ACTIVE',
          GSI1SK: '2024-01-01T00:00:00.000Z',
        };

        mockSend.mockResolvedValueOnce({
          Items: mockGames,
          LastEvaluatedKey: mockLastEvaluatedKey,
        });

        // Act
        const result = await repository.listByStatus('ACTIVE', 20);

        // Assert
        expect(result.items).toEqual(mockGames);
        expect(result.lastEvaluatedKey).toEqual(mockLastEvaluatedKey);
      });

      it('カーソルベースのページネーションをサポートする', async () => {
        // Arrange
        const mockGames: GameEntity[] = [
          {
            PK: 'GAME#game-3',
            SK: 'GAME#game-3',
            GSI1PK: 'GAME#STATUS#ACTIVE',
            GSI1SK: '2024-01-01T00:00:00.000Z',
            gameId: 'game-3',
            gameType: 'OTHELLO',
            status: 'ACTIVE',
            aiSide: 'BLACK',
            currentTurn: 5,
            boardState: JSON.stringify({ board: [] }),
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            entityType: 'GAME',
          },
        ];
        const exclusiveStartKey = {
          PK: 'GAME#game-2',
          SK: 'GAME#game-2',
          GSI1PK: 'GAME#STATUS#ACTIVE',
          GSI1SK: '2024-01-02T00:00:00.000Z',
        };
        const cursor = Buffer.from(JSON.stringify(exclusiveStartKey)).toString('base64');

        mockSend.mockResolvedValueOnce({
          Items: mockGames,
        });

        // Act
        const result = await repository.listByStatus('ACTIVE', 20, cursor);

        // Assert
        expect(result.items).toEqual(mockGames);
        expect(mockSend).toHaveBeenCalledTimes(1);

        const queryCommand = mockSend.mock.calls[0][0];
        expect(queryCommand.input.ExclusiveStartKey).toEqual(exclusiveStartKey);
      });

      it('limitパラメータが正しく適用される', async () => {
        // Arrange
        mockSend.mockResolvedValueOnce({
          Items: [],
        });

        // Act
        await repository.listByStatus('ACTIVE', 50);

        // Assert
        const queryCommand = mockSend.mock.calls[0][0];
        expect(queryCommand.input.Limit).toBe(50);
      });

      it('空の結果を返す', async () => {
        // Arrange
        mockSend.mockResolvedValueOnce({
          Items: [],
        });

        // Act
        const result = await repository.listByStatus('ACTIVE');

        // Assert
        expect(result.items).toEqual([]);
        expect(result.items).toHaveLength(0);
        expect(result.lastEvaluatedKey).toBeUndefined();
      });
    });

    describe('エラーケース', () => {
      it('DynamoDBエラーの場合はエラーをスローする', async () => {
        // Arrange
        const dynamoError = new Error('DynamoDB service error');
        dynamoError.name = 'ServiceUnavailable';

        mockSend.mockRejectedValueOnce(dynamoError);

        // Act & Assert
        await expect(repository.listByStatus('ACTIVE')).rejects.toThrow('DynamoDB service error');
        expect(mockSend).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('updateBoardState', () => {
    describe('成功ケース', () => {
      it('盤面状態を更新する', async () => {
        // Arrange
        const gameId = 'game-123';
        const boardState = JSON.stringify({
          board: [
            [1, 2],
            [2, 1],
          ],
        });
        const currentTurn = 5;

        mockSend.mockResolvedValueOnce({});

        // Act
        await repository.updateBoardState(gameId, boardState, currentTurn);

        // Assert
        expect(mockSend).toHaveBeenCalledTimes(1);

        const updateCommand = mockSend.mock.calls[0][0];
        expect(updateCommand).toBeInstanceOf(UpdateCommand);
        expect(updateCommand.input.TableName).toBe('test-table');
        expect(updateCommand.input.Key).toEqual({
          PK: 'GAME#game-123',
          SK: 'GAME#game-123',
        });
        expect(updateCommand.input.UpdateExpression).toBe(
          'SET boardState = :boardState, currentTurn = :currentTurn, updatedAt = :updatedAt'
        );
        expect(updateCommand.input.ExpressionAttributeValues).toMatchObject({
          ':boardState': boardState,
          ':currentTurn': currentTurn,
        });
        expect(updateCommand.input.ExpressionAttributeValues?.[':updatedAt']).toBeDefined();
      });
    });

    describe('エラーケース', () => {
      it('DynamoDBエラーの場合はエラーをスローする', async () => {
        // Arrange
        const gameId = 'game-123';
        const boardState = JSON.stringify({ board: [] });
        const currentTurn = 5;
        const dynamoError = new Error('DynamoDB service error');
        dynamoError.name = 'ServiceUnavailable';

        mockSend.mockRejectedValueOnce(dynamoError);

        // Act & Assert
        await expect(repository.updateBoardState(gameId, boardState, currentTurn)).rejects.toThrow(
          'DynamoDB service error'
        );
        expect(mockSend).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('finish', () => {
    describe('成功ケース', () => {
      it('ゲームを終了状態に更新する（AI勝利）', async () => {
        // Arrange
        const gameId = 'game-123';
        const winner = 'AI' as const;

        mockSend.mockResolvedValueOnce({});

        // Act
        await repository.finish(gameId, winner);

        // Assert
        expect(mockSend).toHaveBeenCalledTimes(1);

        const updateCommand = mockSend.mock.calls[0][0];
        expect(updateCommand).toBeInstanceOf(UpdateCommand);
        expect(updateCommand.input.TableName).toBe('test-table');
        expect(updateCommand.input.Key).toEqual({
          PK: 'GAME#game-123',
          SK: 'GAME#game-123',
        });
        expect(updateCommand.input.UpdateExpression).toBe(
          'SET #status = :status, winner = :winner, updatedAt = :updatedAt, GSI1PK = :gsi1pk, GSI1SK = :gsi1sk'
        );
        expect(updateCommand.input.ExpressionAttributeNames).toEqual({
          '#status': 'status',
        });
        expect(updateCommand.input.ExpressionAttributeValues).toMatchObject({
          ':status': 'FINISHED',
          ':winner': 'AI',
          ':gsi1pk': 'GAME#STATUS#FINISHED',
        });
        expect(updateCommand.input.ExpressionAttributeValues?.[':updatedAt']).toBeDefined();
        expect(updateCommand.input.ExpressionAttributeValues?.[':gsi1sk']).toBeDefined();
      });

      it('ゲームを終了状態に更新する（COLLECTIVE勝利）', async () => {
        // Arrange
        const gameId = 'game-456';
        const winner = 'COLLECTIVE' as const;

        mockSend.mockResolvedValueOnce({});

        // Act
        await repository.finish(gameId, winner);

        // Assert
        expect(mockSend).toHaveBeenCalledTimes(1);

        const updateCommand = mockSend.mock.calls[0][0];
        expect(updateCommand.input.ExpressionAttributeValues).toMatchObject({
          ':status': 'FINISHED',
          ':winner': 'COLLECTIVE',
          ':gsi1pk': 'GAME#STATUS#FINISHED',
        });
      });

      it('ゲームを終了状態に更新する（引き分け）', async () => {
        // Arrange
        const gameId = 'game-789';
        const winner = 'DRAW' as const;

        mockSend.mockResolvedValueOnce({});

        // Act
        await repository.finish(gameId, winner);

        // Assert
        expect(mockSend).toHaveBeenCalledTimes(1);

        const updateCommand = mockSend.mock.calls[0][0];
        expect(updateCommand.input.ExpressionAttributeValues).toMatchObject({
          ':status': 'FINISHED',
          ':winner': 'DRAW',
          ':gsi1pk': 'GAME#STATUS#FINISHED',
        });
      });
    });

    describe('エラーケース', () => {
      it('DynamoDBエラーの場合はエラーをスローする', async () => {
        // Arrange
        const gameId = 'game-123';
        const winner = 'AI' as const;
        const dynamoError = new Error('DynamoDB service error');
        dynamoError.name = 'ServiceUnavailable';

        mockSend.mockRejectedValueOnce(dynamoError);

        // Act & Assert
        await expect(repository.finish(gameId, winner)).rejects.toThrow('DynamoDB service error');
        expect(mockSend).toHaveBeenCalledTimes(1);
      });
    });
  });
});
