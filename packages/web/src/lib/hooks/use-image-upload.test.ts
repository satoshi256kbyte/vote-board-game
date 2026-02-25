import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useImageUpload } from './use-image-upload';
import { profileService } from '@/lib/services/profile-service';

// profileServiceをモック
vi.mock('@/lib/services/profile-service', () => ({
  profileService: {
    getUploadUrl: vi.fn(),
  },
}));

// グローバルfetchをモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useImageUpload', () => {
  const mockFile = new File(['test content'], 'test-image.png', { type: 'image/png' });
  const mockUploadUrl = 'https://s3.amazonaws.com/bucket/presigned-url';
  const mockIconUrl = 'https://cdn.example.com/icons/user-123.png';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('初期状態', () => {
    it('should start with idle state', () => {
      const { result } = renderHook(() => useImageUpload());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.uploadImage).toBe('function');
      expect(typeof result.current.retry).toBe('function');
    });
  });

  describe('画像アップロード成功', () => {
    it('should successfully upload image', async () => {
      vi.mocked(profileService.getUploadUrl).mockResolvedValueOnce({
        uploadUrl: mockUploadUrl,
        iconUrl: mockIconUrl,
        expiresIn: 3600,
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const { result } = renderHook(() => useImageUpload());

      let uploadResult;
      await act(async () => {
        uploadResult = await result.current.uploadImage(mockFile);
      });

      expect(uploadResult).toEqual({ iconUrl: mockIconUrl });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(profileService.getUploadUrl).toHaveBeenCalledWith('png');
      expect(mockFetch).toHaveBeenCalledWith(mockUploadUrl, {
        method: 'PUT',
        body: mockFile,
        headers: {
          'Content-Type': 'image/png',
        },
      });
    });

    it('should extract file extension correctly for JPEG', async () => {
      const jpegFile = new File(['test'], 'photo.jpeg', { type: 'image/jpeg' });

      vi.mocked(profileService.getUploadUrl).mockResolvedValueOnce({
        uploadUrl: mockUploadUrl,
        iconUrl: mockIconUrl,
        expiresIn: 3600,
      });

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const { result } = renderHook(() => useImageUpload());

      await act(async () => {
        await result.current.uploadImage(jpegFile);
      });

      expect(profileService.getUploadUrl).toHaveBeenCalledWith('jpeg');
    });

    it('should extract file extension correctly for JPG', async () => {
      const jpgFile = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });

      vi.mocked(profileService.getUploadUrl).mockResolvedValueOnce({
        uploadUrl: mockUploadUrl,
        iconUrl: mockIconUrl,
        expiresIn: 3600,
      });

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const { result } = renderHook(() => useImageUpload());

      await act(async () => {
        await result.current.uploadImage(jpgFile);
      });

      expect(profileService.getUploadUrl).toHaveBeenCalledWith('jpg');
    });

    it('should extract file extension correctly for GIF', async () => {
      const gifFile = new File(['test'], 'animation.gif', { type: 'image/gif' });

      vi.mocked(profileService.getUploadUrl).mockResolvedValueOnce({
        uploadUrl: mockUploadUrl,
        iconUrl: mockIconUrl,
        expiresIn: 3600,
      });

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const { result } = renderHook(() => useImageUpload());

      await act(async () => {
        await result.current.uploadImage(gifFile);
      });

      expect(profileService.getUploadUrl).toHaveBeenCalledWith('gif');
    });

    it('should handle file without extension', async () => {
      const noExtFile = new File(['test'], 'image', { type: 'image/png' });

      vi.mocked(profileService.getUploadUrl).mockResolvedValueOnce({
        uploadUrl: mockUploadUrl,
        iconUrl: mockIconUrl,
        expiresIn: 3600,
      });

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const { result } = renderHook(() => useImageUpload());

      await act(async () => {
        await result.current.uploadImage(noExtFile);
      });

      // ファイル名に拡張子がない場合、ファイル名自体が拡張子として扱われる
      expect(profileService.getUploadUrl).toHaveBeenCalledWith('image');
    });

    it('should handle uppercase file extension', async () => {
      const upperFile = new File(['test'], 'IMAGE.PNG', { type: 'image/png' });

      vi.mocked(profileService.getUploadUrl).mockResolvedValueOnce({
        uploadUrl: mockUploadUrl,
        iconUrl: mockIconUrl,
        expiresIn: 3600,
      });

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const { result } = renderHook(() => useImageUpload());

      await act(async () => {
        await result.current.uploadImage(upperFile);
      });

      expect(profileService.getUploadUrl).toHaveBeenCalledWith('png');
    });

    it('should clear previous error on successful upload', async () => {
      vi.mocked(profileService.getUploadUrl)
        .mockRejectedValueOnce(new Error('Initial error'))
        .mockResolvedValueOnce({
          uploadUrl: mockUploadUrl,
          iconUrl: mockIconUrl,
          expiresIn: 3600,
        });

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const { result } = renderHook(() => useImageUpload());

      // 最初のアップロードでエラー
      await act(async () => {
        await result.current.uploadImage(mockFile);
      });

      expect(result.current.error).toBe('Initial error');

      // 2回目のアップロードで成功
      await act(async () => {
        await result.current.uploadImage(mockFile);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Presigned URL取得エラー', () => {
    it('should handle getUploadUrl error with Error instance', async () => {
      const error = new Error('認証エラーが発生しました。再度ログインしてください');
      vi.mocked(profileService.getUploadUrl).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useImageUpload());

      let uploadResult;
      await act(async () => {
        uploadResult = await result.current.uploadImage(mockFile);
      });

      expect(uploadResult).toBeNull();
      expect(result.current.error).toBe('認証エラーが発生しました。再度ログインしてください');
      expect(result.current.isLoading).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle getUploadUrl error for unsupported file type', async () => {
      const error = new Error('サポートされていないファイル形式です');
      vi.mocked(profileService.getUploadUrl).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useImageUpload());

      await act(async () => {
        await result.current.uploadImage(mockFile);
      });

      expect(result.current.error).toBe('サポートされていないファイル形式です');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle getUploadUrl server error', async () => {
      const error = new Error('サーバーエラーが発生しました。しばらくしてから再度お試しください');
      vi.mocked(profileService.getUploadUrl).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useImageUpload());

      await act(async () => {
        await result.current.uploadImage(mockFile);
      });

      expect(result.current.error).toBe(
        'サーバーエラーが発生しました。しばらくしてから再度お試しください'
      );
    });

    it('should handle getUploadUrl network error', async () => {
      const error = new Error(
        'ネットワークエラーが発生しました。インターネット接続を確認してください'
      );
      vi.mocked(profileService.getUploadUrl).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useImageUpload());

      await act(async () => {
        await result.current.uploadImage(mockFile);
      });

      expect(result.current.error).toBe(
        'ネットワークエラーが発生しました。インターネット接続を確認してください'
      );
    });

    it('should handle non-Error exceptions from getUploadUrl', async () => {
      vi.mocked(profileService.getUploadUrl).mockRejectedValueOnce('Unknown error');

      const { result } = renderHook(() => useImageUpload());

      await act(async () => {
        await result.current.uploadImage(mockFile);
      });

      expect(result.current.error).toBe('画像のアップロードに失敗しました');
    });
  });

  describe('S3アップロードエラー', () => {
    it('should handle S3 upload failure (not ok response)', async () => {
      vi.mocked(profileService.getUploadUrl).mockResolvedValueOnce({
        uploadUrl: mockUploadUrl,
        iconUrl: mockIconUrl,
        expiresIn: 3600,
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      const { result } = renderHook(() => useImageUpload());

      let uploadResult;
      await act(async () => {
        uploadResult = await result.current.uploadImage(mockFile);
      });

      expect(uploadResult).toBeNull();
      expect(result.current.error).toBe('画像のアップロードに失敗しました。再度お試しください');
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle S3 upload failure with 400 status', async () => {
      vi.mocked(profileService.getUploadUrl).mockResolvedValueOnce({
        uploadUrl: mockUploadUrl,
        iconUrl: mockIconUrl,
        expiresIn: 3600,
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      const { result } = renderHook(() => useImageUpload());

      await act(async () => {
        await result.current.uploadImage(mockFile);
      });

      expect(result.current.error).toBe('画像のアップロードに失敗しました。再度お試しください');
    });

    it('should handle S3 upload failure with 500 status', async () => {
      vi.mocked(profileService.getUploadUrl).mockResolvedValueOnce({
        uploadUrl: mockUploadUrl,
        iconUrl: mockIconUrl,
        expiresIn: 3600,
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useImageUpload());

      await act(async () => {
        await result.current.uploadImage(mockFile);
      });

      expect(result.current.error).toBe('画像のアップロードに失敗しました。再度お試しください');
    });

    it('should handle S3 network error during upload', async () => {
      vi.mocked(profileService.getUploadUrl).mockResolvedValueOnce({
        uploadUrl: mockUploadUrl,
        iconUrl: mockIconUrl,
        expiresIn: 3600,
      });

      mockFetch.mockRejectedValueOnce(new TypeError('Network request failed'));

      const { result } = renderHook(() => useImageUpload());

      await act(async () => {
        await result.current.uploadImage(mockFile);
      });

      expect(result.current.error).toBe('Network request failed');
    });

    it('should handle S3 timeout error', async () => {
      vi.mocked(profileService.getUploadUrl).mockResolvedValueOnce({
        uploadUrl: mockUploadUrl,
        iconUrl: mockIconUrl,
        expiresIn: 3600,
      });

      mockFetch.mockRejectedValueOnce(new Error('Request timeout'));

      const { result } = renderHook(() => useImageUpload());

      await act(async () => {
        await result.current.uploadImage(mockFile);
      });

      expect(result.current.error).toBe('Request timeout');
    });
  });

  describe('リトライ機能', () => {
    it('should retry upload with same file', async () => {
      vi.mocked(profileService.getUploadUrl).mockResolvedValueOnce({
        uploadUrl: mockUploadUrl,
        iconUrl: mockIconUrl,
        expiresIn: 3600,
      });

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const { result } = renderHook(() => useImageUpload());

      let retryResult;
      await act(async () => {
        retryResult = await result.current.retry(mockFile);
      });

      expect(retryResult).toEqual({ iconUrl: mockIconUrl });
      expect(result.current.error).toBeNull();
      expect(profileService.getUploadUrl).toHaveBeenCalledWith('png');
      expect(mockFetch).toHaveBeenCalledWith(mockUploadUrl, {
        method: 'PUT',
        body: mockFile,
        headers: {
          'Content-Type': 'image/png',
        },
      });
    });

    it('should retry after failed upload', async () => {
      vi.mocked(profileService.getUploadUrl)
        .mockResolvedValueOnce({
          uploadUrl: mockUploadUrl,
          iconUrl: mockIconUrl,
          expiresIn: 3600,
        })
        .mockResolvedValueOnce({
          uploadUrl: mockUploadUrl,
          iconUrl: mockIconUrl,
          expiresIn: 3600,
        });

      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: true, status: 200 });

      const { result } = renderHook(() => useImageUpload());

      // 最初のアップロードで失敗
      let uploadResult;
      await act(async () => {
        uploadResult = await result.current.uploadImage(mockFile);
      });

      expect(uploadResult).toBeNull();
      expect(result.current.error).toBe('画像のアップロードに失敗しました。再度お試しください');

      // リトライで成功
      let retryResult;
      await act(async () => {
        retryResult = await result.current.retry(mockFile);
      });

      expect(retryResult).toEqual({ iconUrl: mockIconUrl });
      expect(result.current.error).toBeNull();
      expect(profileService.getUploadUrl).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should clear error on retry', async () => {
      vi.mocked(profileService.getUploadUrl)
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce({
          uploadUrl: mockUploadUrl,
          iconUrl: mockIconUrl,
          expiresIn: 3600,
        });

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const { result } = renderHook(() => useImageUpload());

      // 最初のアップロードでエラー
      await act(async () => {
        await result.current.uploadImage(mockFile);
      });

      expect(result.current.error).toBe('First error');

      // リトライで成功
      await act(async () => {
        await result.current.retry(mockFile);
      });

      expect(result.current.error).toBeNull();
    });

    it('should handle retry failure', async () => {
      vi.mocked(profileService.getUploadUrl).mockRejectedValueOnce(new Error('Retry failed'));

      const { result } = renderHook(() => useImageUpload());

      let retryResult;
      await act(async () => {
        retryResult = await result.current.retry(mockFile);
      });

      expect(retryResult).toBeNull();
      expect(result.current.error).toBe('Retry failed');
    });

    it('should retry with different file', async () => {
      const newFile = new File(['new content'], 'new-image.jpg', { type: 'image/jpeg' });

      vi.mocked(profileService.getUploadUrl).mockResolvedValueOnce({
        uploadUrl: mockUploadUrl,
        iconUrl: 'https://cdn.example.com/icons/new-icon.jpg',
        expiresIn: 3600,
      });

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const { result } = renderHook(() => useImageUpload());

      let retryResult;
      await act(async () => {
        retryResult = await result.current.retry(newFile);
      });

      expect(retryResult).toEqual({ iconUrl: 'https://cdn.example.com/icons/new-icon.jpg' });
      expect(profileService.getUploadUrl).toHaveBeenCalledWith('jpg');
    });
  });

  describe('ローディング状態の管理', () => {
    it('should set isLoading to false after successful upload', async () => {
      vi.mocked(profileService.getUploadUrl).mockResolvedValueOnce({
        uploadUrl: mockUploadUrl,
        iconUrl: mockIconUrl,
        expiresIn: 3600,
      });

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const { result } = renderHook(() => useImageUpload());

      expect(result.current.isLoading).toBe(false);

      await act(async () => {
        await result.current.uploadImage(mockFile);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should set isLoading to false after failed upload', async () => {
      vi.mocked(profileService.getUploadUrl).mockRejectedValueOnce(new Error('Failed'));

      const { result } = renderHook(() => useImageUpload());

      expect(result.current.isLoading).toBe(false);

      await act(async () => {
        await result.current.uploadImage(mockFile);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should set isLoading to false after S3 upload failure', async () => {
      vi.mocked(profileService.getUploadUrl).mockResolvedValueOnce({
        uploadUrl: mockUploadUrl,
        iconUrl: mockIconUrl,
        expiresIn: 3600,
      });

      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      const { result } = renderHook(() => useImageUpload());

      await act(async () => {
        await result.current.uploadImage(mockFile);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('複数回のアップロード', () => {
    it('should handle multiple sequential uploads', async () => {
      vi.mocked(profileService.getUploadUrl)
        .mockResolvedValueOnce({
          uploadUrl: mockUploadUrl,
          iconUrl: mockIconUrl,
          expiresIn: 3600,
        })
        .mockResolvedValueOnce({
          uploadUrl: mockUploadUrl,
          iconUrl: 'https://cdn.example.com/icons/second.png',
          expiresIn: 3600,
        });

      mockFetch
        .mockResolvedValueOnce({ ok: true, status: 200 })
        .mockResolvedValueOnce({ ok: true, status: 200 });

      const { result } = renderHook(() => useImageUpload());

      // 1回目のアップロード
      let result1;
      await act(async () => {
        result1 = await result.current.uploadImage(mockFile);
      });

      expect(result1).toEqual({ iconUrl: mockIconUrl });
      expect(result.current.error).toBeNull();

      // 2回目のアップロード
      const secondFile = new File(['second'], 'second.png', { type: 'image/png' });
      let result2;
      await act(async () => {
        result2 = await result.current.uploadImage(secondFile);
      });

      expect(result2).toEqual({ iconUrl: 'https://cdn.example.com/icons/second.png' });
      expect(result.current.error).toBeNull();
      expect(profileService.getUploadUrl).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle upload after error', async () => {
      vi.mocked(profileService.getUploadUrl)
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce({
          uploadUrl: mockUploadUrl,
          iconUrl: mockIconUrl,
          expiresIn: 3600,
        });

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const { result } = renderHook(() => useImageUpload());

      // 1回目のアップロードでエラー
      let result1;
      await act(async () => {
        result1 = await result.current.uploadImage(mockFile);
      });

      expect(result1).toBeNull();
      expect(result.current.error).toBe('First error');

      // 2回目のアップロードで成功
      let result2;
      await act(async () => {
        result2 = await result.current.uploadImage(mockFile);
      });

      expect(result2).toEqual({ iconUrl: mockIconUrl });
      expect(result.current.error).toBeNull();
    });
  });

  describe('エッジケース', () => {
    it('should handle file with multiple dots in name', async () => {
      const multiDotFile = new File(['test'], 'my.image.file.png', { type: 'image/png' });

      vi.mocked(profileService.getUploadUrl).mockResolvedValueOnce({
        uploadUrl: mockUploadUrl,
        iconUrl: mockIconUrl,
        expiresIn: 3600,
      });

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const { result } = renderHook(() => useImageUpload());

      await act(async () => {
        await result.current.uploadImage(multiDotFile);
      });

      expect(profileService.getUploadUrl).toHaveBeenCalledWith('png');
    });

    it('should handle very large file name', async () => {
      const longName = 'a'.repeat(200) + '.png';
      const longNameFile = new File(['test'], longName, { type: 'image/png' });

      vi.mocked(profileService.getUploadUrl).mockResolvedValueOnce({
        uploadUrl: mockUploadUrl,
        iconUrl: mockIconUrl,
        expiresIn: 3600,
      });

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const { result } = renderHook(() => useImageUpload());

      let uploadResult;
      await act(async () => {
        uploadResult = await result.current.uploadImage(longNameFile);
      });

      expect(uploadResult).toEqual({ iconUrl: mockIconUrl });
    });

    it('should handle file with special characters in name', async () => {
      const specialFile = new File(['test'], 'image@#$%.png', { type: 'image/png' });

      vi.mocked(profileService.getUploadUrl).mockResolvedValueOnce({
        uploadUrl: mockUploadUrl,
        iconUrl: mockIconUrl,
        expiresIn: 3600,
      });

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const { result } = renderHook(() => useImageUpload());

      await act(async () => {
        await result.current.uploadImage(specialFile);
      });

      expect(profileService.getUploadUrl).toHaveBeenCalledWith('png');
    });

    it('should handle empty file', async () => {
      const emptyFile = new File([], 'empty.png', { type: 'image/png' });

      vi.mocked(profileService.getUploadUrl).mockResolvedValueOnce({
        uploadUrl: mockUploadUrl,
        iconUrl: mockIconUrl,
        expiresIn: 3600,
      });

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const { result } = renderHook(() => useImageUpload());

      let uploadResult;
      await act(async () => {
        uploadResult = await result.current.uploadImage(emptyFile);
      });

      expect(uploadResult).toEqual({ iconUrl: mockIconUrl });
      expect(mockFetch).toHaveBeenCalledWith(mockUploadUrl, {
        method: 'PUT',
        body: emptyFile,
        headers: {
          'Content-Type': 'image/png',
        },
      });
    });

    it('should handle null exception', async () => {
      vi.mocked(profileService.getUploadUrl).mockRejectedValueOnce(null);

      const { result } = renderHook(() => useImageUpload());

      await act(async () => {
        await result.current.uploadImage(mockFile);
      });

      expect(result.current.error).toBe('画像のアップロードに失敗しました');
    });

    it('should handle undefined exception', async () => {
      vi.mocked(profileService.getUploadUrl).mockRejectedValueOnce(undefined);

      const { result } = renderHook(() => useImageUpload());

      await act(async () => {
        await result.current.uploadImage(mockFile);
      });

      expect(result.current.error).toBe('画像のアップロードに失敗しました');
    });
  });

  describe('戻り値の検証', () => {
    it('should return UploadResult on success', async () => {
      vi.mocked(profileService.getUploadUrl).mockResolvedValueOnce({
        uploadUrl: mockUploadUrl,
        iconUrl: mockIconUrl,
        expiresIn: 3600,
      });

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const { result } = renderHook(() => useImageUpload());

      let uploadResult;
      await act(async () => {
        uploadResult = await result.current.uploadImage(mockFile);
      });

      expect(uploadResult).toEqual({ iconUrl: mockIconUrl });
      expect(uploadResult).toHaveProperty('iconUrl');
    });

    it('should return null on failure', async () => {
      vi.mocked(profileService.getUploadUrl).mockRejectedValueOnce(new Error('Failed'));

      const { result } = renderHook(() => useImageUpload());

      let uploadResult;
      await act(async () => {
        uploadResult = await result.current.uploadImage(mockFile);
      });

      expect(uploadResult).toBeNull();
    });

    it('should return null on S3 upload failure', async () => {
      vi.mocked(profileService.getUploadUrl).mockResolvedValueOnce({
        uploadUrl: mockUploadUrl,
        iconUrl: mockIconUrl,
        expiresIn: 3600,
      });

      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      const { result } = renderHook(() => useImageUpload());

      let uploadResult;
      await act(async () => {
        uploadResult = await result.current.uploadImage(mockFile);
      });

      expect(uploadResult).toBeNull();
    });
  });
});
