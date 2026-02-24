import { describe, it, expect, vi, beforeEach } from 'vitest';
import { S3Service } from './s3-service.js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// AWS SDK v3をモック
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(),
  PutObjectCommand: vi.fn(),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(),
}));

describe('S3Service', () => {
  let s3Service: S3Service;
  const mockBucketName = 'test-bucket';
  const mockCdnDomain = 'cdn.example.com';
  const mockRegion = 'ap-northeast-1';
  const mockUserId = 'test-user-123';

  beforeEach(() => {
    vi.clearAllMocks();

    // S3Clientのモック実装
    (S3Client as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({}));

    s3Service = new S3Service(mockBucketName, mockCdnDomain, mockRegion);
  });

  describe('generateUploadUrl', () => {
    describe('Presigned URL生成の正常系テスト', () => {
      it('png拡張子でPresigned URLを生成する', async () => {
        const mockUploadUrl =
          'https://s3.amazonaws.com/test-bucket/icons/test-user-123/1234567890.png?signature=abc';
        (getSignedUrl as ReturnType<typeof vi.fn>).mockResolvedValue(mockUploadUrl);

        const result = await s3Service.generateUploadUrl(mockUserId, 'png');

        expect(result).toHaveProperty('uploadUrl');
        expect(result).toHaveProperty('iconUrl');
        expect(result).toHaveProperty('expiresIn');
        expect(result.uploadUrl).toBe(mockUploadUrl);
        expect(result.iconUrl).toMatch(
          /^https:\/\/cdn\.example\.com\/icons\/test-user-123\/\d+\.png$/
        );
        expect(result.expiresIn).toBe(300);
      });

      it('jpg拡張子でPresigned URLを生成する', async () => {
        const mockUploadUrl =
          'https://s3.amazonaws.com/test-bucket/icons/test-user-123/1234567890.jpg?signature=abc';
        (getSignedUrl as ReturnType<typeof vi.fn>).mockResolvedValue(mockUploadUrl);

        const result = await s3Service.generateUploadUrl(mockUserId, 'jpg');

        expect(result).toHaveProperty('uploadUrl');
        expect(result).toHaveProperty('iconUrl');
        expect(result).toHaveProperty('expiresIn');
        expect(result.uploadUrl).toBe(mockUploadUrl);
        expect(result.iconUrl).toMatch(
          /^https:\/\/cdn\.example\.com\/icons\/test-user-123\/\d+\.jpg$/
        );
        expect(result.expiresIn).toBe(300);
      });

      it('jpeg拡張子でPresigned URLを生成する', async () => {
        const mockUploadUrl =
          'https://s3.amazonaws.com/test-bucket/icons/test-user-123/1234567890.jpeg?signature=abc';
        (getSignedUrl as ReturnType<typeof vi.fn>).mockResolvedValue(mockUploadUrl);

        const result = await s3Service.generateUploadUrl(mockUserId, 'jpeg');

        expect(result).toHaveProperty('uploadUrl');
        expect(result).toHaveProperty('iconUrl');
        expect(result).toHaveProperty('expiresIn');
        expect(result.uploadUrl).toBe(mockUploadUrl);
        expect(result.iconUrl).toMatch(
          /^https:\/\/cdn\.example\.com\/icons\/test-user-123\/\d+\.jpeg$/
        );
        expect(result.expiresIn).toBe(300);
      });

      it('gif拡張子でPresigned URLを生成する', async () => {
        const mockUploadUrl =
          'https://s3.amazonaws.com/test-bucket/icons/test-user-123/1234567890.gif?signature=abc';
        (getSignedUrl as ReturnType<typeof vi.fn>).mockResolvedValue(mockUploadUrl);

        const result = await s3Service.generateUploadUrl(mockUserId, 'gif');

        expect(result).toHaveProperty('uploadUrl');
        expect(result).toHaveProperty('iconUrl');
        expect(result).toHaveProperty('expiresIn');
        expect(result.uploadUrl).toBe(mockUploadUrl);
        expect(result.iconUrl).toMatch(
          /^https:\/\/cdn\.example\.com\/icons\/test-user-123\/\d+\.gif$/
        );
        expect(result.expiresIn).toBe(300);
      });
    });

    describe('iconUrlのパターン検証', () => {
      it('iconUrlがicons/{userId}/{timestamp}.{extension}パターンに従う', async () => {
        const mockUploadUrl =
          'https://s3.amazonaws.com/test-bucket/icons/user-456/1234567890.png?signature=abc';
        (getSignedUrl as ReturnType<typeof vi.fn>).mockResolvedValue(mockUploadUrl);

        const result = await s3Service.generateUploadUrl('user-456', 'png');

        // iconUrlのパターンを検証
        const iconUrlPattern = /^https:\/\/cdn\.example\.com\/icons\/user-456\/\d+\.png$/;
        expect(result.iconUrl).toMatch(iconUrlPattern);

        // iconUrlからパスを抽出して検証
        const url = new URL(result.iconUrl);
        const pathParts = url.pathname.split('/');
        expect(pathParts[1]).toBe('icons');
        expect(pathParts[2]).toBe('user-456');
        expect(pathParts[3]).toMatch(/^\d+\.png$/);
      });

      it('異なるuserIdで異なるiconUrlを生成する', async () => {
        const mockUploadUrl1 =
          'https://s3.amazonaws.com/test-bucket/icons/user-1/1234567890.png?signature=abc';
        const mockUploadUrl2 =
          'https://s3.amazonaws.com/test-bucket/icons/user-2/1234567890.png?signature=def';

        (getSignedUrl as ReturnType<typeof vi.fn>)
          .mockResolvedValueOnce(mockUploadUrl1)
          .mockResolvedValueOnce(mockUploadUrl2);

        const result1 = await s3Service.generateUploadUrl('user-1', 'png');
        const result2 = await s3Service.generateUploadUrl('user-2', 'png');

        expect(result1.iconUrl).toContain('user-1');
        expect(result2.iconUrl).toContain('user-2');
        expect(result1.iconUrl).not.toBe(result2.iconUrl);
      });

      it('タイムスタンプが含まれることを確認', async () => {
        const mockUploadUrl =
          'https://s3.amazonaws.com/test-bucket/icons/user-123/1234567890.png?signature=abc';
        (getSignedUrl as ReturnType<typeof vi.fn>).mockResolvedValue(mockUploadUrl);

        const beforeTimestamp = Date.now();
        const result = await s3Service.generateUploadUrl('user-123', 'png');
        const afterTimestamp = Date.now();

        // iconUrlからタイムスタンプを抽出
        const match = result.iconUrl.match(/\/(\d+)\.png$/);
        expect(match).not.toBeNull();

        if (match) {
          const timestamp = parseInt(match[1], 10);
          expect(timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
          expect(timestamp).toBeLessThanOrEqual(afterTimestamp);
        }
      });
    });

    describe('Content-Typeマッピングの検証', () => {
      it('png拡張子でimage/pngのContent-Typeを設定する', async () => {
        const mockUploadUrl =
          'https://s3.amazonaws.com/test-bucket/icons/user-123/1234567890.png?signature=abc';
        (getSignedUrl as ReturnType<typeof vi.fn>).mockResolvedValue(mockUploadUrl);

        await s3Service.generateUploadUrl(mockUserId, 'png');

        // PutObjectCommandが正しいContent-Typeで呼ばれたことを確認
        expect(PutObjectCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            ContentType: 'image/png',
          })
        );
      });

      it('jpg拡張子でimage/jpegのContent-Typeを設定する', async () => {
        const mockUploadUrl =
          'https://s3.amazonaws.com/test-bucket/icons/user-123/1234567890.jpg?signature=abc';
        (getSignedUrl as ReturnType<typeof vi.fn>).mockResolvedValue(mockUploadUrl);

        await s3Service.generateUploadUrl(mockUserId, 'jpg');

        expect(PutObjectCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            ContentType: 'image/jpeg',
          })
        );
      });

      it('jpeg拡張子でimage/jpegのContent-Typeを設定する', async () => {
        const mockUploadUrl =
          'https://s3.amazonaws.com/test-bucket/icons/user-123/1234567890.jpeg?signature=abc';
        (getSignedUrl as ReturnType<typeof vi.fn>).mockResolvedValue(mockUploadUrl);

        await s3Service.generateUploadUrl(mockUserId, 'jpeg');

        expect(PutObjectCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            ContentType: 'image/jpeg',
          })
        );
      });

      it('gif拡張子でimage/gifのContent-Typeを設定する', async () => {
        const mockUploadUrl =
          'https://s3.amazonaws.com/test-bucket/icons/user-123/1234567890.gif?signature=abc';
        (getSignedUrl as ReturnType<typeof vi.fn>).mockResolvedValue(mockUploadUrl);

        await s3Service.generateUploadUrl(mockUserId, 'gif');

        expect(PutObjectCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            ContentType: 'image/gif',
          })
        );
      });
    });

    describe('有効期限とファイルサイズ制限の検証', () => {
      it('有効期限が300秒（5分）であることを確認', async () => {
        const mockUploadUrl =
          'https://s3.amazonaws.com/test-bucket/icons/user-123/1234567890.png?signature=abc';
        (getSignedUrl as ReturnType<typeof vi.fn>).mockResolvedValue(mockUploadUrl);

        const result = await s3Service.generateUploadUrl(mockUserId, 'png');

        expect(result.expiresIn).toBe(300);

        // getSignedUrlが正しいexpiresInで呼ばれたことを確認
        expect(getSignedUrl).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          expect.objectContaining({
            expiresIn: 300,
          })
        );
      });

      it('ファイルサイズ制限が5MBであることを確認', async () => {
        const mockUploadUrl =
          'https://s3.amazonaws.com/test-bucket/icons/user-123/1234567890.png?signature=abc';
        (getSignedUrl as ReturnType<typeof vi.fn>).mockResolvedValue(mockUploadUrl);

        await s3Service.generateUploadUrl(mockUserId, 'png');

        const expectedMaxFileSize = 5 * 1024 * 1024; // 5MB

        // PutObjectCommandが正しいContentLengthで呼ばれたことを確認
        expect(PutObjectCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            ContentLength: expectedMaxFileSize,
          })
        );
      });

      it('PutObjectCommandに正しいバケット名とキーが設定される', async () => {
        const mockUploadUrl =
          'https://s3.amazonaws.com/test-bucket/icons/user-123/1234567890.png?signature=abc';
        (getSignedUrl as ReturnType<typeof vi.fn>).mockResolvedValue(mockUploadUrl);

        await s3Service.generateUploadUrl(mockUserId, 'png');

        expect(PutObjectCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            Bucket: mockBucketName,
            Key: expect.stringMatching(/^icons\/test-user-123\/\d+\.png$/),
          })
        );
      });
    });

    describe('AWS SDK v3の統合検証', () => {
      it('getSignedUrlがS3ClientとPutObjectCommandで呼ばれる', async () => {
        const mockUploadUrl =
          'https://s3.amazonaws.com/test-bucket/icons/user-123/1234567890.png?signature=abc';
        (getSignedUrl as ReturnType<typeof vi.fn>).mockResolvedValue(mockUploadUrl);

        await s3Service.generateUploadUrl(mockUserId, 'png');

        // getSignedUrlが呼ばれたことを確認
        expect(getSignedUrl).toHaveBeenCalledTimes(1);
        expect(getSignedUrl).toHaveBeenCalledWith(
          expect.anything(), // S3Client
          expect.anything(), // PutObjectCommand
          expect.objectContaining({
            expiresIn: 300,
          })
        );
      });

      it('複数回呼び出しても正しく動作する', async () => {
        const mockUploadUrl1 =
          'https://s3.amazonaws.com/test-bucket/icons/user-1/1234567890.png?signature=abc';
        const mockUploadUrl2 =
          'https://s3.amazonaws.com/test-bucket/icons/user-2/1234567891.jpg?signature=def';

        (getSignedUrl as ReturnType<typeof vi.fn>)
          .mockResolvedValueOnce(mockUploadUrl1)
          .mockResolvedValueOnce(mockUploadUrl2);

        const result1 = await s3Service.generateUploadUrl('user-1', 'png');
        const result2 = await s3Service.generateUploadUrl('user-2', 'jpg');

        expect(result1.uploadUrl).toBe(mockUploadUrl1);
        expect(result2.uploadUrl).toBe(mockUploadUrl2);
        expect(getSignedUrl).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('S3Serviceのコンストラクタ', () => {
    it('正しいリージョンでS3Clientを初期化する', () => {
      const customRegion = 'us-west-2';
      new S3Service(mockBucketName, mockCdnDomain, customRegion);

      expect(S3Client).toHaveBeenCalledWith({ region: customRegion });
    });

    it('デフォルトリージョン（ap-northeast-1）でS3Clientを初期化する', () => {
      new S3Service(mockBucketName, mockCdnDomain);

      expect(S3Client).toHaveBeenCalledWith({ region: 'ap-northeast-1' });
    });
  });
});
