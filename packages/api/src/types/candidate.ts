/**
 * Candidate API のリクエスト/レスポンス型定義
 *
 * このファイルは、Candidate API エンドポイントで使用される型を定義します。
 * Requirements: 1.5, 6.3, 6.4
 */

/**
 * 候補オブジェクトのレスポンス型
 */
export interface CandidateResponse {
  /** 候補ID（UUID v4） */
  candidateId: string;
  /** 位置（"row,col"形式） */
  position: string;
  /** 説明文（最大200文字） */
  description: string;
  /** 投票数 */
  voteCount: number;
  /** 作成者（"AI" または "USER#<userId>"） */
  createdBy: string;
  /** ステータス */
  status: 'VOTING' | 'CLOSED' | 'ADOPTED';
  /** 投票締切（ISO 8601形式） */
  votingDeadline: string;
  /** 作成日時（ISO 8601形式） */
  createdAt: string;
}

/**
 * 候補一覧取得APIのレスポンス
 * GET /api/games/:gameId/turns/:turnNumber/candidates
 */
export interface GetCandidatesResponse {
  /** 候補のリスト（投票数降順） */
  candidates: CandidateResponse[];
}
