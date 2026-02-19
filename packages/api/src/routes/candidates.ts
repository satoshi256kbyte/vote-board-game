import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const candidatesRouter = new Hono();

const createCandidateSchema = z.object({
  gameId: z.string(),
  position: z.object({
    row: z.number().int().min(0).max(7),
    col: z.number().int().min(0).max(7),
  }),
  description: z.string().max(200),
});

// GET /api/candidates?gameId=xxx - 候補一覧取得
candidatesRouter.get('/', async (c) => {
  const gameId = c.req.query('gameId');

  if (!gameId) {
    return c.json({ error: 'gameId is required' }, 400);
  }

  // TODO: DynamoDB から取得
  return c.json({
    candidates: [],
  });
});

// POST /api/candidates - 候補投稿
candidatesRouter.post('/', zValidator('json', createCandidateSchema), async (c) => {
  const data = c.req.valid('json');

  // TODO: DynamoDB に保存
  return c.json(
    {
      candidateId: 'candidate-1',
      ...data,
      createdAt: new Date().toISOString(),
    },
    201
  );
});

export { candidatesRouter };
