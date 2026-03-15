/**
 * Commentary API Routes
 *
 * 対局解説のためのRESTful APIエンドポイント
 * - GET /games/:gameId/commentary - 解説一覧取得
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Context } from 'hono';
import { CommentaryRepository } from '../lib/dynamodb/repositories/commentary.js';
import { GameRepository } from '../lib/dynamodb/repositories/game.js';
import { docClient, TABLE_NAME } from '../lib/dynamodb/index.js';

// gameId パラメータのバリデーションスキーマ
const commentaryParamSchema = z.object({
  gameId: z.string().min(1, 'gameId is required'),
});

// バリデーションエラーハンドラー（共通）
const validationErrorHandler = (
  result: {
    success: boolean;
    error?: { issues: Array<{ path: PropertyKey[]; message: string }> };
  },
  c: Context
) => {
  if (!result.success) {
    const fields: Record<string, string> = {};
    result.error!.issues.forEach((issue) => {
      const fieldName = issue.path.map(String).join('.');
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
 * 解説ルーターを作成
 * GET /games/:gameId/commentary - 解説一覧取得
 * /api にマウントされることを想定
 * @param commentaryRepo CommentaryRepositoryインスタンス（テスト時にモックを注入可能）
 * @param gameRepo GameRepositoryインスタンス（テスト時にモックを注入可能）
 */
export function createCommentaryRouter(
  commentaryRepo?: CommentaryRepository,
  gameRepo?: GameRepository
): Hono {
  const router = new Hono();

  const commentaryRepository = commentaryRepo || new CommentaryRepository(docClient, TABLE_NAME);
  const gameRepository = gameRepo || new GameRepository();

  // GET /games/:gameId/commentary - 解説一覧取得
  router.get(
    '/games/:gameId/commentary',
    zValidator('param', commentaryParamSchema, validationErrorHandler),
    async (c) => {
      try {
        const { gameId } = c.req.valid('param');

        // 対局の存在確認
        const game = await gameRepository.getById(gameId);
        if (!game) {
          return c.json(
            {
              error: 'NOT_FOUND',
              message: 'Game not found',
            },
            404
          );
        }

        // 解説を取得
        const commentaries = await commentaryRepository.listByGame(gameId);

        // turnNumber 昇順でソート
        const sorted = [...commentaries].sort((a, b) => a.turnNumber - b.turnNumber);

        // レスポンス用にマッピング
        const response = sorted.map((c) => ({
          turnNumber: c.turnNumber,
          content: c.content,
          generatedBy: c.generatedBy,
          createdAt: c.createdAt,
        }));

        return c.json({ commentaries: response }, 200);
      } catch (error) {
        console.error('Failed to retrieve commentaries', {
          error: error instanceof Error ? error.message : 'Unknown error',
          gameId: c.req.param('gameId'),
          timestamp: new Date().toISOString(),
        });

        return c.json(
          {
            error: 'INTERNAL_ERROR',
            message: 'Failed to retrieve commentaries',
          },
          500
        );
      }
    }
  );

  return router;
}

// デフォルトエクスポート（本番環境用）
export const commentaryRouter = createCommentaryRouter();
