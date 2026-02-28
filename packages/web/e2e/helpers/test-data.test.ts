/**
 * Unit tests for test-data helper functions
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestGame, createTestCandidate, cleanupTestGame } from './test-data';

describe('createTestGame', () => {
  beforeEach(() => {
    // Set required environment variables
    process.env.DYNAMODB_TABLE_NAME = 'test-table';
    process.env.AWS_REGION = 'ap-northeast-1';
  });

  afterEach(() => {
    delete process.env.DYNAMODB_TABLE_NAME;
  });

  it('should throw error if DYNAMODB_TABLE_NAME is not set', async () => {
    delete process.env.DYNAMODB_TABLE_NAME;

    await expect(createTestGame()).rejects.toThrow(
      'DYNAMODB_TABLE_NAME environment variable is not set'
    );
  });

  // Note: Full integration tests with actual DynamoDB would require AWS credentials
  // and should be run in E2E test environment, not unit tests
});

describe('createTestCandidate', () => {
  beforeEach(() => {
    process.env.DYNAMODB_TABLE_NAME = 'test-table';
    process.env.AWS_REGION = 'ap-northeast-1';
  });

  afterEach(() => {
    delete process.env.DYNAMODB_TABLE_NAME;
  });

  it('should throw error if DYNAMODB_TABLE_NAME is not set', async () => {
    delete process.env.DYNAMODB_TABLE_NAME;

    await expect(createTestCandidate('test-game-id')).rejects.toThrow(
      'DYNAMODB_TABLE_NAME environment variable is not set'
    );
  });
});

describe('cleanupTestGame', () => {
  beforeEach(() => {
    process.env.DYNAMODB_TABLE_NAME = 'test-table';
    process.env.AWS_REGION = 'ap-northeast-1';
  });

  afterEach(() => {
    delete process.env.DYNAMODB_TABLE_NAME;
  });

  it('should not throw error if DYNAMODB_TABLE_NAME is not set', async () => {
    delete process.env.DYNAMODB_TABLE_NAME;

    const testGame = {
      gameId: 'test-game-id',
      status: 'active' as const,
      candidates: [],
    };

    // Should not throw - cleanup failures should be logged but not fail
    await expect(cleanupTestGame(testGame)).resolves.toBeUndefined();
  });

  it('should handle cleanup of game with candidates', async () => {
    const testGame = {
      gameId: 'test-game-id',
      status: 'active' as const,
      candidates: [
        {
          candidateId: 'candidate-1',
          description: 'Test candidate 1',
          moveData: '{"row":2,"col":3}',
        },
        {
          candidateId: 'candidate-2',
          description: 'Test candidate 2',
          moveData: '{"row":3,"col":4}',
        },
      ],
    };

    // Should not throw even if DynamoDB operations fail
    await expect(cleanupTestGame(testGame)).resolves.toBeUndefined();
  });
});
