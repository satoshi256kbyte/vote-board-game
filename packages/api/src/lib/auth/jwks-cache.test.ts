import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JwksCache, CACHE_TTL_MS } from './jwks-cache.js';
import type { Jwk } from './types.js';

const JWKS_URL =
  'https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_test/.well-known/jwks.json';

const mockKeys: Jwk[] = [
  { kty: 'RSA', kid: 'key-1', use: 'sig', alg: 'RS256', n: 'test-n', e: 'AQAB' },
  { kty: 'RSA', kid: 'key-2', use: 'sig', alg: 'RS256', n: 'test-n-2', e: 'AQAB' },
];

const updatedKeys: Jwk[] = [
  { kty: 'RSA', kid: 'key-3', use: 'sig', alg: 'RS256', n: 'test-n-3', e: 'AQAB' },
];

describe('JwksCache', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('キャッシュヒット: 2回目の呼び出しでfetchが発生しない', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ keys: mockKeys }), { status: 200 })
    );

    const cache = new JwksCache(JWKS_URL);

    const firstResult = await cache.getKeys();
    const secondResult = await cache.getKeys();

    expect(firstResult).toEqual(mockKeys);
    expect(secondResult).toEqual(mockKeys);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('キャッシュ期限切れ: TTL経過後にfetchが再発生する', async () => {
    fetchSpy
      .mockResolvedValueOnce(new Response(JSON.stringify({ keys: mockKeys }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ keys: updatedKeys }), { status: 200 }));

    const cache = new JwksCache(JWKS_URL);

    const firstResult = await cache.getKeys();
    expect(firstResult).toEqual(mockKeys);

    // TTLを超過させる
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + CACHE_TTL_MS + 1);

    const secondResult = await cache.getKeys();
    expect(secondResult).toEqual(updatedKeys);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('フォールバック: fetch失敗時に期限切れキャッシュを返す', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    fetchSpy
      .mockResolvedValueOnce(new Response(JSON.stringify({ keys: mockKeys }), { status: 200 }))
      .mockRejectedValueOnce(new Error('Network error'));

    const cache = new JwksCache(JWKS_URL);

    const firstResult = await cache.getKeys();
    expect(firstResult).toEqual(mockKeys);

    // TTLを超過させる
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + CACHE_TTL_MS + 1);

    const secondResult = await cache.getKeys();
    expect(secondResult).toEqual(mockKeys);
    expect(warnSpy).toHaveBeenCalledWith('JWKS fetch failed, using expired cache', {
      error: 'Network error',
    });
  });

  it('キャッシュなしエラー: fetch失敗かつキャッシュなし時にエラーをスローする', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('Network error'));

    const cache = new JwksCache(JWKS_URL);

    await expect(cache.getKeys()).rejects.toThrow('Network error');
  });

  it('HTTPエラーレスポンス時にエラーをスローする', async () => {
    fetchSpy.mockResolvedValueOnce(new Response('Not Found', { status: 404 }));

    const cache = new JwksCache(JWKS_URL);

    await expect(cache.getKeys()).rejects.toThrow('JWKS fetch failed: 404');
  });

  it('HTTPエラーレスポンス時に期限切れキャッシュがあればフォールバックする', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    fetchSpy
      .mockResolvedValueOnce(new Response(JSON.stringify({ keys: mockKeys }), { status: 200 }))
      .mockResolvedValueOnce(new Response('Internal Server Error', { status: 500 }));

    const cache = new JwksCache(JWKS_URL);

    await cache.getKeys();

    // TTLを超過させる
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + CACHE_TTL_MS + 1);

    const result = await cache.getKeys();
    expect(result).toEqual(mockKeys);
    expect(warnSpy).toHaveBeenCalledWith('JWKS fetch failed, using expired cache', {
      error: 'JWKS fetch failed: 500',
    });
  });
});
