import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export abstract class BaseRepository {
  constructor(
    protected readonly docClient: DynamoDBDocumentClient,
    protected readonly tableName: string
  ) {}

  protected now(): string {
    return new Date().toISOString();
  }
}
