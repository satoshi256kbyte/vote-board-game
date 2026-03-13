/**
 * Unit tests for BedrockService
 *
 * Requirements: 9.2, 9.3, 9.4, 9.6, 9.8
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BedrockService } from './bedrock-service.js';
import { BedrockClient } from './bedrock-client.js';
import { RetryHandler } from './retry-handler.js';
import { TokenCounter } from './token-counter.js';
import { BedrockValidationError } from './errors.js';
import type { BedrockConfig } from './config.js';

describe('BedrockService', () => {
    let mockClient: BedrockClient;
    let mockRetryHandler: RetryHandler;
    let mockTokenCounter: TokenCounter;
    let config: BedrockConfig;
    let service: BedrockService;
    let consoleLogSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        // モックの作成
        mockClient = {
            converse: vi.fn(),
            converseStream: vi.fn(),
        } as unknown as BedrockClient;

        mockRetryHandler = {
            execute: vi.fn((fn) => fn()),
        } as unknown as RetryHandler;

        mockTokenCounter = {
            recordUsage: vi.fn(),
        } as unknown as TokenCounter;

        config = {
            modelId: 'amazon.nova-pro-v1:0',
            region: 'ap-northeast-1',
            maxTokens: 2048,
            temperature: 0.7,
            topP: 0.9,
        };

        service = new BedrockService(mockClient, mockRetryHandler, mockTokenCounter, config);

        // console.log をスパイ
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('generateText', () => {
        it('should successfully generate text', async () => {
            // モックレスポンスを設定
            const mockResponse = {
                output: {
                    message: {
                        content: [{ text: 'Generated text response' }],
                    },
                },
                usage: {
                    inputTokens: 10,
                    outputTokens: 20,
                },
                $metadata: {
                    requestId: 'test-request-id',
                },
            };

            vi.mocked(mockClient.converse).mockResolvedValue(mockResponse as any) // eslint-disable-line @typescript-eslint/no-explicit-any

            // テスト実行
            const result = await service.generateText({
                prompt: 'Test prompt',
                systemPrompt: 'Test system prompt',
            });

            // 検証
            expect(result.text).toBe('Generated text response');
            expect(result.usage.inputTokens).toBe(10);
            expect(result.usage.outputTokens).toBe(20);
            expect(result.usage.totalTokens).toBe(30);

            // converse が正しいパラメータで呼ばれたことを確認
            expect(mockClient.converse).toHaveBeenCalledWith({
                modelId: 'amazon.nova-pro-v1:0',
                messages: [
                    {
                        role: 'user',
                        content: [{ text: 'Test prompt' }],
                    },
                ],
                system: [{ text: 'Test system prompt' }],
                inferenceConfig: {
                    temperature: 0.7,
                    topP: 0.9,
                    maxTokens: 2048,
                },
            });

            // トークンカウンターが呼ばれたことを確認
            expect(mockTokenCounter.recordUsage).toHaveBeenCalledWith({
                modelId: 'amazon.nova-pro-v1:0',
                inputTokens: 10,
                outputTokens: 20,
                requestId: 'test-request-id',
            });

            // ログが記録されたことを確認
            expect(consoleLogSpy).toHaveBeenCalled();
            const logs = consoleLogSpy.mock.calls.map((call) => JSON.parse(call[0] as string));
            expect(logs.some((log) => log.type === 'BEDROCK_REQUEST')).toBe(true);
            expect(logs.some((log) => log.type === 'BEDROCK_SUCCESS')).toBe(true);
        });

        it('should throw BedrockValidationError for empty prompt', async () => {
            await expect(service.generateText({ prompt: '' })).rejects.toThrow(BedrockValidationError);
            await expect(service.generateText({ prompt: '   ' })).rejects.toThrow(
                BedrockValidationError
            );
            await expect(service.generateText({ prompt: '' })).rejects.toThrow('Prompt cannot be empty');
        });

        it('should throw BedrockValidationError for prompt exceeding 100,000 characters', async () => {
            const longPrompt = 'a'.repeat(100001);
            await expect(service.generateText({ prompt: longPrompt })).rejects.toThrow(
                BedrockValidationError
            );
            await expect(service.generateText({ prompt: longPrompt })).rejects.toThrow(
                'Prompt exceeds maximum length of 100,000 characters'
            );
        });

        it('should not include prompt in logs', async () => {
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

            await service.generateText({ prompt: 'Sensitive prompt data' });

            const logs = consoleLogSpy.mock.calls.map((call) => JSON.parse(call[0] as string));
            logs.forEach((log) => {
                expect(JSON.stringify(log)).not.toContain('Sensitive prompt data');
            });
        });

        it('should use custom parameters when provided', async () => {
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
                prompt: 'Test',
                temperature: 0.5,
                maxTokens: 1024,
            });

            expect(mockClient.converse).toHaveBeenCalledWith(
                expect.objectContaining({
                    inferenceConfig: {
                        temperature: 0.5,
                        topP: 0.9,
                        maxTokens: 1024,
                    },
                })
            );
        });

        it('should call converse without system messages when systemPrompt is not provided', async () => {
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

            await service.generateText({ prompt: 'Test prompt' });

            expect(mockClient.converse).toHaveBeenCalledWith({
                modelId: 'amazon.nova-pro-v1:0',
                messages: [
                    {
                        role: 'user',
                        content: [{ text: 'Test prompt' }],
                    },
                ],
                system: undefined,
                inferenceConfig: {
                    temperature: 0.7,
                    topP: 0.9,
                    maxTokens: 2048,
                },
            });
        });

        it('should log error when API call fails', async () => {
            const error = new Error('API Error');
            error.name = 'ThrottlingException';

            vi.mocked(mockRetryHandler.execute).mockRejectedValue(error);

            await expect(service.generateText({ prompt: 'Test' })).rejects.toThrow('API Error');

            const logs = consoleLogSpy.mock.calls.map((call) => JSON.parse(call[0] as string));
            const errorLog = logs.find((log) => log.type === 'BEDROCK_ERROR');

            expect(errorLog).toBeDefined();
            expect(errorLog?.errorType).toBe('ThrottlingException');
            expect(errorLog?.errorMessage).toBe('API Error');
        });

        it('should use retry handler for API calls', async () => {
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

            await service.generateText({ prompt: 'Test' });

            expect(mockRetryHandler.execute).toHaveBeenCalled();
        });

        it('should handle response with missing text content', async () => {
            const mockResponse = {
                output: {
                    message: {
                        content: [],
                    },
                },
                usage: {
                    inputTokens: 5,
                    outputTokens: 0,
                },
                $metadata: {
                    requestId: 'test-id',
                },
            };

            vi.mocked(mockClient.converse).mockResolvedValue(mockResponse as any) // eslint-disable-line @typescript-eslint/no-explicit-any

            const result = await service.generateText({ prompt: 'Test' });

            expect(result.text).toBe('');
        });

        it('should handle response with missing usage metadata', async () => {
            const mockResponse = {
                output: {
                    message: {
                        content: [{ text: 'Response' }],
                    },
                },
                usage: undefined,
                $metadata: {
                    requestId: 'test-id',
                },
            };

            vi.mocked(mockClient.converse).mockResolvedValue(mockResponse as any) // eslint-disable-line @typescript-eslint/no-explicit-any

            const result = await service.generateText({ prompt: 'Test' });

            expect(result.usage.inputTokens).toBe(0);
            expect(result.usage.outputTokens).toBe(0);
            expect(result.usage.totalTokens).toBe(0);
        });
    });

    describe('generateTextStream', () => {
        it('should successfully generate streaming text', async () => {
            const mockStream = (async function* () {
                yield {
                    contentBlockDelta: {
                        delta: { text: 'Hello ' },
                    },
                };
                yield {
                    contentBlockDelta: {
                        delta: { text: 'world' },
                    },
                };
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

            const result = await service.generateTextStream({ prompt: 'Test prompt' });

            expect(result.text).toBe('Hello world');
            expect(result.usage.inputTokens).toBe(5);
            expect(result.usage.outputTokens).toBe(10);
            expect(result.usage.totalTokens).toBe(15);
            expect(result.hasError).toBe(false);

            expect(mockTokenCounter.recordUsage).toHaveBeenCalledWith({
                modelId: 'amazon.nova-pro-v1:0',
                inputTokens: 5,
                outputTokens: 10,
                requestId: 'stream',
            });
        });

        it('should throw BedrockValidationError for empty prompt', async () => {
            await expect(service.generateTextStream({ prompt: '' })).rejects.toThrow(
                BedrockValidationError
            );
            await expect(service.generateTextStream({ prompt: '   ' })).rejects.toThrow(
                BedrockValidationError
            );
        });

        it('should throw BedrockValidationError for prompt exceeding 100,000 characters', async () => {
            const longPrompt = 'a'.repeat(100001);
            await expect(service.generateTextStream({ prompt: longPrompt })).rejects.toThrow(
                BedrockValidationError
            );
        });

        it('should handle streaming error gracefully', async () => {
            const error = new Error('Streaming failed');
            vi.mocked(mockClient.converseStream).mockRejectedValue(error);

            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const result = await service.generateTextStream({ prompt: 'Test' });

            expect(result.hasError).toBe(true);
            expect(result.errorMessage).toBe('Streaming failed');
            expect(result.text).toBe('');
            expect(result.usage.totalTokens).toBe(0);

            expect(consoleErrorSpy).toHaveBeenCalledWith('Streaming error:', error);

            consoleErrorSpy.mockRestore();
        });

        it('should handle empty stream', async () => {
            const mockStream = (async function* () {
                // Empty stream
            })();

            const mockResponse = {
                stream: mockStream,
            };

            vi.mocked(mockClient.converseStream).mockResolvedValue(mockResponse as any) // eslint-disable-line @typescript-eslint/no-explicit-any

            const result = await service.generateTextStream({ prompt: 'Test' });

            expect(result.text).toBe('');
            expect(result.usage.totalTokens).toBe(0);
            expect(result.hasError).toBe(false);
        });

        it('should handle stream without usage metadata', async () => {
            const mockStream = (async function* () {
                yield {
                    contentBlockDelta: {
                        delta: { text: 'Text' },
                    },
                };
            })();

            const mockResponse = {
                stream: mockStream,
            };

            vi.mocked(mockClient.converseStream).mockResolvedValue(mockResponse as any) // eslint-disable-line @typescript-eslint/no-explicit-any

            const result = await service.generateTextStream({ prompt: 'Test' });

            expect(result.text).toBe('Text');
            expect(result.usage.inputTokens).toBe(0);
            expect(result.usage.outputTokens).toBe(0);
        });
    });
});
