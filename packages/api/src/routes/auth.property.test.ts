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
