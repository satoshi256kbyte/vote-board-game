/**
 * Unit tests for BedrockClient
 *
 * Requirements: 1.5, 9.2
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BedrockClient } from './bedrock-client.js';
import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import type { ConverseParams } from './types.js';

// Mock AWS SDK
vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: vi.fn(),
  ConverseCommand: vi.fn(),
  ConverseStreamCommand: vi.fn(),
}));

describe('BedrockClient', () => {
  let mockSend: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset singleton instance before each test
    BedrockClient.resetInstance();

    // Setup mock
    mockSend = vi.fn();
    vi.mocked(BedrockRuntimeClient).mockImplementation(
      () =>
        ({
          send: mockSend,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any
    );
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      // Requirements: 1.3
      const instance1 = BedrockClient.getInstance();
      const instance2 = BedrockClient.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should initialize with default region', () => {
      // Requirements: 1.1
      BedrockClient.getInstance();

      expect(BedrockRuntimeClient).toHaveBeenCalledWith({
        region: 'ap-northeast-1',
      });
    });

    it('should initialize with custom region', () => {
      // Requirements: 1.1
      BedrockClient.getInstance('us-east-1');

      expect(BedrockRuntimeClient).toHaveBeenCalledWith({
        region: 'us-east-1',
      });
    });

    it('should reset instance for testing', () => {
      // Requirements: 1.3
      const instance1 = BedrockClient.getInstance();
      BedrockClient.resetInstance();
      const instance2 = BedrockClient.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('converse method', () => {
    it('should call ConverseCommand with correct parameters', async () => {
      // Requirements: 3.1, 3.2, 3.3
      const client = BedrockClient.getInstance();

      const params: ConverseParams = {
        modelId: 'amazon.nova-pro-v1:0',
        messages: [
          {
            role: 'user',
            content: [{ text: 'Hello' }],
          },
        ],
        system: [{ text: 'You are a helpful assistant' }],
        inferenceConfig: {
          maxTokens: 2048,
          temperature: 0.7,
          topP: 0.9,
        },
      };

      const mockResponse = {
        output: {
          message: {
            content: [{ text: 'Hi there!' }],
          },
        },
        usage: {
          inputTokens: 10,
          outputTokens: 5,
        },
        $metadata: {
          requestId: 'test-request-id',
        },
      };

      mockSend.mockResolvedValue(mockResponse);

      const response = await client.converse(params);

      expect(ConverseCommand).toHaveBeenCalledWith({
        modelId: params.modelId,
        messages: params.messages,
        system: params.system,
        inferenceConfig: params.inferenceConfig,
      });
      expect(mockSend).toHaveBeenCalled();
      expect(response).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
      // Requirements: 1.5
      const client = BedrockClient.getInstance();

      const params: ConverseParams = {
        modelId: 'amazon.nova-pro-v1:0',
        messages: [
          {
            role: 'user',
            content: [{ text: 'Hello' }],
          },
        ],
      };

      const error = new Error('API Error');
      mockSend.mockRejectedValue(error);

      await expect(client.converse(params)).rejects.toThrow('API Error');
    });
  });

  describe('converseStream method', () => {
    it('should call ConverseStreamCommand with correct parameters', async () => {
      // Requirements: 8.1, 8.2
      const client = BedrockClient.getInstance();

      const params: ConverseParams = {
        modelId: 'amazon.nova-pro-v1:0',
        messages: [
          {
            role: 'user',
            content: [{ text: 'Hello' }],
          },
        ],
        system: [{ text: 'You are a helpful assistant' }],
        inferenceConfig: {
          maxTokens: 2048,
          temperature: 0.7,
          topP: 0.9,
        },
      };

      const mockStreamResponse = {
        stream: (async function* () {
          yield {
            contentBlockDelta: {
              delta: { text: 'Hi' },
            },
          };
          yield {
            contentBlockDelta: {
              delta: { text: ' there!' },
            },
          };
        })(),
      };

      mockSend.mockResolvedValue(mockStreamResponse);

      const response = await client.converseStream(params);

      expect(ConverseStreamCommand).toHaveBeenCalledWith({
        modelId: params.modelId,
        messages: params.messages,
        system: params.system,
        inferenceConfig: params.inferenceConfig,
      });
      expect(mockSend).toHaveBeenCalled();
      expect(response).toEqual(mockStreamResponse);
    });

    it('should handle streaming errors', async () => {
      // Requirements: 1.5
      const client = BedrockClient.getInstance();

      const params: ConverseParams = {
        modelId: 'amazon.nova-pro-v1:0',
        messages: [
          {
            role: 'user',
            content: [{ text: 'Hello' }],
          },
        ],
      };

      const error = new Error('Streaming Error');
      mockSend.mockRejectedValue(error);

      await expect(client.converseStream(params)).rejects.toThrow('Streaming Error');
    });
  });
});
