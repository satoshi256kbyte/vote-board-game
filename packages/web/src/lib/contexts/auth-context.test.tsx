import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { AuthProvider, AuthContext } from './auth-context';
import { useContext } from 'react';
import { storageService } from '@/lib/services/storage-service';
import { authService } from '@/lib/services/auth-service';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// useContextをラップしたカスタムフック
function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('AuthProvider', () => {
    it('初期状態ではユーザーがnullで認証されていない', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('ユーザー情報を設定できる', () => {
      localStorage.setItem('vbg_access_token', 'mock-token');

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
      };

      act(() => {
        result.current.setUser(mockUser);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('ユーザー情報をnullに設定できる', () => {
      localStorage.setItem('vbg_access_token', 'mock-token');

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
      };

      act(() => {
        result.current.setUser(mockUser);
      });

      expect(result.current.user).toEqual(mockUser);

      act(() => {
        result.current.setUser(null);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('トークンが存在してもユーザー情報がない場合は認証されていない', () => {
      localStorage.setItem('vbg_access_token', 'mock-token');

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // No user stored, so even with token, not authenticated
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('ユーザー情報が存在してもトークンがない場合は認証されていない', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
      };

      act(() => {
        result.current.setUser(mockUser);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('ユーザー情報とトークンの両方が存在する場合は認証されている', () => {
      localStorage.setItem('vbg_access_token', 'mock-token');

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
      };

      act(() => {
        result.current.setUser(mockUser);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('初期化', () => {
    it('マウント時にトークンとユーザー情報の存在を確認する', () => {
      const getAccessTokenSpy = vi.spyOn(storageService, 'getAccessToken');
      const getUserSpy = vi.spyOn(storageService, 'getUser');

      renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(getAccessTokenSpy).toHaveBeenCalled();
      expect(getUserSpy).toHaveBeenCalled();
    });

    it('トークンが存在しない場合はユーザーがnullで認証されていない', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('トークンとユーザー情報が存在する場合は認証状態を復元する', () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
      };
      localStorage.setItem('vbg_access_token', 'mock-token');
      localStorage.setItem('vbg_user', JSON.stringify(mockUser));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('isLoading', () => {
    it('初期化完了後に isLoading が false になる', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('login', () => {
    it('login でユーザー情報を設定し StorageService に保存する', () => {
      localStorage.setItem('vbg_access_token', 'mock-token');
      const setUserSpy = vi.spyOn(storageService, 'setUser');

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
      };

      act(() => {
        result.current.login(mockUser);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(setUserSpy).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('logout', () => {
    it('logout で状態をリセットし StorageService をクリアする', () => {
      const clearAllSpy = vi.spyOn(storageService, 'clearAll');

      localStorage.setItem('vbg_access_token', 'mock-token');
      localStorage.setItem(
        'vbg_user',
        JSON.stringify({
          userId: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
        })
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current.isAuthenticated).toBe(true);

      act(() => {
        result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(clearAllSpy).toHaveBeenCalled();
    });

    it('logout 後に /login にリダイレクトする', () => {
      localStorage.setItem('vbg_access_token', 'mock-token');
      localStorage.setItem(
        'vbg_user',
        JSON.stringify({
          userId: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
        })
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      act(() => {
        result.current.logout();
      });

      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  describe('トークン自動リフレッシュ', () => {
    it('認証済み状態でマウント時にリフレッシュタイマーをスケジュールする', () => {
      localStorage.setItem('vbg_access_token', 'mock-token');
      localStorage.setItem('vbg_refresh_token', 'mock-refresh-token');
      localStorage.setItem(
        'vbg_user',
        JSON.stringify({
          userId: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
        })
      );

      const refreshSpy = vi
        .spyOn(authService, 'refreshToken')
        .mockResolvedValue({ accessToken: 'new-token', expiresIn: 900 });

      renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Timer should be set for (900 - 60) * 1000 = 840000ms
      expect(refreshSpy).not.toHaveBeenCalled();

      // Advance to just before the refresh time
      act(() => {
        vi.advanceTimersByTime(839999);
      });
      expect(refreshSpy).not.toHaveBeenCalled();

      // Advance to the refresh time
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(refreshSpy).toHaveBeenCalledWith('mock-refresh-token');
    });

    it('リフレッシュ失敗（401）時にログアウトする', async () => {
      localStorage.setItem('vbg_access_token', 'mock-token');
      localStorage.setItem('vbg_refresh_token', 'mock-refresh-token');
      localStorage.setItem(
        'vbg_user',
        JSON.stringify({
          userId: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
        })
      );

      vi.spyOn(authService, 'refreshToken').mockRejectedValue(
        new Error('リフレッシュトークンが無効または期限切れです')
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Advance to trigger refresh
      await act(async () => {
        vi.advanceTimersByTime(840000);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    it('ネットワークエラー時に30秒後にリトライする', async () => {
      localStorage.setItem('vbg_access_token', 'mock-token');
      localStorage.setItem('vbg_refresh_token', 'mock-refresh-token');
      localStorage.setItem(
        'vbg_user',
        JSON.stringify({
          userId: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
        })
      );

      const refreshSpy = vi
        .spyOn(authService, 'refreshToken')
        .mockRejectedValueOnce(new Error('ネットワークエラー'))
        .mockResolvedValueOnce({ accessToken: 'new-token', expiresIn: 900 });

      renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Trigger initial refresh
      await act(async () => {
        vi.advanceTimersByTime(840000);
      });

      expect(refreshSpy).toHaveBeenCalledTimes(1);

      // Advance 30 seconds for retry
      await act(async () => {
        vi.advanceTimersByTime(30000);
      });

      expect(refreshSpy).toHaveBeenCalledTimes(2);
    });

    it('リトライ上限（3回）到達でログアウトする', async () => {
      localStorage.setItem('vbg_access_token', 'mock-token');
      localStorage.setItem('vbg_refresh_token', 'mock-refresh-token');
      localStorage.setItem(
        'vbg_user',
        JSON.stringify({
          userId: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
        })
      );

      vi.spyOn(authService, 'refreshToken').mockRejectedValue(new Error('ネットワークエラー'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Trigger initial refresh (attempt 1)
      await act(async () => {
        vi.advanceTimersByTime(840000);
      });

      // Retry 1 (attempt 2)
      await act(async () => {
        vi.advanceTimersByTime(30000);
      });

      // Retry 2 (attempt 3) - should logout
      await act(async () => {
        vi.advanceTimersByTime(30000);
      });

      expect(result.current.user).toBeNull();
      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    it('アンマウント時にタイマーをクリアする', () => {
      localStorage.setItem('vbg_access_token', 'mock-token');
      localStorage.setItem('vbg_refresh_token', 'mock-refresh-token');
      localStorage.setItem(
        'vbg_user',
        JSON.stringify({
          userId: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
        })
      );

      const refreshSpy = vi
        .spyOn(authService, 'refreshToken')
        .mockResolvedValue({ accessToken: 'new-token', expiresIn: 900 });

      const { unmount } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      unmount();

      // Advance past refresh time - should not trigger
      act(() => {
        vi.advanceTimersByTime(900000);
      });

      expect(refreshSpy).not.toHaveBeenCalled();
    });
  });
});
