// 環境変数が必要なため、モジュールインポート前に設定
process.env.COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || 'ap-northeast-1_TestPool';
process.env.ICON_BUCKET_NAME = process.env.ICON_BUCKET_NAME || 'test-icon-bucket';
process.env.CDN_DOMAIN = process.env.CDN_DOMAIN || 'test-cdn.example.com';
process.env.ALLOWED_ORIGINS =
  process.env.ALLOWED_ORIGINS || 'http://localhost:3000,https://*.vercel.app';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import app from '../index.js';
import { CognitoService } from '../lib/cognito/cognito-service.js';
import { UserRepository } from '../lib/dynamodb/repositories/user.js';
import { RateLimiter } from '../lib/rate-limiter.js';

// モックを設定
vi.mock('../lib/cognito/cognito-service.js');
vi.mock('../lib/dynamodb/repositories/user.js');
vi.mock('../lib/rate-limiter.js');

// --- ジェネレーター ---

/** 有効なメールアドレスを生成 */
const validEmailArb = fc.emailAddress();

/** パスワードポリシー適合パスワードを生成（8文字以上、大文字・小文字・数字を含む） */
const validPasswordArb = fc
  .tuple(
    fc.integer({ min: 0, max: 25 }),
    fc.integer({ min: 0, max: 25 }),
    fc.integer({ min: 0, max: 9 }),
    fc.string({ minLength: 5, maxLength: 40 }).filter((s) => /^[a-zA-Z0-9!@#$%^&*]+$/.test(s))
  )
  .map(([upperIdx, lowerIdx, num, rest]) => {
    const upper = String.fromCharCode(65 + upperIdx);
    const lower = String.fromCharCode(97 + lowerIdx);
    return `${upper}${lower}${num}${rest}`;
  });

/** 6桁数字の確認コードを生成 */
const validConfirmationCodeArb = fc
  .integer({ min: 0, max: 999999 })
  .map((n) => n.toString().padStart(6, '0'));

// --- ヘルパー ---

function setupDefaultMocks() {
  vi.mocked(RateLimiter).mockImplementation(
    () =>
      ({
        checkLimit: vi.fn().mockResolvedValue(true),
        getRetryAfter: vi.fn().mockResolvedValue(0),
      }) as unknown as RateLimiter
  );

  vi.mocked(UserRepository).mockImplementation(
    () =>
      ({
        create: vi.fn(),
        getById: vi.fn(),
      }) as unknown as UserRepository
  );
}

/**
 * Feature: 4-password-reset-api, Property 2: パスワードリセット要求の成功レスポンス
 *
 * **Validates: Requirements 2.1, 2.2**
 *
 * 任意の有効なメールアドレスに対して、Cognitoが正常に処理した場合、
 * パスワードリセット要求APIは200ステータスコードとメッセージ
 * 「Password reset code has been sent」を含むJSONレスポンスを返すべきです。
 */
describe('Property 2: パスワードリセット要求の成功レスポンス', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 with success message for any valid email when Cognito succeeds', async () => {
    await fc.assert(
      fc.asyncProperty(validEmailArb, async (email) => {
        vi.mocked(CognitoService).mockImplementation(
          () =>
            ({
              forgotPassword: vi.fn().mockResolvedValue(undefined),
              confirmForgotPassword: vi.fn(),
              signUp: vi.fn(),
              authenticate: vi.fn(),
              deleteUser: vi.fn(),
            }) as unknown as CognitoService
        );

        const res = await app.request('/auth/password-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json).toEqual({ message: 'Password reset code has been sent' });
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: 4-password-reset-api, Property 3: アカウント列挙防止
 *
 * **Validates: Requirements 2.3, 8.1**
 *
 * 任意のメールアドレスに対して、そのメールアドレスがCognitoに登録されているかどうかに関わらず、
 * パスワードリセット要求APIは同一の200ステータスコードと同一のメッセージを返すべきです。
 */
describe('Property 3: アカウント列挙防止', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return identical 200 response regardless of whether email is registered', async () => {
    await fc.assert(
      fc.asyncProperty(validEmailArb, async (email) => {
        // ケース1: ユーザーが存在する（Cognito成功）
        vi.mocked(CognitoService).mockImplementation(
          () =>
            ({
              forgotPassword: vi.fn().mockResolvedValue(undefined),
              confirmForgotPassword: vi.fn(),
              signUp: vi.fn(),
              authenticate: vi.fn(),
              deleteUser: vi.fn(),
            }) as unknown as CognitoService
        );

        const resRegistered = await app.request('/auth/password-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        const jsonRegistered = await resRegistered.json();

        // ケース2: ユーザーが存在しない（UserNotFoundException）
        const userNotFoundError = new Error('User does not exist.') as Error & { name: string };
        userNotFoundError.name = 'UserNotFoundException';

        vi.mocked(CognitoService).mockImplementation(
          () =>
            ({
              forgotPassword: vi.fn().mockRejectedValue(userNotFoundError),
              confirmForgotPassword: vi.fn(),
              signUp: vi.fn(),
              authenticate: vi.fn(),
              deleteUser: vi.fn(),
            }) as unknown as CognitoService
        );

        const resNotRegistered = await app.request('/auth/password-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        const jsonNotRegistered = await resNotRegistered.json();

        // 両方のレスポンスが同一であることを検証
        expect(resRegistered.status).toBe(200);
        expect(resNotRegistered.status).toBe(200);
        expect(jsonRegistered).toEqual(jsonNotRegistered);
        expect(jsonRegistered).toEqual({ message: 'Password reset code has been sent' });
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: 4-password-reset-api, Property 4: Cognito予期しないエラー時の500レスポンス
 *
 * **Validates: Requirements 2.4, 6.3**
 *
 * 任意の有効なリクエストに対して、CognitoサービスがUserNotFoundException以外の
 * 予期しないエラーを返した場合、パスワードリセットAPIは500ステータスコードと
 * エラーコード`INTERNAL_ERROR`を返すべきです。
 */
describe('Property 4: Cognito予期しないエラー時の500レスポンス', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /** UserNotFoundException以外のCognitoエラー名を生成 */
  const nonUserNotFoundErrorNameArb = fc.oneof(
    fc.constant('InternalErrorException'),
    fc.constant('TooManyRequestsException'),
    fc.constant('InvalidParameterException'),
    fc.constant('NotAuthorizedException'),
    fc.constant('LimitExceededException'),
    fc.constant('ResourceNotFoundException')
  );

  it('should return 500 INTERNAL_ERROR for password-reset when Cognito throws non-UserNotFoundException', async () => {
    await fc.assert(
      fc.asyncProperty(validEmailArb, nonUserNotFoundErrorNameArb, async (email, errorName) => {
        const cognitoError = new Error(`Cognito error: ${errorName}`) as Error & { name: string };
        cognitoError.name = errorName;

        vi.mocked(CognitoService).mockImplementation(
          () =>
            ({
              forgotPassword: vi.fn().mockRejectedValue(cognitoError),
              confirmForgotPassword: vi.fn(),
              signUp: vi.fn(),
              authenticate: vi.fn(),
              deleteUser: vi.fn(),
            }) as unknown as CognitoService
        );

        const res = await app.request('/auth/password-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        expect(res.status).toBe(500);
        const json = await res.json();
        expect(json.error).toBe('INTERNAL_ERROR');
        expect(json.message).toBe('Password reset failed');
      }),
      { numRuns: 100 }
    );
  });

  it('should return 500 INTERNAL_ERROR for password-reset/confirm when Cognito throws unexpected error', async () => {
    await fc.assert(
      fc.asyncProperty(
        validEmailArb,
        validConfirmationCodeArb,
        validPasswordArb,
        nonUserNotFoundErrorNameArb.filter(
          (name) => name !== 'CodeMismatchException' && name !== 'ExpiredCodeException'
        ),
        async (email, code, password, errorName) => {
          const cognitoError = new Error(`Cognito error: ${errorName}`) as Error & {
            name: string;
          };
          cognitoError.name = errorName;

          vi.mocked(CognitoService).mockImplementation(
            () =>
              ({
                forgotPassword: vi.fn(),
                confirmForgotPassword: vi.fn().mockRejectedValue(cognitoError),
                signUp: vi.fn(),
                authenticate: vi.fn(),
                deleteUser: vi.fn(),
              }) as unknown as CognitoService
          );

          const res = await app.request('/auth/password-reset/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, confirmationCode: code, newPassword: password }),
          });

          expect(res.status).toBe(500);
          const json = await res.json();
          expect(json.error).toBe('INTERNAL_ERROR');
          expect(json.message).toBe('Password reset failed');
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: 4-password-reset-api, Property 6: 無効/期限切れ確認コードのエラーハンドリング
 *
 * **Validates: Requirement 4.3**
 *
 * 任意の有効な形式のリクエストに対して、CognitoがCodeMismatchExceptionまたは
 * ExpiredCodeExceptionを返した場合、パスワードリセット確認APIは400ステータスコード、
 * エラーコード`INVALID_CODE`、メッセージ「Invalid or expired confirmation code」を返すべきです。
 */
describe('Property 6: 無効/期限切れ確認コードのエラーハンドリング', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const invalidCodeErrorNameArb = fc.oneof(
    fc.constant('CodeMismatchException'),
    fc.constant('ExpiredCodeException')
  );

  it('should return 400 INVALID_CODE when Cognito returns CodeMismatchException or ExpiredCodeException', async () => {
    await fc.assert(
      fc.asyncProperty(
        validEmailArb,
        validConfirmationCodeArb,
        validPasswordArb,
        invalidCodeErrorNameArb,
        async (email, code, password, errorName) => {
          const cognitoError = new Error(`Code error: ${errorName}`) as Error & { name: string };
          cognitoError.name = errorName;

          vi.mocked(CognitoService).mockImplementation(
            () =>
              ({
                forgotPassword: vi.fn(),
                confirmForgotPassword: vi.fn().mockRejectedValue(cognitoError),
                signUp: vi.fn(),
                authenticate: vi.fn(),
                deleteUser: vi.fn(),
              }) as unknown as CognitoService
          );

          const res = await app.request('/auth/password-reset/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, confirmationCode: code, newPassword: password }),
          });

          expect(res.status).toBe(400);
          const json = await res.json();
          expect(json.error).toBe('INVALID_CODE');
          expect(json.message).toBe('Invalid or expired confirmation code');
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: 4-password-reset-api, Property 7: パスワードリセット確認の成功レスポンス
 *
 * **Validates: Requirements 6.1, 6.2**
 *
 * 任意の有効なリクエスト（有効なemail、正しい確認コード、ポリシー適合パスワード）に対して、
 * Cognitoが正常に処理した場合、パスワードリセット確認APIは200ステータスコードと
 * メッセージ「Password has been reset successfully」を含むJSONレスポンスを返すべきです。
 */
describe('Property 7: パスワードリセット確認の成功レスポンス', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 with success message for any valid confirm request when Cognito succeeds', async () => {
    await fc.assert(
      fc.asyncProperty(
        validEmailArb,
        validConfirmationCodeArb,
        validPasswordArb,
        async (email, code, password) => {
          vi.mocked(CognitoService).mockImplementation(
            () =>
              ({
                forgotPassword: vi.fn(),
                confirmForgotPassword: vi.fn().mockResolvedValue(undefined),
                signUp: vi.fn(),
                authenticate: vi.fn(),
                deleteUser: vi.fn(),
              }) as unknown as CognitoService
          );

          const res = await app.request('/auth/password-reset/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, confirmationCode: code, newPassword: password }),
          });

          expect(res.status).toBe(200);
          const json = await res.json();
          expect(json).toEqual({ message: 'Password has been reset successfully' });
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: 4-password-reset-api, Property 8: レート制限
 *
 * **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
 *
 * 任意のIPアドレスに対して、パスワードリセット要求エンドポイントでは1分間に3リクエスト、
 * パスワードリセット確認エンドポイントでは1分間に5リクエストを超えた場合、
 * 超過リクエストは429ステータスコード、エラーコード`RATE_LIMIT_EXCEEDED`、
 * および`retryAfter`フィールドを返すべきです。
 */
describe('Property 8: レート制限', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const retryAfterArb = fc.integer({ min: 1, max: 60 });

  it('should return 429 with retryAfter for password-reset when rate limit exceeded', async () => {
    await fc.assert(
      fc.asyncProperty(validEmailArb, retryAfterArb, async (email, retryAfter) => {
        vi.mocked(RateLimiter).mockImplementation(
          () =>
            ({
              checkLimit: vi.fn().mockResolvedValue(false),
              getRetryAfter: vi.fn().mockResolvedValue(retryAfter),
            }) as unknown as RateLimiter
        );

        vi.mocked(UserRepository).mockImplementation(
          () =>
            ({
              create: vi.fn(),
              getById: vi.fn(),
            }) as unknown as UserRepository
        );

        vi.mocked(CognitoService).mockImplementation(
          () =>
            ({
              forgotPassword: vi.fn(),
              confirmForgotPassword: vi.fn(),
              signUp: vi.fn(),
              authenticate: vi.fn(),
              deleteUser: vi.fn(),
            }) as unknown as CognitoService
        );

        const res = await app.request('/auth/password-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        expect(res.status).toBe(429);
        const json = await res.json();
        expect(json.error).toBe('RATE_LIMIT_EXCEEDED');
        expect(json.retryAfter).toBe(retryAfter);
        expect(typeof json.retryAfter).toBe('number');
      }),
      { numRuns: 100 }
    );
  });

  it('should return 429 with retryAfter for password-reset/confirm when rate limit exceeded', async () => {
    await fc.assert(
      fc.asyncProperty(
        validEmailArb,
        validConfirmationCodeArb,
        validPasswordArb,
        retryAfterArb,
        async (email, code, password, retryAfter) => {
          vi.mocked(RateLimiter).mockImplementation(
            () =>
              ({
                checkLimit: vi.fn().mockResolvedValue(false),
                getRetryAfter: vi.fn().mockResolvedValue(retryAfter),
              }) as unknown as RateLimiter
          );

          vi.mocked(UserRepository).mockImplementation(
            () =>
              ({
                create: vi.fn(),
                getById: vi.fn(),
              }) as unknown as UserRepository
          );

          vi.mocked(CognitoService).mockImplementation(
            () =>
              ({
                forgotPassword: vi.fn(),
                confirmForgotPassword: vi.fn(),
                signUp: vi.fn(),
                authenticate: vi.fn(),
                deleteUser: vi.fn(),
              }) as unknown as CognitoService
          );

          const res = await app.request('/auth/password-reset/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, confirmationCode: code, newPassword: password }),
          });

          expect(res.status).toBe(429);
          const json = await res.json();
          expect(json.error).toBe('RATE_LIMIT_EXCEEDED');
          expect(json.retryAfter).toBe(retryAfter);
          expect(typeof json.retryAfter).toBe('number');
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: 4-password-reset-api, Property 9: 機密データのログ保護
 *
 * **Validates: Requirements 8.2, 8.3, 8.4**
 *
 * 任意のパスワードリセットリクエスト（要求・確認の両方）に対して、
 * ログ出力にはパスワードおよび確認コードが含まれてはならず、
 * メールアドレスはマスク済み形式で記録されるべきです。
 */
describe('Property 9: 機密データのログ保護', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should not log password or confirmation code, and should mask email in password-reset requests', async () => {
    await fc.assert(
      fc.asyncProperty(validEmailArb, async (email) => {
        vi.mocked(CognitoService).mockImplementation(
          () =>
            ({
              forgotPassword: vi.fn().mockResolvedValue(undefined),
              confirmForgotPassword: vi.fn(),
              signUp: vi.fn(),
              authenticate: vi.fn(),
              deleteUser: vi.fn(),
            }) as unknown as CognitoService
        );

        const consoleSpy = vi.spyOn(console, 'log');
        const consoleErrorSpy = vi.spyOn(console, 'error');

        await app.request('/auth/password-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        // ログにフルメールアドレスが含まれていないことを検証
        // （メールが1文字のローカルパートの場合はマスク後も同じなのでスキップ）
        const [localPart, domain] = email.split('@');
        if (localPart && localPart.length > 1 && domain) {
          const allCalls = [...consoleSpy.mock.calls, ...consoleErrorSpy.mock.calls];
          allCalls.forEach((call) => {
            const logStr = JSON.stringify(call);
            // フルメールアドレスがログに含まれていないことを確認
            expect(logStr).not.toContain(email);
            // マスク済みメールが含まれていることを確認（ログが出力された場合）
            if (logStr.includes('@') && logStr.includes(domain)) {
              expect(logStr).toContain(`${localPart[0]}***@${domain}`);
            }
          });
        }

        consoleSpy.mockRestore();
        consoleErrorSpy.mockRestore();
      }),
      { numRuns: 100 }
    );
  });

  it('should not log password or confirmation code in password-reset/confirm requests', async () => {
    await fc.assert(
      fc.asyncProperty(
        validEmailArb,
        validConfirmationCodeArb,
        validPasswordArb,
        async (email, code, password) => {
          vi.mocked(CognitoService).mockImplementation(
            () =>
              ({
                forgotPassword: vi.fn(),
                confirmForgotPassword: vi.fn().mockResolvedValue(undefined),
                signUp: vi.fn(),
                authenticate: vi.fn(),
                deleteUser: vi.fn(),
              }) as unknown as CognitoService
          );

          const consoleSpy = vi.spyOn(console, 'log');
          const consoleErrorSpy = vi.spyOn(console, 'error');

          await app.request('/auth/password-reset/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, confirmationCode: code, newPassword: password }),
          });

          const allCalls = [...consoleSpy.mock.calls, ...consoleErrorSpy.mock.calls];
          allCalls.forEach((call) => {
            const logStr = JSON.stringify(call);
            // パスワードがログに含まれていないことを確認
            expect(logStr).not.toContain(password);
            // 確認コードがログに含まれていないことを確認
            expect(logStr).not.toContain(code);
          });

          // メールアドレスのマスク検証
          const [localPart, domain] = email.split('@');
          if (localPart && localPart.length > 1 && domain) {
            const allCalls2 = [...consoleSpy.mock.calls, ...consoleErrorSpy.mock.calls];
            allCalls2.forEach((call) => {
              const logStr = JSON.stringify(call);
              expect(logStr).not.toContain(email);
            });
          }

          consoleSpy.mockRestore();
          consoleErrorSpy.mockRestore();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not log sensitive data even when Cognito errors occur in password-reset/confirm', async () => {
    await fc.assert(
      fc.asyncProperty(
        validEmailArb,
        validConfirmationCodeArb,
        validPasswordArb,
        async (email, code, password) => {
          const cognitoError = new Error('Code mismatch') as Error & { name: string };
          cognitoError.name = 'CodeMismatchException';

          vi.mocked(CognitoService).mockImplementation(
            () =>
              ({
                forgotPassword: vi.fn(),
                confirmForgotPassword: vi.fn().mockRejectedValue(cognitoError),
                signUp: vi.fn(),
                authenticate: vi.fn(),
                deleteUser: vi.fn(),
              }) as unknown as CognitoService
          );

          const consoleSpy = vi.spyOn(console, 'log');
          const consoleErrorSpy = vi.spyOn(console, 'error');

          await app.request('/auth/password-reset/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, confirmationCode: code, newPassword: password }),
          });

          const allCalls = [...consoleSpy.mock.calls, ...consoleErrorSpy.mock.calls];
          allCalls.forEach((call) => {
            const logStr = JSON.stringify(call);
            // パスワードがログに含まれていないことを確認
            expect(logStr).not.toContain(password);
            // 確認コードがログに含まれていないことを確認
            expect(logStr).not.toContain(code);
          });

          consoleSpy.mockRestore();
          consoleErrorSpy.mockRestore();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================
// ログインAPI プロパティテスト (Feature: 3-login-api)
// ============================================================

// --- ログインAPI用ジェネレーター ---

/** ランダムなUUID形式のuserIdを生成 */
const userIdArb = fc.uuid();

/** ランダムなユーザー名を生成（3〜20文字、英数字とアンダースコア） */
const usernameArb = fc
  .string({ minLength: 3, maxLength: 20 })
  .map((s) => s.replace(/[^a-zA-Z0-9_]/g, 'a'))
  .filter((s) => s.length >= 3);

/** ランダムなトークン文字列を生成 */
const tokenArb = fc.string({ minLength: 10, maxLength: 200 }).filter((s) => s.length >= 10);

/**
 * Feature: 3-login-api, Property 2: ログイン成功レスポンス形式
 *
 * **Validates: Requirements 2.1, 2.2, 3.1, 3.2, 4.1, 4.2, 4.3, 4.4**
 *
 * 任意の有効なログインリクエスト（認証成功、ユーザー存在）に対して、
 * APIは200ステータスコード、Content-Type `application/json`、
 * および以下のフィールドを含むレスポンスボディを返すべきです:
 * userId、email、username、accessToken、refreshToken、expiresIn（値: 900）。
 */
describe('Feature: 3-login-api, Property 2: ログイン成功レスポンス形式', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('有効なログインリクエストに対して200とすべての必須フィールドを返す', async () => {
    await fc.assert(
      fc.asyncProperty(
        validEmailArb,
        validPasswordArb,
        userIdArb,
        usernameArb,
        tokenArb,
        tokenArb,
        tokenArb,
        async (email, password, userId, username, accessToken, refreshToken, idToken) => {
          // Cognito認証成功モック
          vi.mocked(CognitoService).mockImplementation(
            () =>
              ({
                signUp: vi.fn(),
                authenticate: vi.fn().mockResolvedValue({
                  accessToken,
                  refreshToken,
                  idToken,
                  expiresIn: 900,
                }),
                deleteUser: vi.fn(),
                forgotPassword: vi.fn(),
                confirmForgotPassword: vi.fn(),
                refreshTokens: vi.fn(),
                extractUserIdFromIdToken: vi.fn().mockReturnValue(userId),
              }) as unknown as CognitoService
          );

          // ユーザー存在モック
          vi.mocked(UserRepository).mockImplementation(
            () =>
              ({
                create: vi.fn(),
                getById: vi.fn().mockResolvedValue({
                  PK: `USER#${userId}`,
                  SK: `USER#${userId}`,
                  userId,
                  email,
                  username,
                  createdAt: '2024-01-01T00:00:00.000Z',
                  updatedAt: '2024-01-01T00:00:00.000Z',
                  entityType: 'USER',
                }),
              }) as unknown as UserRepository
          );

          const res = await app.request('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          // ステータスコード検証
          expect(res.status).toBe(200);

          // Content-Type検証
          expect(res.headers.get('content-type')).toContain('application/json');

          // レスポンスボディ検証
          const json = await res.json();
          expect(json.userId).toBe(userId);
          expect(json.email).toBe(email);
          expect(json.username).toBe(username);
          expect(json.accessToken).toBe(accessToken);
          expect(json.refreshToken).toBe(refreshToken);
          expect(json.expiresIn).toBe(900);

          // 必須フィールドがすべて存在することを検証
          expect(json).toHaveProperty('userId');
          expect(json).toHaveProperty('email');
          expect(json).toHaveProperty('username');
          expect(json).toHaveProperty('accessToken');
          expect(json).toHaveProperty('refreshToken');
          expect(json).toHaveProperty('expiresIn');
        }
      ),
      { numRuns: 20 }
    );
  });
});

/**
 * Feature: 3-login-api, Property 3: 認証失敗時の統一エラーメッセージ
 *
 * **Validates: Requirements 2.3, 8.1**
 *
 * 任意の認証失敗（NotAuthorizedException または UserNotFoundException）に対して、
 * APIは401ステータスコード、エラーコード`AUTHENTICATION_FAILED`、
 * メッセージ「Invalid email or password」を返すべきです。
 * レスポンスにはメールアドレスの存在有無を示す情報を含んではなりません。
 */
describe('Feature: 3-login-api, Property 3: 認証失敗時の統一エラーメッセージ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // 認証失敗エラータイプ
  const authErrorNameArb = fc.oneof(
    fc.constant('NotAuthorizedException'),
    fc.constant('UserNotFoundException')
  );

  it('NotAuthorizedException/UserNotFoundExceptionのどちらでも同一の401レスポンスを返す', async () => {
    await fc.assert(
      fc.asyncProperty(
        validEmailArb,
        validPasswordArb,
        authErrorNameArb,
        async (email, password, errorName) => {
          // 認証失敗モック
          const authError = new Error(`Auth error: ${errorName}`) as Error & { name: string };
          authError.name = errorName;

          vi.mocked(CognitoService).mockImplementation(
            () =>
              ({
                signUp: vi.fn(),
                authenticate: vi.fn().mockRejectedValue(authError),
                deleteUser: vi.fn(),
                forgotPassword: vi.fn(),
                confirmForgotPassword: vi.fn(),
                refreshTokens: vi.fn(),
                extractUserIdFromIdToken: vi.fn(),
              }) as unknown as CognitoService
          );

          const res = await app.request('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          // 401ステータスコード検証
          expect(res.status).toBe(401);

          const json = await res.json();

          // 統一エラーメッセージ検証
          expect(json.error).toBe('AUTHENTICATION_FAILED');
          expect(json.message).toBe('Invalid email or password');

          // レスポンスにメールアドレスの存在有無を示す情報が含まれていないことを検証
          const responseStr = JSON.stringify(json);
          expect(responseStr).not.toContain(email);
          expect(responseStr).not.toContain('not found');
          expect(responseStr).not.toContain('does not exist');
          expect(responseStr).not.toContain('not registered');
        }
      ),
      { numRuns: 20 }
    );
  });
});

/**
 * Feature: 3-login-api, Property 7: レート制限
 *
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
 *
 * 任意のIPアドレスに対して、ログインエンドポイントでは1分間に10リクエスト、
 * リフレッシュエンドポイントでは1分間に20リクエストを超えた場合、
 * 超過リクエストは429ステータスコード、エラーコード`RATE_LIMIT_EXCEEDED`、
 * および`retryAfter`フィールドを返すべきです。
 */
describe('Feature: 3-login-api, Property 7: レート制限', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const retryAfterArb = fc.integer({ min: 1, max: 60 });

  it('ログインエンドポイントでレート制限超過時に429とretryAfterを返す', async () => {
    await fc.assert(
      fc.asyncProperty(
        validEmailArb,
        validPasswordArb,
        retryAfterArb,
        async (email, password, retryAfter) => {
          // レート制限超過モック
          vi.mocked(RateLimiter).mockImplementation(
            () =>
              ({
                checkLimit: vi.fn().mockResolvedValue(false),
                getRetryAfter: vi.fn().mockResolvedValue(retryAfter),
              }) as unknown as RateLimiter
          );

          vi.mocked(UserRepository).mockImplementation(
            () =>
              ({
                create: vi.fn(),
                getById: vi.fn(),
              }) as unknown as UserRepository
          );

          vi.mocked(CognitoService).mockImplementation(
            () =>
              ({
                signUp: vi.fn(),
                authenticate: vi.fn(),
                deleteUser: vi.fn(),
                forgotPassword: vi.fn(),
                confirmForgotPassword: vi.fn(),
                refreshTokens: vi.fn(),
                extractUserIdFromIdToken: vi.fn(),
              }) as unknown as CognitoService
          );

          const res = await app.request('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          expect(res.status).toBe(429);
          const json = await res.json();
          expect(json.error).toBe('RATE_LIMIT_EXCEEDED');
          expect(json.retryAfter).toBe(retryAfter);
          expect(typeof json.retryAfter).toBe('number');
        }
      ),
      { numRuns: 20 }
    );
  });

  it('リフレッシュエンドポイントでレート制限超過時に429とretryAfterを返す', async () => {
    await fc.assert(
      fc.asyncProperty(tokenArb, retryAfterArb, async (refreshToken, retryAfter) => {
        // レート制限超過モック
        vi.mocked(RateLimiter).mockImplementation(
          () =>
            ({
              checkLimit: vi.fn().mockResolvedValue(false),
              getRetryAfter: vi.fn().mockResolvedValue(retryAfter),
            }) as unknown as RateLimiter
        );

        vi.mocked(UserRepository).mockImplementation(
          () =>
            ({
              create: vi.fn(),
              getById: vi.fn(),
            }) as unknown as UserRepository
        );

        vi.mocked(CognitoService).mockImplementation(
          () =>
            ({
              signUp: vi.fn(),
              authenticate: vi.fn(),
              deleteUser: vi.fn(),
              forgotPassword: vi.fn(),
              confirmForgotPassword: vi.fn(),
              refreshTokens: vi.fn(),
              extractUserIdFromIdToken: vi.fn(),
            }) as unknown as CognitoService
        );

        const res = await app.request('/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        expect(res.status).toBe(429);
        const json = await res.json();
        expect(json.error).toBe('RATE_LIMIT_EXCEEDED');
        expect(json.retryAfter).toBe(retryAfter);
        expect(typeof json.retryAfter).toBe('number');
      }),
      { numRuns: 20 }
    );
  });
});

/**
 * Feature: 3-login-api, Property 8: エラーレスポンス形式の一貫性
 *
 * **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
 *
 * 任意のエラーケースに対して、APIは`error`（機械可読なエラーコード）と
 * `message`（人間が読めるエラー説明）フィールドを含むJSONレスポンスを返すべきです。
 * 検証エラーの場合は、`details.fields`オブジェクトにフィールド名とエラーメッセージの
 * マッピングを含むべきです。
 */
describe('Feature: 3-login-api, Property 8: エラーレスポンス形式の一貫性', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('バリデーションエラー時にerror, message, details.fieldsを含むレスポンスを返す', async () => {
    // バリデーションエラーのパターン: emailまたはpasswordが欠落/空
    const invalidLoginPayloadArb = fc.oneof(
      // emailが空
      fc.record({
        email: fc.constant(''),
        password: validPasswordArb,
      }),
      // passwordが空
      fc.record({
        email: validEmailArb,
        password: fc.constant(''),
      }),
      // 両方空
      fc.record({
        email: fc.constant(''),
        password: fc.constant(''),
      }),
      // emailが欠落
      fc.record({
        password: validPasswordArb,
      }),
      // passwordが欠落
      fc.record({
        email: validEmailArb,
      })
    );

    await fc.assert(
      fc.asyncProperty(invalidLoginPayloadArb, async (payload) => {
        const res = await app.request('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        expect(res.status).toBe(400);
        const json = await res.json();

        // error フィールド（機械可読なエラーコード）が存在すること
        expect(json).toHaveProperty('error');
        expect(typeof json.error).toBe('string');
        expect(json.error).toBe('VALIDATION_ERROR');

        // message フィールド（人間が読めるエラー説明）が存在すること
        expect(json).toHaveProperty('message');
        expect(typeof json.message).toBe('string');

        // details.fields が存在し、フィールド名とエラーメッセージのマッピングを含むこと
        expect(json).toHaveProperty('details');
        expect(json.details).toHaveProperty('fields');
        expect(typeof json.details.fields).toBe('object');

        // fieldsの各値が文字列であること
        for (const [fieldName, fieldMessage] of Object.entries(json.details.fields)) {
          expect(typeof fieldName).toBe('string');
          expect(typeof fieldMessage).toBe('string');
        }
      }),
      { numRuns: 20 }
    );
  });

  it('認証失敗時にerrorとmessageフィールドを含むレスポンスを返す', async () => {
    await fc.assert(
      fc.asyncProperty(validEmailArb, validPasswordArb, async (email, password) => {
        // 認証失敗モック
        const authError = new Error('Not authorized') as Error & { name: string };
        authError.name = 'NotAuthorizedException';

        vi.mocked(CognitoService).mockImplementation(
          () =>
            ({
              signUp: vi.fn(),
              authenticate: vi.fn().mockRejectedValue(authError),
              deleteUser: vi.fn(),
              forgotPassword: vi.fn(),
              confirmForgotPassword: vi.fn(),
              refreshTokens: vi.fn(),
              extractUserIdFromIdToken: vi.fn(),
            }) as unknown as CognitoService
        );

        const res = await app.request('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        expect(res.status).toBe(401);
        const json = await res.json();

        // error フィールドが存在し文字列であること
        expect(json).toHaveProperty('error');
        expect(typeof json.error).toBe('string');

        // message フィールドが存在し文字列であること
        expect(json).toHaveProperty('message');
        expect(typeof json.message).toBe('string');
      }),
      { numRuns: 20 }
    );
  });

  it('レート制限エラー時にerror, message, retryAfterフィールドを含むレスポンスを返す', async () => {
    const retryAfterArb = fc.integer({ min: 1, max: 60 });

    await fc.assert(
      fc.asyncProperty(
        validEmailArb,
        validPasswordArb,
        retryAfterArb,
        async (email, password, retryAfter) => {
          vi.mocked(RateLimiter).mockImplementation(
            () =>
              ({
                checkLimit: vi.fn().mockResolvedValue(false),
                getRetryAfter: vi.fn().mockResolvedValue(retryAfter),
              }) as unknown as RateLimiter
          );

          vi.mocked(CognitoService).mockImplementation(
            () =>
              ({
                signUp: vi.fn(),
                authenticate: vi.fn(),
                deleteUser: vi.fn(),
                forgotPassword: vi.fn(),
                confirmForgotPassword: vi.fn(),
                refreshTokens: vi.fn(),
                extractUserIdFromIdToken: vi.fn(),
              }) as unknown as CognitoService
          );

          const res = await app.request('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          expect(res.status).toBe(429);
          const json = await res.json();

          // error フィールドが存在し文字列であること
          expect(json).toHaveProperty('error');
          expect(typeof json.error).toBe('string');

          // message フィールドが存在し文字列であること
          expect(json).toHaveProperty('message');
          expect(typeof json.message).toBe('string');

          // retryAfter フィールドが存在し数値であること
          expect(json).toHaveProperty('retryAfter');
          expect(typeof json.retryAfter).toBe('number');
        }
      ),
      { numRuns: 20 }
    );
  });

  it('内部エラー時にerrorとmessageフィールドを含むレスポンスを返す', async () => {
    await fc.assert(
      fc.asyncProperty(validEmailArb, validPasswordArb, async (email, password) => {
        // 予期しないエラーモック
        const internalError = new Error('Unexpected error') as Error & { name: string };
        internalError.name = 'InternalErrorException';

        vi.mocked(CognitoService).mockImplementation(
          () =>
            ({
              signUp: vi.fn(),
              authenticate: vi.fn().mockRejectedValue(internalError),
              deleteUser: vi.fn(),
              forgotPassword: vi.fn(),
              confirmForgotPassword: vi.fn(),
              refreshTokens: vi.fn(),
              extractUserIdFromIdToken: vi.fn(),
            }) as unknown as CognitoService
        );

        const res = await app.request('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        expect(res.status).toBe(500);
        const json = await res.json();

        // error フィールドが存在し文字列であること
        expect(json).toHaveProperty('error');
        expect(typeof json.error).toBe('string');
        expect(json.error).toBe('INTERNAL_ERROR');

        // message フィールドが存在し文字列であること
        expect(json).toHaveProperty('message');
        expect(typeof json.message).toBe('string');
      }),
      { numRuns: 20 }
    );
  });
});
