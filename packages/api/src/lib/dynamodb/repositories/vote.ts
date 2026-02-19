import { GetCommand, PutCommand, QueryCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { BaseRepository } from './base';
import { VoteEntity, Keys, GSIKeys } from '../types';

export class VoteRepository extends BaseRepository {
  async create(params: {
    gameId: string;
    turnNumber: number;
    userId: string;
    candidateId: string;
  }): Promise<VoteEntity> {
    const now = this.now();
    const keys = Keys.vote(params.gameId, params.turnNumber, params.userId);
    const gsiKeys = GSIKeys.userVotes(params.userId, now);

    const entity: VoteEntity = {
      ...keys,
      ...gsiKeys,
      entityType: 'VOTE',
      gameId: params.gameId,
      turnNumber: params.turnNumber,
      userId: params.userId,
      candidateId: params.candidateId,
      createdAt: now,
      updatedAt: now,
    };

    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: entity,
      })
    );

    return entity;
  }

  async getByUser(gameId: string, turnNumber: number, userId: string): Promise<VoteEntity | null> {
    const keys = Keys.vote(gameId, turnNumber, userId);

    const result = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: keys,
      })
    );

    return (result.Item as VoteEntity) || null;
  }

  async listByTurn(gameId: string, turnNumber: number): Promise<VoteEntity[]> {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `GAME#${gameId}#TURN#${turnNumber}`,
          ':sk': 'VOTE#',
        },
      })
    );

    return (result.Items as VoteEntity[]) || [];
  }

  async listByUser(userId: string, limit = 20): Promise<VoteEntity[]> {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI2',
        KeyConditionExpression: 'GSI2PK = :gsi2pk AND begins_with(GSI2SK, :gsi2sk)',
        ExpressionAttributeValues: {
          ':gsi2pk': `USER#${userId}`,
          ':gsi2sk': 'VOTE#',
        },
        ScanIndexForward: false, // 新しい順
        Limit: limit,
      })
    );

    return (result.Items as VoteEntity[]) || [];
  }

  /**
   * 投票を作成または更新（トランザクション）
   * 既存の投票がある場合は候補の投票数を調整
   */
  async upsertWithTransaction(params: {
    gameId: string;
    turnNumber: number;
    userId: string;
    candidateId: string;
    oldCandidateId?: string;
  }): Promise<VoteEntity> {
    const now = this.now();
    const voteKeys = Keys.vote(params.gameId, params.turnNumber, params.userId);
    const gsiKeys = GSIKeys.userVotes(params.userId, now);
    const newCandidateKeys = Keys.candidate(params.gameId, params.turnNumber, params.candidateId);

    const transactItems: Array<{
      Put?: { TableName: string; Item: Record<string, unknown> };
      Update?: {
        TableName: string;
        Key: Record<string, string>;
        UpdateExpression: string;
        ExpressionAttributeValues: Record<string, unknown>;
      };
    }> = [
      // 投票を作成/更新
      {
        Put: {
          TableName: this.tableName,
          Item: {
            ...voteKeys,
            ...gsiKeys,
            entityType: 'VOTE',
            gameId: params.gameId,
            turnNumber: params.turnNumber,
            userId: params.userId,
            candidateId: params.candidateId,
            createdAt: now,
            updatedAt: now,
          },
        },
      },
      // 新しい候補の投票数を増やす
      {
        Update: {
          TableName: this.tableName,
          Key: newCandidateKeys,
          UpdateExpression: 'SET voteCount = voteCount + :inc, updatedAt = :updatedAt',
          ExpressionAttributeValues: {
            ':inc': 1,
            ':updatedAt': now,
          },
        },
      },
    ];

    // 既存の投票がある場合は古い候補の投票数を減らす
    if (params.oldCandidateId) {
      const oldCandidateKeys = Keys.candidate(
        params.gameId,
        params.turnNumber,
        params.oldCandidateId
      );
      transactItems.push({
        Update: {
          TableName: this.tableName,
          Key: oldCandidateKeys,
          UpdateExpression: 'SET voteCount = voteCount - :dec, updatedAt = :updatedAt',
          ExpressionAttributeValues: {
            ':dec': 1,
            ':updatedAt': now,
          },
        },
      });
    }

    await this.docClient.send(
      new TransactWriteCommand({
        TransactItems: transactItems,
      })
    );

    return {
      ...voteKeys,
      ...gsiKeys,
      entityType: 'VOTE',
      gameId: params.gameId,
      turnNumber: params.turnNumber,
      userId: params.userId,
      candidateId: params.candidateId,
      createdAt: now,
      updatedAt: now,
    };
  }
}
