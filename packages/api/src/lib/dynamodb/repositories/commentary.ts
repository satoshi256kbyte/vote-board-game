import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { BaseRepository } from './base';
import { CommentaryEntity, Keys } from '../types';

export class CommentaryRepository extends BaseRepository {
  async listByGame(gameId: string): Promise<CommentaryEntity[]> {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `GAME#${gameId}`,
          ':sk': 'COMMENTARY#',
        },
      })
    );

    return (result.Items as CommentaryEntity[]) || [];
  }

  async getByGameAndTurn(gameId: string, turnNumber: number): Promise<CommentaryEntity | null> {
    const keys = Keys.commentary(gameId, turnNumber);

    const result = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: keys,
      })
    );

    return (result.Item as CommentaryEntity) || null;
  }

  async create(params: {
    gameId: string;
    turnNumber: number;
    content: string;
    generatedBy: 'AI';
  }): Promise<CommentaryEntity> {
    const now = this.now();
    const keys = Keys.commentary(params.gameId, params.turnNumber);

    const entity: CommentaryEntity = {
      ...keys,
      entityType: 'COMMENTARY',
      gameId: params.gameId,
      turnNumber: params.turnNumber,
      content: params.content,
      generatedBy: params.generatedBy,
      createdAt: now,
    };

    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: entity,
      })
    );

    return entity;
  }
}
