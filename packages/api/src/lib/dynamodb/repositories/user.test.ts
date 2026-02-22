import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserRepository, UserEntity } from './user.js';
import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

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

describe('UserRepository', () => {
  let repository: UserRepository;

  beforeEach(() => {
    // モックをリセット
    vi.clearAllMocks();
    repository = new UserRepository();
  });

  describe('create', () => {
    describe('成功ケース', () => {
      it('有効なパラメータでユーザーを作成する', async () => {
        // Arrange
        const params = {
          userId: 'test-user-id-123',
          email: 'test@example.com',
          username: 'testuser',
        };

        mockSend.mockResolvedValueOnce({});

        // Act
        const result = await repository.create(params);

        // Assert
        expect(result).toMatchObject({
          PK: 'USER#test-user-id-123',
          SK: 'USER#test-user-id-123',
          userId: 'test-user-id-123',
          email: 'test@example.com',
          username: 'testuser',
          entityType: 'USER',
        });
        expect(result.createdAt).toBeDefined();
        expect(result.updatedAt).toBeDefined();
        expect(result.createdAt).toBe(result.updatedAt);

        // DynamoDBクライアントが正しく呼ばれたことを確認
        expect(mockSend).toHaveBeenCalledTimes(1);
        const putCommand = mockSend.mock.calls[0][0];
        expect(putCommand).toBeInstanceOf(PutCommand);
        expect(putCommand.input.TableName).toBe('test-table');
        expect(putCommand.input.ConditionExpression).toBe('attribute_not_exists(PK)');
      });

      it('createdAtとupdatedAtがISO 8601形式である', async () => {
        // Arrange
        const params = {
          userId: 'test-user-id-456',
          email: 'user@example.com',
          username: 'user456',
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
          userId: 'uuid-789',
          email: 'pk-test@example.com',
          username: 'pktest',
        };

        mockSend.mockResolvedValueOnce({});

        // Act
        const result = await repository.create(params);

        // Assert
        expect(result.PK).toBe('USER#uuid-789');
        expect(result.SK).toBe('USER#uuid-789');
      });

      it('entityTypeが"USER"に設定される', async () => {
        // Arrange
        const params = {
          userId: 'test-id',
          email: 'entity@example.com',
          username: 'entitytest',
        };

        mockSend.mockResolvedValueOnce({});

        // Act
        const result = await repository.create(params);

        // Assert
        expect(result.entityType).toBe('USER');
      });
    });

    describe('重複エラー', () => {
      it('ユーザーが既に存在する場合はエラーをスローする', async () => {
        // Arrange
        const params = {
          userId: 'duplicate-user-id',
          email: 'duplicate@example.com',
          username: 'duplicate',
        };

        const conditionalCheckError = new Error('ConditionalCheckFailedException');
        conditionalCheckError.name = 'ConditionalCheckFailedException';
        mockSend.mockRejectedValueOnce(conditionalCheckError);

        // Act & Assert
        await expect(repository.create(params)).rejects.toThrow('User already exists');
        expect(mockSend).toHaveBeenCalledTimes(1);
      });

      it('ConditionalCheckFailedExceptionの場合は特定のエラーメッセージを返す', async () => {
        // Arrange
        const params = {
          userId: 'another-duplicate',
          email: 'another@example.com',
          username: 'another',
        };

        const conditionalCheckError = new Error('The conditional request failed');
        conditionalCheckError.name = 'ConditionalCheckFailedException';
        mockSend.mockRejectedValueOnce(conditionalCheckError);

        // Act & Assert
        await expect(repository.create(params)).rejects.toThrow('User already exists');
      });
    });

    describe('その他のエラー', () => {
      it('DynamoDBエラーの場合はエラーをスローする', async () => {
        // Arrange
        const params = {
          userId: 'error-user-id',
          email: 'error@example.com',
          username: 'erroruser',
        };

        const dynamoError = new Error('DynamoDB service error');
        dynamoError.name = 'ServiceUnavailable';
        mockSend.mockRejectedValueOnce(dynamoError);

        // Act & Assert
        await expect(repository.create(params)).rejects.toThrow('DynamoDB service error');
        expect(mockSend).toHaveBeenCalledTimes(1);
      });

      it('予期しないエラーの場合はエラーをスローする', async () => {
        // Arrange
        const params = {
          userId: 'unexpected-error',
          email: 'unexpected@example.com',
          username: 'unexpected',
        };

        const unexpectedError = new Error('Unexpected error');
        mockSend.mockRejectedValueOnce(unexpectedError);

        // Act & Assert
        await expect(repository.create(params)).rejects.toThrow('Unexpected error');
      });
    });
  });

  describe('getById', () => {
    describe('成功ケース', () => {
      it('存在するユーザーを取得する', async () => {
        // Arrange
        const userId = 'existing-user-id';
        const mockUser: UserEntity = {
          PK: 'USER#existing-user-id',
          SK: 'USER#existing-user-id',
          userId: 'existing-user-id',
          email: 'existing@example.com',
          username: 'existinguser',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          entityType: 'USER',
        };

        mockSend.mockResolvedValueOnce({
          Item: mockUser,
        });

        // Act
        const result = await repository.getById(userId);

        // Assert
        expect(result).toEqual(mockUser);
        expect(mockSend).toHaveBeenCalledTimes(1);

        const getCommand = mockSend.mock.calls[0][0];
        expect(getCommand).toBeInstanceOf(GetCommand);
        expect(getCommand.input.TableName).toBe('test-table');
        expect(getCommand.input.Key).toEqual({
          PK: 'USER#existing-user-id',
          SK: 'USER#existing-user-id',
        });
      });

      it('iconUrlを含むユーザーを取得する', async () => {
        // Arrange
        const userId = 'user-with-icon';
        const mockUser: UserEntity = {
          PK: 'USER#user-with-icon',
          SK: 'USER#user-with-icon',
          userId: 'user-with-icon',
          email: 'icon@example.com',
          username: 'iconuser',
          iconUrl: 'https://example.com/icon.png',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          entityType: 'USER',
        };

        mockSend.mockResolvedValueOnce({
          Item: mockUser,
        });

        // Act
        const result = await repository.getById(userId);

        // Assert
        expect(result).toEqual(mockUser);
        expect(result?.iconUrl).toBe('https://example.com/icon.png');
      });
    });

    describe('ユーザーが存在しない場合', () => {
      it('存在しないユーザーの場合はnullを返す', async () => {
        // Arrange
        const userId = 'non-existent-user';

        mockSend.mockResolvedValueOnce({
          Item: undefined,
        });

        // Act
        const result = await repository.getById(userId);

        // Assert
        expect(result).toBeNull();
        expect(mockSend).toHaveBeenCalledTimes(1);
      });

      it('空のレスポンスの場合はnullを返す', async () => {
        // Arrange
        const userId = 'empty-response';

        mockSend.mockResolvedValueOnce({});

        // Act
        const result = await repository.getById(userId);

        // Assert
        expect(result).toBeNull();
      });
    });

    describe('エラーケース', () => {
      it('DynamoDBエラーの場合はエラーをスローする', async () => {
        // Arrange
        const userId = 'error-user';
        const dynamoError = new Error('DynamoDB service error');
        dynamoError.name = 'ServiceUnavailable';

        mockSend.mockRejectedValueOnce(dynamoError);

        // Act & Assert
        await expect(repository.getById(userId)).rejects.toThrow('DynamoDB service error');
        expect(mockSend).toHaveBeenCalledTimes(1);
      });

      it('予期しないエラーの場合はエラーをスローする', async () => {
        // Arrange
        const userId = 'unexpected-error';
        const unexpectedError = new Error('Unexpected error');

        mockSend.mockRejectedValueOnce(unexpectedError);

        // Act & Assert
        await expect(repository.getById(userId)).rejects.toThrow('Unexpected error');
      });
    });
  });
});
