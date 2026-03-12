/**
 * TokenCounter - トークン使用量の記録と監視
 */

/**
 * トークン使用量の情報
 */
export interface TokenUsage {
  modelId: string;
  requestId: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * TokenCounter クラス
 * AWS Bedrock のトークン使用量を CloudWatch Logs に記録する
 */
export class TokenCounter {
  /**
   * トークン使用量をCloudWatch Logsに記録
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 10.5
   *
   * @param usage - トークン使用量の情報
   */
  public recordUsage(usage: TokenUsage): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      modelId: usage.modelId,
      requestId: usage.requestId,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.inputTokens + usage.outputTokens,
      type: 'BEDROCK_TOKEN_USAGE',
    };

    // 構造化ログとして出力（CloudWatch Logs に記録される）
    console.log(JSON.stringify(logEntry));
  }
}
