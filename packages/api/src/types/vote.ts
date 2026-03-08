/**
 * Vote API のリクエスト/レスポンス型定義
 *
 * Requirements: 8.3
 */

/**
 * 投票リクエストボディ
 * POST /api/games/:gameId/turns/:turnNumber/votes
 */
export interface PostVoteRequest {
  /** 候補ID（UUID v4形式） */
  candidateId: string;
}

/**
 * 投票レスポンス
 */
export interface VoteResponse {
  /** 対局ID */
  gameId: string;
  /** ターン番号 */
  turnNumber: number;
  /** 投票者のユーザーID */
  userId: string;
  /** 候補ID */
  candidateId: string;
  /** 作成日時（ISO 8601形式） */
  createdAt: string;
}
/**
 * 投票変更レスポンス
 * PUT /api/games/:gameId/turns/:turnNumber/votes/me
 *
 * Requirements: 9.3, 9.4
 */
export interface VoteChangeResponse {
  /** 対局ID */
  gameId: string;
  /** ターン番号 */
  turnNumber: number;
  /** 投票者のユーザーID */
  userId: string;
  /** 候補ID */
  candidateId: string;
  /** 作成日時（ISO 8601形式） */
  createdAt: string;
  /** 投票変更時の更新日時（ISO 8601形式） */
  updatedAt: string;
}
