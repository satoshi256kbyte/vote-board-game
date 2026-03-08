import { z } from 'zod';

/**
 * GET /api/games/:gameId/turns/:turnNumber/candidates パスパラメータのバリデーションスキーマ
 *
 * - gameId: UUID v4 形式のゲームID
 * - turnNumber: 0以上の整数（パスパラメータは文字列で渡されるため coerce で変換）
 */
export const getCandidatesParamSchema = z.object({
  gameId: z.string().uuid(),
  turnNumber: z.coerce.number().int().nonnegative(),
});
