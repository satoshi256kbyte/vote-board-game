/**
 * Property-based tests for BedrockClient
 *
 * Requirements: 9.2
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { BedrockClient } from './bedrock-client.js';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';

// Mock AWS SDK
vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: vi.fn(),
  ConverseCommand: vi.fn(),
  ConverseStreamCommand: vi.fn(),
}));

describe('BedrockClient Property Tests', () => {
  beforeEach(() => {
    // Reset singleton instance before each test
    BedrockClient.resetInstance();

    // Setup mock
    const mockSend = vi.fn();
    vi.mocked(BedrockRuntimeClient).mockImplementation(
      () =>
        ({
          send: mockSend,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any
    );
  });

  describe('Property 1: Singleton Client Reuse', () => {
    it('should return the same instance reference for any sequence of getInstance calls', () => {
      // Feature: bedrock-nova-pro-integration, Property 1: Singleton Client Reuse
      // **Validates: Requirements 1.3, 12.3**

      fc.assert(
        fc.property(fc.integer({ min: 2, max: 10 }), (callCount) => {
          // Reset for each property iteration
          BedrockClient.resetInstance();

          // Call getInstance multiple times
          const instances: BedrockClient[] = [];
          for (let i = 0; i < callCount; i++) {
            instances.push(BedrockClient.getInstance());
          }

          // All instances should be the same reference
          const firstInstance = instances[0];
          for (let i = 1; i < instances.length; i++) {
            expect(instances[i]).toBe(firstInstance);
          }
        }),
        { numRuns: 20, endOnFailure: true }
      );
    });

    it('should return the same instance regardless of region parameter after first initialization', () => {
      // Feature: bedrock-nova-pro-integration, Property 1: Singleton Client Reuse
      // **Validates: Requirements 1.3, 12.3**

      fc.assert(
        fc.property(
          fc.constantFrom('ap-northeast-1', 'us-east-1', 'eu-west-1'),
          fc.constantFrom('ap-northeast-1', 'us-east-1', 'eu-west-1'),
          (region1, region2) => {
            // Reset for each property iteration
            BedrockClient.resetInstance();

            // First call with region1
            const instance1 = BedrockClient.getInstance(region1);

            // Second call with region2 (should return same instance)
            const instance2 = BedrockClient.getInstance(region2);

            // Should be the same instance
            expect(instance1).toBe(instance2);
          }
        ),
        { numRuns: 20, endOnFailure: true }
      );
    });
  });
});
