import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  registerSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
} from '../lib/validation/auth-schemas.js';
import { CognitoService } from '../lib/cognito/cognito-service.js';
import { UserRepository } from '../lib/dynamodb/repositories/user.js';
import { RateLimiter } from '../lib/rate-limiter.js';
import { maskEmail } from '../lib/utils/mask.js';

const authRouter = new Hono();

// POST /auth/register
authRouter.post(
  '/register',
  zValidator('json', registerSchema, (result, c) => {
    if (!result.success) {
      // Zodバリデーションエラーを要件に準拠した形式に変換
      const fields: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const fieldName = issue.path.join('.');
        fields[fieldName] = issue.message;
      });

      return c.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: {
            fields,
          },
        },
        400
      );
    }
  }),
  async (c) => {
    const { email, password, username } = c.req.valid('json');
    const ipAddress = c.req.header('x-forwarded-for') || 'unknown';

    // レート制限チェック
    const rateLimiter = new RateLimiter();
    const isAllowed = await rateLimiter.checkLimit(ipAddress, 'register');

    if (!isAllowed) {
      const retryAfter = await rateLimiter.getRetryAfter(ipAddress, 'register');
      return c.json(
        {
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many registration attempts',
          retryAfter,
        },
        429
      );
    }

    // リクエストログ
    console.log('Registration attempt', {
      email: maskEmail(email),
      ipAddress,
      timestamp: new Date().toISOString(),
    });

    try {
      // Cognitoユーザー作成
      const cognitoService = new CognitoService();
      const cognitoResult = await cognitoService.signUp(email, password, username);

      try {
        // DynamoDBにユーザーレコード作成
        const userRepo = new UserRepository();
        const user = await userRepo.create({
          userId: cognitoResult.userId,
          email,
          username,
        });

        // 認証トークン取得
        const tokens = await cognitoService.authenticate(email, password);

        // 成功ログ
        console.log('Registration successful', {
          userId: user.userId,
          timestamp: new Date().toISOString(),
        });

        return c.json(
          {
            userId: user.userId,
            email: user.email,
            username: user.username,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: 900,
          },
          201
        );
      } catch (dbError) {
        // DynamoDB書き込み失敗時のロールバック
        console.error('DynamoDB write failed, rolling back Cognito user', {
          userId: cognitoResult.userId,
          email: maskEmail(email),
          error: dbError instanceof Error ? dbError.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });

        // Cognitoユーザーを削除
        await cognitoService.deleteUser(cognitoResult.userId);

        throw dbError;
      }
    } catch (error) {
      // エラーログ
      const errorCode =
        error && typeof error === 'object' && 'code' in error ? error.code : undefined;
      console.error('Registration failed', {
        email: maskEmail(email),
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode,
        timestamp: new Date().toISOString(),
      });

      // エラーハンドリング
      if (errorCode === 'UsernameExistsException') {
        return c.json(
          {
            error: 'CONFLICT',
            message: 'Email already registered',
          },
          409
        );
      }

      if (errorCode === 'InvalidPasswordException') {
        return c.json(
          {
            error: 'VALIDATION_ERROR',
            message: 'Password does not meet requirements',
            details: {
              fields: {
                password: error instanceof Error ? error.message : 'Invalid password',
              },
            },
          },
          400
        );
      }

      return c.json(
        {
          error: 'INTERNAL_ERROR',
          message: 'Registration failed',
        },
        500
      );
    }
  }
);

// エラー判定ヘルパー関数
function isUserNotFoundException(error: unknown): boolean {
  if (error && typeof error === 'object' && 'name' in error) {
    return (error as { name: string }).name === 'UserNotFoundException';
  }
  return false;
}

function isInvalidCodeError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'name' in error) {
    const name = (error as { name: string }).name;
    return name === 'CodeMismatchException' || name === 'ExpiredCodeException';
  }
  return false;
}

// POST /auth/password-reset
authRouter.post(
  '/password-reset',
  zValidator('json', passwordResetRequestSchema, (result, c) => {
    if (!result.success) {
      const fields: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const fieldName = issue.path.join('.');
        fields[fieldName] = issue.message;
      });
      return c.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: { fields },
        },
        400
      );
    }
  }),
  async (c) => {
    const { email } = c.req.valid('json');
    const ipAddress = c.req.header('x-forwarded-for') || 'unknown';

    // レート制限チェック（1分あたり3リクエスト）
    const rateLimiter = new RateLimiter();
    const isAllowed = await rateLimiter.checkLimit(ipAddress, 'password-reset');
    if (!isAllowed) {
      const retryAfter = await rateLimiter.getRetryAfter(ipAddress, 'password-reset');
      return c.json(
        {
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many password reset attempts',
          retryAfter,
        },
        429
      );
    }

    // リクエストログ
    console.log('Password reset request', {
      email: maskEmail(email),
      ipAddress,
      timestamp: new Date().toISOString(),
    });

    try {
      const cognitoService = new CognitoService();
      await cognitoService.forgotPassword(email);

      console.log('Password reset code sent', { timestamp: new Date().toISOString() });
    } catch (error) {
      // UserNotFoundExceptionを吸収して200を返す（アカウント列挙防止）
      if (!isUserNotFoundException(error)) {
        console.error('Password reset request failed', {
          email: maskEmail(email),
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });

        return c.json({ error: 'INTERNAL_ERROR', message: 'Password reset failed' }, 500);
      }
    }

    return c.json({ message: 'Password reset code has been sent' }, 200);
  }
);

// POST /auth/password-reset/confirm
authRouter.post(
  '/password-reset/confirm',
  zValidator('json', passwordResetConfirmSchema, (result, c) => {
    if (!result.success) {
      const fields: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const fieldName = issue.path.join('.');
        fields[fieldName] = issue.message;
      });
      return c.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: { fields },
        },
        400
      );
    }
  }),
  async (c) => {
    const { email, confirmationCode, newPassword } = c.req.valid('json');
    const ipAddress = c.req.header('x-forwarded-for') || 'unknown';

    // レート制限チェック（1分あたり5リクエスト）
    const rateLimiter = new RateLimiter();
    const isAllowed = await rateLimiter.checkLimit(ipAddress, 'password-reset-confirm');
    if (!isAllowed) {
      const retryAfter = await rateLimiter.getRetryAfter(ipAddress, 'password-reset-confirm');
      return c.json(
        {
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many password reset attempts',
          retryAfter,
        },
        429
      );
    }

    // リクエストログ（パスワード・確認コード非出力）
    console.log('Password reset confirm request', {
      email: maskEmail(email),
      ipAddress,
      timestamp: new Date().toISOString(),
    });

    try {
      const cognitoService = new CognitoService();
      await cognitoService.confirmForgotPassword(email, confirmationCode, newPassword);

      console.log('Password reset successful', {
        email: maskEmail(email),
        timestamp: new Date().toISOString(),
      });

      return c.json({ message: 'Password has been reset successfully' }, 200);
    } catch (error) {
      console.error('Password reset confirm failed', {
        email: maskEmail(email),
        errorCode:
          error && typeof error === 'object' && 'name' in error
            ? (error as { name: string }).name
            : undefined,
        timestamp: new Date().toISOString(),
      });

      if (isInvalidCodeError(error)) {
        return c.json(
          { error: 'INVALID_CODE', message: 'Invalid or expired confirmation code' },
          400
        );
      }

      return c.json({ error: 'INTERNAL_ERROR', message: 'Password reset failed' }, 500);
    }
  }
);

export { authRouter };
