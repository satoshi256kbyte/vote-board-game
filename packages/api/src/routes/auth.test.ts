import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { authRouter } from './auth.js';
import { CognitoService } from '../lib/cognito/cognito-service.js';
import { UserRepository } from '../lib/dynamodb/repositories/user.js';
import { RateLimiter } from '../lib/rate-limiter.js';

// モック
vi.mock('../lib/cognito/cognito-service.js');
vi.mock('../lib/dynamodb/repositories/user.js');
vi.mock('../lib/rate-limiter.js');

describe('Auth Router', () => {
  let app: Hono;
  let mockCognitoService: {
    signUp: ReturnType<typeof vi.fn>;
    authenticate: ReturnType<typeof vi.fn>;
    deleteUser: ReturnType<typeof vi.fn>;
  };
  let mockUserRepository: {
    create: ReturnType<typeof vi.fn>;
  };
  let mockRateLimiter: {
    checkLimit: ReturnType<typeof vi.fn>;
    getRetryAfter: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Honoアプリケーションのセットアップ
    app = new Hono();
    app.route('/auth', authRouter);

    // CognitoServiceのモック
    mockCognitoService = {
      signUp: vi.fn(),
      authenticate: vi.fn(),
      deleteUser: vi.fn(),
    };
    vi.mocked(CognitoService).mockImplementation(
      () => mockCognitoService as unknown as CognitoService
    );

    // UserRepositoryのモック
    mockUserRepository = {
      create: vi.fn(),
    };
    vi.mocked(UserRepository).mockImplementation(
      () => mockUserRepository as unknown as UserRepository
    );

    // RateLimiterのモック
    mockRateLimiter = {
      checkLimit: vi.fn(),
      getRetryAfter: vi.fn(),
    };
    vi.mocked(RateLimiter).mockImplementation(() => mockRateLimiter as unknown as RateLimiter);
  });

  describe('POST /auth/register', () => {
    const validRequest = {
      email: 'test@example.com',
      password: 'Password123',
      username: 'testuser',
    };

    describe('有効なリクエストの成功テスト', () => {
      it('有効なリクエストで201ステータスとユーザー情報を返す', async () => {
        // モックの設定
        mockRateLimiter.checkLimit.mockResolvedValue(true);
        mockCognitoService.signUp.mockResolvedValue({
          userId: 'test-user-id',
          userConfirmed: false,
        });
        mockUserRepository.create.mockResolvedValue({
          PK: 'USER#test-user-id',
          SK: 'USER#test-user-id',
          userId: 'test-user-id',
          email: 'test@example.com',
          username: 'testuser',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          entityType: 'USER',
        });
        mockCognitoService.authenticate.mockResolvedValue({
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          idToken: 'test-id-token',
          expiresIn: 900,
        });

        // リクエスト実行
        const res = await app.request('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validRequest),
        });

        // レスポンス検証
        expect(res.status).toBe(201);
        const json = await res.json();
        expect(json).toEqual({
          userId: 'test-user-id',
          email: 'test@example.com',
          username: 'testuser',
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          expiresIn: 900,
        });

        // モックの呼び出し検証
        expect(mockRateLimiter.checkLimit).toHaveBeenCalledWith('unknown', 'register');
        expect(mockCognitoService.signUp).toHaveBeenCalledWith(
          'test@example.com',
          'Password123',
          'testuser'
        );
        expect(mockUserRepository.create).toHaveBeenCalledWith({
          userId: 'test-user-id',
          email: 'test@example.com',
          username: 'testuser',
        });
        expect(mockCognitoService.authenticate).toHaveBeenCalledWith(
          'test@example.com',
          'Password123'
        );
      });
    });

    describe('バリデーションエラーのテスト', () => {
      it('emailが欠落している場合は400エラーを返す', async () => {
        const res = await app.request('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            password: 'Password123',
            username: 'testuser',
          }),
        });

        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toBeDefined();
      });

      it('emailが空文字列の場合は400エラーを返す', async () => {
        const res = await app.request('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: '',
            password: 'Password123',
            username: 'testuser',
          }),
        });

        expect(res.status).toBe(400);
      });

      it('emailが無効な形式の場合は400エラーを返す', async () => {
        const res = await app.request('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'invalid-email',
            password: 'Password123',
            username: 'testuser',
          }),
        });

        expect(res.status).toBe(400);
      });

      it('passwordが欠落している場合は400エラーを返す', async () => {
        const res = await app.request('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            username: 'testuser',
          }),
        });

        expect(res.status).toBe(400);
      });

      it('passwordが空文字列の場合は400エラーを返す', async () => {
        const res = await app.request('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            password: '',
            username: 'testuser',
          }),
        });

        expect(res.status).toBe(400);
      });

      it('passwordが8文字未満の場合は400エラーを返す', async () => {
        const res = await app.request('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'Pass1',
            username: 'testuser',
          }),
        });

        expect(res.status).toBe(400);
      });

      it('passwordに大文字が含まれていない場合は400エラーを返す', async () => {
        const res = await app.request('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
            username: 'testuser',
          }),
        });

        expect(res.status).toBe(400);
      });

      it('passwordに小文字が含まれていない場合は400エラーを返す', async () => {
        const res = await app.request('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'PASSWORD123',
            username: 'testuser',
          }),
        });

        expect(res.status).toBe(400);
      });

      it('passwordに数字が含まれていない場合は400エラーを返す', async () => {
        const res = await app.request('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'PasswordABC',
            username: 'testuser',
          }),
        });

        expect(res.status).toBe(400);
      });

      it('usernameが欠落している場合は400エラーを返す', async () => {
        const res = await app.request('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'Password123',
          }),
        });

        expect(res.status).toBe(400);
      });

      it('usernameが空文字列の場合は400エラーを返す', async () => {
        const res = await app.request('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'Password123',
            username: '',
          }),
        });

        expect(res.status).toBe(400);
      });

      it('usernameが3文字未満の場合は400エラーを返す', async () => {
        const res = await app.request('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'Password123',
            username: 'ab',
          }),
        });

        expect(res.status).toBe(400);
      });

      it('usernameが20文字を超える場合は400エラーを返す', async () => {
        const res = await app.request('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'Password123',
            username: 'a'.repeat(21),
          }),
        });

        expect(res.status).toBe(400);
      });

      it('usernameに無効な文字が含まれている場合は400エラーを返す', async () => {
        const res = await app.request('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'Password123',
            username: 'test user!',
          }),
        });

        expect(res.status).toBe(400);
      });
    });

    describe('メール重複エラーのテスト', () => {
      it('メールアドレスが既に登録されている場合は409エラーを返す', async () => {
        mockRateLimiter.checkLimit.mockResolvedValue(true);
        mockCognitoService.signUp.mockRejectedValue({
          code: 'UsernameExistsException',
          message: 'User already exists',
        });

        const res = await app.request('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validRequest),
        });

        expect(res.status).toBe(409);
        const json = await res.json();
        expect(json).toEqual({
          error: 'CONFLICT',
          message: 'Email already registered',
        });
      });
    });

    describe('レート制限エラーのテスト', () => {
      it('レート制限を超えた場合は429エラーを返す', async () => {
        mockRateLimiter.checkLimit.mockResolvedValue(false);
        mockRateLimiter.getRetryAfter.mockResolvedValue(45);

        const res = await app.request('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validRequest),
        });

        expect(res.status).toBe(429);
        const json = await res.json();
        expect(json).toEqual({
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many registration attempts',
          retryAfter: 45,
        });

        // Cognitoサービスは呼ばれない
        expect(mockCognitoService.signUp).not.toHaveBeenCalled();
      });
    });

    describe('Cognitoエラーのテスト', () => {
      it('Cognitoのパスワードエラーの場合は400エラーを返す', async () => {
        mockRateLimiter.checkLimit.mockResolvedValue(true);
        const error = new Error('Password does not meet requirements') as Error & {
          code: string;
        };
        error.code = 'InvalidPasswordException';
        mockCognitoService.signUp.mockRejectedValue(error);

        const res = await app.request('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validRequest),
        });

        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json).toEqual({
          error: 'VALIDATION_ERROR',
          message: 'Password does not meet requirements',
          details: {
            fields: {
              password: 'Password does not meet requirements',
            },
          },
        });
      });

      it('Cognitoの予期しないエラーの場合は500エラーを返す', async () => {
        mockRateLimiter.checkLimit.mockResolvedValue(true);
        mockCognitoService.signUp.mockRejectedValue({
          code: 'InternalErrorException',
          message: 'Internal server error',
        });

        const res = await app.request('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validRequest),
        });

        expect(res.status).toBe(500);
        const json = await res.json();
        expect(json).toEqual({
          error: 'INTERNAL_ERROR',
          message: 'Registration failed',
        });
      });
    });

    describe('DynamoDBエラー＋ロールバックのテスト', () => {
      it('DynamoDB書き込み失敗時にCognitoユーザーを削除して500エラーを返す', async () => {
        mockRateLimiter.checkLimit.mockResolvedValue(true);
        mockCognitoService.signUp.mockResolvedValue({
          userId: 'test-user-id',
          userConfirmed: false,
        });
        mockUserRepository.create.mockRejectedValue(new Error('DynamoDB error'));
        mockCognitoService.deleteUser.mockResolvedValue(undefined);

        const res = await app.request('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validRequest),
        });

        expect(res.status).toBe(500);
        const json = await res.json();
        expect(json).toEqual({
          error: 'INTERNAL_ERROR',
          message: 'Registration failed',
        });

        // ロールバック処理の検証
        expect(mockCognitoService.deleteUser).toHaveBeenCalledWith('test-user-id');
      });

      it('DynamoDB書き込み失敗時にロールバックが失敗しても500エラーを返す', async () => {
        mockRateLimiter.checkLimit.mockResolvedValue(true);
        mockCognitoService.signUp.mockResolvedValue({
          userId: 'test-user-id',
          userConfirmed: false,
        });
        mockUserRepository.create.mockRejectedValue(new Error('DynamoDB error'));
        mockCognitoService.deleteUser.mockRejectedValue(new Error('Delete failed'));

        const res = await app.request('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validRequest),
        });

        expect(res.status).toBe(500);
        const json = await res.json();
        expect(json).toEqual({
          error: 'INTERNAL_ERROR',
          message: 'Registration failed',
        });

        // ロールバック試行の検証
        expect(mockCognitoService.deleteUser).toHaveBeenCalledWith('test-user-id');
      });
    });

    describe('IPアドレスの取得', () => {
      it('x-forwarded-forヘッダーからIPアドレスを取得する', async () => {
        mockRateLimiter.checkLimit.mockResolvedValue(true);
        mockCognitoService.signUp.mockResolvedValue({
          userId: 'test-user-id',
          userConfirmed: false,
        });
        mockUserRepository.create.mockResolvedValue({
          PK: 'USER#test-user-id',
          SK: 'USER#test-user-id',
          userId: 'test-user-id',
          email: 'test@example.com',
          username: 'testuser',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          entityType: 'USER',
        });
        mockCognitoService.authenticate.mockResolvedValue({
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          idToken: 'test-id-token',
          expiresIn: 900,
        });

        await app.request('/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': '192.168.1.1',
          },
          body: JSON.stringify(validRequest),
        });

        expect(mockRateLimiter.checkLimit).toHaveBeenCalledWith('192.168.1.1', 'register');
      });

      it('x-forwarded-forヘッダーがない場合はunknownを使用する', async () => {
        mockRateLimiter.checkLimit.mockResolvedValue(true);
        mockCognitoService.signUp.mockResolvedValue({
          userId: 'test-user-id',
          userConfirmed: false,
        });
        mockUserRepository.create.mockResolvedValue({
          PK: 'USER#test-user-id',
          SK: 'USER#test-user-id',
          userId: 'test-user-id',
          email: 'test@example.com',
          username: 'testuser',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          entityType: 'USER',
        });
        mockCognitoService.authenticate.mockResolvedValue({
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          idToken: 'test-id-token',
          expiresIn: 900,
        });

        await app.request('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validRequest),
        });

        expect(mockRateLimiter.checkLimit).toHaveBeenCalledWith('unknown', 'register');
      });
    });
  });
});
