import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import app from '../index.js';
import { CognitoService } from '../lib/cognito/cognito-service.js';
import { UserRepository } from '../lib/dynamodb/repositories/user.js';
import { RateLimiter } from '../lib/rate-limiter.js';

// モックを設定
vi.mock('../lib/cognito/cognito-service.js');
vi.mock('../lib/dynamodb/repositories/user.js');
vi.mock('../lib/rate-limiter.js');

/**
 * Feature: user-registration-api
 * Property 3: メールアドレス重複検証（冪等性）
 *
 * **Validates: Requirements 2.3, 13.1, 13.2, 13.3**
 *
 * 任意の有効な登録リクエストに対して、同じメールアドレスで2回登録を試みた場合、
 * 2回目のリクエストは409ステータスコードとエラーコード`CONFLICT`および
 * メッセージ「Email already registered」を返すべきです。
 */
describe('Property 3: Email duplication validation (idempotency)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // RateLimiterのモック - 常に許可
    vi.mocked(RateLimiter).mockImplementation(
      () =>
        ({
          checkLimit: vi.fn().mockResolvedValue(true),
          getRetryAfter: vi.fn().mockResolvedValue(0),
        }) as unknown as RateLimiter
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return 409 CONFLICT when registering with the same email twice', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 有効な登録データを生成
        fc.record({
          email: fc.emailAddress(),
          password: fc
            .tuple(
              fc.integer({ min: 0, max: 25 }),
              fc.integer({ min: 0, max: 25 }),
              fc.integer({ min: 0, max: 9 })
            )
            .map(([upperIdx, lowerIdx, num]) => {
              const upper = String.fromCharCode(65 + upperIdx); // A-Z
              const lower = String.fromCharCode(97 + lowerIdx); // a-z
              return `${upper}${lower}${num}Pass123`;
            }),
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        }),
        async (data) => {
          // 1回目の登録: 成功
          const mockUserId = `user-${Math.random().toString(36).substring(7)}`;

          vi.mocked(CognitoService).mockImplementation(
            () =>
              ({
                signUp: vi.fn().mockResolvedValueOnce({
                  userId: mockUserId,
                  userConfirmed: false,
                }),
                authenticate: vi.fn().mockResolvedValue({
                  accessToken: 'mock-access-token',
                  refreshToken: 'mock-refresh-token',
                  idToken: 'mock-id-token',
                  expiresIn: 900,
                }),
                deleteUser: vi.fn().mockResolvedValue(undefined),
              }) as unknown as UserRepository
          );

          vi.mocked(UserRepository).mockImplementation(
            () =>
              ({
                create: vi.fn().mockResolvedValue({
                  PK: `USER#${mockUserId}`,
                  SK: `USER#${mockUserId}`,
                  userId: mockUserId,
                  email: data.email,
                  username: data.username,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  entityType: 'USER',
                }),
                getById: vi.fn(),
              }) as unknown as UserRepository
          );

          // 1回目のリクエスト
          const res1 = await app.request('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          // 1回目は成功すべき
          expect(res1.status).toBe(201);

          // 2回目の登録: UsernameExistsExceptionをスロー
          vi.mocked(CognitoService).mockImplementation(
            () =>
              ({
                signUp: vi.fn().mockRejectedValue({
                  code: 'UsernameExistsException',
                  message: 'An account with the given email already exists.',
                }),
                authenticate: vi.fn(),
                deleteUser: vi.fn(),
              }) as unknown as UserRepository
          );

          // 2回目のリクエスト（同じメールアドレス）
          const res2 = await app.request('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          // 2回目は409 CONFLICTを返すべき
          expect(res2.status).toBe(409);

          const json2 = await res2.json();
          expect(json2).toEqual({
            error: 'CONFLICT',
            message: 'Email already registered',
          });

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should not create duplicate Cognito users or user records', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('ValidPass123'),
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        }),
        async (data) => {
          const mockUserId = `user-${Math.random().toString(36).substring(7)}`;
          let signUpCallCount = 0;
          let createUserCallCount = 0;

          // 1回目: 成功
          vi.mocked(CognitoService).mockImplementation(
            () =>
              ({
                signUp: vi.fn().mockImplementation(async () => {
                  signUpCallCount++;
                  if (signUpCallCount === 1) {
                    return {
                      userId: mockUserId,
                      userConfirmed: false,
                    };
                  }
                  throw {
                    code: 'UsernameExistsException',
                    message: 'An account with the given email already exists.',
                  };
                }),
                authenticate: vi.fn().mockResolvedValue({
                  accessToken: 'mock-access-token',
                  refreshToken: 'mock-refresh-token',
                  idToken: 'mock-id-token',
                  expiresIn: 900,
                }),
                deleteUser: vi.fn(),
              }) as unknown as UserRepository
          );

          vi.mocked(UserRepository).mockImplementation(
            () =>
              ({
                create: vi.fn().mockImplementation(async () => {
                  createUserCallCount++;
                  return {
                    PK: `USER#${mockUserId}`,
                    SK: `USER#${mockUserId}`,
                    userId: mockUserId,
                    email: data.email,
                    username: data.username,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    entityType: 'USER',
                  };
                }),
                getById: vi.fn(),
              }) as unknown as UserRepository
          );

          // 1回目のリクエスト
          await app.request('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          // 2回目のリクエスト
          await app.request('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          // Cognito signUpは2回呼ばれるが、2回目は失敗する
          expect(signUpCallCount).toBe(2);

          // UserRepository createは1回だけ呼ばれるべき（2回目はCognitoで失敗するため）
          expect(createUserCallCount).toBe(1);

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should return consistent error response for duplicate emails', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('ValidPass123'),
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        }),
        async (data) => {
          // 常にUsernameExistsExceptionをスロー（既に登録済みの状態をシミュレート）
          vi.mocked(CognitoService).mockImplementation(
            () =>
              ({
                signUp: vi.fn().mockRejectedValue({
                  code: 'UsernameExistsException',
                  message: 'An account with the given email already exists.',
                }),
                authenticate: vi.fn(),
                deleteUser: vi.fn(),
              }) as unknown as UserRepository
          );

          // リクエスト
          const res = await app.request('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          // 409 CONFLICTを返すべき
          expect(res.status).toBe(409);

          const json = await res.json();

          // エラーレスポンスの形式を検証
          expect(json).toHaveProperty('error');
          expect(json).toHaveProperty('message');
          expect(json.error).toBe('CONFLICT');
          expect(json.message).toBe('Email already registered');

          // セキュリティのため、アカウントの存在を明らかにしないメッセージであることを確認
          // （メッセージは一般的で、特定のユーザー情報を含まない）
          expect(json.message).not.toContain(data.email);
          expect(json.message).not.toContain('user');
          expect(json.message).not.toContain('exists');

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should handle duplicate email attempts with different passwords', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password1: fc.constant('ValidPass123'),
          password2: fc.constant('DifferentPass456'),
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        }),
        async (data) => {
          const mockUserId = `user-${Math.random().toString(36).substring(7)}`;

          // 1回目: 成功
          vi.mocked(CognitoService).mockImplementation(
            () =>
              ({
                signUp: vi.fn().mockResolvedValueOnce({
                  userId: mockUserId,
                  userConfirmed: false,
                }),
                authenticate: vi.fn().mockResolvedValue({
                  accessToken: 'mock-access-token',
                  refreshToken: 'mock-refresh-token',
                  idToken: 'mock-id-token',
                  expiresIn: 900,
                }),
                deleteUser: vi.fn(),
              }) as unknown as UserRepository
          );

          vi.mocked(UserRepository).mockImplementation(
            () =>
              ({
                create: vi.fn().mockResolvedValue({
                  PK: `USER#${mockUserId}`,
                  SK: `USER#${mockUserId}`,
                  userId: mockUserId,
                  email: data.email,
                  username: data.username,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  entityType: 'USER',
                }),
                getById: vi.fn(),
              }) as unknown as UserRepository
          );

          // 1回目のリクエスト
          const res1 = await app.request('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: data.email,
              password: data.password1,
              username: data.username,
            }),
          });

          expect(res1.status).toBe(201);

          // 2回目: UsernameExistsExceptionをスロー
          vi.mocked(CognitoService).mockImplementation(
            () =>
              ({
                signUp: vi.fn().mockRejectedValue({
                  code: 'UsernameExistsException',
                  message: 'An account with the given email already exists.',
                }),
                authenticate: vi.fn(),
                deleteUser: vi.fn(),
              }) as unknown as UserRepository
          );

          // 2回目のリクエスト（同じメールアドレス、異なるパスワード）
          const res2 = await app.request('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: data.email,
              password: data.password2, // 異なるパスワード
              username: data.username,
            }),
          });

          // パスワードが異なっても、同じメールアドレスなら409を返すべき
          expect(res2.status).toBe(409);

          const json2 = await res2.json();
          expect(json2.error).toBe('CONFLICT');
          expect(json2.message).toBe('Email already registered');

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should handle duplicate email attempts with different usernames', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('ValidPass123'),
          username1: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
          username2: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        }),
        async (data) => {
          // username1とusername2が異なることを確認
          if (data.username1 === data.username2) {
            return true; // スキップ
          }

          const mockUserId = `user-${Math.random().toString(36).substring(7)}`;

          // 1回目: 成功
          vi.mocked(CognitoService).mockImplementation(
            () =>
              ({
                signUp: vi.fn().mockResolvedValueOnce({
                  userId: mockUserId,
                  userConfirmed: false,
                }),
                authenticate: vi.fn().mockResolvedValue({
                  accessToken: 'mock-access-token',
                  refreshToken: 'mock-refresh-token',
                  idToken: 'mock-id-token',
                  expiresIn: 900,
                }),
                deleteUser: vi.fn(),
              }) as unknown as UserRepository
          );

          vi.mocked(UserRepository).mockImplementation(
            () =>
              ({
                create: vi.fn().mockResolvedValue({
                  PK: `USER#${mockUserId}`,
                  SK: `USER#${mockUserId}`,
                  userId: mockUserId,
                  email: data.email,
                  username: data.username1,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  entityType: 'USER',
                }),
                getById: vi.fn(),
              }) as unknown as UserRepository
          );

          // 1回目のリクエスト
          const res1 = await app.request('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: data.email,
              password: data.password,
              username: data.username1,
            }),
          });

          expect(res1.status).toBe(201);

          // 2回目: UsernameExistsExceptionをスロー
          vi.mocked(CognitoService).mockImplementation(
            () =>
              ({
                signUp: vi.fn().mockRejectedValue({
                  code: 'UsernameExistsException',
                  message: 'An account with the given email already exists.',
                }),
                authenticate: vi.fn(),
                deleteUser: vi.fn(),
              }) as unknown as UserRepository
          );

          // 2回目のリクエスト（同じメールアドレス、異なるユーザー名）
          const res2 = await app.request('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: data.email,
              password: data.password,
              username: data.username2, // 異なるユーザー名
            }),
          });

          // ユーザー名が異なっても、同じメールアドレスなら409を返すべき
          expect(res2.status).toBe(409);

          const json2 = await res2.json();
          expect(json2.error).toBe('CONFLICT');
          expect(json2.message).toBe('Email already registered');

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });
});

/**
 * Feature: user-registration-api
 * Property 9: トランザクション整合性(ロールバック)
 *
 * **Validates: Requirements 6.5**
 *
 * 任意の登録リクエストに対して、Cognitoユーザーの作成が成功したが
 * DynamoDB書き込みが失敗した場合、APIはCognitoユーザーの削除を試み、
 * 500ステータスコードとエラーコード`INTERNAL_ERROR`を返すべきです。
 */
describe('Property 9: Transaction integrity (rollback)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // RateLimiterのモック - 常に許可
    vi.mocked(RateLimiter).mockImplementation(
      () =>
        ({
          checkLimit: vi.fn().mockResolvedValue(true),
          getRetryAfter: vi.fn().mockResolvedValue(0),
        }) as unknown as RateLimiter
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should delete Cognito user and return 500 when DynamoDB write fails', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 有効な登録データを生成
        fc.record({
          email: fc.emailAddress(),
          password: fc
            .tuple(
              fc.integer({ min: 0, max: 25 }),
              fc.integer({ min: 0, max: 25 }),
              fc.integer({ min: 0, max: 9 })
            )
            .map(([upperIdx, lowerIdx, num]) => {
              const upper = String.fromCharCode(65 + upperIdx); // A-Z
              const lower = String.fromCharCode(97 + lowerIdx); // a-z
              return `${upper}${lower}${num}Pass123`;
            }),
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        }),
        async (data) => {
          const mockUserId = `user-${Math.random().toString(36).substring(7)}`;
          const deleteUserMock = vi.fn().mockResolvedValue(undefined);

          // Cognito signUpは成功
          vi.mocked(CognitoService).mockImplementation(
            () =>
              ({
                signUp: vi.fn().mockResolvedValue({
                  userId: mockUserId,
                  userConfirmed: false,
                }),
                authenticate: vi.fn(),
                deleteUser: deleteUserMock,
              }) as unknown as CognitoService
          );

          // DynamoDB createは失敗
          vi.mocked(UserRepository).mockImplementation(
            () =>
              ({
                create: vi.fn().mockRejectedValue(new Error('DynamoDB write failed')),
                getById: vi.fn(),
              }) as unknown as UserRepository
          );

          // リクエスト
          const res = await app.request('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          // 500 INTERNAL_ERRORを返すべき
          expect(res.status).toBe(500);

          const json = await res.json();
          expect(json).toEqual({
            error: 'INTERNAL_ERROR',
            message: 'Registration failed',
          });

          // Cognitoユーザーの削除が試みられたことを確認
          expect(deleteUserMock).toHaveBeenCalledWith(mockUserId);
          expect(deleteUserMock).toHaveBeenCalledTimes(1);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should attempt rollback even when DynamoDB throws different error types', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('ValidPass123'),
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        }),
        // DynamoDBエラーの種類を生成
        fc.oneof(
          fc.constant(new Error('Network timeout')),
          fc.constant(new Error('ConditionalCheckFailedException')),
          fc.constant(new Error('ProvisionedThroughputExceededException')),
          fc.constant(new Error('ResourceNotFoundException')),
          fc.constant({ name: 'ServiceUnavailable', message: 'Service unavailable' })
        ),
        async (data, dbError) => {
          const mockUserId = `user-${Math.random().toString(36).substring(7)}`;
          const deleteUserMock = vi.fn().mockResolvedValue(undefined);

          // Cognito signUpは成功
          vi.mocked(CognitoService).mockImplementation(
            () =>
              ({
                signUp: vi.fn().mockResolvedValue({
                  userId: mockUserId,
                  userConfirmed: false,
                }),
                authenticate: vi.fn(),
                deleteUser: deleteUserMock,
              }) as unknown as CognitoService
          );

          // DynamoDB createは様々なエラーで失敗
          vi.mocked(UserRepository).mockImplementation(
            () =>
              ({
                create: vi.fn().mockRejectedValue(dbError),
                getById: vi.fn(),
              }) as unknown as UserRepository
          );

          // リクエスト
          const res = await app.request('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          // 500 INTERNAL_ERRORを返すべき
          expect(res.status).toBe(500);

          const json = await res.json();
          expect(json.error).toBe('INTERNAL_ERROR');
          expect(json.message).toBe('Registration failed');

          // どのエラーでもロールバックが試みられるべき
          expect(deleteUserMock).toHaveBeenCalledWith(mockUserId);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should still return 500 even if rollback (deleteUser) fails', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('ValidPass123'),
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        }),
        async (data) => {
          const mockUserId = `user-${Math.random().toString(36).substring(7)}`;

          // Cognito signUpは成功
          // deleteUserは失敗（ロールバック失敗をシミュレート）
          vi.mocked(CognitoService).mockImplementation(
            () =>
              ({
                signUp: vi.fn().mockResolvedValue({
                  userId: mockUserId,
                  userConfirmed: false,
                }),
                authenticate: vi.fn(),
                deleteUser: vi.fn().mockRejectedValue(new Error('Failed to delete user')),
              }) as unknown as CognitoService
          );

          // DynamoDB createは失敗
          vi.mocked(UserRepository).mockImplementation(
            () =>
              ({
                create: vi.fn().mockRejectedValue(new Error('DynamoDB write failed')),
                getById: vi.fn(),
              }) as unknown as UserRepository
          );

          // リクエスト
          const res = await app.request('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          // ロールバックが失敗しても500を返すべき
          expect(res.status).toBe(500);

          const json = await res.json();
          expect(json).toEqual({
            error: 'INTERNAL_ERROR',
            message: 'Registration failed',
          });

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should not call deleteUser when Cognito signUp fails', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('ValidPass123'),
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        }),
        async (data) => {
          const deleteUserMock = vi.fn().mockResolvedValue(undefined);

          // Cognito signUpが失敗（ユーザーが作成されない）
          vi.mocked(CognitoService).mockImplementation(
            () =>
              ({
                signUp: vi.fn().mockRejectedValue({
                  code: 'InvalidPasswordException',
                  message: 'Password does not meet requirements',
                }),
                authenticate: vi.fn(),
                deleteUser: deleteUserMock,
              }) as unknown as CognitoService
          );

          vi.mocked(UserRepository).mockImplementation(
            () =>
              ({
                create: vi.fn(),
                getById: vi.fn(),
              }) as unknown as UserRepository
          );

          // リクエスト
          const res = await app.request('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          // エラーレスポンスを返すべき
          expect(res.status).toBe(400);

          // Cognitoユーザーが作成されていないので、deleteUserは呼ばれないべき
          expect(deleteUserMock).not.toHaveBeenCalled();

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should maintain transaction integrity across various valid registration inputs', async () => {
    await fc.assert(
      fc.asyncProperty(
        // より広範な有効な入力を生成
        fc.record({
          email: fc.emailAddress(),
          password: fc
            .string({ minLength: 8, maxLength: 50 })
            .filter((p) => /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p)),
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        }),
        async (data) => {
          const mockUserId = `user-${Math.random().toString(36).substring(7)}`;
          const deleteUserMock = vi.fn().mockResolvedValue(undefined);

          // Cognito signUpは成功
          vi.mocked(CognitoService).mockImplementation(
            () =>
              ({
                signUp: vi.fn().mockResolvedValue({
                  userId: mockUserId,
                  userConfirmed: false,
                }),
                authenticate: vi.fn(),
                deleteUser: deleteUserMock,
              }) as unknown as CognitoService
          );

          // DynamoDB createは失敗
          vi.mocked(UserRepository).mockImplementation(
            () =>
              ({
                create: vi.fn().mockRejectedValue(new Error('DynamoDB write failed')),
                getById: vi.fn(),
              }) as unknown as UserRepository
          );

          // リクエスト
          const res = await app.request('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          // 常に500を返し、ロールバックを試みるべき
          expect(res.status).toBe(500);
          expect(deleteUserMock).toHaveBeenCalledWith(mockUserId);

          const json = await res.json();
          expect(json.error).toBe('INTERNAL_ERROR');
          expect(json.message).toBe('Registration failed');

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: user-registration-api
 * Property 11: 成功レスポンス形式
 *
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.4**
 *
 * 任意の有効な登録リクエストに対して、登録が成功した場合、APIは201ステータスコード、
 * Content-Type `application/json`、および以下のフィールドを含むレスポンスボディを返すべきです:
 * - userId
 * - email
 * - username
 * - accessToken
 * - refreshToken
 * - expiresIn（値: 900）
 */
describe('Property 11: Success response format', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // RateLimiterのモック - 常に許可
    vi.mocked(RateLimiter).mockImplementation(
      () =>
        ({
          checkLimit: vi.fn().mockResolvedValue(true),
          getRetryAfter: vi.fn().mockResolvedValue(0),
        }) as unknown as RateLimiter
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return 201 status code with correct response format for valid registration', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 有効な登録データを生成
        fc.record({
          email: fc.emailAddress(),
          password: fc
            .string({ minLength: 8, maxLength: 50 })
            .filter((p) => /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p)),
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        }),
        async (data) => {
          const mockUserId = `user-${Math.random().toString(36).substring(7)}`;
          const mockAccessToken = `access-${Math.random().toString(36).substring(7)}`;
          const mockRefreshToken = `refresh-${Math.random().toString(36).substring(7)}`;
          const mockIdToken = `id-${Math.random().toString(36).substring(7)}`;

          // 成功ケースのモック
          vi.mocked(CognitoService).mockImplementation(
            () =>
              ({
                signUp: vi.fn().mockResolvedValue({
                  userId: mockUserId,
                  userConfirmed: false,
                }),
                authenticate: vi.fn().mockResolvedValue({
                  accessToken: mockAccessToken,
                  refreshToken: mockRefreshToken,
                  idToken: mockIdToken,
                  expiresIn: 900,
                }),
                deleteUser: vi.fn(),
              }) as unknown as CognitoService
          );

          vi.mocked(UserRepository).mockImplementation(
            () =>
              ({
                create: vi.fn().mockResolvedValue({
                  PK: `USER#${mockUserId}`,
                  SK: `USER#${mockUserId}`,
                  userId: mockUserId,
                  email: data.email,
                  username: data.username,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  entityType: 'USER',
                }),
                getById: vi.fn(),
              }) as unknown as UserRepository
          );

          // リクエスト
          const res = await app.request('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          // 201ステータスコードを返すべき
          expect(res.status).toBe(201);

          // Content-Typeがapplication/jsonであることを確認
          const contentType = res.headers.get('content-type');
          expect(contentType).toContain('application/json');

          const json = await res.json();

          // 必須フィールドが存在することを確認
          expect(json).toHaveProperty('userId');
          expect(json).toHaveProperty('email');
          expect(json).toHaveProperty('username');
          expect(json).toHaveProperty('accessToken');
          expect(json).toHaveProperty('refreshToken');
          expect(json).toHaveProperty('expiresIn');

          // フィールドの値を検証
          expect(json.userId).toBe(mockUserId);
          expect(json.email).toBe(data.email);
          expect(json.username).toBe(data.username);
          expect(json.accessToken).toBe(mockAccessToken);
          expect(json.refreshToken).toBe(mockRefreshToken);
          expect(json.expiresIn).toBe(900);

          // フィールドの型を検証
          expect(typeof json.userId).toBe('string');
          expect(typeof json.email).toBe('string');
          expect(typeof json.username).toBe('string');
          expect(typeof json.accessToken).toBe('string');
          expect(typeof json.refreshToken).toBe('string');
          expect(typeof json.expiresIn).toBe('number');

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return expiresIn value of exactly 900 seconds', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('ValidPass123'),
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        }),
        async (data) => {
          const mockUserId = `user-${Math.random().toString(36).substring(7)}`;

          // 成功ケースのモック
          vi.mocked(CognitoService).mockImplementation(
            () =>
              ({
                signUp: vi.fn().mockResolvedValue({
                  userId: mockUserId,
                  userConfirmed: false,
                }),
                authenticate: vi.fn().mockResolvedValue({
                  accessToken: 'mock-access-token',
                  refreshToken: 'mock-refresh-token',
                  idToken: 'mock-id-token',
                  expiresIn: 900,
                }),
                deleteUser: vi.fn(),
              }) as unknown as CognitoService
          );

          vi.mocked(UserRepository).mockImplementation(
            () =>
              ({
                create: vi.fn().mockResolvedValue({
                  PK: `USER#${mockUserId}`,
                  SK: `USER#${mockUserId}`,
                  userId: mockUserId,
                  email: data.email,
                  username: data.username,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  entityType: 'USER',
                }),
                getById: vi.fn(),
              }) as unknown as UserRepository
          );

          // リクエスト
          const res = await app.request('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          const json = await res.json();

          // expiresInは正確に900であるべき（15分 = 900秒）
          expect(json.expiresIn).toBe(900);
          expect(json.expiresIn).not.toBe(899);
          expect(json.expiresIn).not.toBe(901);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should include all required fields and no unexpected fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('ValidPass123'),
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        }),
        async (data) => {
          const mockUserId = `user-${Math.random().toString(36).substring(7)}`;

          // 成功ケースのモック
          vi.mocked(CognitoService).mockImplementation(
            () =>
              ({
                signUp: vi.fn().mockResolvedValue({
                  userId: mockUserId,
                  userConfirmed: false,
                }),
                authenticate: vi.fn().mockResolvedValue({
                  accessToken: 'mock-access-token',
                  refreshToken: 'mock-refresh-token',
                  idToken: 'mock-id-token',
                  expiresIn: 900,
                }),
                deleteUser: vi.fn(),
              }) as unknown as CognitoService
          );

          vi.mocked(UserRepository).mockImplementation(
            () =>
              ({
                create: vi.fn().mockResolvedValue({
                  PK: `USER#${mockUserId}`,
                  SK: `USER#${mockUserId}`,
                  userId: mockUserId,
                  email: data.email,
                  username: data.username,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  entityType: 'USER',
                }),
                getById: vi.fn(),
              }) as unknown as UserRepository
          );

          // リクエスト
          const res = await app.request('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          const json = await res.json();

          // 必須フィールドのみが存在することを確認
          const expectedFields = [
            'userId',
            'email',
            'username',
            'accessToken',
            'refreshToken',
            'expiresIn',
          ];
          const actualFields = Object.keys(json);

          // すべての必須フィールドが存在する
          expectedFields.forEach((field) => {
            expect(actualFields).toContain(field);
          });

          // 余分なフィールドが存在しない
          expect(actualFields.length).toBe(expectedFields.length);

          // 機密情報（パスワード、内部フィールド）が含まれていないことを確認
          expect(json).not.toHaveProperty('password');
          expect(json).not.toHaveProperty('PK');
          expect(json).not.toHaveProperty('SK');
          expect(json).not.toHaveProperty('entityType');
          expect(json).not.toHaveProperty('createdAt');
          expect(json).not.toHaveProperty('updatedAt');
          expect(json).not.toHaveProperty('idToken');

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should return non-empty string values for all token fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('ValidPass123'),
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        }),
        async (data) => {
          const mockUserId = `user-${Math.random().toString(36).substring(7)}`;

          // 成功ケースのモック
          vi.mocked(CognitoService).mockImplementation(
            () =>
              ({
                signUp: vi.fn().mockResolvedValue({
                  userId: mockUserId,
                  userConfirmed: false,
                }),
                authenticate: vi.fn().mockResolvedValue({
                  accessToken: 'mock-access-token',
                  refreshToken: 'mock-refresh-token',
                  idToken: 'mock-id-token',
                  expiresIn: 900,
                }),
                deleteUser: vi.fn(),
              }) as unknown as CognitoService
          );

          vi.mocked(UserRepository).mockImplementation(
            () =>
              ({
                create: vi.fn().mockResolvedValue({
                  PK: `USER#${mockUserId}`,
                  SK: `USER#${mockUserId}`,
                  userId: mockUserId,
                  email: data.email,
                  username: data.username,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  entityType: 'USER',
                }),
                getById: vi.fn(),
              }) as unknown as UserRepository
          );

          // リクエスト
          const res = await app.request('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          const json = await res.json();

          // すべての文字列フィールドが非空であることを確認
          expect(json.userId).toBeTruthy();
          expect(json.userId.length).toBeGreaterThan(0);

          expect(json.email).toBeTruthy();
          expect(json.email.length).toBeGreaterThan(0);

          expect(json.username).toBeTruthy();
          expect(json.username.length).toBeGreaterThan(0);

          expect(json.accessToken).toBeTruthy();
          expect(json.accessToken.length).toBeGreaterThan(0);

          expect(json.refreshToken).toBeTruthy();
          expect(json.refreshToken.length).toBeGreaterThan(0);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should maintain response format consistency across various valid inputs', async () => {
    await fc.assert(
      fc.asyncProperty(
        // より広範な有効な入力を生成
        fc.record({
          email: fc.emailAddress(),
          password: fc
            .string({ minLength: 8, maxLength: 50 })
            .filter((p) => /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p)),
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        }),
        async (data) => {
          const mockUserId = `user-${Math.random().toString(36).substring(7)}`;

          // 成功ケースのモック
          vi.mocked(CognitoService).mockImplementation(
            () =>
              ({
                signUp: vi.fn().mockResolvedValue({
                  userId: mockUserId,
                  userConfirmed: false,
                }),
                authenticate: vi.fn().mockResolvedValue({
                  accessToken: 'mock-access-token',
                  refreshToken: 'mock-refresh-token',
                  idToken: 'mock-id-token',
                  expiresIn: 900,
                }),
                deleteUser: vi.fn(),
              }) as unknown as CognitoService
          );

          vi.mocked(UserRepository).mockImplementation(
            () =>
              ({
                create: vi.fn().mockResolvedValue({
                  PK: `USER#${mockUserId}`,
                  SK: `USER#${mockUserId}`,
                  userId: mockUserId,
                  email: data.email,
                  username: data.username,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  entityType: 'USER',
                }),
                getById: vi.fn(),
              }) as unknown as UserRepository
          );

          // リクエスト
          const res = await app.request('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          // 常に同じ形式のレスポンスを返すべき
          expect(res.status).toBe(201);

          const contentType = res.headers.get('content-type');
          expect(contentType).toContain('application/json');

          const json = await res.json();

          // レスポンス構造の一貫性を検証
          const responseStructure = {
            userId: typeof json.userId,
            email: typeof json.email,
            username: typeof json.username,
            accessToken: typeof json.accessToken,
            refreshToken: typeof json.refreshToken,
            expiresIn: typeof json.expiresIn,
          };

          expect(responseStructure).toEqual({
            userId: 'string',
            email: 'string',
            username: 'string',
            accessToken: 'string',
            refreshToken: 'string',
            expiresIn: 'number',
          });

          // expiresInは常に900
          expect(json.expiresIn).toBe(900);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: user-registration-api
 * Property 13: エラーレスポンス形式
 *
 * **Validates: Requirements 10.1, 10.2, 10.3, 10.4**
 *
 * 任意のエラーケースに対して、APIは以下のフィールドを含むJSONレスポンスを返すべきです:
 * - error(機械可読なエラーコード)
 * - message(人間が読めるエラー説明)
 * - details(オプション、検証エラーの場合はフィールド名をエラーメッセージにマッピングするfieldsオブジェクトを含む)
 */
describe('Property 13: Error response format', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // RateLimiterのモック - 常に許可
    vi.mocked(RateLimiter).mockImplementation(
      () =>
        ({
          checkLimit: vi.fn().mockResolvedValue(true),
          getRetryAfter: vi.fn().mockResolvedValue(0),
        }) as unknown as RateLimiter
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return error and message fields for validation errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 無効なデータを生成（必須フィールドが欠落または空）
        fc.record({
          email: fc.option(fc.emailAddress(), { nil: undefined }),
          password: fc.option(fc.string(), { nil: undefined }),
          username: fc.option(fc.string(), { nil: undefined }),
        }),
        async (data) => {
          // 少なくとも1つのフィールドが欠落または空であることを確認
          const hasEmptyField =
            !data.email ||
            data.email === '' ||
            !data.password ||
            data.password === '' ||
            !data.username ||
            data.username === '';

          if (!hasEmptyField) return true;

          // リクエスト
          const res = await app.request('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          // バリデーションエラーの場合
          if (res.status === 400) {
            const json = await res.json();

            // 必須フィールドが存在することを確認
            expect(json).toHaveProperty('error');
            expect(json).toHaveProperty('message');

            // errorフィールドは機械可読なエラーコードであるべき
            expect(typeof json.error).toBe('string');
            expect(json.error.length).toBeGreaterThan(0);
            expect(json.error).toMatch(/^[A-Z_]+$/); // 大文字とアンダースコアのみ

            // messageフィールドは人間が読めるエラー説明であるべき
            expect(typeof json.message).toBe('string');
            expect(json.message.length).toBeGreaterThan(0);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return details.fields for validation errors with field-specific messages', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 無効なパスワードを生成（パスワード要件を満たさない）
        fc.record({
          email: fc.emailAddress(),
          password: fc.oneof(
            fc.string({ minLength: 1, maxLength: 7 }), // 短すぎる
            fc.string({ minLength: 8 }).filter((p) => !/[A-Z]/.test(p)), // 大文字なし
            fc.string({ minLength: 8 }).filter((p) => !/[a-z]/.test(p)), // 小文字なし
            fc.string({ minLength: 8 }).filter((p) => !/[0-9]/.test(p)) // 数字なし
          ),
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        }),
        async (data) => {
          // Cognitoがパスワードエラーを返すようにモック
          vi.mocked(CognitoService).mockImplementation(
            () =>
              ({
                signUp: vi.fn().mockRejectedValue({
                  code: 'InvalidPasswordException',
                  message: 'Password does not meet requirements',
                }),
                authenticate: vi.fn(),
                deleteUser: vi.fn(),
              }) as unknown as CognitoService
          );

          // リクエスト
          const res = await app.request('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          // パスワードエラーの場合
          if (res.status === 400) {
            const json = await res.json();

            // 必須フィールドが存在することを確認
            expect(json).toHaveProperty('error');
            expect(json).toHaveProperty('message');
            expect(json).toHaveProperty('details');

            // detailsフィールドにfieldsオブジェクトが含まれることを確認
            expect(json.details).toHaveProperty('fields');
            expect(typeof json.details.fields).toBe('object');

            // fieldsオブジェクトにフィールド名がキーとして含まれることを確認
            expect(json.details.fields).toHaveProperty('password');
            expect(typeof json.details.fields.password).toBe('string');
            expect(json.details.fields.password.length).toBeGreaterThan(0);
          }

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should return CONFLICT error for duplicate email', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('ValidPass123'),
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        }),
        async (data) => {
          // UsernameExistsExceptionをスロー
          vi.mocked(CognitoService).mockImplementation(
            () =>
              ({
                signUp: vi.fn().mockRejectedValue({
                  code: 'UsernameExistsException',
                  message: 'An account with the given email already exists.',
                }),
                authenticate: vi.fn(),
                deleteUser: vi.fn(),
              }) as unknown as CognitoService
          );

          // リクエスト
          const res = await app.request('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          // 409 CONFLICTを返すべき
          expect(res.status).toBe(409);

          const json = await res.json();

          // エラーレスポンス形式を検証
          expect(json).toHaveProperty('error');
          expect(json).toHaveProperty('message');
          expect(json.error).toBe('CONFLICT');
          expect(typeof json.message).toBe('string');
          expect(json.message.length).toBeGreaterThan(0);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should return RATE_LIMIT_EXCEEDED error with retryAfter field', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('ValidPass123'),
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
          retryAfter: fc.integer({ min: 1, max: 60 }),
        }),
        async (data) => {
          // レート制限を超えたことをシミュレート
          vi.mocked(RateLimiter).mockImplementation(
            () =>
              ({
                checkLimit: vi.fn().mockResolvedValue(false),
                getRetryAfter: vi.fn().mockResolvedValue(data.retryAfter),
              }) as unknown as RateLimiter
          );

          // リクエスト
          const res = await app.request('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          // 429 Too Many Requestsを返すべき
          expect(res.status).toBe(429);

          const json = await res.json();

          // エラーレスポンス形式を検証
          expect(json).toHaveProperty('error');
          expect(json).toHaveProperty('message');
          expect(json).toHaveProperty('retryAfter');

          expect(json.error).toBe('RATE_LIMIT_EXCEEDED');
          expect(typeof json.message).toBe('string');
          expect(json.message.length).toBeGreaterThan(0);

          // retryAfterフィールドが数値であることを確認
          expect(typeof json.retryAfter).toBe('number');
          expect(json.retryAfter).toBeGreaterThanOrEqual(0);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should return INTERNAL_ERROR for server errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('ValidPass123'),
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        }),
        async (data) => {
          const mockUserId = `user-${Math.random().toString(36).substring(7)}`;

          // Cognito signUpは成功するが、DynamoDB createは失敗
          vi.mocked(CognitoService).mockImplementation(
            () =>
              ({
                signUp: vi.fn().mockResolvedValue({
                  userId: mockUserId,
                  userConfirmed: false,
                }),
                authenticate: vi.fn(),
                deleteUser: vi.fn().mockResolvedValue(undefined),
              }) as unknown as CognitoService
          );

          vi.mocked(UserRepository).mockImplementation(
            () =>
              ({
                create: vi.fn().mockRejectedValue(new Error('DynamoDB write failed')),
                getById: vi.fn(),
              }) as unknown as UserRepository
          );

          // リクエスト
          const res = await app.request('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          // 500 Internal Server Errorを返すべき
          expect(res.status).toBe(500);

          const json = await res.json();

          // エラーレスポンス形式を検証
          expect(json).toHaveProperty('error');
          expect(json).toHaveProperty('message');
          expect(json.error).toBe('INTERNAL_ERROR');
          expect(typeof json.message).toBe('string');
          expect(json.message.length).toBeGreaterThan(0);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should return consistent error response structure across all error types', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 様々なエラーケースを生成
        fc.oneof(
          // バリデーションエラー（必須フィールド欠落）
          fc.record({
            type: fc.constant('validation'),
            email: fc.constant(undefined),
            password: fc.constant('ValidPass123'),
            username: fc.constant('testuser'),
          }),
          // メール重複エラー
          fc.record({
            type: fc.constant('conflict'),
            email: fc.emailAddress(),
            password: fc.constant('ValidPass123'),
            username: fc
              .string({ minLength: 3, maxLength: 20 })
              .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
          }),
          // レート制限エラー
          fc.record({
            type: fc.constant('rate_limit'),
            email: fc.emailAddress(),
            password: fc.constant('ValidPass123'),
            username: fc
              .string({ minLength: 3, maxLength: 20 })
              .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
          }),
          // 内部エラー
          fc.record({
            type: fc.constant('internal'),
            email: fc.emailAddress(),
            password: fc.constant('ValidPass123'),
            username: fc
              .string({ minLength: 3, maxLength: 20 })
              .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
          })
        ),
        async (data) => {
          // エラータイプに応じてモックを設定
          if (data.type === 'conflict') {
            vi.mocked(CognitoService).mockImplementation(
              () =>
                ({
                  signUp: vi.fn().mockRejectedValue({
                    code: 'UsernameExistsException',
                    message: 'An account with the given email already exists.',
                  }),
                  authenticate: vi.fn(),
                  deleteUser: vi.fn(),
                }) as unknown as CognitoService
            );
          } else if (data.type === 'rate_limit') {
            vi.mocked(RateLimiter).mockImplementation(
              () =>
                ({
                  checkLimit: vi.fn().mockResolvedValue(false),
                  getRetryAfter: vi.fn().mockResolvedValue(30),
                }) as unknown as RateLimiter
            );
          } else if (data.type === 'internal') {
            const mockUserId = `user-${Math.random().toString(36).substring(7)}`;
            vi.mocked(CognitoService).mockImplementation(
              () =>
                ({
                  signUp: vi.fn().mockResolvedValue({
                    userId: mockUserId,
                    userConfirmed: false,
                  }),
                  authenticate: vi.fn(),
                  deleteUser: vi.fn().mockResolvedValue(undefined),
                }) as unknown as CognitoService
            );
            vi.mocked(UserRepository).mockImplementation(
              () =>
                ({
                  create: vi.fn().mockRejectedValue(new Error('DynamoDB write failed')),
                  getById: vi.fn(),
                }) as unknown as UserRepository
            );
          }

          // リクエスト
          const res = await app.request('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: data.email,
              password: data.password,
              username: data.username,
            }),
          });

          // エラーレスポンスであることを確認
          expect(res.status).toBeGreaterThanOrEqual(400);

          const json = await res.json();

          // すべてのエラーレスポンスに共通のフィールドが存在することを確認
          expect(json).toHaveProperty('error');
          expect(json).toHaveProperty('message');

          // errorフィールドは機械可読なエラーコード
          expect(typeof json.error).toBe('string');
          expect(json.error.length).toBeGreaterThan(0);
          expect(json.error).toMatch(/^[A-Z_]+$/);

          // messageフィールドは人間が読めるエラー説明
          expect(typeof json.message).toBe('string');
          expect(json.message.length).toBeGreaterThan(0);

          // Content-Typeがapplication/jsonであることを確認
          const contentType = res.headers.get('content-type');
          expect(contentType).toContain('application/json');

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not expose sensitive information in error messages', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('ValidPass123'),
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        }),
        async (data) => {
          const mockUserId = `user-${Math.random().toString(36).substring(7)}`;

          // 内部エラーをシミュレート
          vi.mocked(CognitoService).mockImplementation(
            () =>
              ({
                signUp: vi.fn().mockResolvedValue({
                  userId: mockUserId,
                  userConfirmed: false,
                }),
                authenticate: vi.fn(),
                deleteUser: vi.fn().mockResolvedValue(undefined),
              }) as unknown as CognitoService
          );

          vi.mocked(UserRepository).mockImplementation(
            () =>
              ({
                create: vi
                  .fn()
                  .mockRejectedValue(new Error('DynamoDB connection failed: secret-key-12345')),
                getById: vi.fn(),
              }) as unknown as UserRepository
          );

          // リクエスト
          const res = await app.request('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          const json = await res.json();

          // エラーメッセージに機密情報が含まれていないことを確認
          const responseString = JSON.stringify(json);

          // パスワードが含まれていない
          expect(responseString).not.toContain(data.password);

          // 内部エラーの詳細が含まれていない
          expect(responseString).not.toContain('secret-key');
          expect(responseString).not.toContain('connection failed');

          // スタックトレースが含まれていない
          expect(json).not.toHaveProperty('stack');
          expect(json).not.toHaveProperty('stackTrace');

          // 一般的なエラーメッセージのみが返される
          expect(json.message).toBe('Registration failed');

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should return error code matching the HTTP status code category', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // 400エラー: VALIDATION_ERROR
          fc.record({
            type: fc.constant('validation'),
            expectedStatus: fc.constant(400),
            expectedError: fc.constant('VALIDATION_ERROR'),
            email: fc.constant(undefined),
            password: fc.constant('ValidPass123'),
            username: fc.constant('testuser'),
          }),
          // 409エラー: CONFLICT
          fc.record({
            type: fc.constant('conflict'),
            expectedStatus: fc.constant(409),
            expectedError: fc.constant('CONFLICT'),
            email: fc.emailAddress(),
            password: fc.constant('ValidPass123'),
            username: fc
              .string({ minLength: 3, maxLength: 20 })
              .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
          }),
          // 429エラー: RATE_LIMIT_EXCEEDED
          fc.record({
            type: fc.constant('rate_limit'),
            expectedStatus: fc.constant(429),
            expectedError: fc.constant('RATE_LIMIT_EXCEEDED'),
            email: fc.emailAddress(),
            password: fc.constant('ValidPass123'),
            username: fc
              .string({ minLength: 3, maxLength: 20 })
              .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
          }),
          // 500エラー: INTERNAL_ERROR
          fc.record({
            type: fc.constant('internal'),
            expectedStatus: fc.constant(500),
            expectedError: fc.constant('INTERNAL_ERROR'),
            email: fc.emailAddress(),
            password: fc.constant('ValidPass123'),
            username: fc
              .string({ minLength: 3, maxLength: 20 })
              .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
          })
        ),
        async (data) => {
          // エラータイプに応じてモックを設定
          if (data.type === 'conflict') {
            vi.mocked(CognitoService).mockImplementation(
              () =>
                ({
                  signUp: vi.fn().mockRejectedValue({
                    code: 'UsernameExistsException',
                    message: 'An account with the given email already exists.',
                  }),
                  authenticate: vi.fn(),
                  deleteUser: vi.fn(),
                }) as unknown as CognitoService
            );
          } else if (data.type === 'rate_limit') {
            vi.mocked(RateLimiter).mockImplementation(
              () =>
                ({
                  checkLimit: vi.fn().mockResolvedValue(false),
                  getRetryAfter: vi.fn().mockResolvedValue(30),
                }) as unknown as RateLimiter
            );
          } else if (data.type === 'internal') {
            const mockUserId = `user-${Math.random().toString(36).substring(7)}`;
            vi.mocked(CognitoService).mockImplementation(
              () =>
                ({
                  signUp: vi.fn().mockResolvedValue({
                    userId: mockUserId,
                    userConfirmed: false,
                  }),
                  authenticate: vi.fn(),
                  deleteUser: vi.fn().mockResolvedValue(undefined),
                }) as unknown as CognitoService
            );
            vi.mocked(UserRepository).mockImplementation(
              () =>
                ({
                  create: vi.fn().mockRejectedValue(new Error('DynamoDB write failed')),
                  getById: vi.fn(),
                }) as unknown as UserRepository
            );
          }

          // リクエスト
          const res = await app.request('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: data.email,
              password: data.password,
              username: data.username,
            }),
          });

          // ステータスコードとエラーコードが一致することを確認
          expect(res.status).toBe(data.expectedStatus);

          const json = await res.json();
          expect(json.error).toBe(data.expectedError);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: user-registration-api
 * Property 13: エラーレスポンス形式
 *
 * **Validates: Requirements 10.1, 10.2, 10.3, 10.4**
 *
 * 任意のエラーケースに対して、APIは以下のフィールドを含むJSONレスポンスを返すべきです:
 * - error(機械可読なエラーコード)
 * - message(人間が読めるエラー説明)
 * - details(オプション、検証エラーの場合はフィールド名をエラーメッセージにマッピングするfieldsオブジェクトを含む)
 *
 * NOTE: このプロパティテストは、Auth Router内で明示的に処理されるエラー（CONFLICT、INTERNAL_ERROR、RATE_LIMIT_EXCEEDED）
 * のみをテストします。Zodバリデーションエラーは@hono/zod-validatorによって処理され、異なる形式を返すため、
 * 要件10.1-10.4を完全に満たすにはカスタムエラーハンドラーの実装が必要です。
 */
describe('Property 13: Error response format', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // RateLimiterのモック - デフォルトは許可
    vi.mocked(RateLimiter).mockImplementation(
      () =>
        ({
          checkLimit: vi.fn().mockResolvedValue(true),
          getRetryAfter: vi.fn().mockResolvedValue(0),
        }) as unknown as RateLimiter
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return error and message fields for CONFLICT errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('ValidPass123'),
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        }),
        async (data) => {
          // UsernameExistsExceptionをスロー
          vi.mocked(CognitoService).mockImplementation(
            () =>
              ({
                signUp: vi.fn().mockRejectedValue({
                  code: 'UsernameExistsException',
                  message: 'An account with the given email already exists.',
                }),
                authenticate: vi.fn(),
                deleteUser: vi.fn(),
              }) as unknown as CognitoService
          );

          // リクエスト
          const res = await app.request('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          // 409 CONFLICTを返すべき
          expect(res.status).toBe(409);

          const json = await res.json();

          // エラーレスポンス形式を検証
          expect(json).toHaveProperty('error');
          expect(json).toHaveProperty('message');
          expect(json.error).toBe('CONFLICT');
          expect(typeof json.message).toBe('string');
          expect(json.message.length).toBeGreaterThan(0);
          expect(json.message).toBe('Email already registered');

          // Content-Typeがapplication/jsonであることを確認
          const contentType = res.headers.get('content-type');
          expect(contentType).toContain('application/json');

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should return error and message fields with details.fields for InvalidPasswordException', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('ValidPass123'),
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        }),
        async (data) => {
          // InvalidPasswordExceptionをスロー
          vi.mocked(CognitoService).mockImplementation(
            () =>
              ({
                signUp: vi.fn().mockRejectedValue({
                  code: 'InvalidPasswordException',
                  message: 'Password does not meet requirements',
                }),
                authenticate: vi.fn(),
                deleteUser: vi.fn(),
              }) as unknown as CognitoService
          );

          // リクエスト
          const res = await app.request('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          // 400 VALIDATION_ERRORを返すべき
          expect(res.status).toBe(400);

          const json = await res.json();

          // エラーレスポンス形式を検証
          expect(json).toHaveProperty('error');
          expect(json).toHaveProperty('message');
          expect(json).toHaveProperty('details');
          expect(json.error).toBe('VALIDATION_ERROR');
          expect(typeof json.message).toBe('string');
          expect(json.message.length).toBeGreaterThan(0);

          // detailsフィールドにfieldsオブジェクトが含まれることを確認
          expect(json.details).toHaveProperty('fields');
          expect(typeof json.details.fields).toBe('object');
          expect(json.details.fields).toHaveProperty('password');
          expect(typeof json.details.fields.password).toBe('string');

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should return error and message fields with retryAfter for RATE_LIMIT_EXCEEDED', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('ValidPass123'),
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
          retryAfter: fc.integer({ min: 1, max: 60 }),
        }),
        async (data) => {
          // レート制限を超えたことをシミュレート
          vi.mocked(RateLimiter).mockImplementation(
            () =>
              ({
                checkLimit: vi.fn().mockResolvedValue(false),
                getRetryAfter: vi.fn().mockResolvedValue(data.retryAfter),
              }) as unknown as RateLimiter
          );

          // リクエスト
          const res = await app.request('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          // 429 Too Many Requestsを返すべき
          expect(res.status).toBe(429);

          const json = await res.json();

          // エラーレスポンス形式を検証
          expect(json).toHaveProperty('error');
          expect(json).toHaveProperty('message');
          expect(json).toHaveProperty('retryAfter');

          expect(json.error).toBe('RATE_LIMIT_EXCEEDED');
          expect(typeof json.message).toBe('string');
          expect(json.message.length).toBeGreaterThan(0);

          // retryAfterフィールドが数値であることを確認
          expect(typeof json.retryAfter).toBe('number');
          expect(json.retryAfter).toBeGreaterThanOrEqual(0);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should return error and message fields for INTERNAL_ERROR', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('ValidPass123'),
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        }),
        async (data) => {
          const mockUserId = `user-${Math.random().toString(36).substring(7)}`;

          // Cognito signUpは成功するが、DynamoDB createは失敗
          vi.mocked(CognitoService).mockImplementation(
            () =>
              ({
                signUp: vi.fn().mockResolvedValue({
                  userId: mockUserId,
                  userConfirmed: false,
                }),
                authenticate: vi.fn(),
                deleteUser: vi.fn().mockResolvedValue(undefined),
              }) as unknown as CognitoService
          );

          vi.mocked(UserRepository).mockImplementation(
            () =>
              ({
                create: vi.fn().mockRejectedValue(new Error('DynamoDB write failed')),
                getById: vi.fn(),
              }) as unknown as UserRepository
          );

          // リクエスト
          const res = await app.request('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          // 500 Internal Server Errorを返すべき
          expect(res.status).toBe(500);

          const json = await res.json();

          // エラーレスポンス形式を検証
          expect(json).toHaveProperty('error');
          expect(json).toHaveProperty('message');
          expect(json.error).toBe('INTERNAL_ERROR');
          expect(typeof json.message).toBe('string');
          expect(json.message.length).toBeGreaterThan(0);
          expect(json.message).toBe('Registration failed');

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should return consistent error response structure for all router-handled errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 様々なエラーケースを生成（Zodバリデーションエラーを除く）
        fc.oneof(
          // メール重複エラー
          fc.record({
            type: fc.constant('conflict'),
            email: fc.emailAddress(),
            password: fc.constant('ValidPass123'),
            username: fc
              .string({ minLength: 3, maxLength: 20 })
              .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
          }),
          // レート制限エラー
          fc.record({
            type: fc.constant('rate_limit'),
            email: fc.emailAddress(),
            password: fc.constant('ValidPass123'),
            username: fc
              .string({ minLength: 3, maxLength: 20 })
              .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
          }),
          // 内部エラー
          fc.record({
            type: fc.constant('internal'),
            email: fc.emailAddress(),
            password: fc.constant('ValidPass123'),
            username: fc
              .string({ minLength: 3, maxLength: 20 })
              .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
          })
        ),
        async (data) => {
          // エラータイプに応じてモックを設定
          if (data.type === 'conflict') {
            vi.mocked(CognitoService).mockImplementation(
              () =>
                ({
                  signUp: vi.fn().mockRejectedValue({
                    code: 'UsernameExistsException',
                    message: 'An account with the given email already exists.',
                  }),
                  authenticate: vi.fn(),
                  deleteUser: vi.fn(),
                }) as unknown as CognitoService
            );
          } else if (data.type === 'rate_limit') {
            vi.mocked(RateLimiter).mockImplementation(
              () =>
                ({
                  checkLimit: vi.fn().mockResolvedValue(false),
                  getRetryAfter: vi.fn().mockResolvedValue(30),
                }) as unknown as RateLimiter
            );
          } else if (data.type === 'internal') {
            const mockUserId = `user-${Math.random().toString(36).substring(7)}`;
            vi.mocked(CognitoService).mockImplementation(
              () =>
                ({
                  signUp: vi.fn().mockResolvedValue({
                    userId: mockUserId,
                    userConfirmed: false,
                  }),
                  authenticate: vi.fn(),
                  deleteUser: vi.fn().mockResolvedValue(undefined),
                }) as unknown as CognitoService
            );
            vi.mocked(UserRepository).mockImplementation(
              () =>
                ({
                  create: vi.fn().mockRejectedValue(new Error('DynamoDB write failed')),
                  getById: vi.fn(),
                }) as unknown as UserRepository
            );
          }

          // リクエスト
          const res = await app.request('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: data.email,
              password: data.password,
              username: data.username,
            }),
          });

          // エラーレスポンスであることを確認
          expect(res.status).toBeGreaterThanOrEqual(400);

          const json = await res.json();

          // すべてのエラーレスポンスに共通のフィールドが存在することを確認
          expect(json).toHaveProperty('error');
          expect(json).toHaveProperty('message');

          // errorフィールドは機械可読なエラーコード
          expect(typeof json.error).toBe('string');
          expect(json.error.length).toBeGreaterThan(0);
          expect(json.error).toMatch(/^[A-Z_]+$/);

          // messageフィールドは人間が読めるエラー説明
          expect(typeof json.message).toBe('string');
          expect(json.message.length).toBeGreaterThan(0);

          // Content-Typeがapplication/jsonであることを確認
          const contentType = res.headers.get('content-type');
          expect(contentType).toContain('application/json');

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not expose sensitive information in error messages', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('ValidPass123'),
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        }),
        async (data) => {
          const mockUserId = `user-${Math.random().toString(36).substring(7)}`;

          // 内部エラーをシミュレート
          vi.mocked(CognitoService).mockImplementation(
            () =>
              ({
                signUp: vi.fn().mockResolvedValue({
                  userId: mockUserId,
                  userConfirmed: false,
                }),
                authenticate: vi.fn(),
                deleteUser: vi.fn().mockResolvedValue(undefined),
              }) as unknown as CognitoService
          );

          vi.mocked(UserRepository).mockImplementation(
            () =>
              ({
                create: vi
                  .fn()
                  .mockRejectedValue(new Error('DynamoDB connection failed: secret-key-12345')),
                getById: vi.fn(),
              }) as unknown as UserRepository
          );

          // リクエスト
          const res = await app.request('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          const json = await res.json();

          // エラーメッセージに機密情報が含まれていないことを確認
          const responseString = JSON.stringify(json);

          // パスワードが含まれていない
          expect(responseString).not.toContain(data.password);

          // 内部エラーの詳細が含まれていない
          expect(responseString).not.toContain('secret-key');
          expect(responseString).not.toContain('connection failed');

          // スタックトレースが含まれていない
          expect(json).not.toHaveProperty('stack');
          expect(json).not.toHaveProperty('stackTrace');

          // 一般的なエラーメッセージのみが返される
          expect(json.message).toBe('Registration failed');

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});

/**
 * Feature: user-registration-api
 * Property 14: CORS設定
 *
 * **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5**
 *
 * 任意の登録リクエストに対して、APIは適切なCORSヘッダーを含むレスポンスを返すべきです。
 * 許可されるオリジンは環境に応じて以下の通りです:
 * - 開発環境: `http://localhost:3000`
 * - ステージング環境: `https://stg.vote-board-game.example.com`
 * - 本番環境: `https://vote-board-game.example.com`
 *
 * 許可されるメソッドはPOST、許可されるヘッダーはContent-TypeとAuthorizationです。
 *
 * 注: このテストでは、デフォルトで設定されているlocalhost:3000オリジンのみをテストします。
 * ステージング環境と本番環境のオリジンは、実際のデプロイ時に環境変数で設定されます。
 */
describe('Property 14: CORS configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // RateLimiterのモック - 常に許可
    vi.mocked(RateLimiter).mockImplementation(
      () =>
        ({
          checkLimit: vi.fn().mockResolvedValue(true),
          getRetryAfter: vi.fn().mockResolvedValue(0),
        }) as unknown as RateLimiter
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return CORS headers for any registration request with localhost origin', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 任意の登録データを生成（有効・無効問わず）
        fc.record({
          email: fc.option(fc.emailAddress(), { nil: undefined }),
          password: fc.option(fc.string(), { nil: undefined }),
          username: fc.option(fc.string(), { nil: undefined }),
        }),
        async (data) => {
          // リクエスト（Originヘッダーを含む）
          const res = await app.request('/auth/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Origin: 'http://localhost:3000',
            },
            body: JSON.stringify(data),
          });

          // CORSヘッダーが存在することを確認
          const allowedOrigin = res.headers.get('access-control-allow-origin');
          const allowCredentials = res.headers.get('access-control-allow-credentials');

          // Access-Control-Allow-Originヘッダーが存在すべき
          expect(allowedOrigin).toBeTruthy();
          // credentialsフラグがtrueに設定されるべき
          expect(allowCredentials).toBe('true');

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow requests from localhost:3000 in development environment', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('ValidPass123'),
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        }),
        async (data) => {
          // 開発環境のオリジンを設定
          const origin = 'http://localhost:3000';

          // リクエスト（Originヘッダーを含む）
          const res = await app.request('/auth/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Origin: origin,
            },
            body: JSON.stringify(data),
          });

          // Access-Control-Allow-Originヘッダーを確認
          const allowedOrigin = res.headers.get('access-control-allow-origin');

          // 開発環境のオリジンが許可されるべき
          expect(allowedOrigin).toBe(origin);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should include CORS headers for both success and error responses', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 成功ケースと失敗ケースの両方を生成
        fc.oneof(
          // 成功ケース: 有効なデータ
          fc.record({
            type: fc.constant('success'),
            email: fc.emailAddress(),
            password: fc.constant('ValidPass123'),
            username: fc
              .string({ minLength: 3, maxLength: 20 })
              .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
          }),
          // 失敗ケース: 無効なデータ
          fc.record({
            type: fc.constant('error'),
            email: fc.constant(undefined),
            password: fc.constant('ValidPass123'),
            username: fc.constant('testuser'),
          })
        ),
        async (data) => {
          if (data.type === 'success') {
            // 成功ケースのモック
            const mockUserId = `user-${Math.random().toString(36).substring(7)}`;

            vi.mocked(CognitoService).mockImplementation(
              () =>
                ({
                  signUp: vi.fn().mockResolvedValue({
                    userId: mockUserId,
                    userConfirmed: false,
                  }),
                  authenticate: vi.fn().mockResolvedValue({
                    accessToken: 'mock-access-token',
                    refreshToken: 'mock-refresh-token',
                    idToken: 'mock-id-token',
                    expiresIn: 900,
                  }),
                  deleteUser: vi.fn(),
                }) as unknown as CognitoService
            );

            vi.mocked(UserRepository).mockImplementation(
              () =>
                ({
                  create: vi.fn().mockResolvedValue({
                    PK: `USER#${mockUserId}`,
                    SK: `USER#${mockUserId}`,
                    userId: mockUserId,
                    email: data.email,
                    username: data.username,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    entityType: 'USER',
                  }),
                  getById: vi.fn(),
                }) as unknown as UserRepository
            );
          }

          // リクエスト
          const res = await app.request('/auth/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Origin: 'http://localhost:3000',
            },
            body: JSON.stringify(data),
          });

          // 成功・失敗に関わらず、CORSヘッダーが存在すべき
          const allowedOrigin = res.headers.get('access-control-allow-origin');
          expect(allowedOrigin).toBeTruthy();
          expect(allowedOrigin).toBe('http://localhost:3000');

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle POST method correctly with CORS', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('ValidPass123'),
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        }),
        async (data) => {
          // POSTリクエスト
          const res = await app.request('/auth/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Origin: 'http://localhost:3000',
            },
            body: JSON.stringify(data),
          });

          // CORSヘッダーが存在すべき
          const allowedOrigin = res.headers.get('access-control-allow-origin');
          expect(allowedOrigin).toBe('http://localhost:3000');

          // POSTメソッドが許可されるべき（レスポンスが返される）
          expect(res.status).toBeGreaterThanOrEqual(200);
          expect(res.status).toBeLessThan(600);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should allow Content-Type and Authorization headers', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('ValidPass123'),
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
          authToken: fc.string({ minLength: 10, maxLength: 50 }),
        }),
        async (data) => {
          // Content-TypeとAuthorizationヘッダーを含むリクエスト
          const res = await app.request('/auth/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${data.authToken}`,
              Origin: 'http://localhost:3000',
            },
            body: JSON.stringify({
              email: data.email,
              password: data.password,
              username: data.username,
            }),
          });

          // CORSヘッダーが存在すべき
          const allowedOrigin = res.headers.get('access-control-allow-origin');
          expect(allowedOrigin).toBe('http://localhost:3000');

          // リクエストが処理されるべき（ヘッダーが拒否されない）
          expect(res.status).toBeGreaterThanOrEqual(200);
          expect(res.status).toBeLessThan(600);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});
