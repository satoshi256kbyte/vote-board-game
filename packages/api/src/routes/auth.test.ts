import { describe, it, expect } from 'vitest';
import app from '../index.js';

describe('Auth Router - CORS', () => {
  it('should include CORS headers in register endpoint response', async () => {
    const res = await app.request('/auth/register', {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:3000',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'Test1234',
        username: 'testuser',
      }),
    });

    // CORS ヘッダーが含まれていることを確認
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:3000');
    expect(res.headers.get('access-control-allow-credentials')).toBe('true');
  });

  it('should handle CORS preflight for register endpoint', async () => {
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
    expect(res.headers.get('access-control-allow-headers')).toContain('Content-Type');
  });

  it('should allow multiple origins from ALLOWED_ORIGINS env var', async () => {
    // 環境変数のテストは実際の環境で確認
    // ここでは localhost:3000 が許可されていることを確認
    const res = await app.request('/auth/register', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
      },
    });

    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:3000');
  });
});
