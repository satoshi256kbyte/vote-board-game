/**
 * Property-based tests for BedrockService
 *
 * Requirements: 9.2, 9.3, 9.4, 9.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { BedrockService } from './bedrock-service.js';
import { BedrockClient } from './bedrock-client.js';
import { RetryHandler } from './retry-handler.js';
import { TokenCounter } from './token-counter.js';
import { BedrockValidationError } from './errors.js';
import type { BedrockConfig } from './config.js';

describe('BedrockService Property Tests', () => {
    let config: BedrockConfig;

    beforeEach(() => {
        config = {
            modelId: 'amazon.nova-pro-v1:0',
            region: 'ap-northeast-1',
            maxTokens: 2048,
            temperature: 0.7,
            topP: 0.9,
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    /**
     * Property 3: Parameter Override Precedence
     * Validates: Requirements 2.5
     */
    it('Property 3: should override default parameters with custom values', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.double({ min: 0, max: 1 }), // temperature
                fc.integer({ min: 1, max: 4096 }), // maxTokens
                async (temperature, maxTokens) => {
                    const mockClient = {
                        converse: vi.fn(),
                        converseStream: vi.fn(),
                    } as unknown as BedrockClient;

                    const mockRetryHandler = {
                        execute: vi.fn((fn) => fn()),
                    } as unknown as RetryHandler;

                    const mockTokenCounter = {
                        recordUsage: vi.fn(),
                    } as unknown as TokenCounter;

                    const service = new BedrockService(mockClient, mockRetryHandler, mockTokenCounter, config);

                    const mockResponse = {
                        output: {
                            message: {
                                content: [{ text: 'Response' }],
                            },
                        },
                        usage: {
                            inputTokens: 5,
                            outputTokens: 10,
                        },
                        $metadata: {
                            requestId: 'test-id',
                        },
                    };

                    vi.mocked(mockClient.converse).mockResolvedValue(mockResponse as any) // eslint-disable-line @typescript-eslint/no-explicit-any

                    await service.generateText({
                        prompt: 'Test prompt',
                        temperature,
                        maxTokens,
                    });

                    const call = vi.mocked(mockClient.converse).mock.calls[0];
                    expect(call[0].inferenceConfig?.temperature).toBe(temperature);
                    expect(call[0].inferenceConfig?.maxTokens).toBe(maxTokens);
                }
            ),
            { numRuns: 10, endOnFailure: true }
        );
    });

    /**
     * Property 4: Empty Prompt Rejection
     * Validates: Requirements 3.4
     */
    it('Property 4: should reject empty or whitespace-only prompts', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.oneof(
                    fc.constant(''),
                    fc.constant('   '),
                    fc.constant('\t'),
                    fc.constant('\n'),
                    fc.constant('  \t\n  ')
                ),
                async (emptyPrompt) => {
                    const mockClient = {
                        converse: vi.fn(),
                        converseStream: vi.fn(),
                    } as unknown as BedrockClient;

                    const mockRetryHandler = {
                        execute: vi.fn((fn) => fn()),
                    } as unknown as RetryHandler;

                    const mockTokenCounter = {
                        recordUsage: vi.fn(),
                    } as unknown as TokenCounter;

                    const service = new BedrockService(mockClient, mockRetryHandler, mockTokenCounter, config);

                    await expect(service.generateText({ prompt: emptyPrompt })).rejects.toThrow(
                        BedrockValidationError
                    );
                    await expect(service.generateText({ prompt: emptyPrompt })).rejects.toThrow(
                        'Prompt cannot be empty'
                    );

                    // API呼び出しが行われていないことを確認
                    expect(mockClient.converse).not.toHaveBeenCalled();
                }
            ),
            { numRuns: 10, endOnFailure: true }
        );
    });

    /**
     * Property 5: API Request Structure
     * Validates: Requirements 3.1, 3.2, 3.3
     */
    it('Property 5: should structure API requests correctly', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.string({ minLength: 1, maxLength: 1000 }), // prompt
                fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }), // systemPrompt
                async (prompt, systemPrompt) => {
                    const mockClient = {
                        converse: vi.fn(),
                        converseStream: vi.fn(),
                    } as unknown as BedrockClient;

                    const mockRetryHandler = {
                        execute: vi.fn((fn) => fn()),
                    } as unknown as RetryHandler;

                    const mockTokenCounter = {
                        recordUsage: vi.fn(),
                    } as unknown as TokenCounter;

                    const service = new BedrockService(mockClient, mockRetryHandler, mockTokenCounter, config);

                    const mockResponse = {
                        output: {
                            message: {
                                content: [{ text: 'Response' }],
                            },
                        },
                        usage: {
                            inputTokens: 5,
                            outputTokens: 10,
                        },
                        $metadata: {
                            requestId: 'test-id',
                        },
                    };

                    vi.mocked(mockClient.converse).mockResolvedValue(mockResponse as any) // eslint-disable-line @typescript-eslint/no-explicit-any

                    await service.generateText({ prompt, systemPrompt });

                    const call = vi.mocked(mockClient.converse).mock.calls[0];

                    // メッセージ配列が正しく構造化されていることを確認
                    expect(call[0].messages).toHaveLength(1);
                    expect(call[0].messages[0].role).toBe('user');
                    expect(call[0].messages[0].content).toHaveLength(1);
                    expect(call[0].messages[0].content[0].text).toBe(prompt);

                    // システムプロンプトが正しく設定されていることを確認
                    if (systemPrompt) {
                        expect(call[0].system).toBeDefined();
                        expect(call[0].system).toHaveLength(1);
                        expect(call[0].system![0].text).toBe(systemPrompt);
                    } else {
                        expect(call[0].system).toBeUndefined();
                    }
                }
            ),
            { numRuns: 10, endOnFailure: true }
        );
    });

    /**
     * Property 6: Response Text Extraction
     * Validates: Requirements 3.6
     */
    it('Property 6: should extract text from response correctly', async () => {
        await fc.assert(
            fc.asyncProperty(fc.string({ minLength: 0, maxLength: 1000 }), async (responseText) => {
                const mockClient = {
                    converse: vi.fn(),
                    converseStream: vi.fn(),
                } as unknown as BedrockClient;

                const mockRetryHandler = {
                    execute: vi.fn((fn) => fn()),
                } as unknown as RetryHandler;

                const mockTokenCounter = {
                    recordUsage: vi.fn(),
                } as unknown as TokenCounter;

                const service = new BedrockService(mockClient, mockRetryHandler, mockTokenCounter, config);

                const mockResponse = {
                    output: {
                        message: {
                            content: [{ text: responseText }],
                        },
                    },
                    usage: {
                        inputTokens: 5,
                        outputTokens: 10,
                    },
                    $metadata: {
                        requestId: 'test-id',
                    },
                };

                vi.mocked(mockClient.converse).mockResolvedValue(mockResponse as any) // eslint-disable-line @typescript-eslint/no-explicit-any

                const result = await service.generateText({ prompt: 'Test' });

                expect(result.text).toBe(responseText);
            }),
            { numRuns: 10, endOnFailure: true }
        );
    });

    /**
     * Property 11: Error Logging Structure
     * Validates: Requirements 4.6, 10.3, 10.5
     */
    it('Property 11: should log errors with correct structure', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.constantFrom('ThrottlingException', 'ValidationException', 'TimeoutError'),
                fc.string({ minLength: 1, maxLength: 100 }),
                async (errorName, errorMessage) => {
                    const mockClient = {
                        converse: vi.fn(),
                        converseStream: vi.fn(),
                    } as unknown as BedrockClient;

                    const mockRetryHandler = {
                        execute: vi.fn(),
                    } as unknown as RetryHandler;

                    const mockTokenCounter = {
                        recordUsage: vi.fn(),
                    } as unknown as TokenCounter;

                    const service = new BedrockService(mockClient, mockRetryHandler, mockTokenCounter, config);

                    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

                    const error = new Error(errorMessage);
                    error.name = errorName;

                    vi.mocked(mockRetryHandler.execute).mockRejectedValue(error);

                    await expect(service.generateText({ prompt: 'Test' })).rejects.toThrow();

                    const logs = consoleLogSpy.mock.calls.map((call) => JSON.parse(call[0] as string));
                    const errorLog = logs.find((log) => log.type === 'BEDROCK_ERROR');

                    expect(errorLog).toBeDefined();
                    expect(errorLog?.timestamp).toBeDefined();
                    expect(errorLog?.requestId).toBeDefined();
                    expect(errorLog?.errorType).toBe(errorName);
                    expect(errorLog?.errorMessage).toBe(errorMessage);

                    consoleLogSpy.mockRestore();
                }
            ),
            { numRuns: 10, endOnFailure: true }
        );
    });

    /**
     * Property 14: Streaming Chunk Aggregation
     * Validates: Requirements 8.2, 8.3, 8.4
     */
    it('Property 14: should aggregate streaming chunks in order', async () => {
        await fc.assert(
            fc.asyncProperty(fc.array(fc.string({ minLength: 1, maxLength: 50 })), async (chunks) => {
                const mockClient = {
                    converse: vi.fn(),
                    converseStream: vi.fn(),
                } as unknown as BedrockClient;

                const mockRetryHandler = {
                    execute: vi.fn((fn) => fn()),
                } as unknown as RetryHandler;

                const mockTokenCounter = {
                    recordUsage: vi.fn(),
                } as unknown as TokenCounter;

                const service = new BedrockService(mockClient, mockRetryHandler, mockTokenCounter, config);

                const mockStream = (async function* () {
                    for (const chunk of chunks) {
                        yield {
                            contentBlockDelta: {
                                delta: { text: chunk },
                            },
                        };
                    }
                    yield {
                        metadata: {
                            usage: {
                                inputTokens: 5,
                                outputTokens: 10,
                            },
                        },
                    };
                })();

                const mockResponse = {
                    stream: mockStream,
                };

                vi.mocked(mockClient.converseStream).mockResolvedValue(mockResponse as any) // eslint-disable-line @typescript-eslint/no-explicit-any

                const result = await service.generateTextStream({ prompt: 'Test' });

                const expectedText = chunks.join('');
                expect(result.text).toBe(expectedText);
                expect(result.hasError).toBe(false);
            }),
            { numRuns: 10, endOnFailure: true }
        );
    });

    /**
     * Property 15: Streaming Error Handling
     * Validates: Requirements 8.5
     */
    it('Property 15: should handle streaming errors gracefully', async () => {
        await fc.assert(
            fc.asyncProperty(fc.string({ minLength: 1, maxLength: 100 }), async (errorMessage) => {
                const mockClient = {
                    converse: vi.fn(),
                    converseStream: vi.fn(),
                } as unknown as BedrockClient;

                const mockRetryHandler = {
                    execute: vi.fn((fn) => fn()),
                } as unknown as RetryHandler;

                const mockTokenCounter = {
                    recordUsage: vi.fn(),
                } as unknown as TokenCounter;

                const service = new BedrockService(mockClient, mockRetryHandler, mockTokenCounter, config);

                const error = new Error(errorMessage);
                vi.mocked(mockClient.converseStream).mockRejectedValue(error);

                const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

                const result = await service.generateTextStream({ prompt: 'Test' });

                expect(result.hasError).toBe(true);
                expect(result.errorMessage).toBe(errorMessage);
                expect(result.text).toBe('');
                expect(result.usage.totalTokens).toBe(0);

                consoleErrorSpy.mockRestore();
            }),
            { numRuns: 10, endOnFailure: true }
        );
    });

    /**
     * Property 16: Request Invocation Logging
     * Validates: Requirements 10.1, 10.5
     */
    it('Property 16: should log request invocation with timestamp and requestId', async () => {
        await fc.assert(
            fc.asyncProperty(fc.string({ minLength: 1, maxLength: 100 }), async (prompt) => {
                const mockClient = {
                    converse: vi.fn(),
                    converseStream: vi.fn(),
                } as unknown as BedrockClient;

                const mockRetryHandler = {
                    execute: vi.fn((fn) => fn()),
                } as unknown as RetryHandler;

                const mockTokenCounter = {
                    recordUsage: vi.fn(),
                } as unknown as TokenCounter;

                const service = new BedrockService(mockClient, mockRetryHandler, mockTokenCounter, config);

                const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

                const mockResponse = {
                    output: {
                        message: {
                            content: [{ text: 'Response' }],
                        },
                    },
                    usage: {
                        inputTokens: 5,
                        outputTokens: 10,
                    },
                    $metadata: {
                        requestId: 'test-id',
                    },
                };

                vi.mocked(mockClient.converse).mockResolvedValue(mockResponse as any) // eslint-disable-line @typescript-eslint/no-explicit-any

                await service.generateText({ prompt });

                const logs = consoleLogSpy.mock.calls.map((call) => JSON.parse(call[0] as string));
                const requestLog = logs.find((log) => log.type === 'BEDROCK_REQUEST');

                expect(requestLog).toBeDefined();
                expect(requestLog?.timestamp).toBeDefined();
                expect(requestLog?.requestId).toBeDefined();
                expect(new Date(requestLog!.timestamp).getTime()).toBeGreaterThan(0);

                consoleLogSpy.mockRestore();
            }),
            { numRuns: 10, endOnFailure: true }
        );
    });

    /**
     * Property 17: Success Response Logging
     * Validates: Requirements 10.2, 10.5
     */
    it('Property 17: should log success with response time and token usage', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 1, max: 100 }), // inputTokens
                fc.integer({ min: 1, max: 100 }), // outputTokens
                async (inputTokens, outputTokens) => {
                    const mockClient = {
                        converse: vi.fn(),
                        converseStream: vi.fn(),
                    } as unknown as BedrockClient;

                    const mockRetryHandler = {
                        execute: vi.fn((fn) => fn()),
                    } as unknown as RetryHandler;

                    const mockTokenCounter = {
                        recordUsage: vi.fn(),
                    } as unknown as TokenCounter;

                    const service = new BedrockService(mockClient, mockRetryHandler, mockTokenCounter, config);

                    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

                    const mockResponse = {
                        output: {
                            message: {
                                content: [{ text: 'Response' }],
                            },
                        },
                        usage: {
                            inputTokens,
                            outputTokens,
                        },
                        $metadata: {
                            requestId: 'test-id',
                        },
                    };

                    vi.mocked(mockClient.converse).mockResolvedValue(mockResponse as any) // eslint-disable-line @typescript-eslint/no-explicit-any

                    await service.generateText({ prompt: 'Test' });

                    const logs = consoleLogSpy.mock.calls.map((call) => JSON.parse(call[0] as string));
                    const successLog = logs.find((log) => log.type === 'BEDROCK_SUCCESS');

                    expect(successLog).toBeDefined();
                    expect(successLog?.responseTime).toBeGreaterThanOrEqual(0);
                    expect(successLog?.inputTokens).toBe(inputTokens);
                    expect(successLog?.outputTokens).toBe(outputTokens);
                    expect(successLog?.totalTokens).toBe(inputTokens + outputTokens);

                    consoleLogSpy.mockRestore();
                }
            ),
            { numRuns: 10, endOnFailure: true }
        );
    });

    /**
     * Property 19: Sensitive Data Exclusion
     * Validates: Requirements 10.6
     */
    it('Property 19: should not log prompts or system prompts', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.string({ minLength: 10, maxLength: 100 }), // prompt
                fc.option(fc.string({ minLength: 10, maxLength: 100 }), { nil: undefined }), // systemPrompt
                async (prompt, systemPrompt) => {
                    const mockClient = {
                        converse: vi.fn(),
                        converseStream: vi.fn(),
                    } as unknown as BedrockClient;

                    const mockRetryHandler = {
                        execute: vi.fn((fn) => fn()),
                    } as unknown as RetryHandler;

                    const mockTokenCounter = {
                        recordUsage: vi.fn(),
                    } as unknown as TokenCounter;

                    const service = new BedrockService(mockClient, mockRetryHandler, mockTokenCounter, config);

                    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

                    const mockResponse = {
                        output: {
                            message: {
                                content: [{ text: 'Response' }],
                            },
                        },
                        usage: {
                            inputTokens: 5,
                            outputTokens: 10,
                        },
                        $metadata: {
                            requestId: 'test-id',
                        },
                    };

                    vi.mocked(mockClient.converse).mockResolvedValue(mockResponse as any) // eslint-disable-line @typescript-eslint/no-explicit-any

                    await service.generateText({ prompt, systemPrompt });

                    const logs = consoleLogSpy.mock.calls.map((call) => JSON.parse(call[0] as string));

                    // すべてのログにプロンプトが含まれていないことを確認
                    logs.forEach((log) => {
                        const logString = JSON.stringify(log);
                        expect(logString).not.toContain(prompt);
                        if (systemPrompt) {
                            expect(logString).not.toContain(systemPrompt);
                        }
                    });

                    consoleLogSpy.mockRestore();
                }
            ),
            { numRuns: 10, endOnFailure: true }
        );
    });
});
