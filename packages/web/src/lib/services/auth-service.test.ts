import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { storageService } from './storage-service';
import type { authService as AuthServiceType } from './auth-service';

// storageServiceのモック
vi.mock('./storage-service', () => ({
  storageService: {
    setAccessToken: vi.fn(),
    setRefreshToken: vi.fn(),
    removeAccessToken: vi.fn(),
    removeRefreshToken: vi.fn(),
  },
}));

describe('AuthService', () => {
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

  describe('login', () => {
    const validEmail = 'test@example.com';
    const validPassword = 'password123';
    const mockLoginResponse = {
      userId: 'user-123',
      email: validEmail,
      username: 'testuser',
      accessToken: 'access-token-abc',
      refreshToken: 'refresh-token-xyz',
      expiresIn: 900,
    };

    describe('ログイン成功時（200レスポンス）', () => {
      it('正しいエンドポイントにPOSTリクエストを送信する', async () => {
        const mockFetch = vi.mocked(global.fetch);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockLoginResponse,
        } as unknown as Response);

        await authService.login(validEmail, validPassword);

        expect(mockFetch).toHaveBeenCalledWith(
          '/auth/login',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: validEmail, password: validPassword }),
          })
        );
      });

      it('レスポンスデータを正しく返す', async () => {
        const mockFetch = vi.mocked(global.fetch);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockLoginResponse,
        } as unknown as Response);

        const result = await authService.login(validEmail, validPassword);

        expect(result).toEqual(mockLoginResponse);
      });

      it('アクセストークンをローカルストレージに保存する', async () => {
        const mockFetch = vi.mocked(global.fetch);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockLoginResponse,
        } as unknown as Response);

        await authService.login(validEmail, validPassword);

        expect(storageService.setAccessToken).toHaveBeenCalledWith(mockLoginResponse.accessToken);
      });

      it('リフレッシュトークンをローカルストレージに保存する', async () => {
        const mockFetch = vi.mocked(global.fetch);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockLoginResponse,
        } as unknown as Response);

        await authService.login(validEmail, validPassword);

        expect(storageService.setRefreshToken).toHaveBeenCalledWith(mockLoginResponse.refreshToken);
      });

      it('トークン保存後にレスポンスを返す', async () => {
        const mockFetch = vi.mocked(global.fetch);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockLoginResponse,
        } as unknown as Response);

        const result = await authService.login(validEmail, validPassword);

        expect(storageService.setAccessToken).toHaveBeenCalled();
        expect(storageService.setRefreshToken).toHaveBeenCalled();
        expect(result).toEqual(mockLoginResponse);
      });
    });

    describe('エラーレスポンスの変換（401）', () => {
      it('401レスポンス時に適切なエラーメッセージを投げる', async () => {
        const mockFetch = vi.mocked(global.fetch);
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({ message: 'Unauthorized' }),
        } as unknown as Response);

        await expect(authService.login(validEmail, validPassword)).rejects.toThrow(
          'メールアドレスまたはパスワードが正しくありません'
        );
      });

      it('401エラー時にトークンを保存しない', async () => {
        const mockFetch = vi.mocked(global.fetch);
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({ message: 'Unauthorized' }),
        } as unknown as Response);

        await expect(authService.login(validEmail, validPassword)).rejects.toThrow();

        expect(storageService.setAccessToken).not.toHaveBeenCalled();
        expect(storageService.setRefreshToken).not.toHaveBeenCalled();
      });
    });

    describe('エラーレスポンスの変換（429）', () => {
      it('429レスポンス時に適切なエラーメッセージを投げる', async () => {
        const mockFetch = vi.mocked(global.fetch);
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: async () => ({ message: 'Too Many Requests' }),
        } as unknown as Response);

        await expect(authService.login(validEmail, validPassword)).rejects.toThrow(
          'ログイン試行回数が上限に達しました。しばらくしてから再度お試しください'
        );
      });

      it('429エラー時にトークンを保存しない', async () => {
        const mockFetch = vi.mocked(global.fetch);
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: async () => ({ message: 'Too Many Requests' }),
        } as unknown as Response);

        await expect(authService.login(validEmail, validPassword)).rejects.toThrow();

        expect(storageService.setAccessToken).not.toHaveBeenCalled();
        expect(storageService.setRefreshToken).not.toHaveBeenCalled();
      });
    });

    describe('エラーレスポンスの変換（500）', () => {
      it('500レスポンス時に適切なエラーメッセージを投げる', async () => {
        const mockFetch = vi.mocked(global.fetch);
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ message: 'Internal Server Error' }),
        } as unknown as Response);

        await expect(authService.login(validEmail, validPassword)).rejects.toThrow(
          'サーバーエラーが発生しました。しばらくしてから再度お試しください'
        );
      });

      it('500エラー時にトークンを保存しない', async () => {
        const mockFetch = vi.mocked(global.fetch);
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ message: 'Internal Server Error' }),
        } as unknown as Response);

        await expect(authService.login(validEmail, validPassword)).rejects.toThrow();

        expect(storageService.setAccessToken).not.toHaveBeenCalled();
        expect(storageService.setRefreshToken).not.toHaveBeenCalled();
      });
    });

    describe('ネットワークエラーのテスト', () => {
      let originalNavigator: Navigator;

      beforeEach(() => {
        originalNavigator = global.navigator;
      });

      afterEach(() => {
        global.navigator = originalNavigator;
      });

      it('オフライン時に適切なエラーメッセージを投げる', async () => {
        // navigatorをモック
        Object.defineProperty(global, 'navigator', {
          value: { onLine: false },
          writable: true,
          configurable: true,
        });

        const mockFetch = vi.mocked(global.fetch);
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 503,
          json: async () => ({ message: 'Service Unavailable' }),
        } as unknown as Response);

        await expect(authService.login(validEmail, validPassword)).rejects.toThrow(
          'ネットワークエラーが発生しました。インターネット接続を確認してください'
        );
      });

      it('fetch失敗時にネットワークエラーメッセージを投げる（オフライン）', async () => {
        // navigatorをモック
        Object.defineProperty(global, 'navigator', {
          value: { onLine: false },
          writable: true,
          configurable: true,
        });

        const mockFetch = vi.mocked(global.fetch);
        mockFetch.mockRejectedValueOnce(new Error('Network request failed'));

        await expect(authService.login(validEmail, validPassword)).rejects.toThrow(
          'Network request failed'
        );
      });

      it('ネットワークエラー時にトークンを保存しない', async () => {
        // navigatorをモック
        Object.defineProperty(global, 'navigator', {
          value: { onLine: false },
          writable: true,
          configurable: true,
        });

        const mockFetch = vi.mocked(global.fetch);
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 503,
          json: async () => ({ message: 'Service Unavailable' }),
        } as unknown as Response);

        await expect(authService.login(validEmail, validPassword)).rejects.toThrow();

        expect(storageService.setAccessToken).not.toHaveBeenCalled();
        expect(storageService.setRefreshToken).not.toHaveBeenCalled();
      });
    });

    describe('その他のエラーケース', () => {
      it('不明なステータスコード時にデフォルトエラーメッセージを投げる（オンライン）', async () => {
        // navigatorをモック
        Object.defineProperty(global, 'navigator', {
          value: { onLine: true },
          writable: true,
          configurable: true,
        });

        const mockFetch = vi.mocked(global.fetch);
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({ message: 'Bad Request' }),
        } as unknown as Response);

        await expect(authService.login(validEmail, validPassword)).rejects.toThrow('Bad Request');
      });

      it('エラーレスポンスのJSONパースに失敗した場合にデフォルトエラーメッセージを投げる', async () => {
        // navigatorをモック
        Object.defineProperty(global, 'navigator', {
          value: { onLine: true },
          writable: true,
          configurable: true,
        });

        const mockFetch = vi.mocked(global.fetch);
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => {
            throw new Error('Invalid JSON');
          },
        } as unknown as Response);

        await expect(authService.login(validEmail, validPassword)).rejects.toThrow(
          'ログインに失敗しました'
        );
      });

      it('エラーレスポンスにmessageがない場合にデフォルトエラーメッセージを投げる', async () => {
        // navigatorをモック
        Object.defineProperty(global, 'navigator', {
          value: { onLine: true },
          writable: true,
          configurable: true,
        });

        const mockFetch = vi.mocked(global.fetch);
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({}),
        } as unknown as Response);

        await expect(authService.login(validEmail, validPassword)).rejects.toThrow(
          'ログインに失敗しました'
        );
      });
    });

    describe('エッジケース', () => {
      it('空のメールアドレスとパスワードでリクエストを送信できる', async () => {
        const mockFetch = vi.mocked(global.fetch);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockLoginResponse,
        } as unknown as Response);

        await authService.login('', '');

        expect(mockFetch).toHaveBeenCalledWith(
          '/auth/login',
          expect.objectContaining({
            body: JSON.stringify({ email: '', password: '' }),
          })
        );
      });

      it('特殊文字を含むメールアドレスとパスワードを正しく送信する', async () => {
        const specialEmail = 'test+tag@example.com';
        const specialPassword = 'p@ssw0rd!#$%';

        const mockFetch = vi.mocked(global.fetch);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockLoginResponse,
        } as unknown as Response);

        await authService.login(specialEmail, specialPassword);

        expect(mockFetch).toHaveBeenCalledWith(
          '/auth/login',
          expect.objectContaining({
            body: JSON.stringify({ email: specialEmail, password: specialPassword }),
          })
        );
      });

      it('非常に長いメールアドレスとパスワードを正しく送信する', async () => {
        const longEmail = 'a'.repeat(100) + '@example.com';
        const longPassword = 'p'.repeat(200);

        const mockFetch = vi.mocked(global.fetch);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockLoginResponse,
        } as unknown as Response);

        await authService.login(longEmail, longPassword);

        expect(mockFetch).toHaveBeenCalledWith(
          '/auth/login',
          expect.objectContaining({
            body: JSON.stringify({ email: longEmail, password: longPassword }),
          })
        );
      });

      it('Unicode文字を含むメールアドレスとパスワードを正しく送信する', async () => {
        const unicodeEmail = 'test日本語@example.com';
        const unicodePassword = 'パスワード123';

        const mockFetch = vi.mocked(global.fetch);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockLoginResponse,
        } as unknown as Response);

        await authService.login(unicodeEmail, unicodePassword);

        expect(mockFetch).toHaveBeenCalledWith(
          '/auth/login',
          expect.objectContaining({
            body: JSON.stringify({ email: unicodeEmail, password: unicodePassword }),
          })
        );
      });
    });
  });

  describe('logout', () => {
    it('アクセストークンを削除する', () => {
      authService.logout();

      expect(storageService.removeAccessToken).toHaveBeenCalled();
    });

    it('リフレッシュトークンを削除する', () => {
      authService.logout();

      expect(storageService.removeRefreshToken).toHaveBeenCalled();
    });

    it('両方のトークンを削除する', () => {
      authService.logout();

      expect(storageService.removeAccessToken).toHaveBeenCalled();
      expect(storageService.removeRefreshToken).toHaveBeenCalled();
    });

    it('エラーを投げない', () => {
      expect(() => authService.logout()).not.toThrow();
    });

    it('複数回呼び出してもエラーを投げない', () => {
      expect(() => {
        authService.logout();
        authService.logout();
        authService.logout();
      }).not.toThrow();
    });
  });
});
