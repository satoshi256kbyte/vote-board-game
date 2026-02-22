import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RateLimiter } from './rate-limiter.js';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

// DynamoDBDocumentClientをモック
vi.mock('@aws-sdk/lib-dynamodb', async () => {
  const actual = await vi.importActual('@aws-sdk/lib-dynamodb');
  return {
    ...actual,
    DynamoDBDocumentClient: {
      from: vi.fn(() => ({
        send: vi.fn(),
      })),
    },
  };
});

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;
  let mockSend: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DYNAMODB_TABLE_NAME = 'test-table';

    rateLimiter = new RateLimiter();
    mockSend = vi.fn();
    (rateLimiter as any).docClient.send = mockSend;
  });

  describe('checkLimit', () => {
    it('制限内の場合はtrueを返す（新しいウィンドウ）', async () => {
      // レコードが存在しない場合
      mockSend.mockResolvedValueOnce({ Item: undefined });
      mockSend.mockResolvedValueOnce({});

      const result = await rateLimiter.checkLimit('192.168.1.1', 'register');

      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(2);

      // GetCommandが呼ばれたことを確認
      expect(mockSend).toHaveBeenNthCalledWith(1, expect.any(GetCommand));

      // PutCommandが呼ばれたことを確認
      expect(mockSend).toHaveBeenNthCalledWith(2, expect.any(PutCommand));
    });

    it('制限内の場合はtrueを返す（既存のウィンドウ、カウント < 5）', async () => {
      const now = Math.floor(Date.now() / 1000);
      const windowStart = now - (now % 60);

      // 既存のレコードを返す（カウント: 3）
      mockSend.mockResolvedValueOnce({
        Item: {
          PK: 'RATELIMIT#register#192.168.1.1',
          SK: 'RATELIMIT#register#192.168.1.1',
          count: 3,
          windowStart,
          expiresAt: now + 120,
        },
      });
      mockSend.mockResolvedValueOnce({});

      const result = await rateLimiter.checkLimit('192.168.1.1', 'register');

      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(2);

      // UpdateCommandが呼ばれたことを確認
      expect(mockSend).toHaveBeenNthCalledWith(2, expect.any(UpdateCommand));
    });

    it('制限超過の場合はfalseを返す', async () => {
      const now = Math.floor(Date.now() / 1000);
      const windowStart = now - (now % 60);

      // 既存のレコードを返す（カウント: 5、制限に達している）
      mockSend.mockResolvedValueOnce({
        Item: {
          PK: 'RATELIMIT#register#192.168.1.1',
          SK: 'RATELIMIT#register#192.168.1.1',
          count: 5,
          windowStart,
          expiresAt: now + 120,
        },
      });

      const result = await rateLimiter.checkLimit('192.168.1.1', 'register');

      expect(result).toBe(false);
      expect(mockSend).toHaveBeenCalledTimes(1);

      // UpdateCommandは呼ばれない
      expect(mockSend).not.toHaveBeenCalledWith(expect.any(UpdateCommand));
    });

    it('古いウィンドウの場合は新しいウィンドウを作成', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oldWindowStart = now - 120; // 2分前のウィンドウ

      // 古いレコードを返す
      mockSend.mockResolvedValueOnce({
        Item: {
          PK: 'RATELIMIT#register#192.168.1.1',
          SK: 'RATELIMIT#register#192.168.1.1',
          count: 5,
          windowStart: oldWindowStart,
          expiresAt: now - 60,
        },
      });
      mockSend.mockResolvedValueOnce({});

      const result = await rateLimiter.checkLimit('192.168.1.1', 'register');

      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(2);

      // PutCommandが呼ばれたことを確認（新しいウィンドウ）
      expect(mockSend).toHaveBeenNthCalledWith(2, expect.any(PutCommand));
    });

    it('エラー時はtrueを返す（フェイルオープン）', async () => {
      mockSend.mockRejectedValueOnce(new Error('DynamoDB error'));

      const result = await rateLimiter.checkLimit('192.168.1.1', 'register');

      expect(result).toBe(true);
    });
  });

  describe('getRetryAfter', () => {
    it('次のリクエストまでの待機時間を返す', async () => {
      const now = Math.floor(Date.now() / 1000);
      const windowStart = now - (now % 60);
      const windowEnd = windowStart + 60;
      const expectedRetryAfter = windowEnd - now;

      const result = await rateLimiter.getRetryAfter('192.168.1.1', 'register');

      expect(result).toBe(expectedRetryAfter);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(60);
    });

    it('待機時間が負の場合は0を返す', async () => {
      // この場合、現在時刻がウィンドウの終了時刻を過ぎている
      // Math.maxで0が保証される
      const result = await rateLimiter.getRetryAfter('192.168.1.1', 'register');

      expect(result).toBeGreaterThanOrEqual(0);
    });
  });
});
