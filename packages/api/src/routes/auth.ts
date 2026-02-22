import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { registerSchema } from '../lib/validation/auth-schemas.js';
import { CognitoService } from '../lib/cognito/cognito-service.js';
import { UserRepository } from '../lib/dynamodb/repositories/user.js';
import { RateLimiter } from '../lib/rate-limiter.js';
import { maskEmail } from '../lib/utils/mask.js';

const authRouter = new Hono();

// POST /auth/register
authRouter.post('/register', zValidator('json', registerSchema), async (c) => {
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
  } catch (error) {
    // エラーログ
    console.error('Registration failed', {
      email: maskEmail(email),
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: (error as any).code,
      timestamp: new Date().toISOString(),
    });

    // エラーハンドリング
    if ((error as any).code === 'UsernameExistsException') {
      return c.json(
        {
          error: 'CONFLICT',
          message: 'Email already registered',
        },
        409
      );
    }

    if ((error as any).code === 'InvalidPasswordException') {
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
});

export { authRouter };
