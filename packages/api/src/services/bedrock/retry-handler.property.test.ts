/**
 * Property-based tests for RetryHandler
 *
<<<<<<< HEAD
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 10.4, 10.5
 *
 * Note: Using synchronous property tests to avoid asyncProperty issues with fake timers.
 * Tests manually handle promise resolution with vi.runAllTimersAsync().
=======
 * These tests verify universal properties of the RetryHandler across all inputs.
 * Following the implementation guide, we use numRuns: 10-20 and endOnFailure: true.
 *
 * Requirements: 9.3, 9.5
>>>>>>> 0ae9e5a (feat: AWS Bedrock (Nova Pro) integration)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { RetryHandler } from './retry-handler';
<<<<<<< HEAD

describe('RetryHandler Property Tests', () => {
=======
import { BedrockValidationError, BedrockModelNotFoundError } from './errors';

describe('RetryHandler - Property-Based Tests', () => {
>>>>>>> 0ae9e5a (feat: AWS Bedrock (Nova Pro) integration)
    let consoleLogSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.useFakeTimers();
    });

<<<<<<< HEAD
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
=======
    afterEach(async () => {
        // Clear all pending timers to prevent async leaks
        vi.clearAllTimers();
        vi.restoreAllMocks();
        vi.useRealTimers();
        // Flush any pending microtasks
        await new Promise(resolve => setImmediate(resolve));
    });

    describe('Property 7: Throttling Error Retry', () => {
        /**
         * **Validates: Requirements 4.1**
         *
         * For any ThrottlingException error from the Bedrock API,
         * the RetryHandler should retry the operation up to 3 times
         * with exponential backoff delays.
         */
        it('should retry ThrottlingException up to maxRetries times with exponential backoff', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 100 }),
                    fc.integer({ min: 1, max: 5 }),
                    fc.integer({ min: 100, max: 2000 }),
                    async (errorMessage, maxRetries, baseDelay) => {
                        const retryHandler = new RetryHandler(maxRetries, baseDelay);
                        const error = new Error(errorMessage);
                        error.name = 'ThrottlingException';

                        const mockFn = vi.fn().mockRejectedValue(error);

                        const executePromise = retryHandler.execute(mockFn).catch(e => e);

                        // Advance timers for all retry attempts
                        for (let i = 0; i < maxRetries; i++) {
                            await vi.runAllTimersAsync();
                        }

                        // Should throw after all retries exhausted
                        const result = await executePromise;
                        expect(result).toBeInstanceOf(Error);
                        expect((result as Error).message).toBe(errorMessage);

                        // Should be called initial attempt + maxRetries
                        expect(mockFn).toHaveBeenCalledTimes(maxRetries + 1);
                    }
                ),
                { numRuns: 10, endOnFailure: true }
            );
        });

        it('should use exponential backoff delays for ThrottlingException', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 100, max: 1000 }),
                    async (baseDelay) => {
                        consoleLogSpy.mockClear();
                        const retryHandler = new RetryHandler(3, baseDelay);
                        const error = new Error('Throttled');
                        error.name = 'ThrottlingException';

                        const mockFn = vi.fn().mockRejectedValue(error);

                        const executePromise = retryHandler.execute(mockFn).catch(e => e);

                        // Advance all timers and wait for completion
                        for (let attempt = 0; attempt < 3; attempt++) {
                            await vi.runAllTimersAsync();
                        }

                        const result = await executePromise;
                        expect(result).toBeInstanceOf(Error);

                        // Now verify logs after all retries are complete
                        expect(consoleLogSpy).toHaveBeenCalledTimes(3);

                        for (let attempt = 0; attempt < 3; attempt++) {
                            const logEntry = JSON.parse(consoleLogSpy.mock.calls[attempt][0] as string);
                            const expectedMinDelay = Math.pow(2, attempt) * baseDelay;
                            expect(logEntry.delay).toBeGreaterThanOrEqual(expectedMinDelay);
                            expect(logEntry.delay).toBeLessThan(expectedMinDelay + 1000);
>>>>>>> 0ae9e5a (feat: AWS Bedrock (Nova Pro) integration)
                        }
                    }
                ),
                { numRuns: 10, endOnFailure: true }
            );
        });
    });

    describe('Property 8: Timeout Error Retry', () => {
<<<<<<< HEAD
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
=======
        /**
         * **Validates: Requirements 4.4**
         *
         * For any TimeoutError from the Bedrock API,
         * the RetryHandler should retry the operation up to 2 times
         * with exponential backoff delays.
         */
        it('should retry TimeoutError up to maxRetries times', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 100 }),
                    fc.integer({ min: 1, max: 5 }),
                    fc.integer({ min: 100, max: 2000 }),
                    async (errorMessage, maxRetries, baseDelay) => {
                        const retryHandler = new RetryHandler(maxRetries, baseDelay);
                        const error = new Error(errorMessage);
                        error.name = 'TimeoutError';

                        const mockFn = vi.fn().mockRejectedValue(error);

                        const executePromise = retryHandler.execute(mockFn).catch(e => e);

                        // Advance timers for all retry attempts
                        for (let i = 0; i < maxRetries; i++) {
                            await vi.runAllTimersAsync();
                        }

                        // Should throw after all retries exhausted
                        const result = await executePromise;
                        expect(result).toBeInstanceOf(Error);
                        expect((result as Error).message).toBe(errorMessage);

                        // Should be called initial attempt + maxRetries
                        expect(mockFn).toHaveBeenCalledTimes(maxRetries + 1);
                    }
                ),
                { numRuns: 10, endOnFailure: true }
            );
        });

        it('should retry errors with timeout keyword in message', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 0, maxLength: 50 }),
                    fc.string({ minLength: 0, maxLength: 50 }),
                    fc.integer({ min: 1, max: 3 }),
                    async (prefix, suffix, maxRetries) => {
                        const retryHandler = new RetryHandler(maxRetries, 500);
                        const errorMessage = `${prefix}timeout${suffix}`;
                        const error = new Error(errorMessage);

                        const mockFn = vi.fn().mockRejectedValue(error);

                        const executePromise = retryHandler.execute(mockFn).catch(e => e);

                        for (let i = 0; i < maxRetries; i++) {
                            await vi.runAllTimersAsync();
                        }

                        const result = await executePromise;
                        expect(result).toBeInstanceOf(Error);

                        // Should retry because message contains 'timeout'
                        expect(mockFn).toHaveBeenCalledTimes(maxRetries + 1);
                    }
                ),
                { numRuns: 10, endOnFailure: true }
>>>>>>> 0ae9e5a (feat: AWS Bedrock (Nova Pro) integration)
            );
        });
    });

    describe('Property 9: Non-Retryable Error Propagation', () => {
<<<<<<< HEAD
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
=======
        /**
         * **Validates: Requirements 4.2, 4.3**
         *
         * For any validation error or model not found error from the Bedrock API,
         * the error should be thrown immediately without retry attempts.
         */
        it('should throw BedrockValidationError immediately without retry', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 100 }),
                    fc.integer({ min: 1, max: 5 }),
                    async (errorMessage, maxRetries) => {
                        const retryHandler = new RetryHandler(maxRetries, 1000);
                        const error = new BedrockValidationError(errorMessage);

                        const mockFn = vi.fn().mockRejectedValue(error);

                        await expect(retryHandler.execute(mockFn)).rejects.toThrow(errorMessage);

                        // Should be called only once (no retries)
                        expect(mockFn).toHaveBeenCalledTimes(1);

                        // Should not log any retry attempts
                        expect(consoleLogSpy).not.toHaveBeenCalled();
                    }
                ),
                { numRuns: 10, endOnFailure: true }
            );
        });

        it('should throw BedrockModelNotFoundError immediately without retry', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 100 }),
                    fc.integer({ min: 1, max: 5 }),
                    async (errorMessage, maxRetries) => {
                        const retryHandler = new RetryHandler(maxRetries, 1000);
                        const error = new BedrockModelNotFoundError(errorMessage);

                        const mockFn = vi.fn().mockRejectedValue(error);

                        await expect(retryHandler.execute(mockFn)).rejects.toThrow(errorMessage);

                        // Should be called only once (no retries)
                        expect(mockFn).toHaveBeenCalledTimes(1);

                        // Should not log any retry attempts
                        expect(consoleLogSpy).not.toHaveBeenCalled();
                    }
                ),
                { numRuns: 10, endOnFailure: true }
            );
        });

        it('should throw generic non-retryable errors immediately', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc
                        .string({ minLength: 1, maxLength: 50 })
                        .filter(
                            (name) =>
                                name !== 'ThrottlingException' &&
                                name !== 'TimeoutError' &&
                                name !== 'ServiceUnavailableException'
                        ),
                    fc
                        .string({ minLength: 1, maxLength: 100 })
                        .filter(
                            (msg) =>
                                !msg.toLowerCase().includes('throttl') &&
                                !msg.toLowerCase().includes('timeout') &&
                                !msg.toLowerCase().includes('service unavailable')
                        ),
                    fc.integer({ min: 1, max: 5 }),
                    async (errorName, errorMessage, maxRetries) => {
                        const retryHandler = new RetryHandler(maxRetries, 1000);
                        const error = new Error(errorMessage);
                        error.name = errorName;

                        const mockFn = vi.fn().mockRejectedValue(error);

                        await expect(retryHandler.execute(mockFn)).rejects.toThrow(errorMessage);

                        // Should be called only once (no retries)
                        expect(mockFn).toHaveBeenCalledTimes(1);

                        // Should not log any retry attempts
                        expect(consoleLogSpy).not.toHaveBeenCalled();
>>>>>>> 0ae9e5a (feat: AWS Bedrock (Nova Pro) integration)
                    }
                ),
                { numRuns: 10, endOnFailure: true }
            );
        });
    });

    describe('Property 10: Retry Exhaustion Error', () => {
<<<<<<< HEAD
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
=======
        /**
         * **Validates: Requirements 4.5**
         *
         * For any retryable error that persists after all retry attempts,
         * the final error thrown should include the original error cause
         * and indicate retry exhaustion.
         */
        it('should throw the original error after all retries are exhausted', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.constantFrom('ThrottlingException', 'TimeoutError', 'ServiceUnavailableException'),
                    fc.string({ minLength: 1, maxLength: 100 }),
                    fc.integer({ min: 1, max: 5 }),
                    fc.integer({ min: 100, max: 1000 }),
                    async (errorName, errorMessage, maxRetries, baseDelay) => {
                        const retryHandler = new RetryHandler(maxRetries, baseDelay);
                        const error = new Error(errorMessage);
                        error.name = errorName;

                        const mockFn = vi.fn().mockRejectedValue(error);

                        const executePromise = retryHandler.execute(mockFn).catch(e => e);

                        // Advance timers for all retry attempts
                        for (let i = 0; i < maxRetries; i++) {
                            await vi.runAllTimersAsync();
                        }

                        // Should throw the original error
                        const result = await executePromise;
                        expect(result).toBeInstanceOf(Error);
                        expect((result as Error).name).toBe(errorName);
                        expect((result as Error).message).toBe(errorMessage);
                    }
                ),
                { numRuns: 10, endOnFailure: true }
            );
        });

        it('should preserve error properties after retry exhaustion', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 100 }),
                    fc.integer({ min: 1, max: 3 }),
                    async (errorMessage, maxRetries) => {
                        const retryHandler = new RetryHandler(maxRetries, 500);
                        const error = new Error(errorMessage);
                        error.name = 'ThrottlingException';
                        // Add custom property
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (error as any).customProperty = 'test-value';

                        const mockFn = vi.fn().mockRejectedValue(error);

                        const executePromise = retryHandler.execute(mockFn).catch(e => e);

                        for (let i = 0; i < maxRetries; i++) {
                            await vi.runAllTimersAsync();
                        }

                        const result = await executePromise;
                        expect(result).toBeInstanceOf(Error);
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        expect((result as any).customProperty).toBe('test-value');
>>>>>>> 0ae9e5a (feat: AWS Bedrock (Nova Pro) integration)
                    }
                ),
                { numRuns: 10, endOnFailure: true }
            );
        });
    });
<<<<<<< HEAD
=======

    describe('Property 18: Retry Attempt Logging', () => {
        /**
         * **Validates: Requirements 10.4, 10.5**
         *
         * For any retry attempt by the RetryHandler,
         * a structured JSON log entry should be emitted containing
         * the attempt number and delay duration.
         */
        it('should log structured JSON for each retry attempt', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.constantFrom('ThrottlingException', 'TimeoutError'),
                    fc.string({ minLength: 1, maxLength: 100 }),
                    fc.integer({ min: 1, max: 4 }),
                    fc.integer({ min: 100, max: 1000 }),
                    async (errorName, errorMessage, maxRetries, baseDelay) => {
                        consoleLogSpy.mockClear();
                        const retryHandler = new RetryHandler(maxRetries, baseDelay);
                        const error = new Error(errorMessage);
                        error.name = errorName;

                        const mockFn = vi.fn().mockRejectedValue(error);

                        const executePromise = retryHandler.execute(mockFn).catch(e => e);

                        // Advance timers for all retry attempts
                        for (let i = 0; i < maxRetries; i++) {
                            await vi.runAllTimersAsync();
                        }

                        const result = await executePromise;
                        expect(result).toBeInstanceOf(Error);

                        // Should log exactly maxRetries times (not for the final failure)
                        expect(consoleLogSpy).toHaveBeenCalledTimes(maxRetries);

                        // Verify each log entry structure
                        for (let i = 0; i < maxRetries; i++) {
                            const logCall = consoleLogSpy.mock.calls[i][0];
                            const logEntry = JSON.parse(logCall as string);

                            // Verify required fields
                            expect(logEntry.type).toBe('BEDROCK_RETRY');
                            expect(logEntry.attemptNumber).toBe(i + 1);
                            expect(logEntry.maxRetries).toBe(maxRetries);
                            expect(logEntry.delay).toBeGreaterThan(0);
                            expect(logEntry.errorType).toBe(errorName);
                            expect(logEntry.errorMessage).toBe(errorMessage);
                            expect(logEntry.timestamp).toBeDefined();
                            expect(new Date(logEntry.timestamp).getTime()).toBeGreaterThan(0);
                        }
                    }
                ),
                { numRuns: 10, endOnFailure: true }
            );
        });

        it('should include delay information in retry logs', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 100, max: 2000 }),
                    fc.integer({ min: 1, max: 3 }),
                    async (baseDelay, maxRetries) => {
                        consoleLogSpy.mockClear();
                        const retryHandler = new RetryHandler(maxRetries, baseDelay);
                        const error = new Error('Test error');
                        error.name = 'ThrottlingException';

                        const mockFn = vi.fn().mockRejectedValue(error);

                        const executePromise = retryHandler.execute(mockFn).catch(e => e);

                        for (let i = 0; i < maxRetries; i++) {
                            await vi.runAllTimersAsync();
                        }

                        const result = await executePromise;
                        expect(result).toBeInstanceOf(Error);

                        // Verify delay increases exponentially
                        for (let i = 0; i < maxRetries; i++) {
                            const logEntry = JSON.parse(consoleLogSpy.mock.calls[i][0] as string);
                            const expectedMinDelay = Math.pow(2, i) * baseDelay;
                            const expectedMaxDelay = expectedMinDelay + 1000;

                            expect(logEntry.delay).toBeGreaterThanOrEqual(expectedMinDelay);
                            expect(logEntry.delay).toBeLessThan(expectedMaxDelay);
                        }
                    }
                ),
                { numRuns: 10, endOnFailure: true }
            );
        });

        it('should not log when error is non-retryable', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 100 }),
                    fc.integer({ min: 1, max: 5 }),
                    async (errorMessage, maxRetries) => {
                        consoleLogSpy.mockClear();
                        const retryHandler = new RetryHandler(maxRetries, 1000);
                        const error = new BedrockValidationError(errorMessage);

                        const mockFn = vi.fn().mockRejectedValue(error);

                        await expect(retryHandler.execute(mockFn)).rejects.toThrow();

                        // Should not log any retry attempts for non-retryable errors
                        expect(consoleLogSpy).not.toHaveBeenCalled();
                    }
                ),
                { numRuns: 10, endOnFailure: true }
            );
        });
    });

    describe('Additional Properties: Exponential Backoff Calculation', () => {
        it('should calculate exponential backoff with jitter for any attempt and baseDelay', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 100, max: 5000 }),
                    fc.integer({ min: 0, max: 10 }),
                    (baseDelay, attempt) => {
                        const retryHandler = new RetryHandler(10, baseDelay);
                        const delay = retryHandler.calculateDelay(attempt);
                        const minDelay = Math.pow(2, attempt) * baseDelay;
                        expect(delay).toBeGreaterThanOrEqual(minDelay);
                        const maxDelay = minDelay + 1000;
                        expect(delay).toBeLessThan(maxDelay);
                    }
                ),
                { numRuns: 15, endOnFailure: true }
            );
        });

        it('should include random jitter that varies between calls', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 100, max: 2000 }),
                    fc.integer({ min: 0, max: 5 }),
                    (baseDelay, attempt) => {
                        const retryHandler = new RetryHandler(5, baseDelay);
                        const delays = Array.from({ length: 10 }, () =>
                            retryHandler.calculateDelay(attempt)
                        );
                        const uniqueDelays = new Set(delays);
                        expect(uniqueDelays.size).toBeGreaterThan(1);
                    }
                ),
                { numRuns: 15, endOnFailure: true }
            );
        });
    });

    describe('Additional Properties: Retryable Error Detection', () => {
        it('should identify errors with retryable keywords in message as retryable', () => {
            fc.assert(
                fc.property(
                    fc.constantFrom('throttl', 'timeout', 'service unavailable'),
                    fc.string({ minLength: 0, maxLength: 50 }),
                    fc.string({ minLength: 0, maxLength: 50 }),
                    (keyword, prefix, suffix) => {
                        const retryHandler = new RetryHandler(3, 1000);
                        const errorMessage = `${prefix}${keyword}${suffix}`;
                        const error = new Error(errorMessage);
                        expect(retryHandler.isRetryableError(error)).toBe(true);
                    }
                ),
                { numRuns: 15, endOnFailure: true }
            );
        });

        it('should return false for non-Error objects', () => {
            fc.assert(
                fc.property(
                    fc.oneof(
                        fc.string(),
                        fc.integer(),
                        fc.constant(null),
                        fc.constant(undefined),
                        fc.object(),
                        fc.array(fc.anything())
                    ),
                    (nonError) => {
                        const retryHandler = new RetryHandler(3, 1000);
                        expect(retryHandler.isRetryableError(nonError)).toBe(false);
                    }
                ),
                { numRuns: 15, endOnFailure: true }
            );
        });
    });
>>>>>>> 0ae9e5a (feat: AWS Bedrock (Nova Pro) integration)
});
