import { createMiddleware } from 'hono/factory';
import { jwtVerify, importJWK, errors } from 'jose';
import type { JWK } from 'jose';
import type {
  AuthVariables,
  AuthMiddlewareConfig,
  CognitoAccessTokenPayload,
  Jwk,
} from './types.js';
import { JwksCache } from './jwks-cache.js';

/** Bearerトークンを抽出 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  return token.length > 0 ? token : null;
}

/** JWTヘッダーからkidを取得 */
export function getKidFromToken(token: string): string | null {
  try {
    const [headerPart] = token.split('.');
    if (!headerPart) return null;
    const header = JSON.parse(atob(headerPart)) as Record<string, unknown>;
    return typeof header.kid === 'string' ? header.kid : null;
  } catch {
    return null;
  }
}

/** JWKS URLを構築 */
export function buildJwksUrl(region: string, userPoolId: string): string {
  const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
  return `${issuer}/.well-known/jwks.json`;
}

export function createAuthMiddleware(config: AuthMiddlewareConfig) {
  const issuer = `https://cognito-idp.${config.region}.amazonaws.com/${config.userPoolId}`;
  const jwksUrl = buildJwksUrl(config.region, config.userPoolId);
  const jwksCache = new JwksCache(jwksUrl);

  return createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    const authHeader = c.req.header('authorization');

    // Authorizationヘッダーの検証
    if (!authHeader) {
      return c.json({ error: 'UNAUTHORIZED', message: 'Authorization header is required' }, 401);
    }
    if (!authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'UNAUTHORIZED', message: 'Invalid authorization format' }, 401);
    }
    const token = authHeader.slice(7);
    if (token.length === 0) {
      return c.json({ error: 'UNAUTHORIZED', message: 'Token is required' }, 401);
    }

    // JWKS取得
    let keys: Jwk[];
    try {
      keys = await jwksCache.getKeys();
    } catch (error) {
      console.error('JWKS fetch failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return c.json(
        { error: 'INTERNAL_ERROR', message: 'Authentication service unavailable' },
        500
      );
    }

    // kidに一致する公開鍵を検索
    const kid = getKidFromToken(token);
    if (!kid) {
      console.warn('Token verification failed', { reason: 'invalid_token_header' });
      return c.json({ error: 'UNAUTHORIZED', message: 'Invalid token' }, 401);
    }

    const jwk = keys.find((k) => k.kid === kid);
    if (!jwk) {
      console.warn('Token verification failed', { reason: 'kid_not_found' });
      return c.json({ error: 'UNAUTHORIZED', message: 'Invalid token' }, 401);
    }

    // 署名検証 + クレーム検証
    try {
      const publicKey = await importJWK(jwk as unknown as JWK, 'RS256');
      const { payload } = await jwtVerify(token, publicKey, {
        issuer,
      });

      const claims = payload as unknown as CognitoAccessTokenPayload;

      // token_use検証
      if (claims.token_use !== 'access') {
        console.warn('Token verification failed', { reason: 'invalid_token_use' });
        return c.json({ error: 'UNAUTHORIZED', message: 'Invalid token' }, 401);
      }

      // 認証コンテキスト設定
      c.set('userId', claims.sub);
      c.set('email', claims.email);
      c.set('username', claims.preferred_username);

      await next();
    } catch (error) {
      if (error instanceof errors.JWTExpired) {
        console.warn('Token verification failed', { reason: 'token_expired' });
        return c.json({ error: 'TOKEN_EXPIRED', message: 'Token has expired' }, 401);
      }
      console.warn('Token verification failed', { reason: 'invalid_signature_or_claims' });
      return c.json({ error: 'UNAUTHORIZED', message: 'Invalid token' }, 401);
    }
  });
}
