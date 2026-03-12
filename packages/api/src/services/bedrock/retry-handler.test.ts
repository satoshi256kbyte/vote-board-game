/**
 * Unit tests for RetryHandler
 *
 * Requirements: 4.1, 4.4, 4.5, 10.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RetryHandler } from './retry-handler';

describe('RetryHandler', () => {
    let retryHandler: RetryHandler;
    let consoleLogSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        retryHandler = new RetryHandler(3, 1000);
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.useFakeTimers();
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
        vi.useRealTimers();
    });

    describe('execute', () => {
        it('should return result on first successful attempt', async () => {
            const fn = vi.fn().mockResolvedValue('success');

            const result = await retryHandler.execute(fn);

            expect(result).toBe('success');
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('should retry on ThrottlingException', async () => {
            const error = new Error('Rate exceeded');
            error.name = 'ThrottlingException';

            const fn = vi
                .fn()
                .mockRejectedValueOnce(error)
                .mockRejectedValueOnce(error)
                .mockResolvedValue('success');

            const promise = retryHandler.execute(fn);

            // Fast-forward through retries
            await vi.runAllTimersAsync();

            const result = await promise;

            expect(result).toBe('success');
            expect(fn).toHaveBeenCalledTimes(3);
        });

        it('should retry on TimeoutError', async () => {
            const error = new Error('Request timeout');
            error.name = 'TimeoutError';

            const fn = vi.fn().mockRejectedValueOnce(error).mockResolvedValue('success');

            const promise = retryHandler.execute(fn);

            await vi.runAllTimersAsync();

            const result = await promise;

            expect(result).toBe('success');
            expect(fn).toHaveBeenCalledTimes(2);
        });

        it('should retry on ServiceUnavailableException', async () => {
            const error = new Error('Service unavailable');
            error.name = 'ServiceUnavailableException';

            const fn = vi.fn().mockRejectedValueOnce(error).mockResolvedValue('success');

            const promise = retryHandler.execute(fn);

            await vi.runAllTimersAsync();

            const result = await promise;

            expect(result).toBe('success');
            expect(fn).toHaveBeenCalledTimes(2);
        });

        it('should not retry on validation errors', async () => {
            const error = new Error('Invalid input');
            error.name = 'ValidationException';

            const fn = vi.fn().mockRejectedValue(error);

            await expect(retryHandler.execute(fn)).rejects.toThrow('Invalid input');
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('should throw error after max retries exhausted', async () => {
            const error = new Error('Throttled');
            error.name = 'ThrottlingException';

            const fn = vi.fn().mockRejectedValue(error);

            const executePromise = retryHandler.execute(fn);

            // Run all timers and wait for promise to settle
            const [result] = await Promise.allSettled([
                executePromise,
                vi.runAllTimersAsync(),
            ]);

            expect(result.status).toBe('rejected');
            if (result.status === 'rejected') {
                expect(result.reason.message).toBe('Throttled');
            }
            expect(fn).toHaveBeenCalledTimes(4); // Initial + 3 retries
        });

        it('should log retry attempts', async () => {
            const error = new Error('Throttled');
            error.name = 'ThrottlingException';

            const fn = vi.fn().mockRejectedValueOnce(error).mockResolvedValue('success');

            const promise = retryHandler.execute(fn);

            await vi.runAllTimersAsync();

            await promise;

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('BEDROCK_RETRY')
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('attemptNumber')
            );
        });
    });

    describe('isRetryableError', () => {
        it('should return true for ThrottlingException', () => {
            const error = new Error('Rate exceeded');
            error.name = 'ThrottlingException';

            expect(retryHandler.isRetryableError(error)).toBe(true);
        });

        it('should return true for TimeoutError', () => {
            const error = new Error('Request timeout');
            error.name = 'TimeoutError';

            expect(retryHandler.isRetryableError(error)).toBe(true);
        });

        it('should return true for ServiceUnavailableException', () => {
            const error = new Error('Service unavailable');
            error.name = 'ServiceUnavailableException';

            expect(retryHandler.isRetryableError(error)).toBe(true);
        });

        it('should return true for errors with "throttl" in message', () => {
            const error = new Error('Request was throttled');

            expect(retryHandler.isRetryableError(error)).toBe(true);
        });

        it('should return true for errors with "timeout" in message', () => {
            const error = new Error('Connection timeout occurred');

            expect(retryHandler.isRetryableError(error)).toBe(true);
        });

        it('should return true for errors with "service unavailable" in message', () => {
            const error = new Error('The service unavailable at this time');

            expect(retryHandler.isRetryableError(error)).toBe(true);
        });

        it('should return false for ValidationException', () => {
            const error = new Error('Invalid input');
            error.name = 'ValidationException';

            expect(retryHandler.isRetryableError(error)).toBe(false);
        });

        it('should return false for non-Error objects', () => {
            expect(retryHandler.isRetryableError('string error')).toBe(false);
            expect(retryHandler.isRetryableError(null)).toBe(false);
            expect(retryHandler.isRetryableError(undefined)).toBe(false);
        });
    });

    describe('calculateDelay', () => {
        it('should calculate exponential backoff for attempt 0', () => {
            const delay = retryHandler.calculateDelay(0);

            // 2^0 * 1000 + jitter (0-1000) = 1000-2000
            expect(delay).toBeGreaterThanOrEqual(1000);
            expect(delay).toBeLessThan(2000);
        });

        it('should calculate exponential backoff for attempt 1', () => {
            const delay = retryHandler.calculateDelay(1);

            // 2^1 * 1000 + jitter (0-1000) = 2000-3000
            expect(delay).toBeGreaterThanOrEqual(2000);
            expect(delay).toBeLessThan(3000);
        });

        it('should calculate exponential backoff for attempt 2', () => {
            const delay = retryHandler.calculateDelay(2);

            // 2^2 * 1000 + jitter (0-1000) = 4000-5000
            expect(delay).toBeGreaterThanOrEqual(4000);
            expect(delay).toBeLessThan(5000);
        });

        it('should include jitter in delay calculation', () => {
            const delays = Array.from({ length: 10 }, () => retryHandler.calculateDelay(0));

            // All delays should be different due to jitter
            const uniqueDelays = new Set(delays);
            expect(uniqueDelays.size).toBeGreaterThan(1);
        });
    });

    describe('custom configuration', () => {
        it('should respect custom maxRetries', async () => {
            const customHandler = new RetryHandler(1, 1000);
            const error = new Error('Throttled');
            error.name = 'ThrottlingException';

            const fn = vi.fn().mockRejectedValue(error);

            const executePromise = customHandler.execute(fn);

            // Run all timers and wait for promise to settle
            const [result] = await Promise.allSettled([
                executePromise,
                vi.runAllTimersAsync(),
            ]);

            expect(result.status).toBe('rejected');
            if (result.status === 'rejected') {
                expect(result.reason.message).toBe('Throttled');
            }
            expect(fn).toHaveBeenCalledTimes(2); // Initial + 1 retry
        });

        it('should respect custom baseDelay', () => {
            const customHandler = new RetryHandler(3, 500);
            const delay = customHandler.calculateDelay(0);

            // 2^0 * 500 + jitter (0-1000) = 500-1500
            expect(delay).toBeGreaterThanOrEqual(500);
            expect(delay).toBeLessThan(1500);
        });
    });
});
