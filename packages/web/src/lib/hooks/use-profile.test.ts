import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useProfile } from './use-profile';
import { profileService } from '@/lib/services/profile-service';
import type { Profile } from '@/lib/types/profile';

// profileServiceをモック
vi.mock('@/lib/services/profile-service', () => ({
  profileService: {
    getProfile: vi.fn(),
  },
}));

describe('useProfile', () => {
  const mockProfile: Profile = {
    userId: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    iconUrl: 'https://example.com/icon.png',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('初期状態', () => {
    it('should start with loading state', () => {
      vi.mocked(profileService.getProfile).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useProfile());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.profile).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('プロフィール取得成功', () => {
    it('should fetch profile on mount', async () => {
      vi.mocked(profileService.getProfile).mockResolvedValueOnce(mockProfile);

      const { result } = renderHook(() => useProfile());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.profile).toEqual(mockProfile);
      expect(result.current.error).toBeNull();
      expect(profileService.getProfile).toHaveBeenCalledTimes(1);
    });

    it('should update profile state with fetched data', async () => {
      vi.mocked(profileService.getProfile).mockResolvedValueOnce(mockProfile);

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.profile).toEqual(mockProfile);
      });

      expect(result.current.profile?.userId).toBe('user-123');
      expect(result.current.profile?.email).toBe('test@example.com');
      expect(result.current.profile?.username).toBe('testuser');
      expect(result.current.profile?.iconUrl).toBe('https://example.com/icon.png');
    });
  });

  describe('プロフィール取得エラー', () => {
    it('should handle Error instance', async () => {
      const errorMessage = '認証エラーが発生しました。再度ログインしてください';
      vi.mocked(profileService.getProfile).mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.profile).toBeNull();
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(profileService.getProfile).mockRejectedValueOnce('Unknown error');

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('プロフィールの取得に失敗しました');
      expect(result.current.profile).toBeNull();
    });

    it('should handle network errors', async () => {
      const networkError = new Error(
        'ネットワークエラーが発生しました。インターネット接続を確認してください'
      );
      vi.mocked(profileService.getProfile).mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.error).toBe(networkError.message);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.profile).toBeNull();
    });

    it('should handle server errors', async () => {
      const serverError = new Error(
        'サーバーエラーが発生しました。しばらくしてから再度お試しください'
      );
      vi.mocked(profileService.getProfile).mockRejectedValueOnce(serverError);

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.error).toBe(serverError.message);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('refetch機能', () => {
    it('should refetch profile when refetch is called', async () => {
      vi.mocked(profileService.getProfile).mockResolvedValueOnce(mockProfile);

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.profile).toEqual(mockProfile);
      });

      expect(profileService.getProfile).toHaveBeenCalledTimes(1);

      // 新しいプロフィールデータ
      const updatedProfile: Profile = {
        ...mockProfile,
        username: 'updateduser',
        updatedAt: '2024-01-02T00:00:00Z',
      };
      vi.mocked(profileService.getProfile).mockResolvedValueOnce(updatedProfile);

      // refetchを呼び出す
      await act(async () => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.profile?.username).toBe('updateduser');
      });

      expect(profileService.getProfile).toHaveBeenCalledTimes(2);
    });

    it('should set loading state during refetch', async () => {
      vi.mocked(profileService.getProfile).mockResolvedValueOnce(mockProfile);

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 遅延を持つPromiseを返す
      let resolvePromise: (value: Profile) => void;
      const delayedPromise = new Promise<Profile>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(profileService.getProfile).mockReturnValueOnce(delayedPromise);

      // refetchを呼び出す
      await act(async () => {
        result.current.refetch();
      });

      // ローディング状態を確認
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Promiseを解決
      await act(async () => {
        resolvePromise!(mockProfile);
        await delayedPromise;
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should clear previous error on refetch', async () => {
      const error = new Error('Initial error');
      vi.mocked(profileService.getProfile).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.error).toBe('Initial error');
      });

      // refetchで成功
      vi.mocked(profileService.getProfile).mockResolvedValueOnce(mockProfile);

      await act(async () => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });

      expect(result.current.profile).toEqual(mockProfile);
    });

    it('should handle refetch errors', async () => {
      vi.mocked(profileService.getProfile).mockResolvedValueOnce(mockProfile);

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.profile).toEqual(mockProfile);
      });

      // refetchでエラー
      const refetchError = new Error('Refetch failed');
      vi.mocked(profileService.getProfile).mockRejectedValueOnce(refetchError);

      await act(async () => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Refetch failed');
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('ローディング状態の管理', () => {
    it('should set isLoading to false after successful fetch', async () => {
      vi.mocked(profileService.getProfile).mockResolvedValueOnce(mockProfile);

      const { result } = renderHook(() => useProfile());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should set isLoading to false after failed fetch', async () => {
      vi.mocked(profileService.getProfile).mockRejectedValueOnce(new Error('Failed'));

      const { result } = renderHook(() => useProfile());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('エッジケース', () => {
    it('should handle profile without iconUrl', async () => {
      const profileWithoutIcon: Profile = {
        ...mockProfile,
        iconUrl: undefined,
      };
      vi.mocked(profileService.getProfile).mockResolvedValueOnce(profileWithoutIcon);

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.profile).toEqual(profileWithoutIcon);
      });

      expect(result.current.profile?.iconUrl).toBeUndefined();
    });

    it('should only call getProfile once on mount', async () => {
      vi.mocked(profileService.getProfile).mockResolvedValueOnce(mockProfile);

      renderHook(() => useProfile());

      await waitFor(() => {
        expect(profileService.getProfile).toHaveBeenCalledTimes(1);
      });

      // Wait a bit more to ensure no additional calls
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(profileService.getProfile).toHaveBeenCalledTimes(1);
    });
  });
});
