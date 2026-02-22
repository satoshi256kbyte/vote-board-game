import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { gamesRouter } from './routes/games.js';
import { candidatesRouter } from './routes/candidates.js';
import { votesRouter } from './routes/votes.js';
import { authRouter } from './routes/auth.js';

const app = new Hono();

// ミドルウェア
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  })
);

// ヘルスチェック
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ルーティング
app.route('/api/games', gamesRouter);
app.route('/api/candidates', candidatesRouter);
app.route('/api/votes', votesRouter);
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
