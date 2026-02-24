import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { BaseRepository } from './base.js';
import { docClient, TABLE_NAME } from '../index.js';
import type { UserEntity } from '../types.js';

/**
 * プロフィールリポジトリ
 * DynamoDBへのユーザープロフィールデータアクセスを提供
 */
export class ProfileRepository extends BaseRepository {
  constructor() {
    super(docClient, TABLE_NAME);
  }

  /**
   * ユーザーIDでプロフィールを取得
   * @param userId - ユーザーID
   * @returns ユーザーエンティティ、存在しない場合はnull
   */
  async getById(userId: string): Promise<UserEntity | null> {
    try {
      const response = await this.docClient.send(
        new GetCommand({
          TableName: this.tableName,
          Key: {
            PK: `USER#${userId}`,
            SK: `USER#${userId}`,
          },
        })
      );

      return (response.Item as UserEntity) || null;
    } catch (error) {
      console.error('Failed to get profile:', error);
      throw error;
    }
  }

  /**
   * プロフィールを更新
   * @param userId - ユーザーID
   * @param updates - 更新するフィールド（username, iconUrl）
   * @returns 更新されたユーザーエンティティ
   * @throws ユーザーが存在しない場合はエラー
   */
  async update(
    userId: string,
    updates: { username?: string; iconUrl?: string }
  ): Promise<UserEntity> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, string> = {};

    // 動的にUpdateExpressionを構築
    if (updates.username !== undefined) {
      updateExpressions.push('#username = :username');
      expressionAttributeNames['#username'] = 'username';
      expressionAttributeValues[':username'] = updates.username;
    }

    if (updates.iconUrl !== undefined) {
      updateExpressions.push('#iconUrl = :iconUrl');
      expressionAttributeNames['#iconUrl'] = 'iconUrl';
      expressionAttributeValues[':iconUrl'] = updates.iconUrl;
    }

    // updatedAtは常に更新
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = this.now();

    try {
      const response = await this.docClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: {
            PK: `USER#${userId}`,
            SK: `USER#${userId}`,
          },
          UpdateExpression: `SET ${updateExpressions.join(', ')}`,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
          ConditionExpression: 'attribute_exists(PK)',
          ReturnValues: 'ALL_NEW',
        })
      );

      return response.Attributes as UserEntity;
    } catch (error) {
      if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
        throw new Error('User not found');
      }
      console.error('Failed to update profile:', error);
      throw error;
    }
  }
}
