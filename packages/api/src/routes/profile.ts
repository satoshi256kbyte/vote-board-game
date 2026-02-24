import { Hono } from 'hono';
import { createAuthMiddleware } from '../lib/auth/auth-middleware.js';

const profileRouter = new Hono();

// 認証ミドルウェアの作成
const authMiddleware = createAuthMiddleware({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  region: process.env.AWS_REGION!,
});

// すべてのルートに認証ミドルウェアを適用
profileRouter.use('/*', authMiddleware);

// GET /api/profile - プロフィール情報の取得
profileRouter.get('/', async (c) => {
  // TODO: 実装予定（Task 5.2）
  return c.json({ message: 'Get profile endpoint' }, 200);
});

// PUT /api/profile - プロフィール情報の更新
profileRouter.put('/', async (c) => {
  // TODO: 実装予定（Task 5.3）
  return c.json({ message: 'Update profile endpoint' }, 200);
});

// POST /api/profile/icon/upload-url - アイコンアップロード用Presigned URL生成
profileRouter.post('/icon/upload-url', async (c) => {
  // TODO: 実装予定（Task 5.4）
  return c.json({ message: 'Generate upload URL endpoint' }, 200);
});

export { profileRouter };
