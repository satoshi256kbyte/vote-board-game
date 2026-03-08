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
