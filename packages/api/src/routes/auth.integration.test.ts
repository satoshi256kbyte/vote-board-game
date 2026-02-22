// COGNITO_USER_POOL_IDが必要なため、モジュールインポート前に設定
process.env.COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || 'ap-northeast-1_TestPool';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PutCommand } from '@aws-sdk/lib-dynamodb';

/**
 * エンドツーエンド統合テスト: ユーザー登録API
 *
 * このテストスイートは、実際のHonoアプリケーションを使用して
 * 完全な登録フローをテストします。外部サービス（Cognito、DynamoDB）のみをモックします。
 *
 * **検証: 要件 1.1-1.5, 2.1-2.3, 3.1-3.5, 4.1-4.3, 5.1-5.4, 6.1-6.5, 7.1-7.4, 8.1-8.4, 9.1-9.3**
 */

// CognitoServiceをモック
vi.mock('../lib/cognito/cognito-service.js');

// DynamoDBクライアントをモック
vi.mock('../lib/dynamodb.js');

// RateLimiterをモック
vi.mock('../lib/rate-limiter.js');

// モック設定後にインポート
import app from '../index.js';
import { CognitoService } from '../lib/cognito/cognito-service.js';
import { docClient } from '../lib/dynamodb.js';
import { RateLimiter } from '../lib/rate-limiter.js';

describe('Auth Router - End-to-End Integration Tests', () => {
  let mockSignUp: ReturnType<typeof vi.fn>;
  let mockAuthenticate: ReturnType<typeof vi.fn>;
  let mockDeleteUser: ReturnType<typeof vi.fn>;
  let mockDynamoDBSend: ReturnType<typeof vi.fn>;
  let mockCheckLimit: ReturnType<typeof vi.fn>;
  let mockGetRetryAfter: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // 環境変数を設定
    process.env.AWS_REGION = 'ap-northeast-1';
    process.env.COGNITO_USER_POOL_ID = 'test-user-pool-id';
    process.env.COGNITO_CLIENT_ID = 'test-client-id';
    process.env.DYNAMODB_TABLE_NAME = 'test-table';
    process.env.ALLOWED_ORIGINS = 'http://localhost:3000';

    // モックをリセット
    vi.clearAllMocks();

    // CognitoServiceのモックメソッドを設定
    mockSignUp = vi.fn();
    mockAuthenticate = vi.fn();
    mockDeleteUser = vi.fn();

    vi.mocked(CognitoService).mockImplementation(
      () =>
        ({
          signUp: mockSignUp,
          authenticate: mockAuthenticate,
          deleteUser: mockDeleteUser,
        }) as unknown as CognitoService
    );

    // DynamoDBのモックを設定
    mockDynamoDBSend = vi.mocked(docClient.send);

    // RateLimiterのモックを設定
    mockCheckLimit = vi.fn().mockResolvedValue(true); // デフォルトは許可
    mockGetRetryAfter = vi.fn().mockResolvedValue(60);

    vi.mocked(RateLimiter).mockImplementation(
      () =>
        ({
          checkLimit: mockCheckLimit,
          getRetryAfter: mockGetRetryAfter,
        }) as unknown as RateLimiter
    );
  });

  describe('登録成功フロー', () => {
    it('有効なデータで登録が成功し、201ステータスとトークンを返す', async () => {
      // Arrange
      const registrationData = {
        email: 'newuser@example.com',
        password: 'SecurePass123',
        username: 'newuser',
      };

      // Cognitoのモックレスポンス
      mockSignUp.mockResolvedValueOnce({
        userId: 'test-user-id-123',
        userConfirmed: false,
      });

      mockAuthenticate.mockResolvedValueOnce({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        idToken: 'mock-id-token',
        expiresIn: 900,
      });

      // DynamoDBのモックレスポンス (ユーザーレコード作成のみ)
      mockDynamoDBSend.mockResolvedValueOnce({});

      // Act
      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify(registrationData),
      });

      const json = await res.json();

      // Assert
      expect(res.status).toBe(201);
      expect(json).toEqual({
        userId: 'test-user-id-123',
        email: 'newuser@example.com',
        username: 'newuser',
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 900,
      });

      // Cognitoが正しく呼ばれたことを確認
      expect(mockSignUp).toHaveBeenCalledWith('newuser@example.com', 'SecurePass123', 'newuser');
      expect(mockAuthenticate).toHaveBeenCalledWith('newuser@example.com', 'SecurePass123');

      // DynamoDBが正しく呼ばれたことを確認
      expect(mockDynamoDBSend).toHaveBeenCalledTimes(1);

      const userPutCall = mockDynamoDBSend.mock.calls[0][0];
      expect(userPutCall).toBeInstanceOf(PutCommand);
      expect(userPutCall.input.Item).toMatchObject({
        PK: 'USER#test-user-id-123',
        SK: 'USER#test-user-id-123',
        userId: 'test-user-id-123',
        email: 'newuser@example.com',
        username: 'newuser',
        entityType: 'USER',
      });
    });

    it('Content-Typeがapplication/jsonであることを確認', async () => {
      // Arrange
      const registrationData = {
        email: 'contenttype@example.com',
        password: 'ContentType123',
        username: 'contenttypeuser',
      };

      mockSignUp.mockResolvedValueOnce({
        userId: 'content-type-user-id',
        userConfirmed: false,
      });

      mockAuthenticate.mockResolvedValueOnce({
        accessToken: 'token',
        refreshToken: 'refresh',
        idToken: 'id',
        expiresIn: 900,
      });

      mockDynamoDBSend.mockResolvedValueOnce({});

      // Act
      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.2',
        },
        body: JSON.stringify(registrationData),
      });

      // Assert
      expect(res.status).toBe(201);
      expect(res.headers.get('content-type')).toContain('application/json');
    });
  });

  describe('登録失敗フロー - バリデーションエラー', () => {
    it('メールアドレスが欠落している場合、400エラーを返す', async () => {
      // Arrange
      const invalidData = {
        password: 'Password123',
        username: 'testuser',
      };

      // Act
      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      });

      const json = await res.json();

      // Assert
      expect(res.status).toBe(400);
      expect(json.error).toBe('VALIDATION_ERROR');
      expect(json.message).toBe('Validation failed');
      expect(json.details.fields).toHaveProperty('email');
    });

    it('パスワードが欠落している場合、400エラーを返す', async () => {
      // Arrange
      const invalidData = {
        email: 'test@example.com',
        username: 'testuser',
      };

      // Act
      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      });

      const json = await res.json();

      // Assert
      expect(res.status).toBe(400);
      expect(json.error).toBe('VALIDATION_ERROR');
      expect(json.message).toBe('Validation failed');
      expect(json.details.fields).toHaveProperty('password');
    });

    it('ユーザー名が欠落している場合、400エラーを返す', async () => {
      // Arrange
      const invalidData = {
        email: 'test@example.com',
        password: 'Password123',
      };

      // Act
      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      });

      const json = await res.json();

      // Assert
      expect(res.status).toBe(400);
      expect(json.error).toBe('VALIDATION_ERROR');
      expect(json.message).toBe('Validation failed');
      expect(json.details.fields).toHaveProperty('username');
    });

    it('メールアドレスの形式が無効な場合、400エラーを返す', async () => {
      // Arrange
      const invalidData = {
        email: 'invalid-email',
        password: 'Password123',
        username: 'testuser',
      };

      // Act
      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      });

      const json = await res.json();

      // Assert
      expect(res.status).toBe(400);
      expect(json.error).toBe('VALIDATION_ERROR');
      expect(json.details.fields.email).toContain('Invalid email format');
    });

    it('パスワードが要件を満たさない場合、400エラーを返す', async () => {
      // Arrange
      const invalidData = {
        email: 'test@example.com',
        password: 'weak',
        username: 'testuser',
      };

      // Act
      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      });

      const json = await res.json();

      // Assert
      expect(res.status).toBe(400);
      expect(json.error).toBe('VALIDATION_ERROR');
      expect(json.details.fields.password).toContain('at least 8 characters');
    });

    it('ユーザー名が短すぎる場合、400エラーを返す', async () => {
      // Arrange
      const invalidData = {
        email: 'test@example.com',
        password: 'Password123',
        username: 'ab',
      };

      // Act
      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      });

      const json = await res.json();

      // Assert
      expect(res.status).toBe(400);
      expect(json.error).toBe('VALIDATION_ERROR');
      expect(json.details.fields.username).toContain('at least 3 characters');
    });

    it('ユーザー名が長すぎる場合、400エラーを返す', async () => {
      // Arrange
      const invalidData = {
        email: 'test@example.com',
        password: 'Password123',
        username: 'a'.repeat(21),
      };

      // Act
      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      });

      const json = await res.json();

      // Assert
      expect(res.status).toBe(400);
      expect(json.error).toBe('VALIDATION_ERROR');
      expect(json.details.fields.username).toContain('at most 20 characters');
    });

    it('ユーザー名に無効な文字が含まれる場合、400エラーを返す', async () => {
      // Arrange
      const invalidData = {
        email: 'test@example.com',
        password: 'Password123',
        username: 'invalid@user',
      };

      // Act
      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      });

      const json = await res.json();

      // Assert
      expect(res.status).toBe(400);
      expect(json.error).toBe('VALIDATION_ERROR');
      expect(json.details.fields.username).toContain('alphanumeric');
    });

    it('複数のフィールドが無効な場合、すべてのエラーを返す', async () => {
      // Arrange
      const invalidData = {
        email: 'invalid',
        password: 'weak',
        username: 'a',
      };

      // Act
      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      });

      const json = await res.json();

      // Assert
      expect(res.status).toBe(400);
      expect(json.error).toBe('VALIDATION_ERROR');
      expect(json.details.fields).toHaveProperty('email');
      expect(json.details.fields).toHaveProperty('password');
      expect(json.details.fields).toHaveProperty('username');
    });
  });

  describe('登録失敗フロー - メール重複', () => {
    it('メールアドレスが既に登録されている場合、409エラーを返す', async () => {
      // Arrange
      const duplicateData = {
        email: 'existing@example.com',
        password: 'Password123',
        username: 'existinguser',
      };

      // Cognitoが重複エラーを返す
      const usernameExistsError = new Error('User already exists');
      (usernameExistsError as { code: string }).code = 'UsernameExistsException';
      mockSignUp.mockRejectedValueOnce(usernameExistsError);

      // Act
      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.3',
        },
        body: JSON.stringify(duplicateData),
      });

      const json = await res.json();

      // Assert
      expect(res.status).toBe(409);
      expect(json.error).toBe('CONFLICT');
      expect(json.message).toBe('Email already registered');
    });

    it('重複エラー時にDynamoDBへの書き込みが行われないことを確認', async () => {
      // Arrange
      const duplicateData = {
        email: 'duplicate@example.com',
        password: 'Password123',
        username: 'duplicateuser',
      };

      const usernameExistsError = new Error('User already exists');
      (usernameExistsError as { code: string }).code = 'UsernameExistsException';
      mockSignUp.mockRejectedValueOnce(usernameExistsError);

      // Act
      await app.request('/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.4',
        },
        body: JSON.stringify(duplicateData),
      });

      // Assert
      // DynamoDBへのユーザーレコード作成が呼ばれていないことを確認
      expect(mockDynamoDBSend).not.toHaveBeenCalled();
    });
  });

  describe('レート制限のテスト', () => {
    it('同じIPアドレスから6回目のリクエストで429エラーを返す', async () => {
      // Arrange
      const registrationData = {
        email: 'ratelimit@example.com',
        password: 'Password123',
        username: 'ratelimituser',
      };

      const ipAddress = '192.168.1.100';

      // レート制限を超過したことをシミュレート
      mockCheckLimit.mockResolvedValueOnce(false);
      mockGetRetryAfter.mockResolvedValueOnce(70);

      // Act
      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': ipAddress,
        },
        body: JSON.stringify(registrationData),
      });

      const json = await res.json();

      // Assert
      expect(res.status).toBe(429);
      expect(json.error).toBe('RATE_LIMIT_EXCEEDED');
      expect(json.message).toBe('Too many registration attempts');
      expect(json).toHaveProperty('retryAfter');
      expect(typeof json.retryAfter).toBe('number');
      expect(json.retryAfter).toBeGreaterThanOrEqual(0);
    });

    it('レート制限内のリクエストは正常に処理される', async () => {
      // Arrange
      const registrationData = {
        email: 'withinlimit@example.com',
        password: 'Password123',
        username: 'withinlimituser',
      };

      const ipAddress = '192.168.1.101';

      // レート制限内（許可される）
      mockCheckLimit.mockResolvedValueOnce(true);

      mockDynamoDBSend.mockResolvedValueOnce({});

      mockSignUp.mockResolvedValueOnce({
        userId: 'within-limit-user-id',
        userConfirmed: false,
      });

      mockAuthenticate.mockResolvedValueOnce({
        accessToken: 'token',
        refreshToken: 'refresh',
        idToken: 'id',
        expiresIn: 900,
      });

      // Act
      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': ipAddress,
        },
        body: JSON.stringify(registrationData),
      });

      // Assert
      expect(res.status).toBe(201);
      expect(mockCheckLimit).toHaveBeenCalledWith(ipAddress, 'register');
    });

    it('異なるIPアドレスからのリクエストは独立してカウントされる', async () => {
      // Arrange
      const registrationData1 = {
        email: 'ip1@example.com',
        password: 'Password123',
        username: 'ip1user',
      };

      const registrationData2 = {
        email: 'ip2@example.com',
        password: 'Password123',
        username: 'ip2user',
      };

      // IP1は制限超過、IP2は許可
      mockCheckLimit
        .mockResolvedValueOnce(false) // IP1: 制限超過
        .mockResolvedValueOnce(true); // IP2: 許可

      mockGetRetryAfter.mockResolvedValueOnce(60);

      mockDynamoDBSend.mockResolvedValueOnce({});

      mockSignUp.mockResolvedValueOnce({
        userId: 'ip2-user-id',
        userConfirmed: false,
      });

      mockAuthenticate.mockResolvedValueOnce({
        accessToken: 'token',
        refreshToken: 'refresh',
        idToken: 'id',
        expiresIn: 900,
      });

      // Act
      const res1 = await app.request('/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.102',
        },
        body: JSON.stringify(registrationData1),
      });

      const res2 = await app.request('/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.103',
        },
        body: JSON.stringify(registrationData2),
      });

      // Assert
      expect(res1.status).toBe(429); // IP1は制限超過
      expect(res2.status).toBe(201); // IP2は成功
    });
  });

  describe('トランザクション整合性とロールバック', () => {
    it('DynamoDB書き込み失敗時にCognitoユーザーが削除される', async () => {
      // Arrange
      const registrationData = {
        email: 'rollback@example.com',
        password: 'Password123',
        username: 'rollbackuser',
      };

      // DynamoDB書き込みが失敗
      mockDynamoDBSend.mockRejectedValueOnce(new Error('DynamoDB write failed'));

      // Cognitoは成功
      mockSignUp.mockResolvedValueOnce({
        userId: 'rollback-user-id',
        userConfirmed: false,
      });

      mockDeleteUser.mockResolvedValueOnce(undefined);

      // Act
      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.5',
        },
        body: JSON.stringify(registrationData),
      });

      const json = await res.json();

      // Assert
      expect(res.status).toBe(500);
      expect(json.error).toBe('INTERNAL_ERROR');

      // Cognitoのdeleteユーザーが呼ばれたことを確認
      expect(mockDeleteUser).toHaveBeenCalledWith('rollback-user-id');
    });
  });

  describe('CORSヘッダー', () => {
    it('許可されたオリジンからのリクエストにCORSヘッダーを含む', async () => {
      // Arrange
      const registrationData = {
        email: 'cors@example.com',
        password: 'Password123',
        username: 'corsuser',
      };

      mockDynamoDBSend.mockResolvedValueOnce({});

      mockSignUp.mockResolvedValueOnce({
        userId: 'cors-user-id',
        userConfirmed: false,
      });

      mockAuthenticate.mockResolvedValueOnce({
        accessToken: 'token',
        refreshToken: 'refresh',
        idToken: 'id',
        expiresIn: 900,
      });

      // Act
      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'http://localhost:3000',
          'x-forwarded-for': '192.168.1.6',
        },
        body: JSON.stringify(registrationData),
      });

      // Assert
      expect(res.status).toBe(201);
      expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:3000');
      expect(res.headers.get('access-control-allow-credentials')).toBe('true');
    });
  });
});
