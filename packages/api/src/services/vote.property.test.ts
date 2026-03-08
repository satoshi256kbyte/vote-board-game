/**
 * VoteService プロパティベーステスト
 *
 * Property 7: 既存投票がある場合に AlreadyVotedError がスローされる
 * Property 8: 成功レスポンスの形式検証
 *
 * Requirements: 6.1, 6.2, 7.4, 7.5, 8.1, 8.3, 8.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { VoteService, AlreadyVotedError } from './vote.js';
import type { VoteRepository } from '../lib/dynamodb/repositories/vote.js';
import type { CandidateRepository } from '../lib/dynamodb/repositories/candidate.js';
import type { GameRepository } from '../lib/dynamodb/repositories/game.js';
import type { GameEntity, CandidateEntity, VoteEntity } from '../lib/dynamodb/types.js';

const GAME_ID = '550e8400-e29b-41d4-a716-446655440000';
const CANDIDATE_ID = '789e0123-e89b-12d3-a456-426614174002';
const TURN_NUMBER = 5;

function createMockVoteRepo() {
  return { getByUser: vi.fn(), upsertWithTransaction: vi.fn() };
}
function createMockCandidateRepo() {
  return { listByTurn: vi.fn() };
}
function createMockGameRepo() {
  return { getById: vi.fn() };
}

function createGameEntity(): GameEntity {
  return {
    PK: `GAME#${GAME_ID}`,
    SK: `GAME#${GAME_ID}`,
    entityType: 'GAME',
    GSI1PK: 'GAME#STATUS#ACTIVE',
    GSI1SK: '2024-01-14T00:00:00.000Z',
    gameId: GAME_ID,
    gameType: 'OTHELLO',
    status: 'ACTIVE',
    aiSide: 'BLACK',
    currentTurn: TURN_NUMBER,
    boardState: '{}',
    createdAt: '2024-01-14T00:00:00.000Z',
  };
}

function createCandidateEntity(): CandidateEntity {
  const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  return {
    PK: `GAME#${GAME_ID}#TURN#${TURN_NUMBER}`,
    SK: `CANDIDATE#${CANDIDATE_ID}`,
    entityType: 'CANDIDATE',
    candidateId: CANDIDATE_ID,
    gameId: GAME_ID,
    turnNumber: TURN_NUMBER,
    position: '3,4',
    description: 'テスト',
    voteCount: 10,
    createdBy: 'AI',
    status: 'VOTING',
    votingDeadline: futureDate,
    createdAt: '2024-01-14T00:00:00.000Z',
  };
}

function createVoteEntity(userId: string): VoteEntity {
  const now = new Date().toISOString();
  return {
    PK: `GAME#${GAME_ID}#TURN#${TURN_NUMBER}`,
    SK: `VOTE#${userId}`,
    GSI2PK: `USER#${userId}`,
    GSI2SK: `VOTE#${now}`,
    entityType: 'VOTE',
    gameId: GAME_ID,
    turnNumber: TURN_NUMBER,
    userId,
    candidateId: CANDIDATE_ID,
    createdAt: now,
    updatedAt: now,
  };
}

describe('VoteService - プロパティテスト', () => {
  let service: VoteService;
  let mockVoteRepo: ReturnType<typeof createMockVoteRepo>;
  let mockCandidateRepo: ReturnType<typeof createMockCandidateRepo>;
  let mockGameRepo: ReturnType<typeof createMockGameRepo>;

  beforeEach(() => {
    mockVoteRepo = createMockVoteRepo();
    mockCandidateRepo = createMockCandidateRepo();
    mockGameRepo = createMockGameRepo();
    service = new VoteService(
      mockVoteRepo as unknown as VoteRepository,
      mockCandidateRepo as unknown as CandidateRepository,
      mockGameRepo as unknown as GameRepository
    );
  });

  it('Property 8: 成功レスポンスに必須フィールドが含まれ createdAt が ISO 8601 形式', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), async (userId) => {
        mockVoteRepo.getByUser.mockClear();
        mockVoteRepo.upsertWithTransaction.mockClear();
        mockGameRepo.getById.mockClear();
        mockCandidateRepo.listByTurn.mockClear();

        mockGameRepo.getById.mockResolvedValue(createGameEntity());
        mockCandidateRepo.listByTurn.mockResolvedValue([createCandidateEntity()]);
        mockVoteRepo.getByUser.mockResolvedValue(null);
        mockVoteRepo.upsertWithTransaction.mockResolvedValue(createVoteEntity(userId));

        const result = await service.createVote(GAME_ID, TURN_NUMBER, CANDIDATE_ID, userId);

        expect(result).toHaveProperty('gameId');
        expect(result).toHaveProperty('turnNumber');
        expect(result).toHaveProperty('userId');
        expect(result).toHaveProperty('candidateId');
        expect(result).toHaveProperty('createdAt');
        // ISO 8601 形式の検証
        expect(new Date(result.createdAt).toISOString()).toBe(result.createdAt);
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('Property 7: 既存投票がある場合 AlreadyVotedError がスローされる', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), async (userId) => {
        mockVoteRepo.getByUser.mockClear();
        mockGameRepo.getById.mockClear();
        mockCandidateRepo.listByTurn.mockClear();

        mockGameRepo.getById.mockResolvedValue(createGameEntity());
        mockCandidateRepo.listByTurn.mockResolvedValue([createCandidateEntity()]);
        mockVoteRepo.getByUser.mockResolvedValue(createVoteEntity(userId));

        await expect(
          service.createVote(GAME_ID, TURN_NUMBER, CANDIDATE_ID, userId)
        ).rejects.toThrow(AlreadyVotedError);
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });
});
