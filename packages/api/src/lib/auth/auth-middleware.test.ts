import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { Jwk } from './types.js';

// Mock jose module - factory must not reference top-level variables
const mockJwtVerify = vi.fn();
const mockImportJWK = vi.fn();

vi.mock('jose', () => {
  class JWTExpired extends Error {
    code = 'ERR_JWT_EXPIRED';
    constructor(message = 'JWT expired') {
      super(message);
      this.name = 'JWTExpired';
    }
  }
  return {
    jwtVerify: (...args: unknown[]) => mockJwtVerify(...args),
    importJWK: (...args: unknown[]) => mockImportJWK(...args),
    errors: {
      JWTExpired,
    },
  };
});

// Mock JwksCache
const mockGetKeys = vi.fn();

vi.mock('./jwks-cache.js', () => ({
  JwksCache: vi.fn().mockImplementation(() => ({
    getKeys: mockGetKeys,
  })),
}));

import { createAuthMiddleware } from './auth-middleware.js';
import { errors } from 'jose';
import type { AuthVariables } from './types.js';

const TEST_CONFIG = {
  userPoolId: 'ap-northeast-1_testPool',
  region: 'ap-northeast-1',
};

const TEST_KID = 'test-kid-1';

const mockJwks: Jwk[] = [
  { kty: 'RSA', kid: TEST_KID, use: 'sig', alg: 'RS256', n: 'test-n', e: 'AQAB' },
];

/** Base64エンコードされたJWTヘッダーを含むダミートークンを生成 */
function createDummyToken(kid: string): string {
  const header = btoa(JSON.stringify({ alg: 'RS256', kid }));
  const payload = btoa(JSON.stringify({ sub: 'test' }));
  const signature = 'dummy-signature';
  return `${header}.${payload}.${signature}`;
}

function createApp() {
  const app = new Hono<{ Variables: AuthVariables }>();
  const middleware = createAuthMiddleware(TEST_CONFIG);

  app.use('/protected/*', middleware);
  app.get('/protected/resource', (c) => {
    return c.json({
      userId: c.get('userId'),
      email: c.get('email'),
      username: c.get('username'),
    });
  });

  return app;
}

describe('createAuthMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Authorizationヘッダー検証', () => {
    it('Authorizationヘッダーなし→401 UNAUTHORIZED', async () => {
      const app = createApp();
      const res = await app.request('/protected/resource');

      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: string; message: string };
      expect(body.error).toBe('UNAUTHORIZED');
      expect(body.message).toBe('Authorization header is required');
    });

    it('Bearer形式でない→401 UNAUTHORIZED', async () => {
      const app = createApp();
      const res = await app.request('/protected/resource', {
        headers: { Authorization: 'Basic some-token' },
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: string; message: string };
      expect(body.error).toBe('UNAUTHORIZED');
      expect(body.message).toBe('Invalid authorization format');
    });

    it('トークン空→401 UNAUTHORIZED', async () => {
      // Hono/Fetch API trims trailing whitespace from header values,
      // so "Bearer " becomes "Bearer" which fails the startsWith check.
      // To test the empty token path, we call the middleware logic directly
      // by sending a token that decodes to empty after Bearer prefix.
      // Instead, we verify the extractBearerToken helper handles this case.
      const { extractBearerToken } = await import('./auth-middleware.js');
      expect(extractBearerToken('Bearer ')).toBeNull();

      // Also verify the middleware returns 401 for "Bearer" (trimmed)
      const app = createApp();
      const res = await app.request('/protected/resource', {
        headers: { Authorization: 'Bearer' },
      });
      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: string; message: string };
      expect(body.error).toBe('UNAUTHORIZED');
    });
  });

  describe('認証成功', () => {
    it('有効なトークン→認証成功、コンテキストにuserId/email/username設定', async () => {
      const token = createDummyToken(TEST_KID);
      mockGetKeys.mockResolvedValue(mockJwks);
      mockImportJWK.mockResolvedValue('mock-public-key');
      mockJwtVerify.mockResolvedValue({
        payload: {
          sub: 'user-123',
          iss: `https://cognito-idp.ap-northeast-1.amazonaws.com/${TEST_CONFIG.userPoolId}`,
          token_use: 'access',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
          email: 'user@example.com',
          preferred_username: 'testuser',
        },
      });

      const app = createApp();
      const res = await app.request('/protected/resource', {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as { userId: string; email: string; username: string };
      expect(body.userId).toBe('user-123');
      expect(body.email).toBe('user@example.com');
      expect(body.username).toBe('testuser');
    });

    it('emailなしトークン→email=undefined', async () => {
      const token = createDummyToken(TEST_KID);
      mockGetKeys.mockResolvedValue(mockJwks);
      mockImportJWK.mockResolvedValue('mock-public-key');
      mockJwtVerify.mockResolvedValue({
        payload: {
          sub: 'user-456',
          iss: `https://cognito-idp.ap-northeast-1.amazonaws.com/${TEST_CONFIG.userPoolId}`,
          token_use: 'access',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
          preferred_username: 'testuser2',
        },
      });

      const app = createApp();
      const res = await app.request('/protected/resource', {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as { userId: string; email: undefined; username: string };
      expect(body.userId).toBe('user-456');
      expect(body.email).toBeUndefined();
      expect(body.username).toBe('testuser2');
    });

    it('preferred_usernameなしトークン→username=undefined', async () => {
      const token = createDummyToken(TEST_KID);
      mockGetKeys.mockResolvedValue(mockJwks);
      mockImportJWK.mockResolvedValue('mock-public-key');
      mockJwtVerify.mockResolvedValue({
        payload: {
          sub: 'user-789',
          iss: `https://cognito-idp.ap-northeast-1.amazonaws.com/${TEST_CONFIG.userPoolId}`,
          token_use: 'access',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
          email: 'user@example.com',
        },
      });

      const app = createApp();
      const res = await app.request('/protected/resource', {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as { userId: string; email: string; username: undefined };
      expect(body.userId).toBe('user-789');
      expect(body.email).toBe('user@example.com');
      expect(body.username).toBeUndefined();
    });
  });

  describe('トークン検証エラー', () => {
    it('署名不正→401 UNAUTHORIZED "Invalid token"', async () => {
      const token = createDummyToken(TEST_KID);
      mockGetKeys.mockResolvedValue(mockJwks);
      mockImportJWK.mockResolvedValue('mock-public-key');
      mockJwtVerify.mockRejectedValue(new Error('signature verification failed'));

      const app = createApp();
      const res = await app.request('/protected/resource', {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: string; message: string };
      expect(body.error).toBe('UNAUTHORIZED');
      expect(body.message).toBe('Invalid token');
    });

    it('kid不一致→401 UNAUTHORIZED "Invalid token"', async () => {
      const token = createDummyToken('unknown-kid');
      mockGetKeys.mockResolvedValue(mockJwks);

      const app = createApp();
      const res = await app.request('/protected/resource', {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: string; message: string };
      expect(body.error).toBe('UNAUTHORIZED');
      expect(body.message).toBe('Invalid token');
    });

    it('iss不正→401 UNAUTHORIZED "Invalid token"', async () => {
      const token = createDummyToken(TEST_KID);
      mockGetKeys.mockResolvedValue(mockJwks);
      mockImportJWK.mockResolvedValue('mock-public-key');
      mockJwtVerify.mockRejectedValue(new Error('unexpected "iss" claim value'));

      const app = createApp();
      const res = await app.request('/protected/resource', {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: string; message: string };
      expect(body.error).toBe('UNAUTHORIZED');
      expect(body.message).toBe('Invalid token');
    });

    it('token_use不正→401 UNAUTHORIZED "Invalid token"', async () => {
      const token = createDummyToken(TEST_KID);
      mockGetKeys.mockResolvedValue(mockJwks);
      mockImportJWK.mockResolvedValue('mock-public-key');
      mockJwtVerify.mockResolvedValue({
        payload: {
          sub: 'user-123',
          iss: `https://cognito-idp.ap-northeast-1.amazonaws.com/${TEST_CONFIG.userPoolId}`,
          token_use: 'id',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
        },
      });

      const app = createApp();
      const res = await app.request('/protected/resource', {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: string; message: string };
      expect(body.error).toBe('UNAUTHORIZED');
      expect(body.message).toBe('Invalid token');
    });

    it('有効期限切れ→401 TOKEN_EXPIRED "Token has expired"', async () => {
      const token = createDummyToken(TEST_KID);
      mockGetKeys.mockResolvedValue(mockJwks);
      mockImportJWK.mockResolvedValue('mock-public-key');
      mockJwtVerify.mockRejectedValue(new errors.JWTExpired('JWT expired'));

      const app = createApp();
      const res = await app.request('/protected/resource', {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: string; message: string };
      expect(body.error).toBe('TOKEN_EXPIRED');
      expect(body.message).toBe('Token has expired');
    });
  });

  describe('JWKS取得エラー', () => {
    it('JWKS取得失敗（キャッシュなし）→500 INTERNAL_ERROR', async () => {
      const token = createDummyToken(TEST_KID);
      mockGetKeys.mockRejectedValue(new Error('Network error'));

      const app = createApp();
      const res = await app.request('/protected/resource', {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(500);
      const body = (await res.json()) as { error: string; message: string };
      expect(body.error).toBe('INTERNAL_ERROR');
      expect(body.message).toBe('Authentication service unavailable');
    });
  });
});
