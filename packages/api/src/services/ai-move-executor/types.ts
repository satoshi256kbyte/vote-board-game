/**
 * AI手実行サービスの型定義
 *
 * AIレスポンスのパース、手決定結果、対局処理結果、バッチ処理サマリーの型を定義する。
 */

/** AIレスポンスの期待するJSON構造 */
export interface AIMoveAIResponse {
  position: string; // "row,col" 形式
  description: string; // 200文字以内の説明文
}

/** AIレスポンスのパース結果 */
export interface AIMoveParseResult {
  success: boolean;
  position: string | null; // "row,col" 形式、失敗時は null
  description: string | null;
  error?: string; // パース・バリデーションエラーのログ用メッセージ
}

/** AIの手決定結果 */
export interface AIMoveDecision {
  position: { row: number; col: number };
  description: string;
  isFallback: boolean;
}

/** 対局単位の処理結果 */
export interface AIMoveGameResult {
  gameId: string;
  status: 'success' | 'skipped' | 'failed' | 'passed' | 'finished';
  reason?: string;
}

/** バッチ全体の処理サマリー */
export interface AIMoveProcessingSummary {
  totalGames: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  passedCount: number;
  finishedCount: number;
  results: AIMoveGameResult[];
}
