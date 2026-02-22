import type { Jwk, JwksCacheEntry } from './types.js';

export const CACHE_TTL_MS = 60 * 60 * 1000; // 1時間

export class JwksCache {
  private cache: JwksCacheEntry | null = null;
  private jwksUrl: string;

  constructor(jwksUrl: string) {
    this.jwksUrl = jwksUrl;
  }

  /** キャッシュからJWKSを取得。期限切れまたは未キャッシュの場合はfetchする */
  async getKeys(): Promise<Jwk[]> {
    const now = Date.now();

    // キャッシュが有効な場合
    if (this.cache && now - this.cache.fetchedAt < CACHE_TTL_MS) {
      return this.cache.keys;
    }

    // JWKSエンドポイントから取得
    try {
      const response = await fetch(this.jwksUrl);
      if (!response.ok) {
        throw new Error(`JWKS fetch failed: ${response.status}`);
      }
      const jwks = (await response.json()) as { keys: Jwk[] };
      this.cache = { keys: jwks.keys, fetchedAt: now };
      return this.cache.keys;
    } catch (error) {
      // 期限切れキャッシュが存在する場合はフォールバック
      if (this.cache) {
        console.warn('JWKS fetch failed, using expired cache', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return this.cache.keys;
      }
      // キャッシュなしの場合はエラー
      throw error;
    }
  }
}
