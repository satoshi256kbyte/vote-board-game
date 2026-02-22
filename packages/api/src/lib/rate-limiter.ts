import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

interface RateLimitRecord {
  PK: string;
  SK: string;
  count: number;
  windowStart: number;
  expiresAt: number;
}

const RATE_LIMITS: Record<string, number> = {
  register: 5,
  login: 10,
  refresh: 20,
  'password-reset': 3,
  'password-reset-confirm': 5,
};

const DEFAULT_MAX_REQUESTS = 5;

export class RateLimiter {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;
  private windowSeconds: number = 60; // 1分

  constructor() {
    const client = new DynamoDBClient({});
    this.docClient = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.DYNAMODB_TABLE_NAME!;
  }

  /**
   * レート制限をチェック
   */
  async checkLimit(ipAddress: string, action: string): Promise<boolean> {
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - (now % this.windowSeconds);
    const key = `RATELIMIT#${action}#${ipAddress}`;

    try {
      // 現在のカウントを取得
      const response = await this.docClient.send(
        new GetCommand({
          TableName: this.tableName,
          Key: {
            PK: key,
            SK: key,
          },
        })
      );

      const record = response.Item as RateLimitRecord | undefined;

      // レコードが存在しない、または古いウィンドウの場合
      if (!record || record.windowStart < windowStart) {
        // 新しいウィンドウを作成
        await this.docClient.send(
          new PutCommand({
            TableName: this.tableName,
            Item: {
              PK: key,
              SK: key,
              count: 1,
              windowStart,
              expiresAt: now + this.windowSeconds + 60, // TTL: ウィンドウ終了後1分
            },
          })
        );
        return true;
      }

      // 制限を超えているかチェック
      const maxRequests = RATE_LIMITS[action] ?? DEFAULT_MAX_REQUESTS;
      if (record.count >= maxRequests) {
        return false;
      }

      // カウントをインクリメント
      await this.docClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: {
            PK: key,
            SK: key,
          },
          UpdateExpression: 'SET #count = #count + :inc',
          ExpressionAttributeNames: {
            '#count': 'count',
          },
          ExpressionAttributeValues: {
            ':inc': 1,
          },
        })
      );

      return true;
    } catch (error) {
      console.error('Rate limit check error:', error);
      // エラー時は許可（フェイルオープン）
      return true;
    }
  }

  /**
   * 次のリクエストまでの待機時間を取得（秒）
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getRetryAfter(_ipAddress: string, _action: string): Promise<number> {
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - (now % this.windowSeconds);
    const windowEnd = windowStart + this.windowSeconds;

    return Math.max(0, windowEnd - now);
  }
}
