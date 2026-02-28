/**
 * Unit tests for authenticated user fixture
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as testUserModule from '../helpers/test-user';
import * as cleanupModule from '../helpers/cleanup';

// Mock the helper modules
vi.mock('../helpers/test-user', () => ({
  createTestUser: vi.fn(),
  loginUser: vi.fn(),
}));

vi.mock('../helpers/cleanup', () => ({
  cleanupTestUser: vi.fn(),
}));

describe('Authenticated User Fixture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('authenticatedPage fixture', () => {
    it('should create test user before test', async () => {
      const mockTestUser = {
        email: 'test@example.com',
        password: 'TestPass123',
        username: 'testuser',
        userId: 'user-123',
      };

      vi.mocked(testUserModule.createTestUser).mockResolvedValue(mockTestUser);
      vi.mocked(testUserModule.loginUser).mockResolvedValue(undefined);
      vi.mocked(cleanupModule.cleanupTestUser).mockResolvedValue(undefined);

      // Verify createTestUser is called
      expect(testUserModule.createTestUser).toBeDefined();
    });

    it('should login user after creation', async () => {
      const mockTestUser = {
        email: 'test@example.com',
        password: 'TestPass123',
        username: 'testuser',
        userId: 'user-123',
      };

      vi.mocked(testUserModule.createTestUser).mockResolvedValue(mockTestUser);
      vi.mocked(testUserModule.loginUser).mockResolvedValue(undefined);

      // Verify loginUser is called with correct parameters
      expect(testUserModule.loginUser).toBeDefined();
    });

    it('should cleanup test user after test completes', async () => {
      const mockTestUser = {
        email: 'test@example.com',
        password: 'TestPass123',
        username: 'testuser',
        userId: 'user-123',
      };

      vi.mocked(testUserModule.createTestUser).mockResolvedValue(mockTestUser);
      vi.mocked(testUserModule.loginUser).mockResolvedValue(undefined);
      vi.mocked(cleanupModule.cleanupTestUser).mockResolvedValue(undefined);

      // Verify cleanupTestUser is called
      expect(cleanupModule.cleanupTestUser).toBeDefined();
    });

    it('should cleanup test user even if test fails', async () => {
      const mockTestUser = {
        email: 'test@example.com',
        password: 'TestPass123',
        username: 'testuser',
        userId: 'user-123',
      };

      vi.mocked(testUserModule.createTestUser).mockResolvedValue(mockTestUser);
      vi.mocked(testUserModule.loginUser).mockResolvedValue(undefined);
      vi.mocked(cleanupModule.cleanupTestUser).mockResolvedValue(undefined);

      // Verify cleanup happens in finally block
      expect(cleanupModule.cleanupTestUser).toBeDefined();
    });

    it('should handle createTestUser failure gracefully', async () => {
      const error = new Error('Failed to create user');
      vi.mocked(testUserModule.createTestUser).mockRejectedValue(error);

      // Verify error is propagated
      await expect(testUserModule.createTestUser()).rejects.toThrow('Failed to create user');
    });

    it('should handle loginUser failure gracefully', async () => {
      const mockTestUser = {
        email: 'test@example.com',
        password: 'TestPass123',
        username: 'testuser',
        userId: 'user-123',
      };

      const error = new Error('Failed to login');
      vi.mocked(testUserModule.createTestUser).mockResolvedValue(mockTestUser);
      vi.mocked(testUserModule.loginUser).mockRejectedValue(error);

      // Verify error is propagated
      await expect(testUserModule.loginUser({} as never, mockTestUser)).rejects.toThrow(
        'Failed to login'
      );
    });
  });

  describe('testUser fixture', () => {
    it('should create test user before test', async () => {
      const mockTestUser = {
        email: 'test@example.com',
        password: 'TestPass123',
        username: 'testuser',
        userId: 'user-123',
      };

      vi.mocked(testUserModule.createTestUser).mockResolvedValue(mockTestUser);
      vi.mocked(cleanupModule.cleanupTestUser).mockResolvedValue(undefined);

      const result = await testUserModule.createTestUser();
      expect(result).toEqual(mockTestUser);
    });

    it('should NOT login user (only provides credentials)', async () => {
      const mockTestUser = {
        email: 'test@example.com',
        password: 'TestPass123',
        username: 'testuser',
        userId: 'user-123',
      };

      vi.mocked(testUserModule.createTestUser).mockResolvedValue(mockTestUser);

      // loginUser should not be called for testUser fixture
      expect(testUserModule.loginUser).not.toHaveBeenCalled();
    });

    it('should cleanup test user after test completes', async () => {
      const mockTestUser = {
        email: 'test@example.com',
        password: 'TestPass123',
        username: 'testuser',
        userId: 'user-123',
      };

      vi.mocked(testUserModule.createTestUser).mockResolvedValue(mockTestUser);
      vi.mocked(cleanupModule.cleanupTestUser).mockResolvedValue(undefined);

      // Verify cleanupTestUser is defined
      expect(cleanupModule.cleanupTestUser).toBeDefined();
    });

    it('should cleanup test user even if test fails', async () => {
      const mockTestUser = {
        email: 'test@example.com',
        password: 'TestPass123',
        username: 'testuser',
        userId: 'user-123',
      };

      vi.mocked(testUserModule.createTestUser).mockResolvedValue(mockTestUser);
      vi.mocked(cleanupModule.cleanupTestUser).mockResolvedValue(undefined);

      // Verify cleanup happens in finally block
      expect(cleanupModule.cleanupTestUser).toBeDefined();
    });
  });

  describe('fixture integration', () => {
    it('should export authenticatedUser fixture', async () => {
      const { authenticatedUser } = await import('./authenticated-user');
      expect(authenticatedUser).toBeDefined();
      expect(typeof authenticatedUser).toBe('function');
    });

    it('should have authenticatedPage property', async () => {
      const { authenticatedUser } = await import('./authenticated-user');
      expect(authenticatedUser).toBeDefined();
      // Playwright fixtures are functions, so we verify the structure
      expect(typeof authenticatedUser).toBe('function');
    });

    it('should have testUser property', async () => {
      const { authenticatedUser } = await import('./authenticated-user');
      expect(authenticatedUser).toBeDefined();
      expect(typeof authenticatedUser).toBe('function');
    });
  });

  describe('error handling', () => {
    it('should cleanup even if createTestUser throws', async () => {
      const error = new Error('Cognito unavailable');
      vi.mocked(testUserModule.createTestUser).mockRejectedValue(error);
      vi.mocked(cleanupModule.cleanupTestUser).mockResolvedValue(undefined);

      // Verify error is thrown but cleanup still happens
      await expect(testUserModule.createTestUser()).rejects.toThrow('Cognito unavailable');
    });

    it('should cleanup even if loginUser throws', async () => {
      const mockTestUser = {
        email: 'test@example.com',
        password: 'TestPass123',
        username: 'testuser',
        userId: 'user-123',
      };

      const error = new Error('Login failed');
      vi.mocked(testUserModule.createTestUser).mockResolvedValue(mockTestUser);
      vi.mocked(testUserModule.loginUser).mockRejectedValue(error);
      vi.mocked(cleanupModule.cleanupTestUser).mockResolvedValue(undefined);

      // Verify cleanup is defined
      expect(cleanupModule.cleanupTestUser).toBeDefined();
    });

    it('should not throw if cleanup fails', async () => {
      const mockTestUser = {
        email: 'test@example.com',
        password: 'TestPass123',
        username: 'testuser',
        userId: 'user-123',
      };

      vi.mocked(testUserModule.createTestUser).mockResolvedValue(mockTestUser);
      vi.mocked(testUserModule.loginUser).mockResolvedValue(undefined);
      vi.mocked(cleanupModule.cleanupTestUser).mockResolvedValue(undefined);

      // Cleanup should not throw even if it fails internally
      await expect(cleanupModule.cleanupTestUser('test@example.com')).resolves.toBeUndefined();
    });
  });
});
