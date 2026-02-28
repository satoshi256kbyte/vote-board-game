/**
 * Unit tests for test-data fixture exports
 */

import { describe, it, expect, vi } from 'vitest';

// Mock AWS SDK dependencies
vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(),
}));

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(),
  },
  PutCommand: vi.fn(),
  DeleteCommand: vi.fn(),
}));

vi.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: vi.fn(),
  AdminCreateUserCommand: vi.fn(),
  AdminSetUserPasswordCommand: vi.fn(),
  AdminDeleteUserCommand: vi.fn(),
  MessageActionType: {
    SUPPRESS: 'SUPPRESS',
  },
}));

describe('Test Data Fixtures', () => {
  describe('exports', () => {
    it('should export authenticatedUser fixture', async () => {
      const { authenticatedUser } = await import('./test-data');
      expect(authenticatedUser).toBeDefined();
      expect(typeof authenticatedUser).toBe('function');
    });

    it('should export testGame fixture', async () => {
      const { testGame } = await import('./test-data');
      expect(testGame).toBeDefined();
      expect(typeof testGame).toBe('function');
    });

    it('should export all fixtures', async () => {
      const fixtures = await import('./test-data');
      expect(fixtures).toHaveProperty('authenticatedUser');
      expect(fixtures).toHaveProperty('testGame');
    });
  });

  describe('fixture types', () => {
    it('should have correct authenticatedUser type', async () => {
      const { authenticatedUser } = await import('./test-data');
      // Playwright fixtures are functions
      expect(typeof authenticatedUser).toBe('function');
    });

    it('should have correct testGame type', async () => {
      const { testGame } = await import('./test-data');
      // Playwright fixtures are functions
      expect(typeof testGame).toBe('function');
    });
  });

  describe('re-exports', () => {
    it('should re-export from authenticated-user module', async () => {
      const { authenticatedUser: fromIndex } = await import('./test-data');
      const { authenticatedUser: fromModule } = await import('./authenticated-user');
      expect(fromIndex).toBe(fromModule);
    });

    it('should re-export from test-game module', async () => {
      const { testGame: fromIndex } = await import('./test-data');
      const { testGame: fromModule } = await import('./test-game');
      expect(fromIndex).toBe(fromModule);
    });
  });
});
