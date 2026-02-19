import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const votesRouter = new Hono();

const createVoteSchema = z.object({
  gameId: z.string(),
  candidateId: z.string(),
});

// POST /api/votes - 投票
votesRouter.post('/', zValidator('json', createVoteSchema), async (c) => {
  const data = c.req.valid('json');

  // TODO: ユーザー認証チェック
  // TODO: 重複投票チェック
  // TODO: DynamoDB に保存

  return c.json(
    {
      voteId: 'vote-1',
      ...data,
      createdAt: new Date().toISOString(),
    },
    201
  );
});

// GET /api/votes/my?gameId=xxx - 自分の投票取得
votesRouter.get('/my', async (c) => {
  const gameId = c.req.query('gameId');

  if (!gameId) {
    return c.json({ error: 'gameId is required' }, 400);
  }

  // TODO: ユーザー認証チェック
  // TODO: DynamoDB から取得

  return c.json({
    vote: null,
  });
});

export { votesRouter };
