/**
 * Unit tests for Cognito availability checker
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isCognitoAvailable, formatCognitoUnavailableWarning } from './cognito-availability';

// Mock AWS SDK
vi.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: vi.fn(),
  ListUserPoolsCommand: vi.fn(),
}));

describe('Cognito Availability Checker', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('isCognitoAvailable', () => {
    it('should return false when USER_POOL_ID is not set', async () => {
      delete process.env.USER_POOL_ID;

      const result = await isCognitoAvailable();

      expect(result).toBe(false);
    });

    it('should return false when Cognito client throws error', async () => {
      process.env.USER_POOL_ID = 'test-pool-id';

      const { CognitoIdentityProviderClient } =
        await import('@aws-sdk/client-cognito-identity-provider');
      const mockSend = vi.fn().mockRejectedValue(new Error('Service unavailable'));
      // @ts-expect-error - Mocking constructor
      vi.mocked(CognitoIdentityProviderClient).mockImplementation(() => ({ send: mockSend }));
      const result = await isCognitoAvailable();

      expect(result).toBe(false);
    });
  });

  describe('formatCognitoUnavailableWarning', () => {
    it('should return formatted warning message', () => {
      const warning = formatCognitoUnavailableWarning();

      expect(warning).toContain('⚠️  Warning: Cognito service is unavailable');
      expect(warning).toContain('USER_POOL_ID environment variable is not set');
      expect(warning).toContain('AWS credentials are not configured');
      expect(warning).toContain('Tests requiring Cognito will be skipped');
    });

    it('should include possible causes in warning', () => {
      const warning = formatCognitoUnavailableWarning();

      expect(warning).toContain('Possible causes:');
      expect(warning).toContain('Cognito service is experiencing issues');
      expect(warning).toContain('Network connectivity problems');
    });
  });
});
