import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const gamesRouter = new Hono();

// GET /api/games - ゲーム一覧取得
gamesRouter.get('/', async (c) => {
  // TODO: DynamoDB から取得
  return c.json({
    games: [],
  });
});

// GET /api/games/:gameId - ゲーム詳細取得
gamesRouter.get('/:gameId', async (c) => {
  const gameId = c.req.param('gameId');

  // TODO: DynamoDB から取得
  return c.json({
    gameId,
    status: 'active',
    currentTurn: 1,
  });
});

// GET /api/games/:gameId/board - 盤面取得
gamesRouter.get('/:gameId/board', async (c) => {
  const gameId = c.req.param('gameId');

  // TODO: DynamoDB から取得
  return c.json({
    gameId,
    board: [],
    turn: 1,
  });
});

// GET /api/games/:gameId/history - 対局履歴取得
gamesRouter.get('/:gameId/history', async (c) => {
  const gameId = c.req.param('gameId');

  // TODO: DynamoDB から取得
  return c.json({
    gameId,
    moves: [],
  });
});

export { gamesRouter };
