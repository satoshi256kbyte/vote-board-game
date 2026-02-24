import { Hono } from 'hono';
import { createAuthMiddleware } from '../lib/auth/auth-middleware.js';
import { ProfileRepository } from '../lib/dynamodb/repositories/profile.js';
import type { AuthVariables } from '../lib/auth/types.js';
import { updateProfileSchema } from '../lib/validation/profile-schemas.js';
import { ZodError } from 'zod';

const profileRouter = new Hono<{ Variables: AuthVariables }>();

// 認証ミドルウェアの作成
const authMiddleware = createAuthMiddleware({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  region: process.env.AWS_REGION!,
});

// すべてのルートに認証ミドルウェアを適用
profileRouter.use('/*', authMiddleware);

// ProfileRepositoryのインスタンス作成
const profileRepository = new ProfileRepository();

// GET /api/profile - プロフィール情報の取得
profileRouter.get('/', async (c) => {
  try {
    // JWT TokenからuserIdを抽出（認証ミドルウェアで設定済み）
    const userId = c.get('userId');

    console.log('Profile retrieval request', {
      operation: 'GET_PROFILE',
      userId,
      endpoint: '/api/profile',
      method: 'GET',
      timestamp: new Date().toISOString(),
    });

    // ProfileRepository.getById()を呼び出し
    const profile = await profileRepository.getById(userId);

    // ユーザーが存在しない場合は404エラー
    if (!profile) {
      console.warn('Profile not found', {
        operation: 'GET_PROFILE',
        userId,
        timestamp: new Date().toISOString(),
      });
      return c.json(
        {
          error: 'NOT_FOUND',
          message: 'User not found',
        },
        404
      );
    }

    // プロフィール情報を返却（200 OK）
    return c.json(
      {
        userId: profile.userId,
        email: profile.email,
        username: profile.username,
        iconUrl: profile.iconUrl,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
      200
    );
  } catch (error) {
    // サーバーエラー（500）
    console.error('Profile operation failed', {
      operation: 'GET_PROFILE',
      userId: c.get('userId'),
      endpoint: '/api/profile',
      method: 'GET',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });

    return c.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'An internal error occurred',
      },
      500
    );
  }
});

// PUT /api/profile - プロフィール情報の更新
profileRouter.put('/', async (c) => {
  try {
    // JWT TokenからuserIdを抽出（認証ミドルウェアで設定済み）
    const userId = c.get('userId');

    // リクエストボディを取得
    const body = await c.req.json();

    // リクエストボディのバリデーション（updateProfileSchema）
    let validatedData;
    try {
      validatedData = updateProfileSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        // バリデーションエラー（400）
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          fieldErrors[path || 'root'] = err.message;
        });

        console.warn('Profile update validation failed', {
          operation: 'UPDATE_PROFILE',
          userId,
          errors: fieldErrors,
          timestamp: new Date().toISOString(),
        });

        return c.json(
          {
            error: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: {
              fields: fieldErrors,
            },
          },
          400
        );
      }
      throw error;
    }

    console.log('Profile update request', {
      operation: 'UPDATE_PROFILE',
      userId,
      endpoint: '/api/profile',
      method: 'PUT',
      timestamp: new Date().toISOString(),
    });

    // ProfileRepository.update()を呼び出し
    try {
      const updatedProfile = await profileRepository.update(userId, validatedData);

      // 更新されたプロフィール情報を返却（200 OK）
      return c.json(
        {
          userId: updatedProfile.userId,
          email: updatedProfile.email,
          username: updatedProfile.username,
          iconUrl: updatedProfile.iconUrl,
          createdAt: updatedProfile.createdAt,
          updatedAt: updatedProfile.updatedAt,
        },
        200
      );
    } catch (error) {
      // ユーザーが存在しない場合は404エラー
      if (error instanceof Error && error.message === 'User not found') {
        console.warn('Profile not found for update', {
          operation: 'UPDATE_PROFILE',
          userId,
          timestamp: new Date().toISOString(),
        });
        return c.json(
          {
            error: 'NOT_FOUND',
            message: 'User not found',
          },
          404
        );
      }
      throw error;
    }
  } catch (error) {
    // サーバーエラー（500）
    console.error('Profile operation failed', {
      operation: 'UPDATE_PROFILE',
      userId: c.get('userId'),
      endpoint: '/api/profile',
      method: 'PUT',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });

    return c.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'An internal error occurred',
      },
      500
    );
  }
});

// POST /api/profile/icon/upload-url - アイコンアップロード用Presigned URL生成
profileRouter.post('/icon/upload-url', async (c) => {
  // TODO: 実装予定（Task 5.4）
  return c.json({ message: 'Generate upload URL endpoint' }, 200);
});

export { profileRouter };
