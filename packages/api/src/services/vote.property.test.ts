/**
 * VoteService プロパティベーステスト
 *
 * createVote:
 *   Property 7: 既存投票がある場合に AlreadyVotedError がスローされる
 *   Property 8: 成功レスポンスの形式検証
 *
 * changeVote:
 *   Property 5: 未投票ユーザーの拒否
 *   Property 6: 同一候補への変更の拒否
 *   Property 7: アトミックな投票数更新
 *   Property 8: 成功レスポンスの形式
 *
 * Requirements: 6.1, 6.2, 7.1, 7.2, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { VoteService, AlreadyVotedError, NotVotedError, SameCandidateError } from './vote.js';
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

/**
 * changeVote プロパティベーステスト
 *
 * Feature: 21-vote-change-api
 */
describe('VoteService.changeVote - プロパティテスト', () => {
  let service: VoteService;
  let mockVoteRepo: ReturnType<typeof createMockVoteRepo>;
  let mockCandidateRepo: ReturnType<typeof createMockCandidateRepo>;
  let mockGameRepo: ReturnType<typeof createMockGameRepo>;

  const NEW_CANDIDATE_ID = '890e1234-e89b-12d3-a456-426614174003';

  function createCandidateEntityWithId(candidateId: string): CandidateEntity {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    return {
      PK: `GAME#${GAME_ID}#TURN#${TURN_NUMBER}`,
      SK: `CANDIDATE#${candidateId}`,
      entityType: 'CANDIDATE',
      candidateId,
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

  function createVoteEntityWithCandidate(userId: string, candidateId: string): VoteEntity {
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
      candidateId,
      createdAt: now,
      updatedAt: now,
    };
  }

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

  /**
   * Feature: 21-vote-change-api, Property 5: 未投票ユーザーの拒否
   * **Validates: Requirements 6.1, 6.2**
   */
  it('Property 5: 未投票ユーザーによる投票変更で NotVotedError がスローされる', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), async (userId) => {
        mockVoteRepo.getByUser.mockClear();
        mockGameRepo.getById.mockClear();
        mockCandidateRepo.listByTurn.mockClear();

        mockGameRepo.getById.mockResolvedValue(createGameEntity());
        mockCandidateRepo.listByTurn.mockResolvedValue([
          createCandidateEntityWithId(NEW_CANDIDATE_ID),
        ]);
        // 既存投票なし → NotVotedError
        mockVoteRepo.getByUser.mockResolvedValue(null);

        await expect(
          service.changeVote(GAME_ID, TURN_NUMBER, NEW_CANDIDATE_ID, userId)
        ).rejects.toThrow(NotVotedError);
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });

  /**
   * Feature: 21-vote-change-api, Property 6: 同一候補への変更の拒否
   * **Validates: Requirements 7.1, 7.2**
   */
  it('Property 6: 同一候補への変更で SameCandidateError がスローされる', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), fc.uuid(), async (userId, candidateId) => {
        mockVoteRepo.getByUser.mockClear();
        mockGameRepo.getById.mockClear();
        mockCandidateRepo.listByTurn.mockClear();

        mockGameRepo.getById.mockResolvedValue(createGameEntity());
        mockCandidateRepo.listByTurn.mockResolvedValue([createCandidateEntityWithId(candidateId)]);
        // 既存投票が同じ candidateId
        mockVoteRepo.getByUser.mockResolvedValue(
          createVoteEntityWithCandidate(userId, candidateId)
        );

        await expect(service.changeVote(GAME_ID, TURN_NUMBER, candidateId, userId)).rejects.toThrow(
          SameCandidateError
        );
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });

  /**
   * Feature: 21-vote-change-api, Property 7: アトミックな投票数更新
   * **Validates: Requirements 8.1, 8.2, 8.3, 8.4**
   */
  it('Property 7: upsertWithTransaction が oldCandidateId 付きで呼ばれる', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        async (userId, oldCandidateId, newCandidateId) => {
          // 旧候補と新候補が同一の場合は SameCandidateError になるためスキップ
          fc.pre(oldCandidateId !== newCandidateId);

          mockVoteRepo.getByUser.mockClear();
          mockVoteRepo.upsertWithTransaction.mockClear();
          mockGameRepo.getById.mockClear();
          mockCandidateRepo.listByTurn.mockClear();

          mockGameRepo.getById.mockResolvedValue(createGameEntity());
          mockCandidateRepo.listByTurn.mockResolvedValue([
            createCandidateEntityWithId(oldCandidateId),
            createCandidateEntityWithId(newCandidateId),
          ]);
          mockVoteRepo.getByUser.mockResolvedValue(
            createVoteEntityWithCandidate(userId, oldCandidateId)
          );
          mockVoteRepo.upsertWithTransaction.mockResolvedValue(
            createVoteEntityWithCandidate(userId, newCandidateId)
          );

          await service.changeVote(GAME_ID, TURN_NUMBER, newCandidateId, userId);

          expect(mockVoteRepo.upsertWithTransaction).toHaveBeenCalledWith({
            gameId: GAME_ID,
            turnNumber: TURN_NUMBER,
            userId,
            candidateId: newCandidateId,
            oldCandidateId,
          });
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  /**
   * Feature: 21-vote-change-api, Property 8: 成功レスポンスの形式
   * **Validates: Requirements 8.5, 9.1, 9.2, 9.3, 9.4**
   */
  it('Property 8: 成功レスポンスに必須フィールドが含まれ日時が ISO 8601 形式', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        async (userId, oldCandidateId, newCandidateId) => {
          fc.pre(oldCandidateId !== newCandidateId);

          mockVoteRepo.getByUser.mockClear();
          mockVoteRepo.upsertWithTransaction.mockClear();
          mockGameRepo.getById.mockClear();
          mockCandidateRepo.listByTurn.mockClear();

          mockGameRepo.getById.mockResolvedValue(createGameEntity());
          mockCandidateRepo.listByTurn.mockResolvedValue([
            createCandidateEntityWithId(oldCandidateId),
            createCandidateEntityWithId(newCandidateId),
          ]);
          mockVoteRepo.getByUser.mockResolvedValue(
            createVoteEntityWithCandidate(userId, oldCandidateId)
          );
          mockVoteRepo.upsertWithTransaction.mockResolvedValue(
            createVoteEntityWithCandidate(userId, newCandidateId)
          );

          const result = await service.changeVote(GAME_ID, TURN_NUMBER, newCandidateId, userId);

          // 必須フィールドの存在確認
          expect(result).toHaveProperty('gameId');
          expect(result).toHaveProperty('turnNumber');
          expect(result).toHaveProperty('userId');
          expect(result).toHaveProperty('candidateId');
          expect(result).toHaveProperty('createdAt');
          expect(result).toHaveProperty('updatedAt');

          // 値の一致確認
          expect(result.gameId).toBe(GAME_ID);
          expect(result.turnNumber).toBe(TURN_NUMBER);
          expect(result.userId).toBe(userId);
          expect(result.candidateId).toBe(newCandidateId);

          // ISO 8601 形式の検証
          expect(new Date(result.createdAt).toISOString()).toBe(result.createdAt);
          expect(new Date(result.updatedAt).toISOString()).toBe(result.updatedAt);
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });
});

/**
 * getMyVote プロパティベーステスト
 *
 * Feature: 22-vote-status-api, Property 4: 成功レスポンスの形式
 *
 * 投票が存在するユーザーからの有効なリクエストに対して、
 * gameId, turnNumber, userId, candidateId, createdAt, updatedAt のすべてのフィールドを含む。
 * updatedAt が未定義の場合は createdAt の値をフォールバックとして使用する。
 *
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
 */
describe('VoteService.getMyVote - プロパティテスト', () => {
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

  it('Property 4: 成功レスポンスに必須フィールドが含まれ updatedAt が createdAt にフォールバックする', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), fc.boolean(), async (userId, hasUpdatedAt) => {
        mockVoteRepo.getByUser.mockClear();

        const now = new Date().toISOString();
        const entity: VoteEntity = {
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
          updatedAt: hasUpdatedAt ? now : undefined,
        };
        mockVoteRepo.getByUser.mockResolvedValue(entity);

        const result = await service.getMyVote(GAME_ID, TURN_NUMBER, userId);

        // 必須フィールドの存在確認
        expect(result).toHaveProperty('gameId');
        expect(result).toHaveProperty('turnNumber');
        expect(result).toHaveProperty('userId');
        expect(result).toHaveProperty('candidateId');
        expect(result).toHaveProperty('createdAt');
        expect(result).toHaveProperty('updatedAt');

        // 値の一致確認
        expect(result.gameId).toBe(GAME_ID);
        expect(result.turnNumber).toBe(TURN_NUMBER);
        expect(result.userId).toBe(userId);
        expect(result.candidateId).toBe(CANDIDATE_ID);

        // ISO 8601 形式の検証
        expect(new Date(result.createdAt).toISOString()).toBe(result.createdAt);
        expect(new Date(result.updatedAt).toISOString()).toBe(result.updatedAt);

        // updatedAt フォールバックの検証
        if (!hasUpdatedAt) {
          expect(result.updatedAt).toBe(result.createdAt);
        }
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });
});
