import { z } from 'zod';

/**
 * GET /api/games クエリパラメータのバリデーションスキーマ
 *
 * - status: ゲームのステータス (ACTIVE または FINISHED)、デフォルトは ACTIVE
 * - limit: 取得するゲーム数 (1-100)、デフォルトは 20
 * - cursor: ページネーション用のカーソル (オプション)
 */
export const getGamesQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'FINISHED']).optional().default('ACTIVE'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  cursor: z.string().optional(),
});

/**
 * POST /api/games リクエストボディのバリデーションスキーマ
 *
 * - gameType: ゲームの種類 (MVP では OTHELLO のみ)
 * - aiSide: AI が担当する色 (BLACK または WHITE)
 */
export const createGameSchema = z.object({
  gameType: z.literal('OTHELLO'),
  aiSide: z.enum(['BLACK', 'WHITE']),
});

/**
 * パスパラメータ :gameId のバリデーションスキーマ
 *
 * - gameId: UUID v4 形式のゲームID
 */
export const gameIdParamSchema = z.object({
  gameId: z.string().uuid(),
});
