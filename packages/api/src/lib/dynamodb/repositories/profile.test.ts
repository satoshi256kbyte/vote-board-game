import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileRepository } from './profile.js';
import type { UserEntity } from '../types.js';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

// DynamoDBクライアントをモック
vi.mock('../index.js', () => ({
  docClient: {
    send: vi.fn(),
  },
  TABLE_NAME: 'test-table',
}));

// モックされたdocClientを取得
import { docClient } from '../index.js';
const mockSend = docClient.send as ReturnType<typeof vi.fn>;

describe('ProfileRepository', () => {
  let repository: ProfileRepository;

  beforeEach(() => {
    // モックをリセット
    vi.clearAllMocks();
    repository = new ProfileRepository();
  });

  describe('getById', () => {
    describe('成功ケース', () => {
      it('存在するユーザーのプロフィールを取得する', async () => {
        // Arrange
        const userId = 'test-user-123';
        const mockUser: UserEntity = {
          PK: 'USER#test-user-123',
          SK: 'USER#test-user-123',
          userId: 'test-user-123',
          email: 'test@example.com',
          username: 'testuser',
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
          PK: 'USER#test-user-123',
          SK: 'USER#test-user-123',
        });
      });

      it('iconUrlを含むユーザーのプロフィールを取得する', async () => {
        // Arrange
        const userId = 'user-with-icon';
        const mockUser: UserEntity = {
          PK: 'USER#user-with-icon',
          SK: 'USER#user-with-icon',
          userId: 'user-with-icon',
          email: 'icon@example.com',
          username: 'iconuser',
          iconUrl: 'https://example.com/icons/user.png',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
          entityType: 'USER',
        };

        mockSend.mockResolvedValueOnce({
          Item: mockUser,
        });

        // Act
        const result = await repository.getById(userId);

        // Assert
        expect(result).toEqual(mockUser);
        expect(result?.iconUrl).toBe('https://example.com/icons/user.png');
      });

      it('PKとSKが正しい形式で使用される', async () => {
        // Arrange
        const userId = 'uuid-789';
        const mockUser: UserEntity = {
          PK: 'USER#uuid-789',
          SK: 'USER#uuid-789',
          userId: 'uuid-789',
          email: 'pk-test@example.com',
          username: 'pktest',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          entityType: 'USER',
        };

        mockSend.mockResolvedValueOnce({
          Item: mockUser,
        });

        // Act
        await repository.getById(userId);

        // Assert
        const getCommand = mockSend.mock.calls[0][0];
        expect(getCommand.input.Key).toEqual({
          PK: 'USER#uuid-789',
          SK: 'USER#uuid-789',
        });
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

  describe('update', () => {
    describe('成功ケース', () => {
      it('usernameのみを更新する', async () => {
        // Arrange
        const userId = 'test-user-123';
        const updates = { username: 'newusername' };
        const mockUpdatedUser: UserEntity = {
          PK: 'USER#test-user-123',
          SK: 'USER#test-user-123',
          userId: 'test-user-123',
          email: 'test@example.com',
          username: 'newusername',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
          entityType: 'USER',
        };

        mockSend.mockResolvedValueOnce({
          Attributes: mockUpdatedUser,
        });

        // Act
        const result = await repository.update(userId, updates);

        // Assert
        expect(result).toEqual(mockUpdatedUser);
        expect(result.username).toBe('newusername');
        expect(mockSend).toHaveBeenCalledTimes(1);

        const updateCommand = mockSend.mock.calls[0][0];
        expect(updateCommand).toBeInstanceOf(UpdateCommand);
        expect(updateCommand.input.TableName).toBe('test-table');
        expect(updateCommand.input.Key).toEqual({
          PK: 'USER#test-user-123',
          SK: 'USER#test-user-123',
        });
        expect(updateCommand.input.ConditionExpression).toBe('attribute_exists(PK)');
        expect(updateCommand.input.ReturnValues).toBe('ALL_NEW');
      });

      it('iconUrlのみを更新する', async () => {
        // Arrange
        const userId = 'test-user-456';
        const updates = { iconUrl: 'https://example.com/new-icon.png' };
        const mockUpdatedUser: UserEntity = {
          PK: 'USER#test-user-456',
          SK: 'USER#test-user-456',
          userId: 'test-user-456',
          email: 'test@example.com',
          username: 'testuser',
          iconUrl: 'https://example.com/new-icon.png',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
          entityType: 'USER',
        };

        mockSend.mockResolvedValueOnce({
          Attributes: mockUpdatedUser,
        });

        // Act
        const result = await repository.update(userId, updates);

        // Assert
        expect(result).toEqual(mockUpdatedUser);
        expect(result.iconUrl).toBe('https://example.com/new-icon.png');
      });

      it('usernameとiconUrlを同時に更新する', async () => {
        // Arrange
        const userId = 'test-user-789';
        const updates = {
          username: 'updateduser',
          iconUrl: 'https://example.com/updated-icon.png',
        };
        const mockUpdatedUser: UserEntity = {
          PK: 'USER#test-user-789',
          SK: 'USER#test-user-789',
          userId: 'test-user-789',
          email: 'test@example.com',
          username: 'updateduser',
          iconUrl: 'https://example.com/updated-icon.png',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-03T00:00:00.000Z',
          entityType: 'USER',
        };

        mockSend.mockResolvedValueOnce({
          Attributes: mockUpdatedUser,
        });

        // Act
        const result = await repository.update(userId, updates);

        // Assert
        expect(result).toEqual(mockUpdatedUser);
        expect(result.username).toBe('updateduser');
        expect(result.iconUrl).toBe('https://example.com/updated-icon.png');
      });

      it('updatedAtが更新される', async () => {
        // Arrange
        const userId = 'test-user-update-time';
        const updates = { username: 'timetest' };
        const mockUpdatedUser: UserEntity = {
          PK: 'USER#test-user-update-time',
          SK: 'USER#test-user-update-time',
          userId: 'test-user-update-time',
          email: 'test@example.com',
          username: 'timetest',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-05T12:30:45.678Z',
          entityType: 'USER',
        };

        mockSend.mockResolvedValueOnce({
          Attributes: mockUpdatedUser,
        });

        // Act
        const result = await repository.update(userId, updates);

        // Assert
        expect(result.updatedAt).toBeDefined();
        expect(result.updatedAt).toBe('2024-01-05T12:30:45.678Z');

        // UpdateExpressionにupdatedAtが含まれることを確認
        const updateCommand = mockSend.mock.calls[0][0];
        expect(updateCommand.input.UpdateExpression).toContain('#updatedAt = :updatedAt');
        expect(updateCommand.input.ExpressionAttributeNames).toHaveProperty('#updatedAt');
        expect(updateCommand.input.ExpressionAttributeValues).toHaveProperty(':updatedAt');
      });

      it('UpdateExpressionが動的に構築される（usernameのみ）', async () => {
        // Arrange
        const userId = 'test-user-dynamic';
        const updates = { username: 'dynamicuser' };

        mockSend.mockResolvedValueOnce({
          Attributes: {
            userId: 'test-user-dynamic',
            username: 'dynamicuser',
          },
        });

        // Act
        await repository.update(userId, updates);

        // Assert
        const updateCommand = mockSend.mock.calls[0][0];
        expect(updateCommand.input.UpdateExpression).toBe(
          'SET #username = :username, #updatedAt = :updatedAt'
        );
        expect(updateCommand.input.ExpressionAttributeNames).toEqual({
          '#username': 'username',
          '#updatedAt': 'updatedAt',
        });
        expect(updateCommand.input.ExpressionAttributeValues).toHaveProperty(
          ':username',
          'dynamicuser'
        );
        expect(updateCommand.input.ExpressionAttributeValues).toHaveProperty(':updatedAt');
      });

      it('UpdateExpressionが動的に構築される（iconUrlのみ）', async () => {
        // Arrange
        const userId = 'test-user-icon-only';
        const updates = { iconUrl: 'https://example.com/icon.png' };

        mockSend.mockResolvedValueOnce({
          Attributes: {
            userId: 'test-user-icon-only',
            iconUrl: 'https://example.com/icon.png',
          },
        });

        // Act
        await repository.update(userId, updates);

        // Assert
        const updateCommand = mockSend.mock.calls[0][0];
        expect(updateCommand.input.UpdateExpression).toBe(
          'SET #iconUrl = :iconUrl, #updatedAt = :updatedAt'
        );
        expect(updateCommand.input.ExpressionAttributeNames).toEqual({
          '#iconUrl': 'iconUrl',
          '#updatedAt': 'updatedAt',
        });
        expect(updateCommand.input.ExpressionAttributeValues).toHaveProperty(
          ':iconUrl',
          'https://example.com/icon.png'
        );
      });

      it('UpdateExpressionが動的に構築される（両方）', async () => {
        // Arrange
        const userId = 'test-user-both';
        const updates = {
          username: 'bothuser',
          iconUrl: 'https://example.com/both.png',
        };

        mockSend.mockResolvedValueOnce({
          Attributes: {
            userId: 'test-user-both',
            username: 'bothuser',
            iconUrl: 'https://example.com/both.png',
          },
        });

        // Act
        await repository.update(userId, updates);

        // Assert
        const updateCommand = mockSend.mock.calls[0][0];
        expect(updateCommand.input.UpdateExpression).toBe(
          'SET #username = :username, #iconUrl = :iconUrl, #updatedAt = :updatedAt'
        );
        expect(updateCommand.input.ExpressionAttributeNames).toEqual({
          '#username': 'username',
          '#iconUrl': 'iconUrl',
          '#updatedAt': 'updatedAt',
        });
        expect(updateCommand.input.ExpressionAttributeValues).toHaveProperty(
          ':username',
          'bothuser'
        );
        expect(updateCommand.input.ExpressionAttributeValues).toHaveProperty(
          ':iconUrl',
          'https://example.com/both.png'
        );
      });
    });

    describe('条件付き更新', () => {
      it('ConditionExpressionでユーザーの存在を確認する', async () => {
        // Arrange
        const userId = 'test-user-condition';
        const updates = { username: 'conditionuser' };

        mockSend.mockResolvedValueOnce({
          Attributes: {
            userId: 'test-user-condition',
            username: 'conditionuser',
          },
        });

        // Act
        await repository.update(userId, updates);

        // Assert
        const updateCommand = mockSend.mock.calls[0][0];
        expect(updateCommand.input.ConditionExpression).toBe('attribute_exists(PK)');
      });

      it('存在しないユーザーの更新時にエラーをスローする', async () => {
        // Arrange
        const userId = 'non-existent-user';
        const updates = { username: 'newname' };

        const conditionalCheckError = new Error('ConditionalCheckFailedException');
        conditionalCheckError.name = 'ConditionalCheckFailedException';
        mockSend.mockRejectedValueOnce(conditionalCheckError);

        // Act & Assert
        await expect(repository.update(userId, updates)).rejects.toThrow('User not found');
        expect(mockSend).toHaveBeenCalledTimes(1);
      });

      it('ConditionalCheckFailedExceptionの場合は特定のエラーメッセージを返す', async () => {
        // Arrange
        const userId = 'another-non-existent';
        const updates = { iconUrl: 'https://example.com/icon.png' };

        const conditionalCheckError = new Error('The conditional request failed');
        conditionalCheckError.name = 'ConditionalCheckFailedException';
        mockSend.mockRejectedValueOnce(conditionalCheckError);

        // Act & Assert
        await expect(repository.update(userId, updates)).rejects.toThrow('User not found');
      });
    });

    describe('エラーケース', () => {
      it('DynamoDBエラーの場合はエラーをスローする', async () => {
        // Arrange
        const userId = 'error-user';
        const updates = { username: 'erroruser' };

        const dynamoError = new Error('DynamoDB service error');
        dynamoError.name = 'ServiceUnavailable';
        mockSend.mockRejectedValueOnce(dynamoError);

        // Act & Assert
        await expect(repository.update(userId, updates)).rejects.toThrow('DynamoDB service error');
        expect(mockSend).toHaveBeenCalledTimes(1);
      });

      it('予期しないエラーの場合はエラーをスローする', async () => {
        // Arrange
        const userId = 'unexpected-error';
        const updates = { username: 'unexpected' };

        const unexpectedError = new Error('Unexpected error');
        mockSend.mockRejectedValueOnce(unexpectedError);

        // Act & Assert
        await expect(repository.update(userId, updates)).rejects.toThrow('Unexpected error');
      });
    });
  });
});
