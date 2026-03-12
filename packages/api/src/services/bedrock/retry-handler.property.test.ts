/**
 * Property-based tests for RetryHandler
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 10.4, 10.5
 *
 * Note: Using synchronous property tests to avoid asyncProperty issues with fake timers.
 * Tests manually handle promise resolution with vi.runAllTimersAsync().
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { RetryHandler } from './retry-handler';

describe('RetryHandler Property Tests', () => {
    let consoleLogSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.useFakeTimers();
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    describe('Property 7: Throttling Error Retry', () => {
        it('should retry throttling errors up to 3 times with exponential backoff', async () => {
            // Feature: bedrock-nova-pro-integration, Property 7: Throttling Error Retry
            // **Validates: Requirements 4.1**

            await fc.assert(
                fc.asyncProperty(
                    fc.constantFrom('ThrottlingException', 'throttled', 'throttling'),
                    fc.integer({ min: 1, max: 3 }),
                    async (errorIndicator, failureCount) => {
                        vi.clearAllMocks();
                        const retryHandler = new RetryHandler(3, 1000);

                        // Create throttling error
                        const error = new Error('Request throttled');
                        if (errorIndicator === 'ThrottlingException') {
                            error.name = 'ThrottlingException';
                        } else {
                            error.message = `Request was ${errorIndicator}`;
                        }

                        // Mock function that fails failureCount times then succeeds
                        const fn = vi.fn();
                        for (let i = 0; i < failureCount; i++) {
                            fn.mockRejectedValueOnce(error);
                        }
                        fn.mockResolvedValue('success');

                        // Execute with timer advancement
                        const promise = retryHandler.execute(fn);
                        await vi.runAllTimersAsync();
                        const result = await promise;

                        expect(result).toBe('success');
                        expect(fn).toHaveBeenCalledTimes(failureCount + 1);
                    }
                ),
                { numRuns: 15, endOnFailure: true }
            );
        });

        it('should use exponential backoff delays for throttling errors', async () => {
            // Feature: bedrock-nova-pro-integration, Property 7: Throttling Error Retry
            // **Validates: Requirements 4.1**

            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 100, max: 2000 }),
                    async (baseDelay) => {
                        vi.clearAllMocks();
                        consoleLogSpy.mockClear();
                        const retryHandler = new RetryHandler(3, baseDelay);

                        const error = new Error('Throttled');
                        error.name = 'ThrottlingException';

                        const fn = vi.fn().mockRejectedValue(error);

                        const promise = retryHandler.execute(fn).catch(() => { /* Expected to fail */ });
                        await vi.runAllTimersAsync();
                        await promise;

                        // Verify exponential backoff was logged
                        const logs = consoleLogSpy.mock.calls
                            .map((call) => JSON.parse(call[0] as string))
                            .filter((log) => log.type === 'BEDROCK_RETRY');

                        expect(logs.length).toBe(3); // 3 retry attempts

                        // Verify delays increase exponentially
                        for (let i = 0; i < logs.length; i++) {
                            const expectedMin = Math.pow(2, i) * baseDelay;
                            const expectedMax = Math.pow(2, i) * baseDelay + 1000;
                            expect(logs[i].delayMs).toBeGreaterThanOrEqual(expectedMin);
                            expect(logs[i].delayMs).toBeLessThan(expectedMax);
                        }
                    }
                ),
                { numRuns: 10, endOnFailure: true }
            );
        });
    });

    describe('Property 8: Timeout Error Retry', () => {
        it('should retry timeout errors up to maxRetries times', async () => {
            // Feature: bedrock-nova-pro-integration, Property 8: Timeout Error Retry
            // **Validates: Requirements 4.4**

            await fc.assert(
                fc.asyncProperty(
                    fc.constantFrom('TimeoutError', 'timeout', 'timed out'),
                    fc.integer({ min: 1, max: 3 }),
                    fc.integer({ min: 1, max: 5 }),
                    async (errorIndicator, failureCount, maxRetries) => {
                        vi.clearAllMocks();
                        const retryHandler = new RetryHandler(maxRetries, 1000);

                        // Create timeout error
                        const error = new Error('Request timeout');
                        if (errorIndicator === 'TimeoutError') {
                            error.name = 'TimeoutError';
                        } else {
                            error.message = `Connection ${errorIndicator}`;
                        }

                        // Mock function that always fails with the error
                        const fn = vi.fn().mockRejectedValue(error);

                        // Should succeed if failureCount <= maxRetries
                        if (failureCount <= maxRetries) {
                            // Mock to fail failureCount times then succeed
                            fn.mockClear();
                            for (let i = 0; i < failureCount; i++) {
                                fn.mockRejectedValueOnce(error);
                            }
                            fn.mockResolvedValue('success');

                            const promise = retryHandler.execute(fn);
                            await vi.runAllTimersAsync();
                            const result = await promise;
                            expect(result).toBe('success');
                            expect(fn).toHaveBeenCalledTimes(failureCount + 1);
                        } else {
                            // Should fail if failureCount > maxRetries
                            // Function will always fail, so it should be called maxRetries + 1 times
                            const promise = retryHandler.execute(fn);
                            await vi.runAllTimersAsync();
                            await expect(promise).rejects.toThrow();
                            expect(fn).toHaveBeenCalledTimes(maxRetries + 1);
                        }
                    }
                ),
                { numRuns: 15, endOnFailure: true }
            );
        });
    });

    describe('Property 9: Non-Retryable Error Propagation', () => {
        it('should immediately throw non-retryable errors without retry', async () => {
            // Feature: bedrock-nova-pro-integration, Property 9: Non-Retryable Error Propagation
            // **Validates: Requirements 4.2, 4.3**

            await fc.assert(
                fc.asyncProperty(
                    fc.constantFrom(
                        'ValidationException',
                        'ModelNotFoundException',
                        'AccessDeniedException',
                        'InvalidRequestException'
                    ),
                    fc.string({ minLength: 5, maxLength: 50 }),
                    async (errorName, errorMessage) => {
                        vi.clearAllMocks();
                        const retryHandler = new RetryHandler(3, 1000);

                        const error = new Error(errorMessage);
                        error.name = errorName;

                        const fn = vi.fn().mockRejectedValue(error);

                        // Error should be thrown immediately without retries
                        await expect(retryHandler.execute(fn)).rejects.toThrow(errorMessage);
                        expect(fn).toHaveBeenCalledTimes(1);
                    }
                ),
                { numRuns: 15, endOnFailure: true }
            );
        });

        it('should not retry non-Error objects', async () => {
            // Feature: bedrock-nova-pro-integration, Property 9: Non-Retryable Error Propagation
            // **Validates: Requirements 4.2, 4.3**

            await fc.assert(
                fc.asyncProperty(
                    fc.oneof(
                        fc.string(),
                        fc.integer(),
                        fc.constant(null)
                    ),
                    async (nonError) => {
                        vi.clearAllMocks();
                        const retryHandler = new RetryHandler(3, 1000);

                        const fn = vi.fn().mockRejectedValue(nonError);

                        // Should throw immediately without retries
                        await expect(retryHandler.execute(fn)).rejects.toBe(nonError);
                        expect(fn).toHaveBeenCalledTimes(1);
                    }
                ),
                { numRuns: 10, endOnFailure: true }
            );
        });
    });

    describe('Property 10: Retry Exhaustion Error', () => {
        it('should throw the original error after all retries are exhausted', async () => {
            // Feature: bedrock-nova-pro-integration, Property 10: Retry Exhaustion Error
            // **Validates: Requirements 4.5**

            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 1, max: 5 }),
                    fc.integer({ min: 100, max: 2000 }),
                    fc.constantFrom('ThrottlingException', 'TimeoutError', 'ServiceUnavailableException'),
                    fc.string({ minLength: 10, maxLength: 100 }),
                    async (maxRetries, baseDelay, errorName, errorMessage) => {
                        vi.clearAllMocks();
                        const retryHandler = new RetryHandler(maxRetries, baseDelay);

                        const error = new Error(errorMessage);
                        error.name = errorName;

                        const fn = vi.fn().mockRejectedValue(error);

                        const promise = retryHandler.execute(fn);
                        await vi.runAllTimersAsync();

                        // Should fail after exhausting retries
                        await expect(promise).rejects.toThrow(errorMessage);

                        // Should have attempted initial call + maxRetries
                        expect(fn).toHaveBeenCalledTimes(maxRetries + 1);
                    }
                ),
                { numRuns: 15, endOnFailure: true }
            );
        });
    });

    describe('Property 18: Retry Attempt Logging', () => {
        it('should log structured JSON for each retry attempt', async () => {
            // Feature: bedrock-nova-pro-integration, Property 18: Retry Attempt Logging
            // **Validates: Requirements 10.4, 10.5**

            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 1, max: 4 }),
                    fc.integer({ min: 100, max: 2000 }),
                    fc.constantFrom('ThrottlingException', 'TimeoutError'),
                    async (retryCount, baseDelay, errorName) => {
                        vi.clearAllMocks();
                        consoleLogSpy.mockClear();
                        const retryHandler = new RetryHandler(retryCount, baseDelay);

                        const error = new Error('Test error');
                        error.name = errorName;

                        const fn = vi.fn();
                        for (let i = 0; i < retryCount; i++) {
                            fn.mockRejectedValueOnce(error);
                        }
                        fn.mockResolvedValue('success');

                        const promise = retryHandler.execute(fn).catch(() => { /* May succeed or fail */ });
                        await vi.runAllTimersAsync();
                        await promise;

                        // Parse all log entries
                        const logs = consoleLogSpy.mock.calls
                            .map((call) => JSON.parse(call[0] as string))
                            .filter((log) => log.type === 'BEDROCK_RETRY');

                        // Should have logged each retry attempt
                        expect(logs.length).toBe(retryCount);

                        // Verify each log entry has required fields
                        logs.forEach((log, index) => {
                            expect(log).toHaveProperty('type', 'BEDROCK_RETRY');
                            expect(log).toHaveProperty('timestamp');
                            expect(log).toHaveProperty('attemptNumber', index + 1);
                            expect(log).toHaveProperty('maxRetries', retryCount);
                            expect(log).toHaveProperty('delayMs');
                            expect(log).toHaveProperty('errorName', errorName);
                            expect(log).toHaveProperty('errorMessage', 'Test error');

                            // Verify timestamp is valid ISO string
                            expect(() => new Date(log.timestamp)).not.toThrow();

                            // Verify delay is within expected range
                            const expectedMin = Math.pow(2, index) * baseDelay;
                            const expectedMax = Math.pow(2, index) * baseDelay + 1000;
                            expect(log.delayMs).toBeGreaterThanOrEqual(expectedMin);
                            expect(log.delayMs).toBeLessThan(expectedMax);
                        });
                    }
                ),
                { numRuns: 15, endOnFailure: true }
            );
        });

        it('should log attempt numbers sequentially', async () => {
            // Feature: bedrock-nova-pro-integration, Property 18: Retry Attempt Logging
            // **Validates: Requirements 10.4, 10.5**

            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 2, max: 5 }),
                    async (maxRetries) => {
                        vi.clearAllMocks();
                        consoleLogSpy.mockClear();
                        const retryHandler = new RetryHandler(maxRetries, 1000);

                        const error = new Error('Throttled');
                        error.name = 'ThrottlingException';

                        const fn = vi.fn().mockRejectedValue(error);

                        const promise = retryHandler.execute(fn).catch(() => { /* Expected to fail */ });
                        await vi.runAllTimersAsync();
                        await promise;

                        const logs = consoleLogSpy.mock.calls
                            .map((call) => JSON.parse(call[0] as string))
                            .filter((log) => log.type === 'BEDROCK_RETRY');

                        // Verify attempt numbers are sequential
                        const attemptNumbers = logs.map((log) => log.attemptNumber);
                        expect(attemptNumbers).toEqual(
                            Array.from({ length: maxRetries }, (_, i) => i + 1)
                        );
                    }
                ),
                { numRuns: 10, endOnFailure: true }
            );
        });
    });
});
