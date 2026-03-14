/**
 * 対局解説生成サービスの型定義
 *
 * AIレスポンスのパース、バリデーション結果、バッチ処理結果の型を定義する。
 *
 * Requirements: 4.6, 7.2, 7.4
 */

/** AIレスポンスの期待するJSON構造 */
export interface AICommentaryResponse {
  content: string; // 解説文（500文字以内）
}

/** パース結果 */
export interface ParsedCommentary {
  content: string; // 500文字以内（切り詰め済み）
}

/** パース・バリデーション結果 */
export interface CommentaryParseResult {
  commentary: ParsedCommentary | null;
  error?: string; // パース・バリデーションエラーのログ用メッセージ
}

/** 対局単位の処理結果 */
export interface CommentaryGameResult {
  gameId: string;
  status: 'success' | 'skipped' | 'failed';
  reason?: string; // スキップ・失敗の理由
}

/** バッチ全体の処理サマリー */
export interface CommentaryProcessingSummary {
  totalGames: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  results: CommentaryGameResult[];
}
