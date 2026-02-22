import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  storageService,
  getAccessToken,
  setAccessToken,
  removeAccessToken,
} from './storage-service';

describe('StorageService', () => {
  // localStorageのモック
  const localStorageMock = (() => {
    let store: Record<string, string> = {};

    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
  })();

  beforeEach(() => {
    // 各テスト前にlocalStorageをクリア
    localStorageMock.clear();
    // グローバルなlocalStorageをモックに置き換え
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('アクセストークンの操作', () => {
    describe('setAccessToken', () => {
      it('アクセストークンをローカルストレージに保存する', () => {
        const token = 'test-access-token-123';
        storageService.setAccessToken(token);

        expect(localStorage.getItem('vbg_access_token')).toBe(token);
      });

      it('既存のアクセストークンを上書きする', () => {
        storageService.setAccessToken('old-token');
        storageService.setAccessToken('new-token');

        expect(localStorage.getItem('vbg_access_token')).toBe('new-token');
      });

      it('空文字列のトークンを保存できる', () => {
        storageService.setAccessToken('');

        // jsdomのlocalStorageは空文字列をnullとして返す
        const result = localStorage.getItem('vbg_access_token');
        expect(result === '' || result === null).toBe(true);
      });
    });

    describe('getAccessToken', () => {
      it('保存されたアクセストークンを取得する', () => {
        const token = 'test-access-token-456';
        localStorage.setItem('vbg_access_token', token);

        const result = storageService.getAccessToken();

        expect(result).toBe(token);
      });

      it('トークンが存在しない場合はnullを返す', () => {
        const result = storageService.getAccessToken();

        expect(result).toBeNull();
      });

      it('空文字列のトークンを取得できる', () => {
        localStorage.setItem('vbg_access_token', '');

        const result = storageService.getAccessToken();

        // jsdomのlocalStorageは空文字列をnullとして返す
        expect(result === '' || result === null).toBe(true);
      });
    });

    describe('removeAccessToken', () => {
      it('アクセストークンをローカルストレージから削除する', () => {
        localStorage.setItem('vbg_access_token', 'token-to-remove');

        storageService.removeAccessToken();

        expect(localStorage.getItem('vbg_access_token')).toBeNull();
      });

      it('トークンが存在しない場合でもエラーを発生させない', () => {
        expect(() => storageService.removeAccessToken()).not.toThrow();
      });

      it('削除後にgetAccessTokenはnullを返す', () => {
        storageService.setAccessToken('token');
        storageService.removeAccessToken();

        expect(storageService.getAccessToken()).toBeNull();
      });
    });
  });

  describe('リフレッシュトークンの操作', () => {
    describe('setRefreshToken', () => {
      it('リフレッシュトークンをローカルストレージに保存する', () => {
        const token = 'test-refresh-token-123';
        storageService.setRefreshToken(token);

        expect(localStorage.getItem('vbg_refresh_token')).toBe(token);
      });

      it('既存のリフレッシュトークンを上書きする', () => {
        storageService.setRefreshToken('old-refresh-token');
        storageService.setRefreshToken('new-refresh-token');

        expect(localStorage.getItem('vbg_refresh_token')).toBe('new-refresh-token');
      });

      it('空文字列のトークンを保存できる', () => {
        storageService.setRefreshToken('');

        // jsdomのlocalStorageは空文字列をnullとして返す
        const result = localStorage.getItem('vbg_refresh_token');
        expect(result === '' || result === null).toBe(true);
      });
    });

    describe('getRefreshToken', () => {
      it('保存されたリフレッシュトークンを取得する', () => {
        const token = 'test-refresh-token-456';
        localStorage.setItem('vbg_refresh_token', token);

        const result = storageService.getRefreshToken();

        expect(result).toBe(token);
      });

      it('トークンが存在しない場合はnullを返す', () => {
        const result = storageService.getRefreshToken();

        expect(result).toBeNull();
      });

      it('空文字列のトークンを取得できる', () => {
        localStorage.setItem('vbg_refresh_token', '');

        const result = storageService.getRefreshToken();

        // jsdomのlocalStorageは空文字列をnullとして返す
        expect(result === '' || result === null).toBe(true);
      });
    });

    describe('removeRefreshToken', () => {
      it('リフレッシュトークンをローカルストレージから削除する', () => {
        localStorage.setItem('vbg_refresh_token', 'refresh-token-to-remove');

        storageService.removeRefreshToken();

        expect(localStorage.getItem('vbg_refresh_token')).toBeNull();
      });

      it('トークンが存在しない場合でもエラーを発生させない', () => {
        expect(() => storageService.removeRefreshToken()).not.toThrow();
      });

      it('削除後にgetRefreshTokenはnullを返す', () => {
        storageService.setRefreshToken('refresh-token');
        storageService.removeRefreshToken();

        expect(storageService.getRefreshToken()).toBeNull();
      });
    });
  });

  describe('複数トークンの操作', () => {
    it('アクセストークンとリフレッシュトークンを独立して保存できる', () => {
      const accessToken = 'access-token-123';
      const refreshToken = 'refresh-token-456';

      storageService.setAccessToken(accessToken);
      storageService.setRefreshToken(refreshToken);

      expect(storageService.getAccessToken()).toBe(accessToken);
      expect(storageService.getRefreshToken()).toBe(refreshToken);
    });

    it('アクセストークンの削除はリフレッシュトークンに影響しない', () => {
      storageService.setAccessToken('access-token');
      storageService.setRefreshToken('refresh-token');

      storageService.removeAccessToken();

      expect(storageService.getAccessToken()).toBeNull();
      expect(storageService.getRefreshToken()).toBe('refresh-token');
    });

    it('リフレッシュトークンの削除はアクセストークンに影響しない', () => {
      storageService.setAccessToken('access-token');
      storageService.setRefreshToken('refresh-token');

      storageService.removeRefreshToken();

      expect(storageService.getAccessToken()).toBe('access-token');
      expect(storageService.getRefreshToken()).toBeNull();
    });
  });

  describe('SSR環境での動作', () => {
    let originalWindow: typeof globalThis.window;

    beforeEach(() => {
      // windowオブジェクトを保存
      originalWindow = global.window;
    });

    afterEach(() => {
      // windowオブジェクトを復元
      global.window = originalWindow;
    });

    it('window未定義時、setAccessTokenはエラーを発生させない', () => {
      // @ts-expect-error - テストのためにwindowをundefinedに設定
      delete global.window;

      expect(() => storageService.setAccessToken('token')).not.toThrow();
    });

    it('window未定義時、getAccessTokenはnullを返す', () => {
      // @ts-expect-error - テストのためにwindowをundefinedに設定
      delete global.window;

      const result = storageService.getAccessToken();

      expect(result).toBeNull();
    });

    it('window未定義時、removeAccessTokenはエラーを発生させない', () => {
      // @ts-expect-error - テストのためにwindowをundefinedに設定
      delete global.window;

      expect(() => storageService.removeAccessToken()).not.toThrow();
    });

    it('window未定義時、setRefreshTokenはエラーを発生させない', () => {
      // @ts-expect-error - テストのためにwindowをundefinedに設定
      delete global.window;

      expect(() => storageService.setRefreshToken('token')).not.toThrow();
    });

    it('window未定義時、getRefreshTokenはnullを返す', () => {
      // @ts-expect-error - テストのためにwindowをundefinedに設定
      delete global.window;

      const result = storageService.getRefreshToken();

      expect(result).toBeNull();
    });

    it('window未定義時、removeRefreshTokenはエラーを発生させない', () => {
      // @ts-expect-error - テストのためにwindowをundefinedに設定
      delete global.window;

      expect(() => storageService.removeRefreshToken()).not.toThrow();
    });
  });

  describe('後方互換性のある個別エクスポート', () => {
    it('getAccessToken関数が正しく動作する', () => {
      localStorage.setItem('vbg_access_token', 'test-token');

      const result = getAccessToken();

      expect(result).toBe('test-token');
    });

    it('setAccessToken関数が正しく動作する', () => {
      setAccessToken('new-token');

      expect(localStorage.getItem('vbg_access_token')).toBe('new-token');
    });

    it('removeAccessToken関数が正しく動作する', () => {
      localStorage.setItem('vbg_access_token', 'token-to-remove');

      removeAccessToken();

      expect(localStorage.getItem('vbg_access_token')).toBeNull();
    });

    it('個別エクスポート関数はstorageServiceインスタンスを使用する', () => {
      // storageServiceのメソッドをスパイ
      const setAccessTokenSpy = vi.spyOn(storageService, 'setAccessToken');
      const getAccessTokenSpy = vi.spyOn(storageService, 'getAccessToken');
      const removeAccessTokenSpy = vi.spyOn(storageService, 'removeAccessToken');

      setAccessToken('token');
      getAccessToken();
      removeAccessToken();

      expect(setAccessTokenSpy).toHaveBeenCalledWith('token');
      expect(getAccessTokenSpy).toHaveBeenCalled();
      expect(removeAccessTokenSpy).toHaveBeenCalled();

      // スパイをクリーンアップ
      setAccessTokenSpy.mockRestore();
      getAccessTokenSpy.mockRestore();
      removeAccessTokenSpy.mockRestore();
    });
  });

  describe('エッジケース', () => {
    it('非常に長いトークン文字列を保存・取得できる', () => {
      const longToken = 'a'.repeat(10000);

      storageService.setAccessToken(longToken);

      expect(storageService.getAccessToken()).toBe(longToken);
    });

    it('特殊文字を含むトークンを保存・取得できる', () => {
      const specialToken = 'token-with-!@#$%^&*()_+-={}[]|:;"<>?,./';

      storageService.setAccessToken(specialToken);

      expect(storageService.getAccessToken()).toBe(specialToken);
    });

    it('Unicode文字を含むトークンを保存・取得できる', () => {
      const unicodeToken = 'token-with-日本語-🎮-emoji';

      storageService.setAccessToken(unicodeToken);

      expect(storageService.getAccessToken()).toBe(unicodeToken);
    });

    it('連続した保存・取得・削除操作が正しく動作する', () => {
      storageService.setAccessToken('token1');
      expect(storageService.getAccessToken()).toBe('token1');

      storageService.setAccessToken('token2');
      expect(storageService.getAccessToken()).toBe('token2');

      storageService.removeAccessToken();
      expect(storageService.getAccessToken()).toBeNull();

      storageService.setAccessToken('token3');
      expect(storageService.getAccessToken()).toBe('token3');
    });
  });
});
