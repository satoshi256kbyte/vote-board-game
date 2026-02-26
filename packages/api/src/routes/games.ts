/**
 * Game API Routes
 *
 * ゲーム管理のためのRESTful APIエンドポイント群
 * - GET /api/games - ゲーム一覧取得
 * - GET /api/games/:gameId - ゲーム詳細取得
 * - POST /api/games - ゲーム作成
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { Context } from 'hono';
import { GameService } from '../services/game.js';
import { GameRepository } from '../lib/dynamodb/repositories/game.js';
import { getGamesQuerySchema, createGameSchema, gameIdParamSchema } from '../schemas/game.js';

// バリデーションエラーハンドラー（共通）
const validationErrorHandler = (
  result: {
    success: boolean;
    error?: { issues: Array<{ path: (string | number)[]; message: string }> };
  },
  c: Context
) => {
  if (!result.success) {
    const fields: Record<string, string> = {};
    result.error!.issues.forEach((issue) => {
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
};

/**
 * ゲームルーターを作成
 * @param gameService GameServiceインスタンス（テスト時にモックを注入可能）
 */
export function createGamesRouter(gameService?: GameService): Hono {
  const gamesRouter = new Hono();

  // GameService インスタンスの作成（依存性注入）
  const service = gameService || new GameService(new GameRepository());

  // GET /api/games - ゲーム一覧取得
  gamesRouter.get(
    '/',
    zValidator('query', getGamesQuerySchema, validationErrorHandler),
    async (c) => {
      try {
        const { status, limit, cursor } = c.req.valid('query');

        const result = await service.listGames({
          status,
          limit,
          cursor,
        });

        return c.json(result, 200);
      } catch (error) {
        console.error('Failed to list games', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });

        return c.json(
          {
            error: 'INTERNAL_ERROR',
            message: 'Failed to retrieve games',
          },
          500
        );
      }
    }
  );

  // GET /api/games/:gameId - ゲーム詳細取得
  gamesRouter.get(
    '/:gameId',
    zValidator('param', gameIdParamSchema, validationErrorHandler),
    async (c) => {
      try {
        const { gameId } = c.req.valid('param');

        const game = await service.getGame(gameId);

        if (!game) {
          return c.json(
            {
              error: 'NOT_FOUND',
              message: 'Game not found',
            },
            404
          );
        }

        return c.json(game, 200);
      } catch (error) {
        console.error('Failed to get game', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });

        return c.json(
          {
            error: 'INTERNAL_ERROR',
            message: 'Failed to retrieve game',
          },
          500
        );
      }
    }
  );

  // POST /api/games - ゲーム作成
  gamesRouter.post('/', zValidator('json', createGameSchema, validationErrorHandler), async (c) => {
    try {
      const { gameType, aiSide } = c.req.valid('json');

      const game = await service.createGame({
        gameType,
        aiSide,
      });

      console.log('Game created successfully', {
        gameId: game.gameId,
        timestamp: new Date().toISOString(),
      });

      return c.json(game, 201);
    } catch (error) {
      console.error('Failed to create game', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });

      return c.json(
        {
          error: 'INTERNAL_ERROR',
          message: 'Failed to create game',
        },
        500
      );
    }
  });

  return gamesRouter;
}

// デフォルトエクスポート（本番環境用）
export const gamesRouter = createGamesRouter();
