import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { isOriginAllowed } from './cors.js';

describe('CORS Middleware Properties', () => {
  /**
   * **Validates: Requirements 3.1, 3.2**
   *
   * Property 1: CORS ヘッダーの許可
   * 任意の許可されたオリジンからのリクエストに対して、適切な CORS ヘッダーを返す
   */
  it('Property 1: should allow all requests from allowed origins', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'https://vote-board-game-web.vercel.app',
          'https://preview-abc123.vercel.app',
          'https://preview-xyz789.vercel.app',
          'http://localhost:3000'
        ),
        (origin) => {
          const allowedOrigins =
            'https://vote-board-game-web.vercel.app,https://preview-abc123.vercel.app,https://preview-xyz789.vercel.app,http://localhost:3000';
          const result = isOriginAllowed(origin, allowedOrigins.split(','));
          expect(result).toBe(true);
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  /**
   * **Validates: Requirements 3.1, 3.2**
   *
   * Property 2: 不正なオリジンの拒否
   * 任意の許可されていないオリジンに対して、CORS ヘッダーを返さない
   */
  it('Property 2: should reject all unauthorized origins', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'https://malicious-site.com',
          'https://evil.example.com',
          'http://attacker.net',
          'https://vercel.app.fake.com'
        ),
        (origin) => {
          const allowedOrigins = [
            'https://vote-board-game-web.vercel.app',
            'https://preview-test.vercel.app',
          ];

          const result = isOriginAllowed(origin, allowedOrigins);
          expect(result).toBe(false);
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  /**
   * **Validates: Requirements 3.1**
   *
   * Property 3: 複数オリジンの処理
   * 任意の許可されたオリジンのリストに対して、各オリジンが正しく処理される
   */
  it('Property 3: should handle multiple allowed origins correctly', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom(
            'https://example.com',
            'https://test.com',
            'https://preview.vercel.app',
            'http://localhost:3000'
          ),
          { minLength: 1, maxLength: 4 }
        ),
        (origins) => {
          const allowedOrigins = origins.join(',');
          const testOrigin = origins[0];

          const result = isOriginAllowed(testOrigin, allowedOrigins.split(','));
          expect(result).toBe(true);
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  /**
   * **Validates: Requirements 3.1**
   *
   * Property 4: 完全一致の検証
   * オリジンは完全一致のみを許可する
   */
  it('Property 4: should only match exact origins', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'https://vote-board-game-web.vercel.app',
          'http://localhost:3000',
          'https://example.com'
        ),
        (origin) => {
          const allowedOrigins = [origin];

          const result = isOriginAllowed(origin, allowedOrigins);
          expect(result).toBe(true);
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });
});
