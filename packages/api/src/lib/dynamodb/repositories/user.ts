import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { BaseRepository } from './base.js';
import { docClient, TABLE_NAME } from '../index.js';

/**
 * ユーザーエンティティ
 */
export interface UserEntity {
  PK: string; // "USER#<userId>"
  SK: string; // "USER#<userId>"
  userId: string; // UUID from Cognito
  email: string; // ユーザーのメールアドレス
  username: string; // 表示名（3-20文字）
  iconUrl?: string; // プロフィール画像URL（オプション）
  createdAt: string; // ISO 8601形式
  updatedAt: string; // ISO 8601形式
  entityType: 'USER'; // エンティティタイプ識別子
}

/**
 * ユーザーリポジトリ
 * DynamoDBへのユーザーデータアクセスを提供
 */
export class UserRepository extends BaseRepository {
  constructor() {
    super(docClient, TABLE_NAME);
  }

  /**
   * ユーザーを作成
   * @param params - ユーザー作成パラメータ
   * @returns 作成されたユーザーエンティティ
   * @throws ユーザーが既に存在する場合はエラー
   */
  async create(params: { userId: string; email: string; username: string }): Promise<UserEntity> {
    const now = this.now();

    const user: UserEntity = {
      PK: `USER#${params.userId}`,
      SK: `USER#${params.userId}`,
      userId: params.userId,
      email: params.email,
      username: params.username,
      createdAt: now,
      updatedAt: now,
      entityType: 'USER',
    };

    try {
      await this.docClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: user,
          ConditionExpression: 'attribute_not_exists(PK)',
        })
      );

      return user;
    } catch (error) {
      if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
        throw new Error('User already exists');
      }
      console.error('Failed to create user:', error);
      throw error;
    }
  }

  /**
   * ユーザーIDでユーザーを取得
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
      console.error('Failed to get user:', error);
      throw error;
    }
  }
}
