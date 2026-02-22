import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { Hono } from 'hono';
import { authRouter } from './auth.js';
import { CognitoService } from '../lib/cognito/cognito-service.js';
import { UserRepository } from '../lib/dynamodb/repositories/user.js';
import { RateLimiter } from '../lib/rate-limiter.js';

// Honoアプリケーションを作成
const app = new Hono();
app.route('/auth', authRouter);

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
