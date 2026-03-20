/**
 * Unit tests for test-data helper functions
 *
 * Note: These tests are excluded from vitest (e2e/** is excluded).
 * They serve as documentation and can be run manually.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestGame, createTestCandidate, cleanupTestGame } from './test-data';

// Mock aws-client-factory
vi.mock('./aws-client-factory', () => ({
  getDynamoDocClient: vi.fn(() => ({
    send: vi.fn().mockResolvedValue({}),
  })),
  withCredentialRefresh: vi.fn(async (fn: () => Promise<unknown>) => fn()),
}));

describe('createTestGame', () => {
  beforeEach(() => {
    process.env.DYNAMODB_TABLE_NAME = 'test-table';
    process.env.AWS_REGION = 'ap-northeast-1';
  });

  afterEach(() => {
    delete process.env.DYNAMODB_TABLE_NAME;
    vi.clearAllMocks();
  });

  it('should return mock game if DYNAMODB_TABLE_NAME is not set', async () => {
    delete process.env.DYNAMODB_TABLE_NAME;

    const game = await createTestGame();
    expect(game).toBeDefined();
    expect(game.gameId).toBeDefined();
    expect(game.status).toBe('active');
    expect(game.candidates).toEqual([]);
  });

  it('should create game with tags: ["E2E"] and GSI3PK: "TAG#E2E"', async () => {
    const { getDynamoDocClient } = await import('./aws-client-factory');
    const mockSend = vi.fn().mockResolvedValue({});
    vi.mocked(getDynamoDocClient).mockReturnValue({ send: mockSend } as never);

    const game = await createTestGame();

    expect(game).toBeDefined();
    expect(game.gameId).toBeDefined();

    // Verify PutCommand was called with tags and GSI3PK
    const putCall = mockSend.mock.calls[0][0];
    const item = putCall.input.Item;
    expect(item.tags).toEqual(['E2E']);
    expect(item.GSI3PK).toBe('TAG#E2E');
    expect(item.entityType).toBe('GAME');
    expect(item.PK).toBe(`GAME#${game.gameId}`);
  });
});

describe('createTestCandidate', () => {
  beforeEach(() => {
    process.env.DYNAMODB_TABLE_NAME = 'test-table';
    process.env.AWS_REGION = 'ap-northeast-1';
  });

  afterEach(() => {
    delete process.env.DYNAMODB_TABLE_NAME;
    vi.clearAllMocks();
  });

  it('should return mock candidate if DYNAMODB_TABLE_NAME is not set', async () => {
    delete process.env.DYNAMODB_TABLE_NAME;

    const candidate = await createTestCandidate('test-game-id');
    expect(candidate).toBeDefined();
    expect(candidate.candidateId).toBeDefined();
    expect(candidate.description).toContain('テスト候補');
  });
});

describe('cleanupTestGame', () => {
  beforeEach(() => {
    process.env.DYNAMODB_TABLE_NAME = 'test-table';
    process.env.AWS_REGION = 'ap-northeast-1';
  });

  afterEach(() => {
    delete process.env.DYNAMODB_TABLE_NAME;
    vi.clearAllMocks();
  });

  it('should not throw error if DYNAMODB_TABLE_NAME is not set', async () => {
    delete process.env.DYNAMODB_TABLE_NAME;

    const testGame = {
      gameId: 'test-game-id',
      status: 'active' as const,
      candidates: [],
    };

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
          position: '2,3',
        },
        {
          candidateId: 'candidate-2',
          description: 'Test candidate 2',
          position: '3,4',
        },
      ],
    };

    await expect(cleanupTestGame(testGame)).resolves.toBeUndefined();
  });
});
