// 環境変数が必要なため、モジュールインポート前に設定
process.env.COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || 'ap-northeast-1_TestPool';
process.env.ICON_BUCKET_NAME = process.env.ICON_BUCKET_NAME || 'test-icon-bucket';
process.env.CDN_DOMAIN = process.env.CDN_DOMAIN || 'test-cdn.example.com';

import { describe, it, expect } from 'vitest';
import app from './index.js';

describe('API', () => {
  it('should return health check', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty('status', 'ok');
    expect(data).toHaveProperty('timestamp');
  });

  it('should return 404 for unknown routes', async () => {
    const res = await app.request('/unknown');
    expect(res.status).toBe(404);
  });

  it('should include CORS headers in responses', async () => {
    const res = await app.request('/health', {
      headers: {
        Origin: 'http://localhost:3000',
      },
    });

    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:3000');
    expect(res.headers.get('access-control-allow-credentials')).toBe('true');
  });

  it('should handle CORS preflight requests', async () => {
    const res = await app.request('/auth/register', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    });

    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:3000');
    expect(res.headers.get('access-control-allow-methods')).toContain('POST');
  });
});

describe('ルート保護設定', () => {
  describe('保護対象ルート（認証なしで401）', () => {
    it('POST /api/votes にAuthorizationヘッダーなし→401', async () => {
      const res = await app.request('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: 'game-1', candidateId: 'candidate-1' }),
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe('UNAUTHORIZED');
    });

    it('POST /api/candidates にAuthorizationヘッダーなし→401', async () => {
      const res = await app.request('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: 'game-1',
          position: { row: 2, col: 3 },
          description: 'テスト候補',
        }),
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe('UNAUTHORIZED');
    });
  });

  describe('公開ルート（認証なしで401以外）', () => {
    it('GET /api/candidates にAuthorizationヘッダーなし→401ではない', async () => {
      const res = await app.request('/api/candidates?gameId=game-1');

      expect(res.status).not.toBe(401);
    });

    it('GET /api/games にAuthorizationヘッダーなし→401ではない', async () => {
      const res = await app.request('/api/games');

      expect(res.status).not.toBe(401);
    });

    it('GET /health にAuthorizationヘッダーなし→200', async () => {
      const res = await app.request('/health');

      expect(res.status).toBe(200);
    });

    it('POST /auth/register にAuthorizationヘッダーなし→401ではない', async () => {
      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'Password123!',
          username: 'testuser',
        }),
      });

      expect(res.status).not.toBe(401);
    });
  });
});
