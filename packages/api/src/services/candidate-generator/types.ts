/**
 * 次の一手候補生成サービスの型定義
 *
 * AIレスポンスのパース、バリデーション結果、バッチ処理結果の型を定義する。
 *
 * Requirements: 4.7, 6.2, 6.4
 */

/** AIレスポンスの期待するJSON構造（個別候補） */
export interface AIResponseCandidate {
  position: string; // "row,col" 形式（例: "2,3"）
  description: string; // 200文字以内の説明文
}

/** AIレスポンスの期待するJSON構造 */
export interface AIResponse {
  candidates: AIResponseCandidate[];
}

/** パース・バリデーション済みの候補 */
export interface ParsedCandidate {
  position: string; // "row,col" 形式
  description: string; // 200文字以内（切り詰め済み）
}

/** AIレスポンスのパース結果 */
export interface ParseResult {
  candidates: ParsedCandidate[];
  errors: string[]; // パース・バリデーションエラーのログ用メッセージ
}

/** 対局単位の処理結果 */
export interface GameProcessingResult {
  gameId: string;
  status: 'success' | 'skipped' | 'failed';
  candidatesGenerated: number;
  candidatesSaved: number;
  reason?: string; // スキップ・失敗の理由
}

/** バッチ全体の処理サマリー */
export interface ProcessingSummary {
  totalGames: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  totalCandidatesGenerated: number;
  results: GameProcessingResult[];
}
