/** エラーレスポンスの型定義 */
export interface ErrorResponse {
  /** エラーコード（例: VALIDATION_ERROR, UNAUTHORIZED, NOT_FOUND, INTERNAL_ERROR） */
  error: string;
  /** 人間が読めるエラーメッセージ */
  message: string;
  /** オプション：詳細情報 */
  details?: {
    /** フィールドレベルのエラー（バリデーションエラー用） */
    fields?: Record<string, string>;
    /** その他の詳細情報 */
    [key: string]: unknown;
  };
}
