import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { gamesRouter } from './routes/games.js';
import { candidatesRouter } from './routes/candidates.js';
import { votesRouter } from './routes/votes.js';
import { authRouter } from './routes/auth.js';
import { profileRouter } from './routes/profile.js';
import { createAuthMiddleware } from './lib/auth/auth-middleware.js';
import { corsMiddleware } from './middleware/cors.js';
import type { AuthVariables } from './lib/auth/types.js';

// 環境変数チェック（起動時にフェイルファスト）
const userPoolId = process.env.COGNITO_USER_POOL_ID;
const region = process.env.AWS_REGION || 'ap-northeast-1';
const iconBucketName = process.env.ICON_BUCKET_NAME;
const cdnDomain = process.env.CDN_DOMAIN;

if (!userPoolId) {
  console.error('COGNITO_USER_POOL_ID environment variable is not set');
  throw new Error('COGNITO_USER_POOL_ID is required');
}

if (!iconBucketName) {
  console.error('ICON_BUCKET_NAME environment variable is not set');
  throw new Error('ICON_BUCKET_NAME is required');
}

if (!cdnDomain) {
  console.error('CDN_DOMAIN environment variable is not set');
  throw new Error('CDN_DOMAIN is required');
}

const authMiddleware = createAuthMiddleware({ userPoolId, region });

const app = new Hono<{ Variables: AuthVariables }>();

// ミドルウェア
app.use('*', logger());
app.use('*', corsMiddleware(process.env.ALLOWED_ORIGINS || ''));

// 保護対象ルートにミドルウェアを適用（ルート登録前に適用）
app.use('/api/votes/*', authMiddleware);
app.use('/api/candidates', async (c, next) => {
  // POSTのみ認証必須、GETは公開
  if (c.req.method === 'POST') {
    return authMiddleware(c, next);
  }
  await next();
});

// ヘルスチェック
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ルーティング
app.route('/api/games', gamesRouter);
app.route('/api/candidates', candidatesRouter);
app.route('/api/votes', votesRouter);
app.route('/api/profile', profileRouter);
app.route('/auth', authRouter);

// 404ハンドラー
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// エラーハンドラー
app.onError((err, c) => {
  console.error('Error:', err);

  // Zodバリデーションエラーの処理
  if (err.name === 'ZodError') {
    const zodError = err as unknown as {
      issues: Array<{ path: string[]; message: string }>;
    };
    const fields: Record<string, string> = {};

    // Zodのissuesをfieldsオブジェクトに変換
    if (zodError.issues && Array.isArray(zodError.issues)) {
      zodError.issues.forEach((issue) => {
        const fieldName = issue.path.join('.');
        fields[fieldName] = issue.message;
      });
    }

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

  // その他のエラー
  return c.json(
    {
      error: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
    },
    500
  );
});

export default app;
