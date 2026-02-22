import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { UserRepository } from './user.js';
import { PutCommand } from '@aws-sdk/lib-dynamodb';

// DynamoDBクライアントをモック
vi.mock('../../dynamodb.js', () => ({
  docClient: {
    send: vi.fn(),
  },
  TABLE_NAME: 'test-table',
}));

// モックされたdocClientを取得
import { docClient } from '../../dynamodb.js';
const mockSend = docClient.send as ReturnType<typeof vi.fn>;

/**
 * Feature: user-registration-api
 * Property 8: DynamoDBユーザーレコード作成
 *
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
 *
 * 任意の有効な登録リクエストに対して、Cognitoユーザーの作成が成功した場合、
 * APIはDynamoDBに以下のフィールドを含むユーザーレコードを作成すべきです:
 * - PK: `USER#<userId>`
 * - SK: `USER#<userId>`
 * - userId（CognitoからのUUID）
 * - email
 * - username
 * - createdAt（ISO 8601形式）
 * - updatedAt（ISO 8601形式）
 * - entityType: `USER`
 */
describe('Property 8: DynamoDB user record creation', () => {
  let repository: UserRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new UserRepository();
  });

  // UUIDジェネレーター（簡易版）
  const uuidGenerator = fc.uuid();

  // 有効なメールアドレスジェネレーター
  const validEmailGenerator = fc.emailAddress();

  // 有効なユーザー名ジェネレーター（3-20文字、英数字・ハイフン・アンダースコア）
  const validUsernameGenerator = fc
    .string({ minLength: 3, maxLength: 20 })
    .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s));

  it('should create user records with all required fields for any valid registration request', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: uuidGenerator,
          email: validEmailGenerator,
          username: validUsernameGenerator,
        }),
        async (params) => {
          // Arrange
          vi.clearAllMocks(); // モックをクリア
          mockSend.mockResolvedValueOnce({});

          // Act
          const result = await repository.create(params);

          // Assert: すべての必須フィールドが存在することを確認
          expect(result).toBeDefined();
          expect(result.PK).toBe(`USER#${params.userId}`);
          expect(result.SK).toBe(`USER#${params.userId}`);
          expect(result.userId).toBe(params.userId);
          expect(result.email).toBe(params.email);
          expect(result.username).toBe(params.username);
          expect(result.entityType).toBe('USER');
          expect(result.createdAt).toBeDefined();
          expect(result.updatedAt).toBeDefined();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should create PK and SK in the correct format: USER#<userId>', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: uuidGenerator,
          email: validEmailGenerator,
          username: validUsernameGenerator,
        }),
        async (params) => {
          // Arrange
          vi.clearAllMocks(); // モックをクリア
          mockSend.mockResolvedValueOnce({});

          // Act
          const result = await repository.create(params);

          // Assert: PK/SK形式の検証
          expect(result.PK).toMatch(/^USER#[a-f0-9-]+$/);
          expect(result.SK).toMatch(/^USER#[a-f0-9-]+$/);
          expect(result.PK).toBe(result.SK); // PKとSKは同じ値

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should create createdAt and updatedAt in ISO 8601 format', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: uuidGenerator,
          email: validEmailGenerator,
          username: validUsernameGenerator,
        }),
        async (params) => {
          // Arrange
          vi.clearAllMocks(); // モックをクリア
          mockSend.mockResolvedValueOnce({});

          // Act
          const result = await repository.create(params);

          // Assert: ISO 8601形式の検証
          const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
          expect(result.createdAt).toMatch(iso8601Regex);
          expect(result.updatedAt).toMatch(iso8601Regex);

          // createdAtとupdatedAtは同じ値（作成時）
          expect(result.createdAt).toBe(result.updatedAt);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should set entityType to "USER" for all user records', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: uuidGenerator,
          email: validEmailGenerator,
          username: validUsernameGenerator,
        }),
        async (params) => {
          // Arrange
          vi.clearAllMocks(); // モックをクリア
          mockSend.mockResolvedValueOnce({});

          // Act
          const result = await repository.create(params);

          // Assert: entityTypeの検証
          expect(result.entityType).toBe('USER');

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should send PutCommand with correct parameters to DynamoDB', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: uuidGenerator,
          email: validEmailGenerator,
          username: validUsernameGenerator,
        }),
        async (params) => {
          // Arrange
          vi.clearAllMocks(); // モックをクリア
          mockSend.mockResolvedValueOnce({});

          // Act
          const result = await repository.create(params);

          // Assert: DynamoDBクライアントが正しく呼ばれたことを確認
          // 最後の呼び出しを取得
          const lastCall = mockSend.mock.lastCall;
          expect(lastCall).toBeDefined();

          const putCommand = lastCall![0];
          expect(putCommand).toBeInstanceOf(PutCommand);
          expect(putCommand.input.TableName).toBe('test-table');
          expect(putCommand.input.ConditionExpression).toBe('attribute_not_exists(PK)');

          // 返り値を検証（Itemの内容は返り値で確認）
          expect(result.PK).toBe(`USER#${params.userId}`);
          expect(result.SK).toBe(`USER#${params.userId}`);
          expect(result.userId).toBe(params.userId);
          expect(result.email).toBe(params.email);
          expect(result.username).toBe(params.username);
          expect(result.entityType).toBe('USER');

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should preserve email format exactly as provided', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: uuidGenerator,
          email: validEmailGenerator,
          username: validUsernameGenerator,
        }),
        async (params) => {
          // Arrange
          vi.clearAllMocks(); // モックをクリア
          mockSend.mockResolvedValueOnce({});

          // Act
          const result = await repository.create(params);

          // Assert: メールアドレスが変更されていないことを確認
          expect(result.email).toBe(params.email);
          expect(result.email).not.toBe('');
          expect(result.email).toContain('@');

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should preserve username exactly as provided', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: uuidGenerator,
          email: validEmailGenerator,
          username: validUsernameGenerator,
        }),
        async (params) => {
          // Arrange
          vi.clearAllMocks(); // モックをクリア
          mockSend.mockResolvedValueOnce({});

          // Act
          const result = await repository.create(params);

          // Assert: ユーザー名が変更されていないことを確認
          expect(result.username).toBe(params.username);
          expect(result.username.length).toBeGreaterThanOrEqual(3);
          expect(result.username.length).toBeLessThanOrEqual(20);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should create unique records for different userIds', () => {
    fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.record({
            userId: uuidGenerator,
            email: validEmailGenerator,
            username: validUsernameGenerator,
          }),
          fc.record({
            userId: uuidGenerator,
            email: validEmailGenerator,
            username: validUsernameGenerator,
          })
        ),
        async ([params1, params2]) => {
          // 異なるuserIdの場合のみテスト
          if (params1.userId === params2.userId) {
            return true; // スキップ
          }

          // Arrange
          vi.clearAllMocks(); // モックをクリア
          mockSend.mockResolvedValueOnce({});
          mockSend.mockResolvedValueOnce({});

          // Act
          const result1 = await repository.create(params1);
          const result2 = await repository.create(params2);

          // Assert: 異なるPK/SKを持つことを確認
          expect(result1.PK).not.toBe(result2.PK);
          expect(result1.SK).not.toBe(result2.SK);
          expect(result1.userId).not.toBe(result2.userId);

          return true;
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should handle various valid email formats', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: uuidGenerator,
          // さまざまなメール形式を生成
          email: fc.oneof(
            fc.emailAddress(),
            fc
              .tuple(
                fc.stringMatching(/^[a-z0-9]+$/),
                fc.stringMatching(/^[a-z0-9]+$/),
                fc.constantFrom('com', 'org', 'net', 'jp', 'co.jp')
              )
              .map(([local, domain, tld]) => `${local}@${domain}.${tld}`),
            fc
              .tuple(fc.stringMatching(/^[a-z0-9.]+$/), fc.stringMatching(/^[a-z0-9]+$/))
              .map(([local, domain]) => `${local}@${domain}.example.com`)
          ),
          username: validUsernameGenerator,
        }),
        async (params) => {
          // Arrange
          vi.clearAllMocks(); // モックをクリア
          mockSend.mockResolvedValueOnce({});

          // Act
          const result = await repository.create(params);

          // Assert: メールアドレスが正しく保存されることを確認
          expect(result.email).toBe(params.email);
          expect(result.email).toContain('@');

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle various valid username formats', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: uuidGenerator,
          email: validEmailGenerator,
          // さまざまなユーザー名形式を生成
          username: fc.oneof(
            fc.constant('user123'),
            fc.constant('test-user'),
            fc.constant('my_username'),
            fc.constant('user-name_123'),
            fc.constant('ABC'),
            fc.constant('a'.repeat(20)), // 最大長
            fc.constant('abc'), // 最小長
            fc.stringMatching(/^[a-zA-Z0-9_-]{3,20}$/)
          ),
        }),
        async (params) => {
          // Arrange
          vi.clearAllMocks(); // モックをクリア
          mockSend.mockResolvedValueOnce({});

          // Act
          const result = await repository.create(params);

          // Assert: ユーザー名が正しく保存されることを確認
          expect(result.username).toBe(params.username);
          expect(result.username.length).toBeGreaterThanOrEqual(3);
          expect(result.username.length).toBeLessThanOrEqual(20);
          expect(result.username).toMatch(/^[a-zA-Z0-9_-]+$/);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});
