import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { Context } from 'hono';

// Mock環境変数
process.env.COGNITO_USER_POOL_ID = 'test-pool-id';
process.env.AWS_REGION = 'ap-northeast-1';
process.env.ICON_BUCKET_NAME = 'test-bucket';
process.env.CDN_DOMAIN = 'cdn.example.com';

// Mock認証ミドルウェア（デフォルトは成功）
const authMiddlewareMock = vi.fn(async (c: Context, next: () => Promise<void>) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (c as any).set('userId', 'test-user-id');
  await next();
});

vi.mock('../lib/auth/auth-middleware.js', () => ({
  createAuthMiddleware: () => authMiddlewareMock,
}));

// MockProfileRepository
const mockGetById = vi.fn();
const mockUpdate = vi.fn();
vi.mock('../lib/dynamodb/repositories/profile.js', () => ({
  ProfileRepository: vi.fn().mockImplementation(() => ({
    getById: mockGetById,
    update: mockUpdate,
  })),
}));

// MockS3Service
const mockGenerateUploadUrl = vi.fn();
vi.mock('../lib/s3/s3-service.js', () => ({
  S3Service: vi.fn().mockImplementation(() => ({
    generateUploadUrl: mockGenerateUploadUrl,
  })),
}));

/**
 * Profile API Integration Tests
 *
 * これらのテストは、Profile APIの完全なフローを検証します：
 * - プロフィール取得→更新→再取得のフロー
 * - アイコンアップロードURL生成→プロフィール更新のフロー
 * - 認証・認可の統合検証
 *
 * Validates: すべての要件
 */

describe('Profile API Integration Tests', () => {
  let app: Hono;

  beforeEach(async () => {
    vi.clearAllMocks();

    // 認証ミドルウェアを成功するようにリセット
    authMiddlewareMock.mockImplementation(async (c: Context, next: () => Promise<void>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c as any).set('userId', 'test-user-id');
      await next();
    });

    app = new Hono();

    // profileRouterを動的にインポート
    const { profileRouter } = await import('./profile.js');
    app.route('/api/profile', profileRouter);
  });

  describe('プロフィール取得→更新→再取得のフロー', () => {
    it('プロフィールを取得し、usernameを更新し、更新されたプロフィールを再取得できる', async () => {
      // 初期プロフィール
      const initialProfile = {
        PK: 'USER#test-user-id',
        SK: 'USER#test-user-id',
        entityType: 'USER' as const,
        userId: 'test-user-id',
        email: 'test@example.com',
        username: 'oldusername',
        iconUrl: 'https://cdn.example.com/icons/test-user-id/123456.png',
        createdAt: '2025-02-19T10:00:00Z',
        updatedAt: '2025-02-19T10:00:00Z',
      };

      // 更新後のプロフィール
      const updatedProfile = {
        ...initialProfile,
        username: 'newusername',
        updatedAt: '2025-02-20T12:00:00Z',
      };

      // Step 1: 初期プロフィールを取得
      mockGetById.mockResolvedValueOnce(initialProfile);

      const getRes1 = await app.request('/api/profile', {
        method: 'GET',
      });

      expect(getRes1.status).toBe(200);
      const profile1 = await getRes1.json();
      expect(profile1.username).toBe('oldusername');
      expect(profile1.updatedAt).toBe('2025-02-19T10:00:00Z');

      // Step 2: usernameを更新
      mockUpdate.mockResolvedValueOnce(updatedProfile);

      const updateRes = await app.request('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: 'newusername' }),
      });

      expect(updateRes.status).toBe(200);
      const updatedData = await updateRes.json();
      expect(updatedData.username).toBe('newusername');
      expect(updatedData.updatedAt).toBe('2025-02-20T12:00:00Z');

      // Step 3: 更新されたプロフィールを再取得
      mockGetById.mockResolvedValueOnce(updatedProfile);

      const getRes2 = await app.request('/api/profile', {
        method: 'GET',
      });

      expect(getRes2.status).toBe(200);
      const profile2 = await getRes2.json();
      expect(profile2.username).toBe('newusername');
      expect(profile2.updatedAt).toBe('2025-02-20T12:00:00Z');

      // フロー全体の呼び出しを検証
      expect(mockGetById).toHaveBeenCalledTimes(2);
      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockUpdate).toHaveBeenCalledWith('test-user-id', { username: 'newusername' });
    });

    it('プロフィールを取得し、iconUrlを更新し、更新されたプロフィールを再取得できる', async () => {
      const initialProfile = {
        PK: 'USER#test-user-id',
        SK: 'USER#test-user-id',
        entityType: 'USER' as const,
        userId: 'test-user-id',
        email: 'test@example.com',
        username: 'testuser',
        iconUrl: 'https://cdn.example.com/icons/test-user-id/old-icon.png',
        createdAt: '2025-02-19T10:00:00Z',
        updatedAt: '2025-02-19T10:00:00Z',
      };

      const updatedProfile = {
        ...initialProfile,
        iconUrl: 'https://cdn.example.com/icons/test-user-id/new-icon.png',
        updatedAt: '2025-02-20T12:00:00Z',
      };

      // Step 1: 初期プロフィールを取得
      mockGetById.mockResolvedValueOnce(initialProfile);

      const getRes1 = await app.request('/api/profile', {
        method: 'GET',
      });

      expect(getRes1.status).toBe(200);
      const profile1 = await getRes1.json();
      expect(profile1.iconUrl).toBe('https://cdn.example.com/icons/test-user-id/old-icon.png');

      // Step 2: iconUrlを更新
      mockUpdate.mockResolvedValueOnce(updatedProfile);

      const updateRes = await app.request('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          iconUrl: 'https://cdn.example.com/icons/test-user-id/new-icon.png',
        }),
      });

      expect(updateRes.status).toBe(200);
      const updatedData = await updateRes.json();
      expect(updatedData.iconUrl).toBe('https://cdn.example.com/icons/test-user-id/new-icon.png');

      // Step 3: 更新されたプロフィールを再取得
      mockGetById.mockResolvedValueOnce(updatedProfile);

      const getRes2 = await app.request('/api/profile', {
        method: 'GET',
      });

      expect(getRes2.status).toBe(200);
      const profile2 = await getRes2.json();
      expect(profile2.iconUrl).toBe('https://cdn.example.com/icons/test-user-id/new-icon.png');
    });

    it('プロフィールを取得し、usernameとiconUrlを同時に更新し、更新されたプロフィールを再取得できる', async () => {
      const initialProfile = {
        PK: 'USER#test-user-id',
        SK: 'USER#test-user-id',
        entityType: 'USER' as const,
        userId: 'test-user-id',
        email: 'test@example.com',
        username: 'oldusername',
        iconUrl: 'https://cdn.example.com/icons/test-user-id/old-icon.png',
        createdAt: '2025-02-19T10:00:00Z',
        updatedAt: '2025-02-19T10:00:00Z',
      };

      const updatedProfile = {
        ...initialProfile,
        username: 'newusername',
        iconUrl: 'https://cdn.example.com/icons/test-user-id/new-icon.png',
        updatedAt: '2025-02-20T12:00:00Z',
      };

      // Step 1: 初期プロフィールを取得
      mockGetById.mockResolvedValueOnce(initialProfile);

      const getRes1 = await app.request('/api/profile', {
        method: 'GET',
      });

      expect(getRes1.status).toBe(200);
      const profile1 = await getRes1.json();
      expect(profile1.username).toBe('oldusername');
      expect(profile1.iconUrl).toBe('https://cdn.example.com/icons/test-user-id/old-icon.png');

      // Step 2: usernameとiconUrlを同時に更新
      mockUpdate.mockResolvedValueOnce(updatedProfile);

      const updateRes = await app.request('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'newusername',
          iconUrl: 'https://cdn.example.com/icons/test-user-id/new-icon.png',
        }),
      });

      expect(updateRes.status).toBe(200);
      const updatedData = await updateRes.json();
      expect(updatedData.username).toBe('newusername');
      expect(updatedData.iconUrl).toBe('https://cdn.example.com/icons/test-user-id/new-icon.png');
      expect(updatedData.updatedAt).toBe('2025-02-20T12:00:00Z');

      // Step 3: 更新されたプロフィールを再取得
      mockGetById.mockResolvedValueOnce(updatedProfile);

      const getRes2 = await app.request('/api/profile', {
        method: 'GET',
      });

      expect(getRes2.status).toBe(200);
      const profile2 = await getRes2.json();
      expect(profile2.username).toBe('newusername');
      expect(profile2.iconUrl).toBe('https://cdn.example.com/icons/test-user-id/new-icon.png');
      expect(profile2.updatedAt).toBe('2025-02-20T12:00:00Z');

      // updatedAtが更新されていることを確認
      expect(new Date(profile2.updatedAt).getTime()).toBeGreaterThan(
        new Date(profile1.updatedAt).getTime()
      );
    });
  });

  describe('アイコンアップロードURL生成→プロフィール更新のフロー', () => {
    it('アップロードURL生成→プロフィール更新→再取得の完全なフローが正常に動作する', async () => {
      const initialProfile = {
        PK: 'USER#test-user-id',
        SK: 'USER#test-user-id',
        entityType: 'USER' as const,
        userId: 'test-user-id',
        email: 'test@example.com',
        username: 'testuser',
        createdAt: '2025-02-19T10:00:00Z',
        updatedAt: '2025-02-19T10:00:00Z',
      };

      const timestamp = Date.now();
      const uploadUrlResponse = {
        uploadUrl: `https://s3.amazonaws.com/test-bucket/icons/test-user-id/${timestamp}.png?signature=...`,
        iconUrl: `https://cdn.example.com/icons/test-user-id/${timestamp}.png`,
        expiresIn: 300,
      };

      const updatedProfile = {
        ...initialProfile,
        iconUrl: uploadUrlResponse.iconUrl,
        updatedAt: '2025-02-20T12:00:00Z',
      };

      // Step 1: アップロードURL生成
      mockGenerateUploadUrl.mockResolvedValueOnce(uploadUrlResponse);

      const uploadUrlRes = await app.request('/api/profile/icon/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileExtension: 'png' }),
      });

      expect(uploadUrlRes.status).toBe(200);
      const uploadData = await uploadUrlRes.json();
      expect(uploadData).toHaveProperty('uploadUrl');
      expect(uploadData).toHaveProperty('iconUrl');
      expect(uploadData.expiresIn).toBe(300);

      // Step 2: 生成されたiconUrlでプロフィールを更新
      mockUpdate.mockResolvedValueOnce(updatedProfile);

      const updateRes = await app.request('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ iconUrl: uploadData.iconUrl }),
      });

      expect(updateRes.status).toBe(200);
      const updatedData = await updateRes.json();
      expect(updatedData.iconUrl).toBe(uploadData.iconUrl);

      // Step 3: 更新されたプロフィールを再取得
      mockGetById.mockResolvedValueOnce(updatedProfile);

      const getRes = await app.request('/api/profile', {
        method: 'GET',
      });

      expect(getRes.status).toBe(200);
      const profile = await getRes.json();
      expect(profile.iconUrl).toBe(uploadData.iconUrl);

      // フロー全体の呼び出しを検証
      expect(mockGenerateUploadUrl).toHaveBeenCalledWith('test-user-id', 'png');
      expect(mockUpdate).toHaveBeenCalledWith('test-user-id', { iconUrl: uploadData.iconUrl });
      expect(mockGetById).toHaveBeenCalledWith('test-user-id');
    });

    it('各ファイル拡張子（png, jpg, jpeg, gif）でアップロードURL生成→プロフィール更新が正常に動作する', async () => {
      const extensions = ['png', 'jpg', 'jpeg', 'gif'];

      for (const ext of extensions) {
        vi.clearAllMocks();

        const timestamp = Date.now();
        const uploadUrlResponse = {
          uploadUrl: `https://s3.amazonaws.com/test-bucket/icons/test-user-id/${timestamp}.${ext}?signature=...`,
          iconUrl: `https://cdn.example.com/icons/test-user-id/${timestamp}.${ext}`,
          expiresIn: 300,
        };

        const updatedProfile = {
          PK: 'USER#test-user-id',
          SK: 'USER#test-user-id',
          entityType: 'USER' as const,
          userId: 'test-user-id',
          email: 'test@example.com',
          username: 'testuser',
          iconUrl: uploadUrlResponse.iconUrl,
          createdAt: '2025-02-19T10:00:00Z',
          updatedAt: '2025-02-20T12:00:00Z',
        };

        // Step 1: アップロードURL生成
        mockGenerateUploadUrl.mockResolvedValueOnce(uploadUrlResponse);

        const uploadUrlRes = await app.request('/api/profile/icon/upload-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fileExtension: ext }),
        });

        expect(uploadUrlRes.status).toBe(200);
        const uploadData = await uploadUrlRes.json();
        expect(uploadData.iconUrl).toContain(ext);

        // Step 2: プロフィール更新
        mockUpdate.mockResolvedValueOnce(updatedProfile);

        const updateRes = await app.request('/api/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ iconUrl: uploadData.iconUrl }),
        });

        expect(updateRes.status).toBe(200);
        const updatedData = await updateRes.json();
        expect(updatedData.iconUrl).toContain(ext);
      }
    });
  });

  describe('認証・認可の統合検証', () => {
    it('認証エラー時はすべてのエンドポイントで401エラーを返す', async () => {
      // 認証ミドルウェアを401エラーを返すようにモック
      authMiddlewareMock.mockImplementation((async (c: Context) => {
        return c.json(
          {
            error: 'UNAUTHORIZED',
            message: 'Invalid or expired token',
          },
          401
        );
      }) as unknown as typeof authMiddlewareMock);

      // GET /api/profile
      const getRes = await app.request('/api/profile', {
        method: 'GET',
      });

      expect(getRes.status).toBe(401);
      const getData = await getRes.json();
      expect(getData.error).toBe('UNAUTHORIZED');

      // PUT /api/profile
      const putRes = await app.request('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: 'newusername' }),
      });

      expect(putRes.status).toBe(401);
      const putData = await putRes.json();
      expect(putData.error).toBe('UNAUTHORIZED');

      // POST /api/profile/icon/upload-url
      const postRes = await app.request('/api/profile/icon/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileExtension: 'png' }),
      });

      expect(postRes.status).toBe(401);
      const postData = await postRes.json();
      expect(postData.error).toBe('UNAUTHORIZED');

      // 認証エラー時は後続処理が呼ばれないことを検証
      expect(mockGetById).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockGenerateUploadUrl).not.toHaveBeenCalled();
    });

    it('認証成功後にuserIdが正しく抽出され、各エンドポイントで使用される', async () => {
      const testUserId = 'integration-test-user-id';

      // 認証ミドルウェアを特定のuserIdを設定するようにモック
      authMiddlewareMock.mockImplementation(async (c: Context, next: () => Promise<void>) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (c as any).set('userId', testUserId);
        await next();
      });

      const mockProfile = {
        PK: `USER#${testUserId}`,
        SK: `USER#${testUserId}`,
        entityType: 'USER' as const,
        userId: testUserId,
        email: 'test@example.com',
        username: 'testuser',
        createdAt: '2025-02-19T10:00:00Z',
        updatedAt: '2025-02-19T10:00:00Z',
      };

      // GET /api/profile
      mockGetById.mockResolvedValueOnce(mockProfile);

      const getRes = await app.request('/api/profile', {
        method: 'GET',
      });

      expect(getRes.status).toBe(200);
      expect(mockGetById).toHaveBeenCalledWith(testUserId);

      // PUT /api/profile
      mockUpdate.mockResolvedValueOnce(mockProfile);

      const putRes = await app.request('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: 'newusername' }),
      });

      expect(putRes.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith(testUserId, { username: 'newusername' });

      // POST /api/profile/icon/upload-url
      mockGenerateUploadUrl.mockResolvedValueOnce({
        uploadUrl: `https://s3.amazonaws.com/test-bucket/icons/${testUserId}/123456.png?signature=...`,
        iconUrl: `https://cdn.example.com/icons/${testUserId}/123456.png`,
        expiresIn: 300,
      });

      const postRes = await app.request('/api/profile/icon/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileExtension: 'png' }),
      });

      expect(postRes.status).toBe(200);
      expect(mockGenerateUploadUrl).toHaveBeenCalledWith(testUserId, 'png');
    });
  });

  describe('エラーハンドリングの統合検証', () => {
    it('バリデーションエラー時は後続処理を実行しない', async () => {
      // PUT /api/profile - フィールドなし
      const putRes1 = await app.request('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(putRes1.status).toBe(400);
      expect(mockUpdate).not.toHaveBeenCalled();

      // PUT /api/profile - username長さ不正
      const putRes2 = await app.request('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: '' }),
      });

      expect(putRes2.status).toBe(400);
      expect(mockUpdate).not.toHaveBeenCalled();

      // PUT /api/profile - iconUrl形式不正
      const putRes3 = await app.request('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ iconUrl: 'http://cdn.example.com/icon.png' }),
      });

      expect(putRes3.status).toBe(400);
      expect(mockUpdate).not.toHaveBeenCalled();

      // POST /api/profile/icon/upload-url - サポートされていない拡張子
      const postRes = await app.request('/api/profile/icon/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileExtension: 'pdf' }),
      });

      expect(postRes.status).toBe(400);
      expect(mockGenerateUploadUrl).not.toHaveBeenCalled();
    });

    it('DynamoDBエラー時は500エラーを返し、内部詳細を公開しない', async () => {
      // GET /api/profile - DynamoDBエラー
      mockGetById.mockRejectedValueOnce(new Error('DynamoDB connection failed'));

      const getRes = await app.request('/api/profile', {
        method: 'GET',
      });

      expect(getRes.status).toBe(500);
      const getData = await getRes.json();
      expect(getData.error).toBe('INTERNAL_ERROR');
      expect(getData.message).toBe('An internal error occurred');
      expect(getData.message).not.toContain('DynamoDB');
      expect(getData).not.toHaveProperty('stack');

      // PUT /api/profile - DynamoDBエラー
      mockUpdate.mockRejectedValueOnce(new Error('DynamoDB update failed'));

      const putRes = await app.request('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: 'newusername' }),
      });

      expect(putRes.status).toBe(500);
      const putData = await putRes.json();
      expect(putData.error).toBe('INTERNAL_ERROR');
      expect(putData.message).not.toContain('DynamoDB');
    });

    it('S3エラー時は500エラーを返し、内部詳細を公開しない', async () => {
      mockGenerateUploadUrl.mockRejectedValueOnce(new Error('S3 service unavailable'));

      const postRes = await app.request('/api/profile/icon/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileExtension: 'png' }),
      });

      expect(postRes.status).toBe(500);
      const postData = await postRes.json();
      expect(postData.error).toBe('INTERNAL_ERROR');
      expect(postData.message).toBe('An internal error occurred');
      expect(postData.message).not.toContain('S3');
      expect(postData).not.toHaveProperty('stack');
    });

    it('ユーザーが存在しない場合は404エラーを返す', async () => {
      // GET /api/profile
      mockGetById.mockResolvedValueOnce(null);

      const getRes = await app.request('/api/profile', {
        method: 'GET',
      });

      expect(getRes.status).toBe(404);
      const getData = await getRes.json();
      expect(getData.error).toBe('NOT_FOUND');
      expect(getData.message).toBe('User not found');

      // PUT /api/profile
      mockUpdate.mockRejectedValueOnce(new Error('User not found'));

      const putRes = await app.request('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: 'newusername' }),
      });

      expect(putRes.status).toBe(404);
      const putData = await putRes.json();
      expect(putData.error).toBe('NOT_FOUND');
      expect(putData.message).toBe('User not found');
    });
  });

  describe('複数操作の連続実行', () => {
    it('複数のプロフィール更新を連続して実行できる', async () => {
      const initialProfile = {
        PK: 'USER#test-user-id',
        SK: 'USER#test-user-id',
        entityType: 'USER' as const,
        userId: 'test-user-id',
        email: 'test@example.com',
        username: 'username1',
        createdAt: '2025-02-19T10:00:00Z',
        updatedAt: '2025-02-19T10:00:00Z',
      };

      // 1回目の更新
      const updatedProfile1 = {
        ...initialProfile,
        username: 'username2',
        updatedAt: '2025-02-20T11:00:00Z',
      };

      mockUpdate.mockResolvedValueOnce(updatedProfile1);

      const updateRes1 = await app.request('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: 'username2' }),
      });

      expect(updateRes1.status).toBe(200);
      const data1 = await updateRes1.json();
      expect(data1.username).toBe('username2');

      // 2回目の更新
      const updatedProfile2 = {
        ...updatedProfile1,
        username: 'username3',
        updatedAt: '2025-02-20T12:00:00Z',
      };

      mockUpdate.mockResolvedValueOnce(updatedProfile2);

      const updateRes2 = await app.request('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: 'username3' }),
      });

      expect(updateRes2.status).toBe(200);
      const data2 = await updateRes2.json();
      expect(data2.username).toBe('username3');

      // 3回目の更新
      const updatedProfile3 = {
        ...updatedProfile2,
        username: 'username4',
        updatedAt: '2025-02-20T13:00:00Z',
      };

      mockUpdate.mockResolvedValueOnce(updatedProfile3);

      const updateRes3 = await app.request('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: 'username4' }),
      });

      expect(updateRes3.status).toBe(200);
      const data3 = await updateRes3.json();
      expect(data3.username).toBe('username4');

      // すべての更新が呼ばれたことを確認
      expect(mockUpdate).toHaveBeenCalledTimes(3);

      // updatedAtが順次更新されていることを確認
      expect(new Date(data2.updatedAt).getTime()).toBeGreaterThan(
        new Date(data1.updatedAt).getTime()
      );
      expect(new Date(data3.updatedAt).getTime()).toBeGreaterThan(
        new Date(data2.updatedAt).getTime()
      );
    });
  });
});
