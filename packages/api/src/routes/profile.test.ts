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

describe('GET /api/profile', () => {
  let app: Hono;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = new Hono();

    // profileRouterを動的にインポート
    const { profileRouter } = await import('./profile.js');
    app.route('/api/profile', profileRouter);
  });

  it('有効なJWT Tokenでプロフィール取得成功（200 OK）', async () => {
    const mockProfile = {
      PK: 'USER#test-user-id',
      SK: 'USER#test-user-id',
      entityType: 'USER' as const,
      userId: 'test-user-id',
      email: 'test@example.com',
      username: 'testuser',
      iconUrl: 'https://cdn.example.com/icons/test-user-id/123456.png',
      createdAt: '2025-02-19T10:00:00Z',
      updatedAt: '2025-02-19T15:30:00Z',
    };

    mockGetById.mockResolvedValue(mockProfile);

    const res = await app.request('/api/profile', {
      method: 'GET',
    });

    expect(res.status).toBe(200);
    const data = await res.json();

    // レスポンスに全フィールドが含まれることを確認
    expect(data).toHaveProperty('userId');
    expect(data).toHaveProperty('email');
    expect(data).toHaveProperty('username');
    expect(data).toHaveProperty('iconUrl');
    expect(data).toHaveProperty('createdAt');
    expect(data).toHaveProperty('updatedAt');

    // 値の検証
    expect(data.userId).toBe('test-user-id');
    expect(data.email).toBe('test@example.com');
    expect(data.username).toBe('testuser');
    expect(data.iconUrl).toBe('https://cdn.example.com/icons/test-user-id/123456.png');
    expect(data.createdAt).toBe('2025-02-19T10:00:00Z');
    expect(data.updatedAt).toBe('2025-02-19T15:30:00Z');

    expect(mockGetById).toHaveBeenCalledWith('test-user-id');
  });

  it('ユーザーが存在しない場合に404エラー', async () => {
    mockGetById.mockResolvedValue(null);

    const res = await app.request('/api/profile', {
      method: 'GET',
    });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('NOT_FOUND');
    expect(data.message).toBe('User not found');
    expect(mockGetById).toHaveBeenCalledWith('test-user-id');
  });

  it('iconUrlがない場合でもプロフィール取得成功（200 OK）', async () => {
    const mockProfile = {
      PK: 'USER#test-user-id',
      SK: 'USER#test-user-id',
      entityType: 'USER' as const,
      userId: 'test-user-id',
      email: 'test@example.com',
      username: 'testuser',
      // iconUrlなし
      createdAt: '2025-02-19T10:00:00Z',
      updatedAt: '2025-02-19T15:30:00Z',
    };

    mockGetById.mockResolvedValue(mockProfile);

    const res = await app.request('/api/profile', {
      method: 'GET',
    });

    expect(res.status).toBe(200);
    const data = await res.json();

    // iconUrlがundefinedの場合、JSONレスポンスには含まれない
    expect(data.userId).toBe('test-user-id');
    expect(data.email).toBe('test@example.com');
    expect(data.username).toBe('testuser');
    expect(data.createdAt).toBe('2025-02-19T10:00:00Z');
    expect(data.updatedAt).toBe('2025-02-19T15:30:00Z');
  });

  it('DynamoDBエラー時に500エラー', async () => {
    mockGetById.mockRejectedValue(new Error('DynamoDB error'));

    const res = await app.request('/api/profile', {
      method: 'GET',
    });

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('INTERNAL_ERROR');
    expect(data.message).toBe('An internal error occurred');
    // 内部エラー詳細が公開されていないことを確認
    expect(data.message).not.toContain('DynamoDB');
    expect(data).not.toHaveProperty('stack');
  });
});

describe('GET /api/profile - 認証エラー', () => {
  let app: Hono;

  beforeEach(async () => {
    vi.clearAllMocks();

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

    app = new Hono();

    // profileRouterを動的にインポート
    const { profileRouter } = await import('./profile.js');
    app.route('/api/profile', profileRouter);
  });

  it('JWT Token不正で401エラー', async () => {
    const res = await app.request('/api/profile', {
      method: 'GET',
    });

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('UNAUTHORIZED');
    expect(data.message).toBe('Invalid or expired token');
  });
});

describe('PUT /api/profile', () => {
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

  it('usernameのみ更新成功（200 OK）', async () => {
    const mockUpdatedProfile = {
      PK: 'USER#test-user-id',
      SK: 'USER#test-user-id',
      entityType: 'USER' as const,
      userId: 'test-user-id',
      email: 'test@example.com',
      username: 'newusername',
      iconUrl: 'https://cdn.example.com/icons/test-user-id/123456.png',
      createdAt: '2025-02-19T10:00:00Z',
      updatedAt: '2025-02-20T12:00:00Z',
    };

    mockUpdate.mockResolvedValue(mockUpdatedProfile);

    const res = await app.request('/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username: 'newusername' }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.username).toBe('newusername');
    expect(data.updatedAt).toBe('2025-02-20T12:00:00Z');
    expect(mockUpdate).toHaveBeenCalledWith('test-user-id', { username: 'newusername' });
  });

  it('iconUrlのみ更新成功（200 OK）', async () => {
    const mockUpdatedProfile = {
      PK: 'USER#test-user-id',
      SK: 'USER#test-user-id',
      entityType: 'USER' as const,
      userId: 'test-user-id',
      email: 'test@example.com',
      username: 'testuser',
      iconUrl: 'https://cdn.example.com/icons/new-icon.png',
      createdAt: '2025-02-19T10:00:00Z',
      updatedAt: '2025-02-20T12:00:00Z',
    };

    mockUpdate.mockResolvedValue(mockUpdatedProfile);

    const res = await app.request('/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ iconUrl: 'https://cdn.example.com/icons/new-icon.png' }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.iconUrl).toBe('https://cdn.example.com/icons/new-icon.png');
    expect(data.updatedAt).toBe('2025-02-20T12:00:00Z');
    expect(mockUpdate).toHaveBeenCalledWith('test-user-id', {
      iconUrl: 'https://cdn.example.com/icons/new-icon.png',
    });
  });

  it('username + iconUrl同時更新成功（200 OK）', async () => {
    const mockUpdatedProfile = {
      PK: 'USER#test-user-id',
      SK: 'USER#test-user-id',
      entityType: 'USER' as const,
      userId: 'test-user-id',
      email: 'test@example.com',
      username: 'newusername',
      iconUrl: 'https://cdn.example.com/icons/new-icon.png',
      createdAt: '2025-02-19T10:00:00Z',
      updatedAt: '2025-02-20T12:00:00Z',
    };

    mockUpdate.mockResolvedValue(mockUpdatedProfile);

    const res = await app.request('/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'newusername',
        iconUrl: 'https://cdn.example.com/icons/new-icon.png',
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.username).toBe('newusername');
    expect(data.iconUrl).toBe('https://cdn.example.com/icons/new-icon.png');
    expect(data.updatedAt).toBe('2025-02-20T12:00:00Z');
    expect(mockUpdate).toHaveBeenCalledWith('test-user-id', {
      username: 'newusername',
      iconUrl: 'https://cdn.example.com/icons/new-icon.png',
    });
  });

  it('フィールドなしで400エラー', async () => {
    const res = await app.request('/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('VALIDATION_ERROR');
    expect(data.message).toBe('Validation failed');
    expect(data.details).toHaveProperty('fields');
  });

  it('username長さ不正で400エラー（0文字）', async () => {
    const res = await app.request('/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username: '' }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('VALIDATION_ERROR');
    expect(data.message).toBe('Validation failed');
    expect(data.details).toHaveProperty('fields');
  });

  it('username長さ不正で400エラー（51文字以上）', async () => {
    const longUsername = 'a'.repeat(51);
    const res = await app.request('/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username: longUsername }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('VALIDATION_ERROR');
    expect(data.message).toBe('Validation failed');
    expect(data.details).toHaveProperty('fields');
  });

  it('iconUrl形式不正で400エラー（HTTPSでない）', async () => {
    const res = await app.request('/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ iconUrl: 'http://cdn.example.com/icons/icon.png' }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('VALIDATION_ERROR');
    expect(data.message).toBe('Validation failed');
    expect(data.details).toHaveProperty('fields');
  });

  it('iconUrl形式不正で400エラー（無効なURL）', async () => {
    const res = await app.request('/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ iconUrl: 'not-a-url' }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('VALIDATION_ERROR');
    expect(data.message).toBe('Validation failed');
    expect(data.details).toHaveProperty('fields');
  });

  it('updatedAtが更新されることを確認', async () => {
    const oldUpdatedAt = '2025-02-19T10:00:00Z';
    const newUpdatedAt = '2025-02-20T12:00:00Z';

    const mockUpdatedProfile = {
      PK: 'USER#test-user-id',
      SK: 'USER#test-user-id',
      entityType: 'USER' as const,
      userId: 'test-user-id',
      email: 'test@example.com',
      username: 'newusername',
      iconUrl: 'https://cdn.example.com/icons/test-user-id/123456.png',
      createdAt: '2025-02-19T10:00:00Z',
      updatedAt: newUpdatedAt,
    };

    mockUpdate.mockResolvedValue(mockUpdatedProfile);

    const res = await app.request('/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username: 'newusername' }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();

    // updatedAtが更新されていることを確認
    expect(data.updatedAt).toBe(newUpdatedAt);
    expect(data.updatedAt).not.toBe(oldUpdatedAt);
    // 新しいupdatedAtが古いものより後であることを確認
    expect(new Date(data.updatedAt).getTime()).toBeGreaterThan(new Date(oldUpdatedAt).getTime());
  });

  it('ユーザーが存在しない場合に404エラー', async () => {
    mockUpdate.mockRejectedValue(new Error('User not found'));

    const res = await app.request('/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username: 'newusername' }),
    });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('NOT_FOUND');
    expect(data.message).toBe('User not found');
  });

  it('DynamoDBエラー時に500エラー', async () => {
    mockUpdate.mockRejectedValue(new Error('DynamoDB error'));

    const res = await app.request('/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username: 'newusername' }),
    });

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('INTERNAL_ERROR');
    expect(data.message).toBe('An internal error occurred');
    // 内部エラー詳細が公開されていないことを確認
    expect(data.message).not.toContain('DynamoDB');
    expect(data).not.toHaveProperty('stack');
  });
});

describe('POST /api/profile/icon/upload-url', () => {
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

  it('有効なfileExtensionでPresigned URL生成成功（200 OK）', async () => {
    mockGenerateUploadUrl.mockResolvedValue({
      uploadUrl:
        'https://s3.amazonaws.com/test-bucket/icons/test-user-id/1234567890.png?signature=...',
      iconUrl: 'https://cdn.example.com/icons/test-user-id/1234567890.png',
      expiresIn: 300,
    });

    const res = await app.request('/api/profile/icon/upload-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileExtension: 'png' }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('uploadUrl');
    expect(data).toHaveProperty('iconUrl');
    expect(data).toHaveProperty('expiresIn');
    expect(data.expiresIn).toBe(300);
    expect(mockGenerateUploadUrl).toHaveBeenCalledWith('test-user-id', 'png');
  });

  it('サポートされていない拡張子で400エラー', async () => {
    const res = await app.request('/api/profile/icon/upload-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileExtension: 'pdf' }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('VALIDATION_ERROR');
    expect(data.message).toBe('Validation failed');
    expect(data.details).toHaveProperty('fields');
  });

  it('fileExtensionが欠落している場合に400エラー', async () => {
    const res = await app.request('/api/profile/icon/upload-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('VALIDATION_ERROR');
  });

  it('各ファイル拡張子（png, jpg, jpeg, gif）でPresigned URL生成成功', async () => {
    const extensions = ['png', 'jpg', 'jpeg', 'gif'];

    for (const ext of extensions) {
      mockGenerateUploadUrl.mockResolvedValue({
        uploadUrl: `https://s3.amazonaws.com/test-bucket/icons/test-user-id/1234567890.${ext}?signature=...`,
        iconUrl: `https://cdn.example.com/icons/test-user-id/1234567890.${ext}`,
        expiresIn: 300,
      });

      const res = await app.request('/api/profile/icon/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileExtension: ext }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('uploadUrl');
      expect(data).toHaveProperty('iconUrl');
      expect(data.iconUrl).toContain(ext);
      expect(mockGenerateUploadUrl).toHaveBeenCalledWith('test-user-id', ext);
    }
  });

  it('S3Serviceエラー時に500エラー', async () => {
    mockGenerateUploadUrl.mockRejectedValue(new Error('S3 error'));

    const res = await app.request('/api/profile/icon/upload-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileExtension: 'png' }),
    });

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('INTERNAL_ERROR');
    expect(data.message).toBe('An internal error occurred');
  });
});
