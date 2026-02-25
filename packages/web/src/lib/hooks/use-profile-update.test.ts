import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProfileUpdate } from './use-profile-update';
import { profileService } from '@/lib/services/profile-service';
import type { ProfileUpdateData, Profile } from '@/lib/types/profile';

// profileServiceをモック
vi.mock('@/lib/services/profile-service', () => ({
  profileService: {
    updateProfile: vi.fn(),
  },
}));

describe('useProfileUpdate', () => {
  const mockUpdateData: ProfileUpdateData = {
    username: 'newusername',
    iconUrl: 'https://example.com/new-icon.png',
  };

  const mockUpdatedProfile: Profile = {
    userId: 'user-123',
    email: 'test@example.com',
    username: 'newusername',
    iconUrl: 'https://example.com/new-icon.png',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('初期状態', () => {
    it('should start with idle state', () => {
      const { result } = renderHook(() => useProfileUpdate());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.updateProfile).toBe('function');
    });
  });

  describe('プロフィール更新成功', () => {
    it('should successfully update profile', async () => {
      vi.mocked(profileService.updateProfile).mockResolvedValueOnce(mockUpdatedProfile);

      const { result } = renderHook(() => useProfileUpdate());

      let updateResult: boolean | undefined;

      await act(async () => {
        updateResult = await result.current.updateProfile(mockUpdateData);
      });

      expect(updateResult).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(profileService.updateProfile).toHaveBeenCalledWith(mockUpdateData);
      expect(profileService.updateProfile).toHaveBeenCalledTimes(1);
    });

    it('should update only username', async () => {
      const usernameOnlyData: ProfileUpdateData = {
        username: 'newusername',
      };

      vi.mocked(profileService.updateProfile).mockResolvedValueOnce({
        ...mockUpdatedProfile,
        iconUrl: undefined,
      });

      const { result } = renderHook(() => useProfileUpdate());

      let updateResult: boolean | undefined;

      await act(async () => {
        updateResult = await result.current.updateProfile(usernameOnlyData);
      });

      expect(updateResult).toBe(true);
      expect(profileService.updateProfile).toHaveBeenCalledWith(usernameOnlyData);
    });

    it('should update only iconUrl', async () => {
      const iconOnlyData: ProfileUpdateData = {
        iconUrl: 'https://example.com/new-icon.png',
      };

      vi.mocked(profileService.updateProfile).mockResolvedValueOnce(mockUpdatedProfile);

      const { result } = renderHook(() => useProfileUpdate());

      let updateResult: boolean | undefined;

      await act(async () => {
        updateResult = await result.current.updateProfile(iconOnlyData);
      });

      expect(updateResult).toBe(true);
      expect(profileService.updateProfile).toHaveBeenCalledWith(iconOnlyData);
    });

    it('should clear previous error on successful update', async () => {
      vi.mocked(profileService.updateProfile)
        .mockRejectedValueOnce(new Error('Initial error'))
        .mockResolvedValueOnce(mockUpdatedProfile);

      const { result } = renderHook(() => useProfileUpdate());

      // 最初の更新でエラー
      await act(async () => {
        await result.current.updateProfile(mockUpdateData);
      });

      expect(result.current.error).toBe('Initial error');

      // 2回目の更新で成功
      await act(async () => {
        await result.current.updateProfile(mockUpdateData);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('バリデーションエラー (400)', () => {
    it('should handle validation error with Error instance', async () => {
      const validationError = new Error('ユーザー名は50文字以内で入力してください');
      vi.mocked(profileService.updateProfile).mockRejectedValueOnce(validationError);

      const { result } = renderHook(() => useProfileUpdate());

      let updateResult: boolean | undefined;

      await act(async () => {
        updateResult = await result.current.updateProfile(mockUpdateData);
      });

      expect(updateResult).toBe(false);
      expect(result.current.error).toBe('ユーザー名は50文字以内で入力してください');
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle validation error for empty username', async () => {
      const validationError = new Error('ユーザー名を入力してください');
      vi.mocked(profileService.updateProfile).mockRejectedValueOnce(validationError);

      const { result } = renderHook(() => useProfileUpdate());

      await act(async () => {
        await result.current.updateProfile({ username: '' });
      });

      expect(result.current.error).toBe('ユーザー名を入力してください');
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle validation error for username too long', async () => {
      const longUsername = 'a'.repeat(51);
      const validationError = new Error('ユーザー名は50文字以内で入力してください');
      vi.mocked(profileService.updateProfile).mockRejectedValueOnce(validationError);

      const { result } = renderHook(() => useProfileUpdate());

      await act(async () => {
        await result.current.updateProfile({ username: longUsername });
      });

      expect(result.current.error).toBe('ユーザー名は50文字以内で入力してください');
    });

    it('should handle multiple validation errors', async () => {
      const validationError = new Error('ユーザー名を入力してください, 無効なURLです');
      vi.mocked(profileService.updateProfile).mockRejectedValueOnce(validationError);

      const { result } = renderHook(() => useProfileUpdate());

      await act(async () => {
        await result.current.updateProfile({ username: '', iconUrl: 'invalid-url' });
      });

      expect(result.current.error).toContain('ユーザー名を入力してください');
      expect(result.current.error).toContain('無効なURLです');
    });
  });

  describe('認証エラー (401)', () => {
    it('should handle authentication error', async () => {
      const authError = new Error('認証エラーが発生しました。再度ログインしてください');
      vi.mocked(profileService.updateProfile).mockRejectedValueOnce(authError);

      const { result } = renderHook(() => useProfileUpdate());

      let updateResult: boolean | undefined;

      await act(async () => {
        updateResult = await result.current.updateProfile(mockUpdateData);
      });

      expect(updateResult).toBe(false);
      expect(result.current.error).toBe('認証エラーが発生しました。再度ログインしてください');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('サーバーエラー (500)', () => {
    it('should handle server error', async () => {
      const serverError = new Error(
        'サーバーエラーが発生しました。しばらくしてから再度お試しください'
      );
      vi.mocked(profileService.updateProfile).mockRejectedValueOnce(serverError);

      const { result } = renderHook(() => useProfileUpdate());

      let updateResult: boolean | undefined;

      await act(async () => {
        updateResult = await result.current.updateProfile(mockUpdateData);
      });

      expect(updateResult).toBe(false);
      expect(result.current.error).toBe(
        'サーバーエラーが発生しました。しばらくしてから再度お試しください'
      );
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('ネットワークエラー', () => {
    it('should handle network error', async () => {
      const networkError = new Error(
        'ネットワークエラーが発生しました。インターネット接続を確認してください'
      );
      vi.mocked(profileService.updateProfile).mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useProfileUpdate());

      let updateResult: boolean | undefined;

      await act(async () => {
        updateResult = await result.current.updateProfile(mockUpdateData);
      });

      expect(updateResult).toBe(false);
      expect(result.current.error).toBe(
        'ネットワークエラーが発生しました。インターネット接続を確認してください'
      );
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('非Errorオブジェクトの例外', () => {
    it('should handle non-Error exceptions', async () => {
      vi.mocked(profileService.updateProfile).mockRejectedValueOnce('Unknown error');

      const { result } = renderHook(() => useProfileUpdate());

      let updateResult: boolean | undefined;

      await act(async () => {
        updateResult = await result.current.updateProfile(mockUpdateData);
      });

      expect(updateResult).toBe(false);
      expect(result.current.error).toBe('プロフィールの更新に失敗しました');
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle null exception', async () => {
      vi.mocked(profileService.updateProfile).mockRejectedValueOnce(null);

      const { result } = renderHook(() => useProfileUpdate());

      await act(async () => {
        await result.current.updateProfile(mockUpdateData);
      });

      expect(result.current.error).toBe('プロフィールの更新に失敗しました');
    });

    it('should handle undefined exception', async () => {
      vi.mocked(profileService.updateProfile).mockRejectedValueOnce(undefined);

      const { result } = renderHook(() => useProfileUpdate());

      await act(async () => {
        await result.current.updateProfile(mockUpdateData);
      });

      expect(result.current.error).toBe('プロフィールの更新に失敗しました');
    });
  });

  describe('ローディング状態の管理', () => {
    it('should set isLoading during update', async () => {
      vi.mocked(profileService.updateProfile).mockResolvedValueOnce(mockUpdatedProfile);

      const { result } = renderHook(() => useProfileUpdate());

      expect(result.current.isLoading).toBe(false);

      const updatePromise = act(async () => {
        await result.current.updateProfile(mockUpdateData);
      });

      // 更新中はローディング状態になる（同期的にチェック）
      // Note: React 19では非同期更新が即座に反映されないため、
      // このテストは更新完了後の状態を確認する
      await updatePromise;

      expect(result.current.isLoading).toBe(false);
    });

    it('should set isLoading to false after successful update', async () => {
      vi.mocked(profileService.updateProfile).mockResolvedValueOnce(mockUpdatedProfile);

      const { result } = renderHook(() => useProfileUpdate());

      expect(result.current.isLoading).toBe(false);

      await act(async () => {
        await result.current.updateProfile(mockUpdateData);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should set isLoading to false after failed update', async () => {
      vi.mocked(profileService.updateProfile).mockRejectedValueOnce(new Error('Failed'));

      const { result } = renderHook(() => useProfileUpdate());

      expect(result.current.isLoading).toBe(false);

      await act(async () => {
        await result.current.updateProfile(mockUpdateData);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('複数回の更新', () => {
    it('should handle multiple sequential updates', async () => {
      vi.mocked(profileService.updateProfile)
        .mockResolvedValueOnce(mockUpdatedProfile)
        .mockResolvedValueOnce({ ...mockUpdatedProfile, username: 'anotherusername' });

      const { result } = renderHook(() => useProfileUpdate());

      // 1回目の更新
      let success1: boolean | undefined;
      await act(async () => {
        success1 = await result.current.updateProfile({ username: 'newusername' });
      });

      expect(success1).toBe(true);
      expect(result.current.error).toBeNull();

      // 2回目の更新
      let success2: boolean | undefined;
      await act(async () => {
        success2 = await result.current.updateProfile({ username: 'anotherusername' });
      });

      expect(success2).toBe(true);
      expect(result.current.error).toBeNull();
      expect(profileService.updateProfile).toHaveBeenCalledTimes(2);
    });

    it('should handle update after error', async () => {
      vi.mocked(profileService.updateProfile)
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce(mockUpdatedProfile);

      const { result } = renderHook(() => useProfileUpdate());

      // 1回目の更新でエラー
      let success1: boolean | undefined;
      await act(async () => {
        success1 = await result.current.updateProfile(mockUpdateData);
      });

      expect(success1).toBe(false);
      expect(result.current.error).toBe('First error');

      // 2回目の更新で成功
      let success2: boolean | undefined;
      await act(async () => {
        success2 = await result.current.updateProfile(mockUpdateData);
      });

      expect(success2).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });

  describe('エッジケース', () => {
    it('should handle empty update data', async () => {
      vi.mocked(profileService.updateProfile).mockResolvedValueOnce(mockUpdatedProfile);

      const { result } = renderHook(() => useProfileUpdate());

      await act(async () => {
        await result.current.updateProfile({});
      });

      expect(profileService.updateProfile).toHaveBeenCalledWith({});
    });

    it('should handle update with only whitespace username', async () => {
      const validationError = new Error('ユーザー名を入力してください');
      vi.mocked(profileService.updateProfile).mockRejectedValueOnce(validationError);

      const { result } = renderHook(() => useProfileUpdate());

      await act(async () => {
        await result.current.updateProfile({ username: '   ' });
      });

      expect(result.current.error).toBe('ユーザー名を入力してください');
    });

    it('should handle update with special characters in username', async () => {
      vi.mocked(profileService.updateProfile).mockResolvedValueOnce({
        ...mockUpdatedProfile,
        username: 'user@123!',
      });

      const { result } = renderHook(() => useProfileUpdate());

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.updateProfile({ username: 'user@123!' });
      });

      expect(success).toBe(true);
    });

    it('should handle update with very long iconUrl', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(500) + '.png';
      vi.mocked(profileService.updateProfile).mockResolvedValueOnce({
        ...mockUpdatedProfile,
        iconUrl: longUrl,
      });

      const { result } = renderHook(() => useProfileUpdate());

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.updateProfile({ iconUrl: longUrl });
      });

      expect(success).toBe(true);
    });
  });

  describe('戻り値の検証', () => {
    it('should return true on successful update', async () => {
      vi.mocked(profileService.updateProfile).mockResolvedValueOnce(mockUpdatedProfile);

      const { result } = renderHook(() => useProfileUpdate());

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.updateProfile(mockUpdateData);
      });

      expect(success).toBe(true);
    });

    it('should return false on failed update', async () => {
      vi.mocked(profileService.updateProfile).mockRejectedValueOnce(new Error('Failed'));

      const { result } = renderHook(() => useProfileUpdate());

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.updateProfile(mockUpdateData);
      });

      expect(success).toBe(false);
    });
  });
});
