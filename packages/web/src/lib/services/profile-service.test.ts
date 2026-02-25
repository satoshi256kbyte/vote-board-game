import { describe, it, expect, beforeEach, vi } from 'vitest';
import { profileService } from './profile-service';
import { storageService } from './storage-service';
import type { Profile, ProfileUpdateData, UploadUrlResponse } from '@/lib/types/profile';

// グローバルfetchをモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

// storageServiceをモック
vi.mock('./storage-service', () => ({
  storageService: {
    getAccessToken: vi.fn(),
  },
}));

describe('ProfileService', () => {
  const mockToken = 'test-access-token';
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
    mockFetch.mockReset();
    vi.mocked(storageService.getAccessToken).mockReturnValue(mockToken);
  });

  describe('getProfile', () => {
    it('should successfully fetch profile data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockProfile,
      });

      const result = await profileService.getProfile();

      expect(result).toEqual(mockProfile);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/profile'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it('should throw error when access token is missing', async () => {
      vi.mocked(storageService.getAccessToken).mockReturnValue(null);

      await expect(profileService.getProfile()).rejects.toThrow(
        '認証エラーが発生しました。再度ログインしてください'
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should throw error on 401 unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await expect(profileService.getProfile()).rejects.toThrow(
        '認証エラーが発生しました。再度ログインしてください'
      );
    });

    it('should throw error on 404 not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(profileService.getProfile()).rejects.toThrow('ユーザーが見つかりません');
    });

    it('should throw error on 500 server error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(profileService.getProfile()).rejects.toThrow(
        'サーバーエラーが発生しました。しばらくしてから再度お試しください'
      );
    });

    it('should throw generic error on other HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
      });

      await expect(profileService.getProfile()).rejects.toThrow('プロフィールの取得に失敗しました');
    });

    it('should throw network error on TypeError', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Network error'));

      await expect(profileService.getProfile()).rejects.toThrow(
        'ネットワークエラーが発生しました。インターネット接続を確認してください'
      );
    });
  });

  describe('updateProfile', () => {
    const updateData: ProfileUpdateData = {
      username: 'newusername',
      iconUrl: 'https://example.com/new-icon.png',
    };

    const updatedProfile: Profile = {
      ...mockProfile,
      username: 'newusername',
      iconUrl: 'https://example.com/new-icon.png',
      updatedAt: '2024-01-02T00:00:00Z',
    };

    it('should successfully update profile', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => updatedProfile,
      });

      const result = await profileService.updateProfile(updateData);

      expect(result).toEqual(updatedProfile);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/profile'),
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          }),
          body: JSON.stringify(updateData),
        })
      );
    });

    it('should throw error when access token is missing', async () => {
      vi.mocked(storageService.getAccessToken).mockReturnValue(null);

      await expect(profileService.updateProfile(updateData)).rejects.toThrow(
        '認証エラーが発生しました。再度ログインしてください'
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should throw validation error on 400 with field errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          message: 'Validation failed',
          details: {
            fields: {
              username: 'ユーザー名は50文字以内で入力してください',
            },
          },
        }),
      });

      await expect(profileService.updateProfile(updateData)).rejects.toThrow(
        'ユーザー名は50文字以内で入力してください'
      );
    });

    it('should throw validation error on 400 with multiple field errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          message: 'Validation failed',
          details: {
            fields: {
              username: 'ユーザー名を入力してください',
              iconUrl: '無効なURLです',
            },
          },
        }),
      });

      await expect(profileService.updateProfile(updateData)).rejects.toThrow(
        /ユーザー名を入力してください.*無効なURLです|無効なURLです.*ユーザー名を入力してください/
      );
    });

    it('should throw validation error on 400 without field errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          message: 'Invalid request',
        }),
      });

      await expect(profileService.updateProfile(updateData)).rejects.toThrow('Invalid request');
    });

    it('should throw generic validation error on 400 without message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({}),
      });

      await expect(profileService.updateProfile(updateData)).rejects.toThrow(
        'バリデーションエラーが発生しました'
      );
    });

    it('should throw error on 401 unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await expect(profileService.updateProfile(updateData)).rejects.toThrow(
        '認証エラーが発生しました。再度ログインしてください'
      );
    });

    it('should throw error on 500 server error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(profileService.updateProfile(updateData)).rejects.toThrow(
        'サーバーエラーが発生しました。しばらくしてから再度お試しください'
      );
    });

    it('should throw generic error on other HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
      });

      await expect(profileService.updateProfile(updateData)).rejects.toThrow(
        'プロフィールの更新に失敗しました'
      );
    });

    it('should throw network error on TypeError', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Network error'));

      await expect(profileService.updateProfile(updateData)).rejects.toThrow(
        'ネットワークエラーが発生しました。インターネット接続を確認してください'
      );
    });
  });

  describe('getUploadUrl', () => {
    const mockUploadUrlResponse: UploadUrlResponse = {
      uploadUrl: 'https://s3.amazonaws.com/bucket/presigned-url',
      iconUrl: 'https://cdn.example.com/icons/user-123.png',
      expiresIn: 3600,
    };

    it('should successfully get upload URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockUploadUrlResponse,
      });

      const result = await profileService.getUploadUrl('png');

      expect(result).toEqual(mockUploadUrlResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/profile/icon/upload-url'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          }),
          body: JSON.stringify({ fileExtension: 'png' }),
        })
      );
    });

    it('should throw error when access token is missing', async () => {
      vi.mocked(storageService.getAccessToken).mockReturnValue(null);

      await expect(profileService.getUploadUrl('png')).rejects.toThrow(
        '認証エラーが発生しました。再度ログインしてください'
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should throw error on 400 unsupported file format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      await expect(profileService.getUploadUrl('bmp')).rejects.toThrow(
        'サポートされていないファイル形式です'
      );
    });

    it('should throw error on 401 unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await expect(profileService.getUploadUrl('png')).rejects.toThrow(
        '認証エラーが発生しました。再度ログインしてください'
      );
    });

    it('should throw error on 500 server error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(profileService.getUploadUrl('png')).rejects.toThrow(
        'サーバーエラーが発生しました。しばらくしてから再度お試しください'
      );
    });

    it('should throw generic error on other HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
      });

      await expect(profileService.getUploadUrl('png')).rejects.toThrow(
        'アップロードURLの取得に失敗しました'
      );
    });

    it('should throw network error on TypeError', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Network error'));

      await expect(profileService.getUploadUrl('png')).rejects.toThrow(
        'ネットワークエラーが発生しました。インターネット接続を確認してください'
      );
    });

    it('should handle different file extensions', async () => {
      const extensions = ['png', 'jpg', 'jpeg', 'gif'];

      for (const ext of extensions) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            ...mockUploadUrlResponse,
            iconUrl: `https://cdn.example.com/icons/user-123.${ext}`,
          }),
        });

        const result = await profileService.getUploadUrl(ext);
        expect(result.iconUrl).toContain(ext);
      }
    });
  });
});
