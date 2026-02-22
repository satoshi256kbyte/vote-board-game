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

describe('Auth Router Integration Tests', () => {
  let app: Hono;
  let mockCognitoService: {
    signUp: ReturnType<typeof vi.fn>;
    authenticate: ReturnType<typeof vi.fn>;
    deleteUser: ReturnType<typeof vi.fn>;
    forgotPassword: ReturnType<typeof vi.fn>;
    confirmForgotPassword: ReturnType<typeof vi.fn>;
    refreshTokens: ReturnType<typeof vi.fn>;
    extractUserIdFromIdToken: ReturnType<typeof vi.fn>;
  };
  let mockUserRepository: {
    create: ReturnType<typeof vi.fn>;
    getById: ReturnType<typeof vi.fn>;
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
      forgotPassword: vi.fn(),
      confirmForgotPassword: vi.fn(),
      refreshTokens: vi.fn(),
      extractUserIdFromIdToken: vi.fn(),
    };
    vi.mocked(CognitoService).mockImplementation(
      () => mockCognitoService as unknown as CognitoService
    );

    // UserRepositoryのモック
    mockUserRepository = {
      create: vi.fn(),
      getById: vi.fn(),
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

  describe('ログインフローの統合テスト', () => {
    const validLoginRequest = {
      email: 'test@example.com',
      password: 'Password123',
    };

    const mockTokens = {
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      idToken: 'test-id-token',
      expiresIn: 900,
    };

    const mockUser = {
      PK: 'USER#test-user-id',
      SK: 'USER#test-user-id',
      userId: 'test-user-id',
      email: 'test@example.com',
      username: 'testuser',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      entityType: 'USER',
    };

    describe('ログイン成功フロー', () => {
      it('バリデーション→レート制限→認証→ユーザー取得→レスポンスの完全なフローが正常に動作する', async () => {
        // モックの設定（成功パス）
        mockRateLimiter.checkLimit.mockResolvedValue(true);
        mockCognitoService.authenticate.mockResolvedValue(mockTokens);
        mockCognitoService.extractUserIdFromIdToken.mockReturnValue('test-user-id');
        mockUserRepository.getById.mockResolvedValue(mockUser);

        // リクエスト実行
        const res = await app.request('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validLoginRequest),
        });

        // レスポンス検証
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json).toEqual({
          userId: 'test-user-id',
          email: 'test@example.com',
          username: 'testuser',
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          expiresIn: 900,
        });

        // フロー全体の呼び出し順序を検証
        expect(mockRateLimiter.checkLimit).toHaveBeenCalledWith('unknown', 'login');
        expect(mockCognitoService.authenticate).toHaveBeenCalledWith(
          'test@example.com',
          'Password123'
        );
        expect(mockCognitoService.extractUserIdFromIdToken).toHaveBeenCalledWith('test-id-token');
        expect(mockUserRepository.getById).toHaveBeenCalledWith('test-user-id');

        // 呼び出し順序の検証
        const callOrder = vi.mocked(RateLimiter).mock.invocationCallOrder[0];
        const authCallOrder = vi.mocked(CognitoService).mock.invocationCallOrder[0];
        expect(callOrder).toBeLessThan(authCallOrder);
      });

      it('バリデーション通過後にレート制限チェックが実行される', async () => {
        mockRateLimiter.checkLimit.mockResolvedValue(true);
        mockCognitoService.authenticate.mockResolvedValue(mockTokens);
        mockCognitoService.extractUserIdFromIdToken.mockReturnValue('test-user-id');
        mockUserRepository.getById.mockResolvedValue(mockUser);

        await app.request('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validLoginRequest),
        });

        // レート制限チェックが正しいアクションで呼ばれることを検証
        expect(mockRateLimiter.checkLimit).toHaveBeenCalledWith('unknown', 'login');
        expect(mockRateLimiter.checkLimit).toHaveBeenCalledTimes(1);
      });

      it('Cognito認証成功後にIDトークンからuserIdを抽出する', async () => {
        mockRateLimiter.checkLimit.mockResolvedValue(true);
        mockCognitoService.authenticate.mockResolvedValue(mockTokens);
        mockCognitoService.extractUserIdFromIdToken.mockReturnValue('test-user-id');
        mockUserRepository.getById.mockResolvedValue(mockUser);

        await app.request('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validLoginRequest),
        });

        // IDトークンからuserIdを抽出することを検証
        expect(mockCognitoService.extractUserIdFromIdToken).toHaveBeenCalledWith('test-id-token');
        expect(mockCognitoService.extractUserIdFromIdToken).toHaveBeenCalledTimes(1);
      });

      it('userId抽出後にDynamoDBからユーザー情報を取得する', async () => {
        mockRateLimiter.checkLimit.mockResolvedValue(true);
        mockCognitoService.authenticate.mockResolvedValue(mockTokens);
        mockCognitoService.extractUserIdFromIdToken.mockReturnValue('test-user-id');
        mockUserRepository.getById.mockResolvedValue(mockUser);

        await app.request('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validLoginRequest),
        });

        // 抽出されたuserIdでDynamoDBからユーザー情報を取得することを検証
        expect(mockUserRepository.getById).toHaveBeenCalledWith('test-user-id');
        expect(mockUserRepository.getById).toHaveBeenCalledTimes(1);
      });
    });

    describe('ログイン失敗フロー', () => {
      it('バリデーションエラー時は後続処理を実行しない', async () => {
        // 無効なリクエスト（emailが空）
        const res = await app.request('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: '', password: 'Password123' }),
        });

        expect(res.status).toBe(400);

        // バリデーションエラー時は後続処理が呼ばれないことを検証
        expect(mockRateLimiter.checkLimit).not.toHaveBeenCalled();
        expect(mockCognitoService.authenticate).not.toHaveBeenCalled();
        expect(mockUserRepository.getById).not.toHaveBeenCalled();
      });

      it('レート制限超過時は認証処理を実行しない', async () => {
        mockRateLimiter.checkLimit.mockResolvedValue(false);
        mockRateLimiter.getRetryAfter.mockResolvedValue(30);

        const res = await app.request('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validLoginRequest),
        });

        expect(res.status).toBe(429);

        // レート制限超過時は認証処理が呼ばれないことを検証
        expect(mockCognitoService.authenticate).not.toHaveBeenCalled();
        expect(mockUserRepository.getById).not.toHaveBeenCalled();
      });

      it('認証失敗時（NotAuthorizedException）は統一エラーメッセージを返す', async () => {
        mockRateLimiter.checkLimit.mockResolvedValue(true);
        const error = new Error('Incorrect username or password') as Error & {
          name: string;
        };
        error.name = 'NotAuthorizedException';
        mockCognitoService.authenticate.mockRejectedValue(error);

        const res = await app.request('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validLoginRequest),
        });

        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json).toEqual({
          error: 'AUTHENTICATION_FAILED',
          message: 'Invalid email or password',
        });

        // 認証失敗時はユーザー取得が呼ばれないことを検証
        expect(mockUserRepository.getById).not.toHaveBeenCalled();
      });

      it('認証失敗時（UserNotFoundException）は統一エラーメッセージを返す', async () => {
        mockRateLimiter.checkLimit.mockResolvedValue(true);
        const error = new Error('User does not exist') as Error & { name: string };
        error.name = 'UserNotFoundException';
        mockCognitoService.authenticate.mockRejectedValue(error);

        const res = await app.request('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validLoginRequest),
        });

        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json).toEqual({
          error: 'AUTHENTICATION_FAILED',
          message: 'Invalid email or password',
        });

        // 認証失敗時はユーザー取得が呼ばれないことを検証
        expect(mockUserRepository.getById).not.toHaveBeenCalled();
      });

      it('ユーザー未存在時（DynamoDB）は404エラーを返す', async () => {
        mockRateLimiter.checkLimit.mockResolvedValue(true);
        mockCognitoService.authenticate.mockResolvedValue(mockTokens);
        mockCognitoService.extractUserIdFromIdToken.mockReturnValue('test-user-id');
        mockUserRepository.getById.mockResolvedValue(null);

        const res = await app.request('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validLoginRequest),
        });

        expect(res.status).toBe(404);
        const json = await res.json();
        expect(json).toEqual({
          error: 'USER_NOT_FOUND',
          message: 'User not found',
        });

        // Cognito認証とuserIdの抽出は成功していることを検証
        expect(mockCognitoService.authenticate).toHaveBeenCalled();
        expect(mockCognitoService.extractUserIdFromIdToken).toHaveBeenCalled();
        expect(mockUserRepository.getById).toHaveBeenCalled();
      });
    });
  });

  describe('リフレッシュフローの統合テスト', () => {
    const validRefreshRequest = {
      refreshToken: 'valid-refresh-token',
    };

    const mockRefreshResult = {
      accessToken: 'new-access-token',
      idToken: 'new-id-token',
      expiresIn: 900,
    };

    describe('リフレッシュ成功フロー', () => {
      it('バリデーション→レート制限→トークンリフレッシュ→レスポンスの完全なフローが正常に動作する', async () => {
        // モックの設定（成功パス）
        mockRateLimiter.checkLimit.mockResolvedValue(true);
        mockCognitoService.refreshTokens.mockResolvedValue(mockRefreshResult);

        // リクエスト実行
        const res = await app.request('/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validRefreshRequest),
        });

        // レスポンス検証
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json).toEqual({
          accessToken: 'new-access-token',
          expiresIn: 900,
        });

        // フロー全体の呼び出しを検証
        expect(mockRateLimiter.checkLimit).toHaveBeenCalledWith('unknown', 'refresh');
        expect(mockCognitoService.refreshTokens).toHaveBeenCalledWith('valid-refresh-token');

        // 呼び出し順序の検証
        const rateLimitCallOrder = vi.mocked(RateLimiter).mock.invocationCallOrder[0];
        const cognitoCallOrder = vi.mocked(CognitoService).mock.invocationCallOrder[0];
        expect(rateLimitCallOrder).toBeLessThan(cognitoCallOrder);
      });

      it('バリデーション通過後にレート制限チェックが実行される', async () => {
        mockRateLimiter.checkLimit.mockResolvedValue(true);
        mockCognitoService.refreshTokens.mockResolvedValue(mockRefreshResult);

        await app.request('/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validRefreshRequest),
        });

        // レート制限チェックが正しいアクションで呼ばれることを検証
        expect(mockRateLimiter.checkLimit).toHaveBeenCalledWith('unknown', 'refresh');
        expect(mockRateLimiter.checkLimit).toHaveBeenCalledTimes(1);
      });

      it('レート制限通過後にCognitoトークンリフレッシュが実行される', async () => {
        mockRateLimiter.checkLimit.mockResolvedValue(true);
        mockCognitoService.refreshTokens.mockResolvedValue(mockRefreshResult);

        await app.request('/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validRefreshRequest),
        });

        // Cognitoトークンリフレッシュが正しいトークンで呼ばれることを検証
        expect(mockCognitoService.refreshTokens).toHaveBeenCalledWith('valid-refresh-token');
        expect(mockCognitoService.refreshTokens).toHaveBeenCalledTimes(1);
      });
    });

    describe('リフレッシュ失敗フロー', () => {
      it('バリデーションエラー時は後続処理を実行しない', async () => {
        // 無効なリクエスト（refreshTokenが空）
        const res = await app.request('/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: '' }),
        });

        expect(res.status).toBe(400);

        // バリデーションエラー時は後続処理が呼ばれないことを検証
        expect(mockRateLimiter.checkLimit).not.toHaveBeenCalled();
        expect(mockCognitoService.refreshTokens).not.toHaveBeenCalled();
      });

      it('レート制限超過時はトークンリフレッシュを実行しない', async () => {
        mockRateLimiter.checkLimit.mockResolvedValue(false);
        mockRateLimiter.getRetryAfter.mockResolvedValue(15);

        const res = await app.request('/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validRefreshRequest),
        });

        expect(res.status).toBe(429);

        // レート制限超過時はトークンリフレッシュが呼ばれないことを検証
        expect(mockCognitoService.refreshTokens).not.toHaveBeenCalled();
      });

      it('トークン期限切れ時（NotAuthorizedException）は401エラーを返す', async () => {
        mockRateLimiter.checkLimit.mockResolvedValue(true);
        const error = new Error('Token is expired') as Error & { name: string };
        error.name = 'NotAuthorizedException';
        mockCognitoService.refreshTokens.mockRejectedValue(error);

        const res = await app.request('/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validRefreshRequest),
        });

        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json).toEqual({
          error: 'TOKEN_EXPIRED',
          message: 'Refresh token is invalid or expired',
        });

        // トークンリフレッシュは呼ばれていることを検証
        expect(mockCognitoService.refreshTokens).toHaveBeenCalled();
      });

      it('Cognito予期しないエラー時は500エラーを返す', async () => {
        mockRateLimiter.checkLimit.mockResolvedValue(true);
        const error = new Error('Service unavailable') as Error & { name: string };
        error.name = 'InternalErrorException';
        mockCognitoService.refreshTokens.mockRejectedValue(error);

        const res = await app.request('/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validRefreshRequest),
        });

        expect(res.status).toBe(500);
        const json = await res.json();
        expect(json).toEqual({
          error: 'INTERNAL_ERROR',
          message: 'Token refresh failed',
        });
      });
    });
  });
});
