import { z } from 'zod';

/**
 * POST /api/games/:gameId/turns/:turnNumber/votes リクエストボディのバリデーションスキーマ
 *
 * - candidateId: UUID v4 形式の候補ID
 */
export const postVoteBodySchema = z.object({
  candidateId: z.string().uuid(),
});

/**
 * POST /api/games/:gameId/turns/:turnNumber/votes パスパラメータのバリデーションスキーマ
 *
 * - gameId: UUID v4 形式のゲームID
 * - turnNumber: 0以上の整数（パスパラメータは文字列で渡されるため coerce で変換）
 */
export const postVoteParamSchema = z.object({
  gameId: z.string().uuid(),
  turnNumber: z.coerce.number().int().nonnegative(),
});

/**
 * PUT /api/games/:gameId/turns/:turnNumber/votes/me リクエストボディのバリデーションスキーマ
 *
 * - candidateId: UUID v4 形式の変更先候補ID
 */
export const putVoteBodySchema = z.object({
  candidateId: z.string().uuid(),
});

/**
 * PUT /api/games/:gameId/turns/:turnNumber/votes/me パスパラメータのバリデーションスキーマ
 *
 * - gameId: UUID v4 形式のゲームID
 * - turnNumber: 0以上の整数（パスパラメータは文字列で渡されるため coerce で変換）
 */
export const putVoteParamSchema = z.object({
  gameId: z.string().uuid(),
  turnNumber: z.coerce.number().int().nonnegative(),
});

/**
 * GET /api/games/:gameId/turns/:turnNumber/votes/me パスパラメータのバリデーションスキーマ
 *
 * - gameId: UUID v4 形式のゲームID
 * - turnNumber: 0以上の整数（パスパラメータは文字列で渡されるため coerce で変換）
 */
export const getVoteParamSchema = z.object({
  gameId: z.string().uuid(),
  turnNumber: z.coerce.number().int().nonnegative(),
});
