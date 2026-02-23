import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { storageService } from './storage-service';
import type { authService as AuthServiceType } from './auth-service';

/**
 * Feature: login-screen, Property 4: トークンのローカルストレージ保存
 * **検証: 要件 4.2**
 *
 * 任意のログイン成功レスポンス(accessTokenとrefreshTokenを含む)に対して、
 * 両方のトークンがブラウザのローカルストレージに正しく保存されるべきです。
 */

// storageServiceのモック
vi.mock('./storage-service', () => ({
  storageService: {
    setAccessToken: vi.fn(),
    setRefreshToken: vi.fn(),
    getAccessToken: vi.fn(),
    getRefreshToken: vi.fn(),
    removeAccessToken: vi.fn(),
    removeRefreshToken: vi.fn(),
  },
}));

describe('Auth Service - Property-Based Tests', () => {
  let authService: typeof AuthServiceType;

  beforeEach(async () => {
    // fetchのモックをリセット
    vi.clearAllMocks();
    // グローバルfetchをモック
    global.fetch = vi.fn();

    // モジュールをリセットして再インポート
    vi.resetModules();
    const module = await import('./auth-service');
    authService = module.authService;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('プロパティ4: トークンのローカルストレージ保存', () => {
    /**
     * Arbitrary for generating valid login response data
     */
    const loginResponseArbitrary = fc.record({
      userId: fc.string({ minLength: 1, maxLength: 100 }),
      email: fc.emailAddress(),
      username: fc.string({ minLength: 1, maxLength: 50 }),
      accessToken: fc.string({ minLength: 10, maxLength: 500 }),
      refreshToken: fc.string({ minLength: 10, maxLength: 500 }),
      expiresIn: fc.integer({ min: 1, max: 86400 }), // 1秒から24時間
    });

    it('任意のログイン成功レスポンスに対して、accessTokenとrefreshTokenが正しく保存される', async () => {
      await fc.assert(
        fc.asyncProperty(
          loginResponseArbitrary,
          fc.emailAddress(),
          fc.string({ minLength: 1 }),
          async (mockResponse, email, password) => {
            // 各イテレーションでモックをクリア
            vi.clearAllMocks();

            // fetchのモックを設定
            const mockFetch = vi.mocked(global.fetch);
            mockFetch.mockResolvedValueOnce({
              ok: true,
              status: 200,
              json: async () => mockResponse,
            } as unknown as Response);

            // ログイン実行
            const result = await authService.login(email, password);

            // アサーション: レスポンスが正しく返される
            expect(result).toEqual(mockResponse);

            // アサーション: accessTokenが保存される
            expect(storageService.setAccessToken).toHaveBeenCalledWith(mockResponse.accessToken);

            // アサーション: refreshTokenが保存される
            expect(storageService.setRefreshToken).toHaveBeenCalledWith(mockResponse.refreshToken);

            // アサーション: 両方のトークンが正確に1回ずつ保存される
            expect(storageService.setAccessToken).toHaveBeenCalledTimes(1);
            expect(storageService.setRefreshToken).toHaveBeenCalledTimes(1);
          }
        ),
        {
          numRuns: 100, // 100回のランダムテストを実行
          verbose: true,
        }
      );
    });

    it('任意のトークン値（空文字列、特殊文字、長い文字列）に対して正しく保存される', async () => {
      // より広範なトークン値をテスト
      const wideTokenArbitrary = fc.record({
        userId: fc.string({ minLength: 1, maxLength: 100 }),
        email: fc.emailAddress(),
        username: fc.string({ minLength: 1, maxLength: 50 }),
        accessToken: fc.oneof(
          fc.string({ minLength: 0, maxLength: 1000 }), // 空文字列を含む
          fc.string({ minLength: 10, maxLength: 200 }), // 通常の文字列
          fc.uuid() // UUID形式
        ),
        refreshToken: fc.oneof(
          fc.string({ minLength: 0, maxLength: 1000 }),
          fc.string({ minLength: 10, maxLength: 200 }),
          fc.uuid()
        ),
        expiresIn: fc.integer({ min: 1, max: 86400 }),
      });

      await fc.assert(
        fc.asyncProperty(
          wideTokenArbitrary,
          fc.emailAddress(),
          fc.string({ minLength: 1 }),
          async (mockResponse, email, password) => {
            // 各イテレーションでモックをクリア
            vi.clearAllMocks();

            // fetchのモックを設定
            const mockFetch = vi.mocked(global.fetch);
            mockFetch.mockResolvedValueOnce({
              ok: true,
              status: 200,
              json: async () => mockResponse,
            } as unknown as Response);

            // ログイン実行
            await authService.login(email, password);

            // アサーション: トークンが保存される（値に関わらず）
            expect(storageService.setAccessToken).toHaveBeenCalledWith(mockResponse.accessToken);
            expect(storageService.setRefreshToken).toHaveBeenCalledWith(mockResponse.refreshToken);
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('任意のユーザー情報（userId、email、username）に対してトークンが保存される', async () => {
      // ユーザー情報のバリエーションをテスト
      const userInfoArbitrary = fc.record({
        userId: fc.oneof(
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 999999 }).map(String)
        ),
        email: fc.oneof(
          fc.emailAddress(),
          fc.string({ minLength: 1, maxLength: 100 }).map((s) => `${s}@example.com`)
        ),
        username: fc.oneof(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 5, maxLength: 30 })
        ),
        accessToken: fc.string({ minLength: 10, maxLength: 200 }),
        refreshToken: fc.string({ minLength: 10, maxLength: 200 }),
        expiresIn: fc.integer({ min: 1, max: 86400 }),
      });

      await fc.assert(
        fc.asyncProperty(
          userInfoArbitrary,
          fc.emailAddress(),
          fc.string({ minLength: 1 }),
          async (mockResponse, email, password) => {
            // 各イテレーションでモックをクリア
            vi.clearAllMocks();

            // fetchのモックを設定
            const mockFetch = vi.mocked(global.fetch);
            mockFetch.mockResolvedValueOnce({
              ok: true,
              status: 200,
              json: async () => mockResponse,
            } as unknown as Response);

            // ログイン実行
            const result = await authService.login(email, password);

            // アサーション: レスポンス全体が正しく返される
            expect(result).toEqual(mockResponse);

            // アサーション: ユーザー情報に関わらずトークンが保存される
            expect(storageService.setAccessToken).toHaveBeenCalledWith(mockResponse.accessToken);
            expect(storageService.setRefreshToken).toHaveBeenCalledWith(mockResponse.refreshToken);
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('任意のexpiresIn値に対してトークンが保存される', async () => {
      // expiresInのバリエーションをテスト
      const expiresInArbitrary = fc.record({
        userId: fc.string({ minLength: 1, maxLength: 100 }),
        email: fc.emailAddress(),
        username: fc.string({ minLength: 1, maxLength: 50 }),
        accessToken: fc.string({ minLength: 10, maxLength: 200 }),
        refreshToken: fc.string({ minLength: 10, maxLength: 200 }),
        expiresIn: fc.oneof(
          fc.integer({ min: 1, max: 60 }), // 1秒から1分
          fc.integer({ min: 60, max: 3600 }), // 1分から1時間
          fc.integer({ min: 3600, max: 86400 }), // 1時間から24時間
          fc.constant(900) // デフォルト値（15分）
        ),
      });

      await fc.assert(
        fc.asyncProperty(
          expiresInArbitrary,
          fc.emailAddress(),
          fc.string({ minLength: 1 }),
          async (mockResponse, email, password) => {
            // 各イテレーションでモックをクリア
            vi.clearAllMocks();

            // fetchのモックを設定
            const mockFetch = vi.mocked(global.fetch);
            mockFetch.mockResolvedValueOnce({
              ok: true,
              status: 200,
              json: async () => mockResponse,
            } as unknown as Response);

            // ログイン実行
            await authService.login(email, password);

            // アサーション: expiresInの値に関わらずトークンが保存される
            expect(storageService.setAccessToken).toHaveBeenCalledWith(mockResponse.accessToken);
            expect(storageService.setRefreshToken).toHaveBeenCalledWith(mockResponse.refreshToken);
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });
  });
});
