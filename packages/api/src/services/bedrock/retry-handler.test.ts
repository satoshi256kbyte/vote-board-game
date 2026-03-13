import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RetryHandler } from './retry-handler';

/**
 * RetryHandler Unit Tests
 *
 * このテストスイートは、RetryHandlerクラスのユニットテストを提供します。
 * Requirements: 9.3, 9.5
 *
 * テスト対象:
 * - リトライ可能なエラー（ThrottlingException, TimeoutError）
 * - リトライ不可能なエラー（ValidationError）
 * - リトライ回数の上限
 * - エクスポネンシャルバックオフの計算
 */

describe('RetryHandler', () => {
    let retryHandler: RetryHandler;
    let consoleLogSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        // デフォルト設定: maxRetries=3, baseDelay=1000
        retryHandler = new RetryHandler(3, 1000);

        // console.logをモック
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

        // タイマーをモック
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    describe('execute - 成功ケース', () => {
        it('should execute function successfully on first attempt', async () => {
            // **Validates: Requirements 9.3**
            const mockFn = vi.fn().mockResolvedValue('success');

            const result = await retryHandler.execute(mockFn);

            expect(result).toBe('success');
            expect(mockFn).toHaveBeenCalledTimes(1);
        });

        it('should return result immediately without retry on success', async () => {
            // **Validates: Requirements 9.3**
            const mockFn = vi.fn().mockResolvedValue({ data: 'test' });

            const result = await retryHandler.execute(mockFn);

            expect(result).toEqual({ data: 'test' });
            expect(mockFn).toHaveBeenCalledTimes(1);
            expect(consoleLogSpy).not.toHaveBeenCalled();
        });
    });

    describe('isRetryableError - リトライ可能なエラー', () => {
        it('should identify ThrottlingException as retryable', () => {
            // **Validates: Requirements 9.3**
            const error = new Error('Request throttled');
            error.name = 'ThrottlingException';

            expect(retryHandler.isRetryableError(error)).toBe(true);
        });

        it('should identify throttling message as retryable', () => {
            // **Validates: Requirements 9.3**
            const error = new Error('Rate limit exceeded, throttling request');

            expect(retryHandler.isRetryableError(error)).toBe(true);
        });

        it('should identify TimeoutError as retryable', () => {
            // **Validates: Requirements 9.3**
            const error = new Error('Request timed out');
            error.name = 'TimeoutError';

            expect(retryHandler.isRetryableError(error)).toBe(true);
        });

        it('should identify timeout message as retryable', () => {
            // **Validates: Requirements 9.3**
            const error = new Error('Connection timeout after 30 seconds');

            expect(retryHandler.isRetryableError(error)).toBe(true);
        });

        it('should identify ServiceUnavailableException as retryable', () => {
            // **Validates: Requirements 9.3**
            const error = new Error('Service temporarily unavailable');
            error.name = 'ServiceUnavailableException';

            expect(retryHandler.isRetryableError(error)).toBe(true);
        });

        it('should identify service unavailable message as retryable', () => {
            // **Validates: Requirements 9.3**
            const error = new Error('The service unavailable, please try again');

            expect(retryHandler.isRetryableError(error)).toBe(true);
        });
    });

    describe('isRetryableError - リトライ不可能なエラー', () => {
        it('should identify ValidationError as non-retryable', () => {
            // **Validates: Requirements 9.3**
            const error = new Error('Invalid input');
            error.name = 'ValidationError';

            expect(retryHandler.isRetryableError(error)).toBe(false);
        });

        it('should identify ModelNotFoundException as non-retryable', () => {
            // **Validates: Requirements 9.3**
            const error = new Error('Model not found');
            error.name = 'ModelNotFoundException';

            expect(retryHandler.isRetryableError(error)).toBe(false);
        });

        it('should identify generic Error as non-retryable', () => {
            // **Validates: Requirements 9.3**
            const error = new Error('Something went wrong');

            expect(retryHandler.isRetryableError(error)).toBe(false);
        });

        it('should return false for non-Error objects', () => {
            // **Validates: Requirements 9.3**
            expect(retryHandler.isRetryableError('string error')).toBe(false);
            expect(retryHandler.isRetryableError(null)).toBe(false);
            expect(retryHandler.isRetryableError(undefined)).toBe(false);
            expect(retryHandler.isRetryableError(123)).toBe(false);
        });
    });

    describe('execute - リトライ可能なエラーのリトライ', () => {
        it('should retry ThrottlingException up to maxRetries times', async () => {
            // **Validates: Requirements 9.3, 9.5**
            const error = new Error('Request throttled');
            error.name = 'ThrottlingException';

            const mockFn = vi.fn().mockRejectedValue(error);

            // Attach error handler immediately to prevent unhandled rejection
            const executePromise = retryHandler.execute(mockFn).catch((e) => e);

            // 各リトライの遅延を進める
            for (let i = 0; i < 3; i++) {
                await vi.runAllTimersAsync();
            }

            // プロミスが拒否されることを確認
            const result = await executePromise;
            expect(result).toBeInstanceOf(Error);
            expect((result as Error).message).toBe('Request throttled');

            // 初回 + 3回のリトライ = 4回の呼び出し
            expect(mockFn).toHaveBeenCalledTimes(4);
        });

        it('should retry TimeoutError up to maxRetries times', async () => {
            // **Validates: Requirements 9.3, 9.5**
            const error = new Error('Connection timeout');
            error.name = 'TimeoutError';

            const mockFn = vi.fn().mockRejectedValue(error);

            const executePromise = retryHandler.execute(mockFn).catch((e) => e);

            for (let i = 0; i < 3; i++) {
                await vi.runAllTimersAsync();
            }

            const result = await executePromise;
            expect(result).toBeInstanceOf(Error);
            expect((result as Error).message).toBe('Connection timeout');

            expect(mockFn).toHaveBeenCalledTimes(4);
        });

        it('should succeed on retry after initial failure', async () => {
            // **Validates: Requirements 9.3, 9.5**
            const error = new Error('Throttled');
            error.name = 'ThrottlingException';

            const mockFn = vi
                .fn()
                .mockRejectedValueOnce(error)
                .mockRejectedValueOnce(error)
                .mockResolvedValue('success');

            const promise = retryHandler.execute(mockFn);

            // 2回のリトライ遅延を進める
            await vi.runAllTimersAsync();
            await vi.runAllTimersAsync();

            const result = await promise;

            expect(result).toBe('success');
            expect(mockFn).toHaveBeenCalledTimes(3);
        });

        it('should log retry attempts with structured format', async () => {
            // **Validates: Requirements 9.5**
            const error = new Error('Throttled');
            error.name = 'ThrottlingException';

            const mockFn = vi.fn().mockRejectedValue(error);

            const executePromise = retryHandler.execute(mockFn).catch((e) => e);

            // 最初のリトライ
            await vi.runAllTimersAsync();

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"type":"BEDROCK_RETRY"'));
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"attemptNumber":1'));
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('"errorType":"ThrottlingException"')
            );

            // 残りのリトライを進める
            await vi.runAllTimersAsync();
            await vi.runAllTimersAsync();

            const result = await executePromise;
            expect(result).toBeInstanceOf(Error);
        });
    });

    describe('execute - リトライ不可能なエラーの即座の失敗', () => {
        it('should throw ValidationError immediately without retry', async () => {
            // **Validates: Requirements 9.3**
            const error = new Error('Invalid input');
            error.name = 'ValidationError';

            const mockFn = vi.fn().mockRejectedValue(error);

            await expect(retryHandler.execute(mockFn)).rejects.toThrow('Invalid input');

            // リトライなしで1回のみ呼び出し
            expect(mockFn).toHaveBeenCalledTimes(1);
            expect(consoleLogSpy).not.toHaveBeenCalled();
        });

        it('should throw ModelNotFoundException immediately without retry', async () => {
            // **Validates: Requirements 9.3**
            const error = new Error('Model not found');
            error.name = 'ModelNotFoundException';

            const mockFn = vi.fn().mockRejectedValue(error);

            await expect(retryHandler.execute(mockFn)).rejects.toThrow('Model not found');

            expect(mockFn).toHaveBeenCalledTimes(1);
            expect(consoleLogSpy).not.toHaveBeenCalled();
        });

        it('should throw generic Error immediately without retry', async () => {
            // **Validates: Requirements 9.3**
            const error = new Error('Unknown error');

            const mockFn = vi.fn().mockRejectedValue(error);

            await expect(retryHandler.execute(mockFn)).rejects.toThrow('Unknown error');

            expect(mockFn).toHaveBeenCalledTimes(1);
            expect(consoleLogSpy).not.toHaveBeenCalled();
        });
    });

    describe('calculateDelay - エクスポネンシャルバックオフ', () => {
        it('should calculate exponential backoff for attempt 0', () => {
            // **Validates: Requirements 9.5**
            // 2^0 * 1000 = 1000ms + jitter (0-1000ms)
            const delay = retryHandler.calculateDelay(0);

            expect(delay).toBeGreaterThanOrEqual(1000);
            expect(delay).toBeLessThan(2000);
        });

        it('should calculate exponential backoff for attempt 1', () => {
            // **Validates: Requirements 9.5**
            // 2^1 * 1000 = 2000ms + jitter (0-1000ms)
            const delay = retryHandler.calculateDelay(1);

            expect(delay).toBeGreaterThanOrEqual(2000);
            expect(delay).toBeLessThan(3000);
        });

        it('should calculate exponential backoff for attempt 2', () => {
            // **Validates: Requirements 9.5**
            // 2^2 * 1000 = 4000ms + jitter (0-1000ms)
            const delay = retryHandler.calculateDelay(2);

            expect(delay).toBeGreaterThanOrEqual(4000);
            expect(delay).toBeLessThan(5000);
        });

        it('should calculate exponential backoff for attempt 3', () => {
            // **Validates: Requirements 9.5**
            // 2^3 * 1000 = 8000ms + jitter (0-1000ms)
            const delay = retryHandler.calculateDelay(3);

            expect(delay).toBeGreaterThanOrEqual(8000);
            expect(delay).toBeLessThan(9000);
        });

        it('should include jitter in delay calculation', () => {
            // **Validates: Requirements 9.5**
            const delays = Array.from({ length: 10 }, () => retryHandler.calculateDelay(0));

            // ジッターにより、各遅延は異なるはず
            const uniqueDelays = new Set(delays);
            expect(uniqueDelays.size).toBeGreaterThan(1);
        });
    });

    describe('constructor - カスタム設定', () => {
        it('should use custom maxRetries', async () => {
            // **Validates: Requirements 9.5**
            const customHandler = new RetryHandler(2, 1000);
            const error = new Error('Throttled');
            error.name = 'ThrottlingException';

            const mockFn = vi.fn().mockRejectedValue(error);

            const executePromise = customHandler.execute(mockFn).catch((e) => e);

            // 2回のリトライ
            await vi.runAllTimersAsync();
            await vi.runAllTimersAsync();

            const result = await executePromise;
            expect(result).toBeInstanceOf(Error);

            // 初回 + 2回のリトライ = 3回
            expect(mockFn).toHaveBeenCalledTimes(3);
        });

        it('should use custom baseDelay', () => {
            // **Validates: Requirements 9.5**
            const customHandler = new RetryHandler(3, 500);

            // 2^0 * 500 = 500ms + jitter
            const delay = customHandler.calculateDelay(0);

            expect(delay).toBeGreaterThanOrEqual(500);
            expect(delay).toBeLessThan(1500);
        });

        it('should handle maxRetries=0 (no retries)', async () => {
            // **Validates: Requirements 9.5**
            const noRetryHandler = new RetryHandler(0, 1000);
            const error = new Error('Throttled');
            error.name = 'ThrottlingException';

            const mockFn = vi.fn().mockRejectedValue(error);

            await expect(noRetryHandler.execute(mockFn)).rejects.toThrow();

            // リトライなしで1回のみ
            expect(mockFn).toHaveBeenCalledTimes(1);
        });
    });

    describe('execute - リトライ回数の上限', () => {
        it('should stop retrying after maxRetries attempts', async () => {
            // **Validates: Requirements 9.5**
            const error = new Error('Throttled');
            error.name = 'ThrottlingException';

            const mockFn = vi.fn().mockRejectedValue(error);

            const executePromise = retryHandler.execute(mockFn).catch((e) => e);

            // 3回のリトライを進める
            await vi.runAllTimersAsync();
            await vi.runAllTimersAsync();
            await vi.runAllTimersAsync();

            const result = await executePromise;
            expect(result).toBeInstanceOf(Error);
            expect((result as Error).message).toBe('Throttled');

            // 初回 + 3回のリトライ = 4回（maxRetries=3）
            expect(mockFn).toHaveBeenCalledTimes(4);
        });

        it('should throw the last error after all retries exhausted', async () => {
            // **Validates: Requirements 9.5**
            const error = new Error('Persistent throttling');
            error.name = 'ThrottlingException';

            const mockFn = vi.fn().mockRejectedValue(error);

            const executePromise = retryHandler.execute(mockFn).catch((e) => e);

            for (let i = 0; i < 3; i++) {
                await vi.runAllTimersAsync();
            }

            const result = await executePromise;
            expect(result).toBeInstanceOf(Error);
            expect((result as Error).message).toBe('Persistent throttling');
        });

        it('should log all retry attempts', async () => {
            // **Validates: Requirements 9.5**
            const error = new Error('Throttled');
            error.name = 'ThrottlingException';

            const mockFn = vi.fn().mockRejectedValue(error);

            const executePromise = retryHandler.execute(mockFn).catch((e) => e);

            // 3回のリトライを進める
            for (let i = 0; i < 3; i++) {
                await vi.runAllTimersAsync();
            }

            const result = await executePromise;
            expect(result).toBeInstanceOf(Error);

            // 3回のリトライログが記録されているはず
            expect(consoleLogSpy).toHaveBeenCalledTimes(3);

            // 各ログエントリを検証
            const logCalls = consoleLogSpy.mock.calls.map((call) => JSON.parse(call[0] as string));
            expect(logCalls[0].attemptNumber).toBe(1);
            expect(logCalls[1].attemptNumber).toBe(2);
            expect(logCalls[2].attemptNumber).toBe(3);

            logCalls.forEach((log) => {
                expect(log.type).toBe('BEDROCK_RETRY');
                expect(log.maxRetries).toBe(3);
                expect(log.errorType).toBe('ThrottlingException');
                expect(log.timestamp).toBeDefined();
                expect(log.delay).toBeGreaterThan(0);
            });
        });
    });

    describe('execute - エッジケース', () => {
        it('should handle function that throws non-Error object', async () => {
            // **Validates: Requirements 9.3**
            const mockFn = vi.fn().mockRejectedValue('string error');

            await expect(retryHandler.execute(mockFn)).rejects.toBe('string error');

            // 非Errorオブジェクトはリトライ不可
            expect(mockFn).toHaveBeenCalledTimes(1);
        });

        it('should handle function that returns Promise.reject', async () => {
            // **Validates: Requirements 9.3**
            const error = new Error('Rejected');
            error.name = 'ThrottlingException';

            const mockFn = vi.fn(() => Promise.reject(error));

            const executePromise = retryHandler.execute(mockFn).catch((e) => e);

            for (let i = 0; i < 3; i++) {
                await vi.runAllTimersAsync();
            }

            const result = await executePromise;
            expect(result).toBeInstanceOf(Error);
            expect((result as Error).message).toBe('Rejected');

            expect(mockFn).toHaveBeenCalledTimes(4);
        });

        it('should handle mixed error types across retries', async () => {
            // **Validates: Requirements 9.3**
            const throttleError = new Error('Throttled');
            throttleError.name = 'ThrottlingException';

            const validationError = new Error('Invalid');
            validationError.name = 'ValidationError';

            const mockFn = vi
                .fn()
                .mockRejectedValueOnce(throttleError)
                .mockRejectedValueOnce(validationError);

            const executePromise = retryHandler.execute(mockFn).catch((e) => e);

            // 最初のリトライ
            await vi.runAllTimersAsync();

            // ValidationErrorで即座に失敗
            const result = await executePromise;
            expect(result).toBeInstanceOf(Error);
            expect((result as Error).message).toBe('Invalid');

            // 初回（ThrottlingException） + 1回のリトライ（ValidationError）
            expect(mockFn).toHaveBeenCalledTimes(2);
        });
    });
});
