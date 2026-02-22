import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { Hono } from 'hono';
import { SignJWT, generateKeyPair, exportJWK } from 'jose';
import type { JWK, KeyLike } from 'jose';
import { extractBearerToken, buildJwksUrl, createAuthMiddleware } from './auth-middleware.js';
import type { AuthVariables } from './types.js';

// --- Shared helpers ---

interface TestKeyPair {
  publicKey: KeyLike;
  privateKey: KeyLike;
  publicJwk: JWK;
  kid: string;
}

async function generateTestKeyPair(kid: string): Promise<TestKeyPair> {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const publicJwk = await exportJWK(publicKey);
  publicJwk.kid = kid;
  publicJwk.alg = 'RS256';
  publicJwk.use = 'sig';
  return { publicKey, privateKey, publicJwk, kid };
}

const TEST_REGION = 'ap-northeast-1';
const TEST_USER_POOL_ID = 'ap-northeast-1_TestPool';
const TEST_ISSUER = `https://cognito-idp.${TEST_REGION}.amazonaws.com/${TEST_USER_POOL_ID}`;
const TEST_KID = 'prop-test-kid';

function createTestApp(middleware: ReturnType<typeof createAuthMiddleware>) {
  const app = new Hono<{ Variables: AuthVariables }>();
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

async function createSignedToken(
  privateKey: KeyLike,
  kid: string,
  claims: Record<string, unknown>,
  issuer: string,
  expiresIn?: string
): Promise<string> {
  let builder = new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid })
    .setIssuer(issuer)
    .setIssuedAt();
  if (expiresIn) {
    builder = builder.setExpirationTime(expiresIn);
  }
  return builder.sign(privateKey);
}

/**
 * Feature: 5-jwt-token-verification-middleware, Property 1: Bearerトークン抽出の正当性
 * Validates: Requirements 1.1, 1.3
 */
describe('プロパティ1: Bearerトークン抽出の正当性', () => {
  it('任意の文字列tokenに対して、Bearer ${token}から抽出した結果がtokenと一致する', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => !s.includes('\n') && !s.includes('\r')),
        (token) => {
          const result = extractBearerToken(`Bearer ${token}`);
          expect(result).toBe(token);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Bearer で始まらない任意の文字列に対して、抽出が失敗する', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !s.startsWith('Bearer ')),
        (header) => {
          const result = extractBearerToken(header);
          expect(result).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('undefinedに対して、抽出が失敗する', () => {
    expect(extractBearerToken(undefined)).toBeNull();
  });
});

/**
 * Feature: 5-jwt-token-verification-middleware, Property 2: JWKSエンドポイントURL構築
 * Validates: Requirements 2.1, 8.4
 */
describe('プロパティ2: JWKSエンドポイントURL構築', () => {
  it('任意のregionとuserPoolIdに対して、正しいURL形式が生成される', () => {
    const regionArb = fc.stringMatching(/^[a-z]{2}-[a-z]+-[0-9]$/);
    const userPoolIdArb = fc.stringMatching(/^[a-z]{2}-[a-z]+-[0-9]_[A-Za-z0-9]+$/);

    fc.assert(
      fc.property(regionArb, userPoolIdArb, (region, userPoolId) => {
        const url = buildJwksUrl(region, userPoolId);
        const expected = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
        expect(url).toBe(expected);
        expect(url).toMatch(
          /^https:\/\/cognito-idp\..+\.amazonaws\.com\/.+\/\.well-known\/jwks\.json$/
        );
      }),
      { numRuns: 100 }
    );
  });
});

// --- Properties 3-8: Middleware integration tests with real JWTs ---

describe('プロパティ3-8: ミドルウェア統合プロパティテスト', () => {
  let correctKeyPair: TestKeyPair;
  let wrongKeyPair: TestKeyPair;
  let originalFetch: typeof global.fetch;

  beforeEach(async () => {
    correctKeyPair = await generateTestKeyPair(TEST_KID);
    wrongKeyPair = await generateTestKeyPair('wrong-kid');

    originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
      if (urlStr.includes('.well-known/jwks.json')) {
        return Promise.resolve(
          new Response(JSON.stringify({ keys: [correctKeyPair.publicJwk] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      return Promise.resolve(new Response('Not Found', { status: 404 }));
    });

    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function createMiddlewareApp() {
    const middleware = createAuthMiddleware({
      userPoolId: TEST_USER_POOL_ID,
      region: TEST_REGION,
    });
    return createTestApp(middleware);
  }

  /**
   * Feature: 5-jwt-token-verification-middleware, Property 3: 署名検証の正当性
   * Validates: Requirements 2.2, 2.3, 2.4
   */
  describe('プロパティ3: 署名検証の正当性', () => {
    it('正しい鍵で署名されたトークンは検証成功、異なる鍵で署名されたトークンは401', async () => {
      const app = createMiddlewareApp();

      await fc.assert(
        fc.asyncProperty(fc.boolean(), async (useCorrectKey) => {
          const keyPair = useCorrectKey ? correctKeyPair : wrongKeyPair;
          const token = await createSignedToken(
            keyPair.privateKey,
            TEST_KID,
            { sub: 'user-prop3', token_use: 'access' },
            TEST_ISSUER,
            '1h'
          );

          const res = await app.request('/protected/resource', {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (useCorrectKey) {
            expect(res.status).toBe(200);
          } else {
            expect(res.status).toBe(401);
            const body = (await res.json()) as { error: string };
            expect(body.error).toBe('UNAUTHORIZED');
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: 5-jwt-token-verification-middleware, Property 4: クレーム検証
   * Validates: Requirements 3.1, 3.2, 3.4, 3.5
   */
  describe('プロパティ4: クレーム検証', () => {
    it('issとtoken_useが正しいトークンは通過、不正なトークンは401', async () => {
      const app = createMiddlewareApp();

      const issArb = fc.oneof(
        fc.constant(TEST_ISSUER),
        fc.string({ minLength: 1 }).filter((s) => s !== TEST_ISSUER)
      );
      const tokenUseArb = fc.oneof(
        fc.constant('access'),
        fc.string({ minLength: 1 }).filter((s) => s !== 'access')
      );

      await fc.assert(
        fc.asyncProperty(issArb, tokenUseArb, async (iss, tokenUse) => {
          const isCorrectIss = iss === TEST_ISSUER;
          const isCorrectTokenUse = tokenUse === 'access';

          const token = await new SignJWT({ sub: 'user-prop4', token_use: tokenUse })
            .setProtectedHeader({ alg: 'RS256', kid: TEST_KID })
            .setIssuer(iss)
            .setIssuedAt()
            .setExpirationTime('1h')
            .sign(correctKeyPair.privateKey);

          const res = await app.request('/protected/resource', {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (isCorrectIss && isCorrectTokenUse) {
            expect(res.status).toBe(200);
          } else {
            expect(res.status).toBe(401);
            const body = (await res.json()) as { error: string };
            expect(body.error).toBe('UNAUTHORIZED');
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: 5-jwt-token-verification-middleware, Property 5: 有効期限切れトークンのエラーコード区別
   * Validates: Requirements 3.3, 3.6
   */
  describe('プロパティ5: 有効期限切れトークンのエラーコード区別', () => {
    it('期限切れトークンに対してTOKEN_EXPIREDが返る', async () => {
      const app = createMiddlewareApp();

      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 1, max: 86400 }), async (secondsInPast) => {
          const now = Math.floor(Date.now() / 1000);
          const token = await new SignJWT({
            sub: 'user-prop5',
            token_use: 'access',
          })
            .setProtectedHeader({ alg: 'RS256', kid: TEST_KID })
            .setIssuer(TEST_ISSUER)
            .setIssuedAt(now - secondsInPast - 60)
            .setExpirationTime(now - secondsInPast)
            .sign(correctKeyPair.privateKey);

          const res = await app.request('/protected/resource', {
            headers: { Authorization: `Bearer ${token}` },
          });

          expect(res.status).toBe(401);
          const body = (await res.json()) as { error: string; message: string };
          expect(body.error).toBe('TOKEN_EXPIRED');
          expect(body.message).toBe('Token has expired');
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: 5-jwt-token-verification-middleware, Property 6: 認証コンテキストのラウンドトリップ
   * Validates: Requirements 4.1, 4.2, 4.3, 4.4
   */
  describe('プロパティ6: 認証コンテキストのラウンドトリップ', () => {
    it('任意のクレーム値に対して、コンテキストから取得した値が元のクレーム値と一致', async () => {
      const app = createMiddlewareApp();

      const subArb = fc.stringMatching(/^[a-f0-9-]{8,36}$/);
      const emailArb = fc.option(fc.stringMatching(/^[a-z]{3,10}@[a-z]{3,8}\.[a-z]{2,4}$/), {
        nil: undefined,
      });
      const usernameArb = fc.option(fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{2,15}$/), {
        nil: undefined,
      });

      await fc.assert(
        fc.asyncProperty(subArb, emailArb, usernameArb, async (sub, email, username) => {
          const claims: Record<string, unknown> = {
            sub,
            token_use: 'access',
          };
          if (email !== undefined) claims.email = email;
          if (username !== undefined) claims.preferred_username = username;

          const token = await new SignJWT(claims)
            .setProtectedHeader({ alg: 'RS256', kid: TEST_KID })
            .setIssuer(TEST_ISSUER)
            .setIssuedAt()
            .setExpirationTime('1h')
            .sign(correctKeyPair.privateKey);

          const res = await app.request('/protected/resource', {
            headers: { Authorization: `Bearer ${token}` },
          });

          expect(res.status).toBe(200);
          const body = (await res.json()) as {
            userId: string;
            email: string | undefined;
            username: string | undefined;
          };
          expect(body.userId).toBe(sub);
          if (email !== undefined) {
            expect(body.email).toBe(email);
          } else {
            expect(body.email).toBeUndefined();
          }
          if (username !== undefined) {
            expect(body.username).toBe(username);
          } else {
            expect(body.username).toBeUndefined();
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: 5-jwt-token-verification-middleware, Property 7: エラーレスポンス形式の一貫性
   * Validates: Requirements 7.1, 7.2, 7.3, 7.4
   */
  describe('プロパティ7: エラーレスポンス形式の一貫性', () => {
    it('任意の認証エラーに対して、errorとmessageフィールドを含み、トークン情報を含まない', async () => {
      const app = createMiddlewareApp();

      type ErrorScenario =
        | 'no_header'
        | 'bad_format'
        | 'wrong_key'
        | 'bad_iss'
        | 'bad_token_use'
        | 'expired';

      const scenarioArb: fc.Arbitrary<ErrorScenario> = fc.constantFrom(
        'no_header',
        'bad_format',
        'wrong_key',
        'bad_iss',
        'bad_token_use',
        'expired'
      );

      const tokenStringArb = fc
        .string({ minLength: 5, maxLength: 20 })
        .filter((s) => !s.includes('\n') && !s.includes('\r'));

      await fc.assert(
        fc.asyncProperty(scenarioArb, tokenStringArb, async (scenario, randomStr) => {
          let headers: Record<string, string> = {};
          let tokenUsed = '';

          switch (scenario) {
            case 'no_header':
              // No Authorization header
              break;
            case 'bad_format':
              headers = { Authorization: `Basic ${randomStr}` };
              tokenUsed = randomStr;
              break;
            case 'wrong_key': {
              const token = await createSignedToken(
                wrongKeyPair.privateKey,
                TEST_KID,
                { sub: 'user-err', token_use: 'access' },
                TEST_ISSUER,
                '1h'
              );
              headers = { Authorization: `Bearer ${token}` };
              tokenUsed = token;
              break;
            }
            case 'bad_iss': {
              const token = await createSignedToken(
                correctKeyPair.privateKey,
                TEST_KID,
                { sub: 'user-err', token_use: 'access' },
                'https://wrong-issuer.example.com',
                '1h'
              );
              headers = { Authorization: `Bearer ${token}` };
              tokenUsed = token;
              break;
            }
            case 'bad_token_use': {
              const token = await new SignJWT({ sub: 'user-err', token_use: 'id' })
                .setProtectedHeader({ alg: 'RS256', kid: TEST_KID })
                .setIssuer(TEST_ISSUER)
                .setIssuedAt()
                .setExpirationTime('1h')
                .sign(correctKeyPair.privateKey);
              headers = { Authorization: `Bearer ${token}` };
              tokenUsed = token;
              break;
            }
            case 'expired': {
              const now = Math.floor(Date.now() / 1000);
              const token = await new SignJWT({ sub: 'user-err', token_use: 'access' })
                .setProtectedHeader({ alg: 'RS256', kid: TEST_KID })
                .setIssuer(TEST_ISSUER)
                .setIssuedAt(now - 120)
                .setExpirationTime(now - 60)
                .sign(correctKeyPair.privateKey);
              headers = { Authorization: `Bearer ${token}` };
              tokenUsed = token;
              break;
            }
          }

          const res = await app.request('/protected/resource', { headers });

          expect(res.status).toBeGreaterThanOrEqual(400);

          const body = (await res.json()) as Record<string, unknown>;

          // Must have error and message fields
          expect(body).toHaveProperty('error');
          expect(body).toHaveProperty('message');
          expect(typeof body.error).toBe('string');
          expect(typeof body.message).toBe('string');
          expect((body.message as string).length).toBeGreaterThan(0);

          // error must be one of the known codes
          expect(['UNAUTHORIZED', 'TOKEN_EXPIRED', 'INTERNAL_ERROR']).toContain(body.error);

          // Response must not contain token string or payload details
          const bodyStr = JSON.stringify(body);
          if (tokenUsed.length > 10) {
            expect(bodyStr).not.toContain(tokenUsed);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: 5-jwt-token-verification-middleware, Property 8: ログセキュリティ
   * Validates: Requirements 8.1, 8.2, 8.3
   */
  describe('プロパティ8: ログセキュリティ', () => {
    it('任意のリクエストに対して、ログにトークン文字列・ペイロード全体が含まれない', async () => {
      type LogScenario = 'valid' | 'wrong_key' | 'expired' | 'bad_token_use';

      const scenarioArb: fc.Arbitrary<LogScenario> = fc.constantFrom(
        'valid',
        'wrong_key',
        'expired',
        'bad_token_use'
      );

      await fc.assert(
        fc.asyncProperty(scenarioArb, async (scenario) => {
          // Create fresh mocks for each iteration to capture logs
          const warnLogs: string[] = [];
          const errorLogs: string[] = [];

          const stringify = (v: unknown): string =>
            typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v);
          const warnSpy = vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
            warnLogs.push(args.map(stringify).join(' '));
          });
          const errorSpy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
            errorLogs.push(args.map(stringify).join(' '));
          });

          // Need a fresh app per iteration to avoid JWKS cache issues
          const app = createMiddlewareApp();

          let token: string;
          switch (scenario) {
            case 'valid':
              token = await createSignedToken(
                correctKeyPair.privateKey,
                TEST_KID,
                { sub: 'user-log', token_use: 'access', email: 'log@test.com' },
                TEST_ISSUER,
                '1h'
              );
              break;
            case 'wrong_key':
              token = await createSignedToken(
                wrongKeyPair.privateKey,
                TEST_KID,
                { sub: 'user-log', token_use: 'access' },
                TEST_ISSUER,
                '1h'
              );
              break;
            case 'expired': {
              const now = Math.floor(Date.now() / 1000);
              token = await new SignJWT({ sub: 'user-log', token_use: 'access' })
                .setProtectedHeader({ alg: 'RS256', kid: TEST_KID })
                .setIssuer(TEST_ISSUER)
                .setIssuedAt(now - 120)
                .setExpirationTime(now - 60)
                .sign(correctKeyPair.privateKey);
              break;
            }
            case 'bad_token_use':
              token = await new SignJWT({ sub: 'user-log', token_use: 'id' })
                .setProtectedHeader({ alg: 'RS256', kid: TEST_KID })
                .setIssuer(TEST_ISSUER)
                .setIssuedAt()
                .setExpirationTime('1h')
                .sign(correctKeyPair.privateKey);
              break;
          }

          await app.request('/protected/resource', {
            headers: { Authorization: `Bearer ${token}` },
          });

          const allLogs = [...warnLogs, ...errorLogs].join('\n');

          // Token string must not appear in logs
          expect(allLogs).not.toContain(token);

          // Full payload JSON must not appear in logs
          const payloadPart = token.split('.')[1];
          if (payloadPart) {
            try {
              const decoded = atob(payloadPart);
              // If the full decoded payload appears in logs, that's a violation
              if (decoded.length > 10) {
                expect(allLogs).not.toContain(decoded);
              }
            } catch {
              // Not valid base64, skip this check
            }
          }

          // For error scenarios, verify that a reason is logged
          if (scenario !== 'valid') {
            expect(allLogs).toContain('reason');
          }

          warnSpy.mockRestore();
          errorSpy.mockRestore();
        }),
        { numRuns: 100 }
      );
    });
  });
});
