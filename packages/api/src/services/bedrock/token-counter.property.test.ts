import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { TokenCounter, TokenUsage } from './token-counter';

describe('TokenCounter - Property-Based Tests', () => {
  let tokenCounter: TokenCounter;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tokenCounter = new TokenCounter();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('Property 12: Token Usage Calculation', () => {
    it('should calculate totalTokens as sum of inputTokens and outputTokens for any token counts', () => {
      // Feature: bedrock-nova-pro-integration, Property 12: Token Usage Calculation
      // **Validates: Requirements 5.1, 5.2, 5.5**

      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }), // modelId
          fc.string({ minLength: 1, maxLength: 50 }), // requestId
          fc.nat({ max: 1000000 }), // inputTokens
          fc.nat({ max: 1000000 }), // outputTokens
          (modelId, requestId, inputTokens, outputTokens) => {
            // Arrange
            const usage: TokenUsage = {
              modelId,
              requestId,
              inputTokens,
              outputTokens,
            };

            // Act
            tokenCounter.recordUsage(usage);

            // Assert
            const loggedData = JSON.parse(
              consoleLogSpy.mock.calls[consoleLogSpy.mock.calls.length - 1][0] as string
            );
            const expectedTotal = inputTokens + outputTokens;

            expect(loggedData.totalTokens).toBe(expectedTotal);
            expect(loggedData.inputTokens).toBe(inputTokens);
            expect(loggedData.outputTokens).toBe(outputTokens);
          }
        ),
        { numRuns: 15, endOnFailure: true }
      );
    });

    it('should handle edge cases: zero tokens, maximum tokens, and asymmetric distributions', () => {
      // Feature: bedrock-nova-pro-integration, Property 12: Token Usage Calculation
      // **Validates: Requirements 5.1, 5.2, 5.5**

      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }), // modelId
          fc.string({ minLength: 1, maxLength: 50 }), // requestId
          fc.oneof(
            fc.constant({ input: 0, output: 0 }), // Both zero
            fc.record({ input: fc.nat({ max: 1000000 }), output: fc.constant(0) }), // Only input
            fc.record({ input: fc.constant(0), output: fc.nat({ max: 1000000 }) }), // Only output
            fc.record({ input: fc.nat({ max: 1000000 }), output: fc.nat({ max: 1000000 }) }) // Both non-zero
          ),
          (modelId, requestId, tokens) => {
            // Arrange
            const usage: TokenUsage = {
              modelId,
              requestId,
              inputTokens: tokens.input,
              outputTokens: tokens.output,
            };

            // Act
            tokenCounter.recordUsage(usage);

            // Assert
            const loggedData = JSON.parse(
              consoleLogSpy.mock.calls[consoleLogSpy.mock.calls.length - 1][0] as string
            );
            expect(loggedData.totalTokens).toBe(tokens.input + tokens.output);
          }
        ),
        { numRuns: 15, endOnFailure: true }
      );
    });
  });

  describe('Property 13: Token Usage Logging', () => {
    it('should log structured JSON with all required fields for any token usage', () => {
      // Feature: bedrock-nova-pro-integration, Property 13: Token Usage Logging
      // **Validates: Requirements 5.3, 5.4**

      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }), // modelId
          fc.string({ minLength: 1, maxLength: 100 }), // requestId
          fc.nat({ max: 1000000 }), // inputTokens
          fc.nat({ max: 1000000 }), // outputTokens
          (modelId, requestId, inputTokens, outputTokens) => {
            // Arrange
            const usage: TokenUsage = {
              modelId,
              requestId,
              inputTokens,
              outputTokens,
            };

            // Act
            tokenCounter.recordUsage(usage);

            // Assert
            expect(consoleLogSpy).toHaveBeenCalled();
            const loggedString = consoleLogSpy.mock.calls[
              consoleLogSpy.mock.calls.length - 1
            ][0] as string;

            // Verify it's valid JSON
            let loggedData: Record<string, unknown>;
            expect(() => {
              loggedData = JSON.parse(loggedString) as Record<string, unknown>;
            }).not.toThrow();

            // Verify all required fields are present
            expect(loggedData).toHaveProperty('timestamp');
            expect(loggedData).toHaveProperty('modelId');
            expect(loggedData).toHaveProperty('requestId');
            expect(loggedData).toHaveProperty('inputTokens');
            expect(loggedData).toHaveProperty('outputTokens');
            expect(loggedData).toHaveProperty('totalTokens');
            expect(loggedData).toHaveProperty('type');

            // Verify field values match input
            expect(loggedData.modelId).toBe(modelId);
            expect(loggedData.requestId).toBe(requestId);
            expect(loggedData.inputTokens).toBe(inputTokens);
            expect(loggedData.outputTokens).toBe(outputTokens);
            expect(loggedData.totalTokens).toBe(inputTokens + outputTokens);
            expect(loggedData.type).toBe('BEDROCK_TOKEN_USAGE');

            // Verify timestamp is ISO 8601 format
            expect(loggedData.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
          }
        ),
        { numRuns: 15, endOnFailure: true }
      );
    });

    it('should preserve modelId and requestId exactly as provided without modification', () => {
      // Feature: bedrock-nova-pro-integration, Property 13: Token Usage Logging
      // **Validates: Requirements 5.3, 5.4**

      fc.assert(
        fc.property(
          fc.oneof(
            fc.string({ minLength: 1, maxLength: 100 }), // Regular strings
            fc.constant('amazon.nova-pro-v1:0'), // Actual model ID format
            fc.constant('custom-model-id-v2:1'), // Custom model ID
            fc.constant('very-long-request-id-with-special-chars-123-abc-xyz') // Long request ID
          ),
          fc.oneof(
            fc.string({ minLength: 1, maxLength: 100 }),
            fc.uuid(),
            fc.constant('test-request-123'),
            fc.constant('request-with-dashes-and-numbers-456')
          ),
          fc.nat({ max: 1000 }),
          fc.nat({ max: 1000 }),
          (modelId, requestId, inputTokens, outputTokens) => {
            // Arrange
            const usage: TokenUsage = {
              modelId,
              requestId,
              inputTokens,
              outputTokens,
            };

            // Act
            tokenCounter.recordUsage(usage);

            // Assert
            const loggedData = JSON.parse(
              consoleLogSpy.mock.calls[consoleLogSpy.mock.calls.length - 1][0] as string
            );

            // Verify exact preservation (no trimming, no modification)
            expect(loggedData.modelId).toBe(modelId);
            expect(loggedData.requestId).toBe(requestId);
          }
        ),
        { numRuns: 15, endOnFailure: true }
      );
    });

    it('should always log type as BEDROCK_TOKEN_USAGE regardless of input values', () => {
      // Feature: bedrock-nova-pro-integration, Property 13: Token Usage Logging
      // **Validates: Requirements 5.3, 5.4**

      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.nat({ max: 1000000 }),
          fc.nat({ max: 1000000 }),
          (modelId, requestId, inputTokens, outputTokens) => {
            // Arrange
            const usage: TokenUsage = {
              modelId,
              requestId,
              inputTokens,
              outputTokens,
            };

            // Act
            tokenCounter.recordUsage(usage);

            // Assert
            const loggedData = JSON.parse(
              consoleLogSpy.mock.calls[consoleLogSpy.mock.calls.length - 1][0] as string
            );
            expect(loggedData.type).toBe('BEDROCK_TOKEN_USAGE');
          }
        ),
        { numRuns: 15, endOnFailure: true }
      );
    });
  });
});
