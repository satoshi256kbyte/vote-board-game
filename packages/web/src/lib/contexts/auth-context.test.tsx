import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, AuthContext } from './auth-context';
import { useContext } from 'react';
import * as storageService from '@/lib/services/storage-service';

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
    vi.clearAllMocks();
    // localStorageをクリア
    localStorage.clear();
  });

  describe('AuthProvider', () => {
    it('初期状態ではユーザーがnullで認証されていない', () => {
      vi.spyOn(storageService, 'getAccessToken').mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('ユーザー情報を設定できる', () => {
      vi.spyOn(storageService, 'getAccessToken').mockReturnValue('mock-token');

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
      vi.spyOn(storageService, 'getAccessToken').mockReturnValue('mock-token');

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
      vi.spyOn(storageService, 'getAccessToken').mockReturnValue('mock-token');

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('ユーザー情報が存在してもトークンがない場合は認証されていない', () => {
      vi.spyOn(storageService, 'getAccessToken').mockReturnValue(null);

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
      vi.spyOn(storageService, 'getAccessToken').mockReturnValue('mock-token');

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
    it('マウント時にトークンの存在を確認する', () => {
      const getAccessTokenSpy = vi
        .spyOn(storageService, 'getAccessToken')
        .mockReturnValue('mock-token');

      renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(getAccessTokenSpy).toHaveBeenCalled();
    });

    it('トークンが存在しない場合は何もしない', () => {
      vi.spyOn(storageService, 'getAccessToken').mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });
});
