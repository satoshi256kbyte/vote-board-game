import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { BaseRepository } from './base';
import { MoveEntity, Keys } from '../types';

export interface CreateMoveParams {
  gameId: string;
  turnNumber: number;
  side: 'BLACK' | 'WHITE';
  position: string;
  playedBy: 'AI' | 'COLLECTIVE';
  candidateId: string;
}

export class MoveRepository extends BaseRepository {
  async create(params: CreateMoveParams): Promise<MoveEntity> {
    const now = this.now();
    const keys = Keys.move(params.gameId, params.turnNumber);

    const entity: MoveEntity = {
      ...keys,
      entityType: 'MOVE',
      gameId: params.gameId,
      turnNumber: params.turnNumber,
      side: params.side,
      position: params.position,
      playedBy: params.playedBy,
      candidateId: params.candidateId,
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

  async listByGame(gameId: string): Promise<MoveEntity[]> {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `GAME#${gameId}`,
          ':sk': 'MOVE#',
        },
      })
    );

    return (result.Items as MoveEntity[]) || [];
  }
}
