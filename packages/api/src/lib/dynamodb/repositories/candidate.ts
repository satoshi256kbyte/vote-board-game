import {
  PutCommand,
  QueryCommand,
  UpdateCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { BaseRepository } from './base';
import { CandidateEntity, Keys, GSIKeys } from '../types';

export class CandidateRepository extends BaseRepository {
  async create(params: {
    candidateId: string;
    gameId: string;
    turnNumber: number;
    position: string;
    description: string;
    createdBy: string; // 'AI' or 'USER#<userId>'
    votingDeadline: string;
  }): Promise<CandidateEntity> {
    const now = this.now();
    const keys = Keys.candidate(params.gameId, params.turnNumber, params.candidateId);

    // ユーザー作成の場合は GSI2 キーを追加
    const gsiKeys = params.createdBy.startsWith('USER#')
      ? GSIKeys.userCandidates(params.createdBy.replace('USER#', ''), now)
      : {};

    const entity: CandidateEntity = {
      ...keys,
      ...gsiKeys,
      entityType: 'CANDIDATE',
      candidateId: params.candidateId,
      gameId: params.gameId,
      turnNumber: params.turnNumber,
      position: params.position,
      description: params.description,
      voteCount: 0,
      createdBy: params.createdBy,
      status: 'VOTING',
      votingDeadline: params.votingDeadline,
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

  async listByTurn(gameId: string, turnNumber: number): Promise<CandidateEntity[]> {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `GAME#${gameId}#TURN#${turnNumber}`,
          ':sk': 'CANDIDATE#',
        },
      })
    );

    return (result.Items as CandidateEntity[]) || [];
  }

  async incrementVoteCount(gameId: string, turnNumber: number, candidateId: string): Promise<void> {
    const keys = Keys.candidate(gameId, turnNumber, candidateId);

    await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: keys,
        UpdateExpression: 'SET voteCount = voteCount + :inc, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':inc': 1,
          ':updatedAt': this.now(),
        },
      })
    );
  }

  async decrementVoteCount(gameId: string, turnNumber: number, candidateId: string): Promise<void> {
    const keys = Keys.candidate(gameId, turnNumber, candidateId);

    await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: keys,
        UpdateExpression: 'SET voteCount = voteCount - :dec, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':dec': 1,
          ':updatedAt': this.now(),
        },
      })
    );
  }

  async closeVoting(gameId: string, turnNumber: number): Promise<void> {
    const candidates = await this.listByTurn(gameId, turnNumber);

    if (candidates.length === 0) return;

    await this.docClient.send(
      new TransactWriteCommand({
        TransactItems: candidates.map((candidate) => ({
          Update: {
            TableName: this.tableName,
            Key: Keys.candidate(gameId, turnNumber, candidate.candidateId),
            UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
            ExpressionAttributeNames: {
              '#status': 'status',
            },
            ExpressionAttributeValues: {
              ':status': 'CLOSED',
              ':updatedAt': this.now(),
            },
          },
        })),
      })
    );
  }

  async markAsAdopted(gameId: string, turnNumber: number, candidateId: string): Promise<void> {
    const keys = Keys.candidate(gameId, turnNumber, candidateId);

    await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: keys,
        UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': 'ADOPTED',
          ':updatedAt': this.now(),
        },
      })
    );
  }
}
