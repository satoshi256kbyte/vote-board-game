import { GetCommand, PutCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { BaseRepository } from './base';
import { docClient, TABLE_NAME } from '../index.js';
import { GameEntity, Keys, GSIKeys } from '../types';

export class GameRepository extends BaseRepository {
  constructor() {
    super(docClient, TABLE_NAME);
  }
  async create(params: {
    gameId: string;
    gameType: 'OTHELLO' | 'CHESS' | 'GO' | 'SHOGI';
    aiSide: 'BLACK' | 'WHITE';
    boardState?: string;
    tags?: string[];
  }): Promise<GameEntity> {
    const now = this.now();
    const keys = Keys.game(params.gameId);
    const gsiKeys = GSIKeys.gamesByStatus('ACTIVE', now);
    const tags = params.tags ?? [];

    const entity: GameEntity = {
      ...keys,
      ...gsiKeys,
      entityType: 'GAME',
      gameId: params.gameId,
      gameType: params.gameType,
      status: 'ACTIVE',
      aiSide: params.aiSide,
      currentTurn: 0,
      boardState: params.boardState || JSON.stringify({ board: [] }), // 初期盤面
      tags,
      ...(tags.includes('E2E') ? GSIKeys.gamesByTag('E2E') : {}),
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

  async getById(gameId: string): Promise<GameEntity | null> {
    const keys = Keys.game(gameId);

    const result = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: keys,
      })
    );

    return (result.Item as GameEntity) || null;
  }

  async listByStatus(
    status: 'ACTIVE' | 'FINISHED',
    limit = 20,
    cursor?: string
  ): Promise<{ items: GameEntity[]; lastEvaluatedKey?: Record<string, unknown> }> {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :gsi1pk',
        ExpressionAttributeValues: {
          ':gsi1pk': `GAME#STATUS#${status}`,
        },
        ScanIndexForward: false, // 新しい順
        Limit: limit,
        ExclusiveStartKey: cursor
          ? JSON.parse(Buffer.from(cursor, 'base64').toString())
          : undefined,
      })
    );

    return {
      items: (result.Items as GameEntity[]) || [],
      lastEvaluatedKey: result.LastEvaluatedKey,
    };
  }

  async updateBoardState(gameId: string, boardState: string, currentTurn: number): Promise<void> {
    const keys = Keys.game(gameId);

    await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: keys,
        UpdateExpression:
          'SET boardState = :boardState, currentTurn = :currentTurn, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':boardState': boardState,
          ':currentTurn': currentTurn,
          ':updatedAt': this.now(),
        },
      })
    );
  }

  async listByTag(tag: string): Promise<GameEntity[]> {
    const items: GameEntity[] = [];
    let exclusiveStartKey: Record<string, unknown> | undefined;

    do {
      const result = await this.docClient.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: 'GSI3',
          KeyConditionExpression: 'GSI3PK = :gsi3pk',
          ExpressionAttributeValues: {
            ':gsi3pk': `TAG#${tag}`,
          },
          ExclusiveStartKey: exclusiveStartKey,
        })
      );

      if (result.Items) {
        items.push(...(result.Items as GameEntity[]));
      }
      exclusiveStartKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (exclusiveStartKey);

    return items;
  }

  async finish(gameId: string, winner: 'AI' | 'COLLECTIVE' | 'DRAW'): Promise<void> {
    const keys = Keys.game(gameId);
    const now = this.now();
    const gsiKeys = GSIKeys.gamesByStatus('FINISHED', now);

    await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: keys,
        UpdateExpression:
          'SET #status = :status, winner = :winner, updatedAt = :updatedAt, GSI1PK = :gsi1pk, GSI1SK = :gsi1sk',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': 'FINISHED',
          ':winner': winner,
          ':updatedAt': now,
          ':gsi1pk': gsiKeys.GSI1PK,
          ':gsi1sk': gsiKeys.GSI1SK,
        },
      })
    );
  }
}
