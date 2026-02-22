import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { registerSchema } from '../lib/validation/auth-schemas.js';
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

export { authRouter };
