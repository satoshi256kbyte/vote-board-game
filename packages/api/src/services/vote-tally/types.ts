/** 対局単位の処理結果 */
export interface VoteTallyGameResult {
  gameId: string;
  status: 'success' | 'skipped' | 'failed' | 'passed' | 'finished';
  reason?: string;
  adoptedCandidateId?: string;
  position?: string;
}

/** バッチ全体の処理サマリー */
export interface VoteTallySummary {
  totalGames: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  passedCount: number;
  finishedCount: number;
  results: VoteTallyGameResult[];
}
