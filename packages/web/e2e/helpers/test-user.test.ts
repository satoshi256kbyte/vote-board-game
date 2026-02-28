/**
 * Unit tests for test-user helper functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateTestUser, createTestUser, loginUser } from './test-user';
import type { Page } from '@playwright/test';

describe('generateTestUser', () => {
  it('should generate a test user with unique email', () => {
    const user1 = generateTestUser();
    const user2 = generateTestUser();

    expect(user1.email).toMatch(/^test-\d+-\d+@example\.com$/);
    expect(user2.email).toMatch(/^test-\d+-\d+@example\.com$/);
    expect(user1.email).not.toBe(user2.email);
  });

  it('should generate a password that meets security requirements', () => {
    const user = generateTestUser();

    // Password should be at least 8 characters
    expect(user.password.length).toBeGreaterThanOrEqual(8);

    // Password should contain uppercase letter
    expect(user.password).toMatch(/[A-Z]/);

    // Password should contain lowercase letter
    expect(user.password).toMatch(/[a-z]/);

    // Password should contain number
    expect(user.password).toMatch(/[0-9]/);
  });

  it('should generate a test user with unique email and password', () => {
    const user = generateTestUser();

    expect(user.email).toBeTruthy();
    expect(user.password).toBeTruthy();
  });
});

describe('createTestUser', () => {
  beforeEach(() => {
    // Set required environment variables
    process.env.USER_POOL_ID = 'test-pool-id';
    process.env.AWS_REGION = 'ap-northeast-1';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should throw error if USER_POOL_ID is not set', async () => {
    delete process.env.USER_POOL_ID;

    await expect(createTestUser()).rejects.toThrow('USER_POOL_ID environment variable is not set');
  });

  // Note: Full integration tests with actual Cognito would require AWS credentials
  // and should be run in E2E test environment, not unit tests
});

describe('loginUser', () => {
  let mockPage: Page;

  beforeEach(() => {
    mockPage = {
      goto: vi.fn(),
      fill: vi.fn(),
      click: vi.fn(),
      waitForURL: vi.fn(),
    } as unknown as Page;
  });

  it('should navigate to login page and fill credentials', async () => {
    const testUser = {
      email: 'test@example.com',
      password: 'TestPass123',
    };

    await loginUser(mockPage, testUser);

    expect(mockPage.goto).toHaveBeenCalledWith('/login');
    expect(mockPage.fill).toHaveBeenCalledWith('input[name="email"]', testUser.email);
    expect(mockPage.fill).toHaveBeenCalledWith('input[name="password"]', testUser.password);
    expect(mockPage.click).toHaveBeenCalledWith('button[type="submit"]');
    expect(mockPage.waitForURL).toHaveBeenCalledWith('/', { timeout: 10000 });
  });

  it('should throw error if login fails', async () => {
    const testUser = {
      email: 'test@example.com',
      password: 'TestPass123',
    };

    vi.mocked(mockPage.waitForURL).mockRejectedValue(new Error('Login failed'));

    await expect(loginUser(mockPage, testUser)).rejects.toThrow('Login failed');
  });
});
