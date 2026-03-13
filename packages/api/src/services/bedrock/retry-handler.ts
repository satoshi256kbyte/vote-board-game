/**
 * RetryHandler - API呼び出しのリトライロジック
 *
<<<<<<< HEAD
 * このクラスは、AWS Bedrock APIの呼び出し失敗時にリトライ処理を行います。
 * エクスポネンシャルバックオフとジッターを使用して、スロットリングエラーや
 * 一時的なネットワークエラーに対応します。
=======
 * このクラスは、Bedrock API呼び出しの失敗時にリトライロジックを提供します。
 * エクスポネンシャルバックオフとジッターを使用して、スロットリングやタイムアウトエラーに対応します。
>>>>>>> 0ae9e5a (feat: AWS Bedrock (Nova Pro) integration)
 *
 * Requirements: 4.1, 4.4, 4.5, 10.4
 */

/**
 * RetryHandler - API呼び出しのリトライロジック
 */
export class RetryHandler {
    private maxRetries: number;
    private baseDelay: number;

    constructor(maxRetries: number = 3, baseDelay: number = 1000) {
        this.maxRetries = maxRetries;
        this.baseDelay = baseDelay;
    }

    /**
     * 指定された関数をリトライロジック付きで実行
     * Requirements: 4.1, 4.4, 4.5
<<<<<<< HEAD
     *
     * @param fn - 実行する非同期関数
     * @returns 関数の実行結果
     * @throws 最後のエラー（すべてのリトライが失敗した場合）
=======
>>>>>>> 0ae9e5a (feat: AWS Bedrock (Nova Pro) integration)
     */
    public async execute<T>(fn: () => Promise<T>): Promise<T> {
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error as Error;

                // リトライ可能なエラーかチェック
                if (!this.isRetryableError(error)) {
                    throw error;
                }

                // 最後の試行の場合はリトライしない
                if (attempt === this.maxRetries) {
                    break;
                }

                // エクスポネンシャルバックオフで待機
                const delay = this.calculateDelay(attempt);
<<<<<<< HEAD
                console.log(
                    JSON.stringify({
                        type: 'BEDROCK_RETRY',
                        timestamp: new Date().toISOString(),
                        attemptNumber: attempt + 1,
                        maxRetries: this.maxRetries,
                        delayMs: delay,
                        errorName: lastError.name,
                        errorMessage: lastError.message,
                    })
                );
=======

                // リトライ試行をログに記録
                // Requirements: 10.4
                const logEntry = {
                    timestamp: new Date().toISOString(),
                    type: 'BEDROCK_RETRY',
                    attemptNumber: attempt + 1,
                    maxRetries: this.maxRetries,
                    delay,
                    errorType: lastError.name,
                    errorMessage: lastError.message,
                };
                console.log(JSON.stringify(logEntry));

>>>>>>> 0ae9e5a (feat: AWS Bedrock (Nova Pro) integration)
                await this.sleep(delay);
            }
        }

        throw lastError;
    }

    /**
     * エラーがリトライ可能かチェック
     * Requirements: 4.1, 4.4
<<<<<<< HEAD
     *
     * @param error - チェックするエラー
     * @returns リトライ可能な場合はtrue
=======
>>>>>>> 0ae9e5a (feat: AWS Bedrock (Nova Pro) integration)
     */
    public isRetryableError(error: unknown): boolean {
        if (!(error instanceof Error)) {
            return false;
        }

        const errorName = error.name;
        const errorMessage = error.message.toLowerCase();

        // スロットリングエラー
        if (errorName === 'ThrottlingException' || errorMessage.includes('throttl')) {
            return true;
        }

        // ネットワークタイムアウト
        if (errorName === 'TimeoutError' || errorMessage.includes('timeout')) {
            return true;
        }

        // 一時的なサービスエラー
        if (
            errorName === 'ServiceUnavailableException' ||
            errorMessage.includes('service unavailable')
        ) {
            return true;
        }

        return false;
    }

    /**
     * エクスポネンシャルバックオフで遅延時間を計算
<<<<<<< HEAD
     * Requirements: 4.1, 10.4
     *
     * @param attempt - 現在の試行回数（0から始まる）
     * @returns 遅延時間（ミリ秒）
=======
     * Requirements: 4.1
>>>>>>> 0ae9e5a (feat: AWS Bedrock (Nova Pro) integration)
     */
    public calculateDelay(attempt: number): number {
        // 2^attempt * baseDelay + ジッター
        const exponentialDelay = Math.pow(2, attempt) * this.baseDelay;
        const jitter = Math.random() * 1000;
        return exponentialDelay + jitter;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
