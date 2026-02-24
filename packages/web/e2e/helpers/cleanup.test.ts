/**
 * Unit tests for cleanup helper functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanupTestUser } from './cleanup';
import {
  CognitoIdentityProviderClient,
  AdminDeleteUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';

// Mock AWS SDK
vi.mock('@aws-sdk/client-cognito-identity-provider', () => {
  const mockSend = vi.fn();
  return {
    CognitoIdentityProviderClient: vi.fn(() => ({
      send: mockSend,
    })),
    AdminDeleteUserCommand: vi.fn(),
  };
});

describe('cleanupTestUser', () => {
  const originalEnv = process.env;
  let mockSend: ReturnType<typeof vi.fn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
    process.env.USER_POOL_ID = 'test-pool-id';
    process.env.AWS_REGION = 'ap-northeast-1';

    // Get mock send function
    const client = new CognitoIdentityProviderClient({});
    mockSend = client.send as ReturnType<typeof vi.fn>;
    mockSend.mockClear();

    // Spy on console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('should successfully delete a test user from Cognito', async () => {
    mockSend.mockResolvedValue({});

    await cleanupTestUser('test@example.com');

    expect(AdminDeleteUserCommand).toHaveBeenCalledWith({
      UserPoolId: 'test-pool-id',
      Username: 'test@example.com',
    });
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[Cleanup] Successfully deleted test user: test@example.com'
    );
  });

  it('should log warning and skip cleanup when USER_POOL_ID is not set', async () => {
    delete process.env.USER_POOL_ID;

    await cleanupTestUser('test@example.com');

    expect(mockSend).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[Cleanup] USER_POOL_ID environment variable is not set. Skipping test user cleanup.'
    );
  });

  it('should handle UserNotFoundException gracefully', async () => {
    const error = new Error('User not found') as Error & { name: string };
    error.name = 'UserNotFoundException';
    mockSend.mockRejectedValue(error);

    await cleanupTestUser('test@example.com');

    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[Cleanup] Test user not found (may have been already deleted): test@example.com'
    );
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should log error and continue when cleanup fails', async () => {
    const error = new Error('Network error');
    mockSend.mockRejectedValue(error);

    // Should not throw
    await expect(cleanupTestUser('test@example.com')).resolves.toBeUndefined();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[Cleanup] Failed to delete test user: test@example.com',
      error
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[Cleanup] Continuing execution despite cleanup failure'
    );
  });

  it('should use default AWS region when AWS_REGION is not set', async () => {
    delete process.env.AWS_REGION;
    mockSend.mockResolvedValue({});

    await cleanupTestUser('test@example.com');

    expect(CognitoIdentityProviderClient).toHaveBeenCalledWith({
      region: 'ap-northeast-1',
    });
  });

  it('should use custom AWS region when AWS_REGION is set', async () => {
    process.env.AWS_REGION = 'us-east-1';
    mockSend.mockResolvedValue({});

    await cleanupTestUser('test@example.com');

    expect(CognitoIdentityProviderClient).toHaveBeenCalledWith({
      region: 'us-east-1',
    });
  });
});
