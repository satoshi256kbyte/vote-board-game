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

/**
 * "row,col" 形式のポジション文字列バリデーション
 * row と col はそれぞれ 0〜7 の整数
 */
const positionRegex = /^[0-7],[0-7]$/;

/**
 * POST /api/games/:gameId/turns/:turnNumber/candidates リクエストボディのバリデーションスキーマ
 *
 * - position: "row,col" 形式（row/col は 0〜7 の整数）
 * - description: 1〜200文字の説明文
 */
export const postCandidateBodySchema = z.object({
  position: z
    .string()
    .regex(positionRegex, 'Position must be in "row,col" format where row and col are 0-7'),
  description: z
    .string()
    .min(1, 'Description must be at least 1 character')
    .max(200, 'Description must be at most 200 characters'),
});

/**
 * POST /api/games/:gameId/turns/:turnNumber/candidates パスパラメータのバリデーションスキーマ
 *
 * - gameId: UUID v4 形式のゲームID
 * - turnNumber: 0以上の整数（パスパラメータは文字列で渡されるため coerce で変換）
 */
export const postCandidateParamSchema = z.object({
  gameId: z.string().uuid(),
  turnNumber: z.coerce.number().int().nonnegative(),
});
