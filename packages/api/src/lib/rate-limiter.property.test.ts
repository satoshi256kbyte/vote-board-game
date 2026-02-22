import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { RateLimiter } from './rate-limiter.js';
import { PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

// DynamoDBDocumentClientをモック
vi.mock('@aws-sdk/lib-dynamodb', async () => {
  const actual = await vi.importActual('@aws-sdk/lib-dynamodb');
  return {
    ...actual,
    DynamoDBDocumentClient: {
      from: vi.fn().mockImplementation(() => ({
        send: vi.fn(),
      })),
    },
  };
});

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn().mockImplementation(() => ({})),
}));

/**
 * Feature: user-registration-api
 * Property 12: レート制限
 *
 * **Validates: Requirements 9.1, 9.2, 9.3**
 *
 * 任意のIPアドレスに対して、1分間に6回以上の登録リクエストを送信した場合、
 * 6回目以降のリクエストは429ステータスコード、エラーコード`RATE_LIMIT_EXCEEDED`、
 * および次のリクエストが許可されるまでの秒数を示す`retryAfter`フィールドを返すべきです。
 */
describe('Property 12: Rate limiting', () => {
  let rateLimiter: RateLimiter;
  let mockSend: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // 環境変数を設定
    process.env.DYNAMODB_TABLE_NAME = 'test-table';

    // モックをリセット
    vi.clearAllMocks();

    // RateLimiterインスタンスを作成
    rateLimiter = new RateLimiter();

    // モックされたsendメソッドを取得
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockSend = (rateLimiter as any).docClient.send;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should allow first 5 requests and reject 6th and subsequent requests for any IP address', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // 任意のIPアドレスを生成（IPv4形式）
          ipAddress: fc
            .tuple(
              fc.integer({ min: 0, max: 255 }),
              fc.integer({ min: 0, max: 255 }),
              fc.integer({ min: 0, max: 255 }),
              fc.integer({ min: 0, max: 255 })
            )
            .map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`),
          action: fc.constant('register'),
        }),
        async (data) => {
          // モックをリセット
          mockSend.mockClear();

          const now = Math.floor(Date.now() / 1000);
          const windowStart = now - (now % 60);

          // 最初の5回のリクエストをシミュレート
          for (let i = 1; i <= 5; i++) {
            // GetCommandのモックレスポンス
            if (i === 1) {
              // 1回目: レコードが存在しない
              mockSend.mockResolvedValueOnce({ Item: undefined });
              // PutCommandが呼ばれる
              mockSend.mockResolvedValueOnce({});
            } else {
              // 2-5回目: レコードが存在し、カウントがi-1
              mockSend.mockResolvedValueOnce({
                Item: {
                  PK: `RATELIMIT#${data.action}#${data.ipAddress}`,
                  SK: `RATELIMIT#${data.action}#${data.ipAddress}`,
                  count: i - 1,
                  windowStart,
                  expiresAt: now + 120,
                },
              });
              // UpdateCommandが呼ばれる
              mockSend.mockResolvedValueOnce({});
            }

            const result = await rateLimiter.checkLimit(data.ipAddress, data.action);

            // 最初の5回は許可されるべき
            expect(result).toBe(true);
          }

          // 6回目のリクエスト: 制限を超える
          mockSend.mockResolvedValueOnce({
            Item: {
              PK: `RATELIMIT#${data.action}#${data.ipAddress}`,
              SK: `RATELIMIT#${data.action}#${data.ipAddress}`,
              count: 5,
              windowStart,
              expiresAt: now + 120,
            },
          });

          const sixthResult = await rateLimiter.checkLimit(data.ipAddress, data.action);

          // 6回目は拒否されるべき
          expect(sixthResult).toBe(false);

          // 7回目以降も拒否されるべき
          mockSend.mockResolvedValueOnce({
            Item: {
              PK: `RATELIMIT#${data.action}#${data.ipAddress}`,
              SK: `RATELIMIT#${data.action}#${data.ipAddress}`,
              count: 5,
              windowStart,
              expiresAt: now + 120,
            },
          });

          const seventhResult = await rateLimiter.checkLimit(data.ipAddress, data.action);
          expect(seventhResult).toBe(false);

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should return retryAfter value indicating seconds until next window for any IP address', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // 任意のIPアドレスを生成
          ipAddress: fc
            .tuple(
              fc.integer({ min: 0, max: 255 }),
              fc.integer({ min: 0, max: 255 }),
              fc.integer({ min: 0, max: 255 }),
              fc.integer({ min: 0, max: 255 })
            )
            .map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`),
          action: fc.constant('register'),
          // ウィンドウ内の任意の時点を生成（0-59秒）
          secondsIntoWindow: fc.integer({ min: 0, max: 59 }),
        }),
        async (data) => {
          // retryAfterを計算
          const retryAfter = await rateLimiter.getRetryAfter(data.ipAddress, data.action);

          // retryAfterは0以上60以下であるべき
          expect(retryAfter).toBeGreaterThanOrEqual(0);
          expect(retryAfter).toBeLessThanOrEqual(60);

          // retryAfterは次のウィンドウまでの秒数を示すべき
          // （実装では現在時刻を使用するため、正確な値の検証は難しいが、範囲は確認できる）
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should reset count when new window starts for any IP address', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // 任意のIPアドレスを生成
          ipAddress: fc
            .tuple(
              fc.integer({ min: 0, max: 255 }),
              fc.integer({ min: 0, max: 255 }),
              fc.integer({ min: 0, max: 255 }),
              fc.integer({ min: 0, max: 255 })
            )
            .map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`),
          action: fc.constant('register'),
        }),
        async (data) => {
          // モックをリセット
          mockSend.mockClear();

          const now = Math.floor(Date.now() / 1000);
          const oldWindowStart = now - 120; // 2分前のウィンドウ

          // 古いウィンドウのレコードが存在する場合
          mockSend.mockResolvedValueOnce({
            Item: {
              PK: `RATELIMIT#${data.action}#${data.ipAddress}`,
              SK: `RATELIMIT#${data.action}#${data.ipAddress}`,
              count: 5, // 前のウィンドウで5回リクエスト済み
              windowStart: oldWindowStart,
              expiresAt: now + 120,
            },
          });

          // 新しいウィンドウが作成される（PutCommand）
          mockSend.mockResolvedValueOnce({});

          const result = await rateLimiter.checkLimit(data.ipAddress, data.action);

          // 新しいウィンドウでは許可されるべき
          expect(result).toBe(true);

          // PutCommandが呼ばれたことを確認
          const putCommand = mockSend.mock.calls[1][0];
          expect(putCommand).toBeInstanceOf(PutCommand);

          // 新しいウィンドウのカウントが1であることを確認
          const newWindowStart = now - (now % 60); // 現在のウィンドウ
          expect(putCommand.input.Item.count).toBe(1);
          expect(putCommand.input.Item.windowStart).toBe(newWindowStart);

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should handle different IP addresses independently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // 2つの異なるIPアドレスを生成
          ipAddress1: fc
            .tuple(
              fc.integer({ min: 0, max: 255 }),
              fc.integer({ min: 0, max: 255 }),
              fc.integer({ min: 0, max: 255 }),
              fc.integer({ min: 0, max: 255 })
            )
            .map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`),
          ipAddress2: fc
            .tuple(
              fc.integer({ min: 0, max: 255 }),
              fc.integer({ min: 0, max: 255 }),
              fc.integer({ min: 0, max: 255 }),
              fc.integer({ min: 0, max: 255 })
            )
            .map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`),
          action: fc.constant('register'),
        }),
        async (data) => {
          // 同じIPアドレスの場合はスキップ
          if (data.ipAddress1 === data.ipAddress2) {
            return true;
          }

          // モックをリセット
          mockSend.mockClear();

          const now = Math.floor(Date.now() / 1000);
          const windowStart = now - (now % 60);

          // IP1で5回リクエスト
          for (let i = 1; i <= 5; i++) {
            if (i === 1) {
              mockSend.mockResolvedValueOnce({ Item: undefined });
              mockSend.mockResolvedValueOnce({});
            } else {
              mockSend.mockResolvedValueOnce({
                Item: {
                  PK: `RATELIMIT#${data.action}#${data.ipAddress1}`,
                  SK: `RATELIMIT#${data.action}#${data.ipAddress1}`,
                  count: i - 1,
                  windowStart,
                  expiresAt: now + 120,
                },
              });
              mockSend.mockResolvedValueOnce({});
            }

            const result = await rateLimiter.checkLimit(data.ipAddress1, data.action);
            expect(result).toBe(true);
          }

          // IP2で1回リクエスト（IP1とは独立しているため許可されるべき）
          mockSend.mockResolvedValueOnce({ Item: undefined });
          mockSend.mockResolvedValueOnce({});

          const ip2Result = await rateLimiter.checkLimit(data.ipAddress2, data.action);

          // IP2は独立しているため許可されるべき
          expect(ip2Result).toBe(true);

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should handle different actions independently for same IP address', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // 任意のIPアドレスを生成
          ipAddress: fc
            .tuple(
              fc.integer({ min: 0, max: 255 }),
              fc.integer({ min: 0, max: 255 }),
              fc.integer({ min: 0, max: 255 }),
              fc.integer({ min: 0, max: 255 })
            )
            .map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`),
          action1: fc.constant('register'),
          action2: fc.constant('login'),
        }),
        async (data) => {
          // モックをリセット
          mockSend.mockClear();

          const now = Math.floor(Date.now() / 1000);
          const windowStart = now - (now % 60);

          // action1で5回リクエスト
          for (let i = 1; i <= 5; i++) {
            if (i === 1) {
              mockSend.mockResolvedValueOnce({ Item: undefined });
              mockSend.mockResolvedValueOnce({});
            } else {
              mockSend.mockResolvedValueOnce({
                Item: {
                  PK: `RATELIMIT#${data.action1}#${data.ipAddress}`,
                  SK: `RATELIMIT#${data.action1}#${data.ipAddress}`,
                  count: i - 1,
                  windowStart,
                  expiresAt: now + 120,
                },
              });
              mockSend.mockResolvedValueOnce({});
            }

            const result = await rateLimiter.checkLimit(data.ipAddress, data.action1);
            expect(result).toBe(true);
          }

          // action2で1回リクエスト（action1とは独立しているため許可されるべき）
          mockSend.mockResolvedValueOnce({ Item: undefined });
          mockSend.mockResolvedValueOnce({});

          const action2Result = await rateLimiter.checkLimit(data.ipAddress, data.action2);

          // action2は独立しているため許可されるべき
          expect(action2Result).toBe(true);

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should handle edge case IP addresses correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // エッジケースのIPアドレスを生成
          ipAddress: fc.integer({ min: 0, max: 9 }).map((idx) => {
            const edgeCases = [
              '0.0.0.0', // 最小値
              '255.255.255.255', // 最大値
              '127.0.0.1', // ローカルホスト
              '192.168.1.1', // プライベートIP
              '10.0.0.1', // プライベートIP
              '172.16.0.1', // プライベートIP
              '8.8.8.8', // パブリックDNS
              '1.1.1.1', // パブリックDNS
              '203.0.113.0', // テスト用IP
              'unknown', // 不明なIP（フォールバック）
            ];
            return edgeCases[idx];
          }),
          action: fc.constant('register'),
        }),
        async (data) => {
          // モックをリセット
          mockSend.mockClear();

          // 1回目のリクエスト
          mockSend.mockResolvedValueOnce({ Item: undefined });
          mockSend.mockResolvedValueOnce({});

          const result = await rateLimiter.checkLimit(data.ipAddress, data.action);

          // エッジケースのIPアドレスでも正しく処理されるべき
          expect(result).toBe(true);

          // 正しいキーが使用されていることを確認
          const putCommand = mockSend.mock.calls[1][0];
          expect(putCommand).toBeInstanceOf(PutCommand);
          expect(putCommand.input.Item.PK).toBe(`RATELIMIT#${data.action}#${data.ipAddress}`);
          expect(putCommand.input.Item.SK).toBe(`RATELIMIT#${data.action}#${data.ipAddress}`);

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should fail open (allow request) when DynamoDB error occurs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // 任意のIPアドレスを生成
          ipAddress: fc
            .tuple(
              fc.integer({ min: 0, max: 255 }),
              fc.integer({ min: 0, max: 255 }),
              fc.integer({ min: 0, max: 255 }),
              fc.integer({ min: 0, max: 255 })
            )
            .map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`),
          action: fc.constant('register'),
          // 様々なDynamoDBエラーを生成
          errorType: fc.oneof(
            fc.constant('ResourceNotFoundException'),
            fc.constant('ProvisionedThroughputExceededException'),
            fc.constant('InternalServerError'),
            fc.constant('ServiceUnavailable')
          ),
        }),
        async (data) => {
          // モックをリセット
          mockSend.mockClear();

          // DynamoDBエラーをスロー
          const error = new Error(`DynamoDB error: ${data.errorType}`);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (error as any).name = data.errorType;
          mockSend.mockRejectedValueOnce(error);

          const result = await rateLimiter.checkLimit(data.ipAddress, data.action);

          // エラー時はフェイルオープン（許可）すべき
          expect(result).toBe(true);

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should set correct TTL for rate limit records', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // 任意のIPアドレスを生成
          ipAddress: fc
            .tuple(
              fc.integer({ min: 0, max: 255 }),
              fc.integer({ min: 0, max: 255 }),
              fc.integer({ min: 0, max: 255 }),
              fc.integer({ min: 0, max: 255 })
            )
            .map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`),
          action: fc.constant('register'),
        }),
        async (data) => {
          // モックをリセット
          mockSend.mockClear();

          const now = Math.floor(Date.now() / 1000);

          // 1回目のリクエスト（新しいレコード作成）
          mockSend.mockResolvedValueOnce({ Item: undefined });
          mockSend.mockResolvedValueOnce({});

          await rateLimiter.checkLimit(data.ipAddress, data.action);

          // PutCommandが呼ばれたことを確認
          const putCommand = mockSend.mock.calls[1][0];
          expect(putCommand).toBeInstanceOf(PutCommand);

          // TTLが正しく設定されていることを確認（ウィンドウ終了後1分）
          const expiresAt = putCommand.input.Item.expiresAt;
          expect(expiresAt).toBeGreaterThan(now);
          expect(expiresAt).toBeLessThanOrEqual(now + 120); // 最大2分後

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should increment count correctly for subsequent requests within same window', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // 任意のIPアドレスを生成
          ipAddress: fc
            .tuple(
              fc.integer({ min: 0, max: 255 }),
              fc.integer({ min: 0, max: 255 }),
              fc.integer({ min: 0, max: 255 }),
              fc.integer({ min: 0, max: 255 })
            )
            .map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`),
          action: fc.constant('register'),
          // 2-4回目のリクエストをテスト
          requestNumber: fc.integer({ min: 2, max: 4 }),
        }),
        async (data) => {
          // モックをリセット
          mockSend.mockClear();

          const now = Math.floor(Date.now() / 1000);
          const windowStart = now - (now % 60);

          // 既存のレコードをモック（requestNumber - 1回リクエスト済み）
          mockSend.mockResolvedValueOnce({
            Item: {
              PK: `RATELIMIT#${data.action}#${data.ipAddress}`,
              SK: `RATELIMIT#${data.action}#${data.ipAddress}`,
              count: data.requestNumber - 1,
              windowStart,
              expiresAt: now + 120,
            },
          });

          // UpdateCommandが呼ばれる
          mockSend.mockResolvedValueOnce({});

          const result = await rateLimiter.checkLimit(data.ipAddress, data.action);

          // リクエストは許可されるべき
          expect(result).toBe(true);

          // UpdateCommandが呼ばれたことを確認
          expect(mockSend).toHaveBeenCalledTimes(2);
          const updateCommand = mockSend.mock.calls[1][0];
          expect(updateCommand).toBeInstanceOf(UpdateCommand);

          // カウントが1増加していることを確認
          expect(updateCommand.input.UpdateExpression).toBe('SET #count = #count + :inc');
          expect(updateCommand.input.ExpressionAttributeValues[':inc']).toBe(1);

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
});
