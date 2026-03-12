import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TokenCounter, TokenUsage } from './token-counter';

describe('TokenCounter', () => {
  let tokenCounter: TokenCounter;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tokenCounter = new TokenCounter();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('recordUsage', () => {
    it('should log token usage with all required fields', () => {
      // Arrange
      const usage: TokenUsage = {
        modelId: 'amazon.nova-pro-v1:0',
        requestId: 'test-request-123',
        inputTokens: 100,
        outputTokens: 200,
      };

      // Act
      tokenCounter.recordUsage(usage);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);

      expect(loggedData).toHaveProperty('timestamp');
      expect(loggedData.modelId).toBe('amazon.nova-pro-v1:0');
      expect(loggedData.requestId).toBe('test-request-123');
      expect(loggedData.inputTokens).toBe(100);
      expect(loggedData.outputTokens).toBe(200);
      expect(loggedData.totalTokens).toBe(300);
      expect(loggedData.type).toBe('BEDROCK_TOKEN_USAGE');
    });

    it('should calculate totalTokens correctly', () => {
      // Arrange
      const usage: TokenUsage = {
        modelId: 'amazon.nova-pro-v1:0',
        requestId: 'test-request-456',
        inputTokens: 50,
        outputTokens: 150,
      };

      // Act
      tokenCounter.recordUsage(usage);

      // Assert
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
      expect(loggedData.totalTokens).toBe(200);
    });

    it('should handle zero tokens', () => {
      // Arrange
      const usage: TokenUsage = {
        modelId: 'amazon.nova-pro-v1:0',
        requestId: 'test-request-789',
        inputTokens: 0,
        outputTokens: 0,
      };

      // Act
      tokenCounter.recordUsage(usage);

      // Assert
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
      expect(loggedData.totalTokens).toBe(0);
      expect(loggedData.inputTokens).toBe(0);
      expect(loggedData.outputTokens).toBe(0);
    });

    it('should include ISO 8601 timestamp', () => {
      // Arrange
      const usage: TokenUsage = {
        modelId: 'amazon.nova-pro-v1:0',
        requestId: 'test-request-abc',
        inputTokens: 10,
        outputTokens: 20,
      };

      // Act
      tokenCounter.recordUsage(usage);

      // Assert
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
      expect(loggedData.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should log as valid JSON', () => {
      // Arrange
      const usage: TokenUsage = {
        modelId: 'amazon.nova-pro-v1:0',
        requestId: 'test-request-def',
        inputTokens: 75,
        outputTokens: 125,
      };

      // Act
      tokenCounter.recordUsage(usage);

      // Assert
      expect(() => {
        JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
      }).not.toThrow();
    });

    it('should handle large token counts', () => {
      // Arrange
      const usage: TokenUsage = {
        modelId: 'amazon.nova-pro-v1:0',
        requestId: 'test-request-large',
        inputTokens: 100000,
        outputTokens: 200000,
      };

      // Act
      tokenCounter.recordUsage(usage);

      // Assert
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
      expect(loggedData.totalTokens).toBe(300000);
    });

    it('should preserve modelId exactly as provided', () => {
      // Arrange
      const usage: TokenUsage = {
        modelId: 'custom-model-id-v2:1',
        requestId: 'test-request-custom',
        inputTokens: 10,
        outputTokens: 20,
      };

      // Act
      tokenCounter.recordUsage(usage);

      // Assert
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
      expect(loggedData.modelId).toBe('custom-model-id-v2:1');
    });

    it('should preserve requestId exactly as provided', () => {
      // Arrange
      const usage: TokenUsage = {
        modelId: 'amazon.nova-pro-v1:0',
        requestId: 'very-long-request-id-with-special-chars-123-abc-xyz',
        inputTokens: 10,
        outputTokens: 20,
      };

      // Act
      tokenCounter.recordUsage(usage);

      // Assert
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
      expect(loggedData.requestId).toBe('very-long-request-id-with-special-chars-123-abc-xyz');
    });
  });
});
