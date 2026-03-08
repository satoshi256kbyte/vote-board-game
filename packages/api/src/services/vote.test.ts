/**
 * VoteService ユニットテスト
 *
 * Requirements: 3.1, 3.2, 4.1, 4.2, 4.3, 5.1, 6.1, 7.1-7.5, 8.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  VoteService,
  CandidateNotFoundError,
  VotingClosedError,
  AlreadyVotedError,
  NotVotedError,
  SameCandidateError,
} from './vote.js';
import { GameNotFoundError, TurnNotFoundError } from './candidate.js';
import type { VoteRepository } from '../lib/dynamodb/repositories/vote.js';
import type { CandidateRepository } from '../lib/dynamodb/repositories/candidate.js';
import type { GameRepository } from '../lib/dynamodb/repositories/game.js';
import type { GameEntity, CandidateEntity, VoteEntity } from '../lib/dynamodb/types.js';

function createMockVoteRepo() {
  return {
    getByUser: vi.fn(),
    upsertWithTransaction: vi.fn(),
  };
}

function createMockCandidateRepo() {
  return { listByTurn: vi.fn() };
}

function createMockGameRepo() {
  return { getById: vi.fn() };
}

const GAME_ID = '550e8400-e29b-41d4-a716-446655440000';
const CANDIDATE_ID = '789e0123-e89b-12d3-a456-426614174002';
const USER_ID = 'user-123';
const TURN_NUMBER = 5;

function createGameEntity(overrides: Partial<GameEntity> = {}): GameEntity {
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
    ...overrides,
  };
}

function createCandidateEntity(overrides: Partial<CandidateEntity> = {}): CandidateEntity {
  // 未来の日付を投票締切に設定
  const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  return {
    PK: `GAME#${GAME_ID}#TURN#${TURN_NUMBER}`,
    SK: `CANDIDATE#${CANDIDATE_ID}`,
    entityType: 'CANDIDATE',
    candidateId: CANDIDATE_ID,
    gameId: GAME_ID,
    turnNumber: TURN_NUMBER,
    position: '3,4',
    description: 'テスト候補',
    voteCount: 10,
    createdBy: 'AI',
    status: 'VOTING',
    votingDeadline: futureDate,
    createdAt: '2024-01-14T00:00:00.000Z',
    ...overrides,
  };
}

function createVoteEntity(overrides: Partial<VoteEntity> = {}): VoteEntity {
  return {
    PK: `GAME#${GAME_ID}#TURN#${TURN_NUMBER}`,
    SK: `VOTE#${USER_ID}`,
    GSI2PK: `USER#${USER_ID}`,
    GSI2SK: `VOTE#2024-01-15T00:00:00.000Z`,
    entityType: 'VOTE',
    gameId: GAME_ID,
    turnNumber: TURN_NUMBER,
    userId: USER_ID,
    candidateId: CANDIDATE_ID,
    createdAt: '2024-01-15T00:00:00.000Z',
    updatedAt: '2024-01-15T00:00:00.000Z',
    ...overrides,
  };
}

describe('VoteService', () => {
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

  describe('createVote - 正常系', () => {
    it('有効なリクエストで投票が作成される', async () => {
      mockGameRepo.getById.mockResolvedValue(createGameEntity());
      mockCandidateRepo.listByTurn.mockResolvedValue([createCandidateEntity()]);
      mockVoteRepo.getByUser.mockResolvedValue(null);
      mockVoteRepo.upsertWithTransaction.mockResolvedValue(createVoteEntity());

      const result = await service.createVote(GAME_ID, TURN_NUMBER, CANDIDATE_ID, USER_ID);

      expect(result.gameId).toBe(GAME_ID);
      expect(result.turnNumber).toBe(TURN_NUMBER);
      expect(result.userId).toBe(USER_ID);
      expect(result.candidateId).toBe(CANDIDATE_ID);
      expect(result.createdAt).toBeDefined();
    });

    it('レスポンスに必須フィールドがすべて含まれる', async () => {
      mockGameRepo.getById.mockResolvedValue(createGameEntity());
      mockCandidateRepo.listByTurn.mockResolvedValue([createCandidateEntity()]);
      mockVoteRepo.getByUser.mockResolvedValue(null);
      mockVoteRepo.upsertWithTransaction.mockResolvedValue(createVoteEntity());

      const result = await service.createVote(GAME_ID, TURN_NUMBER, CANDIDATE_ID, USER_ID);

      expect(result).toHaveProperty('gameId');
      expect(result).toHaveProperty('turnNumber');
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('candidateId');
      expect(result).toHaveProperty('createdAt');
    });

    it('upsertWithTransactionに正しいパラメータが渡される', async () => {
      mockGameRepo.getById.mockResolvedValue(createGameEntity());
      mockCandidateRepo.listByTurn.mockResolvedValue([createCandidateEntity()]);
      mockVoteRepo.getByUser.mockResolvedValue(null);
      mockVoteRepo.upsertWithTransaction.mockResolvedValue(createVoteEntity());

      await service.createVote(GAME_ID, TURN_NUMBER, CANDIDATE_ID, USER_ID);

      expect(mockVoteRepo.upsertWithTransaction).toHaveBeenCalledWith({
        gameId: GAME_ID,
        turnNumber: TURN_NUMBER,
        userId: USER_ID,
        candidateId: CANDIDATE_ID,
      });
    });
  });

  describe('createVote - エラー系', () => {
    it('ゲームが存在しない場合 GameNotFoundError をスローする', async () => {
      mockGameRepo.getById.mockResolvedValue(null);

      await expect(service.createVote(GAME_ID, TURN_NUMBER, CANDIDATE_ID, USER_ID)).rejects.toThrow(
        GameNotFoundError
      );
    });

    it('ゲームが非アクティブの場合 VotingClosedError をスローする', async () => {
      mockGameRepo.getById.mockResolvedValue(createGameEntity({ status: 'FINISHED' }));

      await expect(service.createVote(GAME_ID, TURN_NUMBER, CANDIDATE_ID, USER_ID)).rejects.toThrow(
        VotingClosedError
      );
    });

    it('ターンが存在しない場合 TurnNotFoundError をスローする', async () => {
      mockGameRepo.getById.mockResolvedValue(createGameEntity({ currentTurn: 3 }));

      await expect(service.createVote(GAME_ID, TURN_NUMBER, CANDIDATE_ID, USER_ID)).rejects.toThrow(
        TurnNotFoundError
      );
    });

    it('候補が存在しない場合 CandidateNotFoundError をスローする', async () => {
      mockGameRepo.getById.mockResolvedValue(createGameEntity());
      mockCandidateRepo.listByTurn.mockResolvedValue([
        createCandidateEntity({ candidateId: 'other-candidate-id' }),
      ]);

      await expect(service.createVote(GAME_ID, TURN_NUMBER, CANDIDATE_ID, USER_ID)).rejects.toThrow(
        CandidateNotFoundError
      );
    });

    it('投票締切済みの場合 VotingClosedError をスローする', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      mockGameRepo.getById.mockResolvedValue(createGameEntity());
      mockCandidateRepo.listByTurn.mockResolvedValue([
        createCandidateEntity({ votingDeadline: pastDate }),
      ]);

      await expect(service.createVote(GAME_ID, TURN_NUMBER, CANDIDATE_ID, USER_ID)).rejects.toThrow(
        VotingClosedError
      );
    });

    it('候補ステータスがVOTINGでない場合 VotingClosedError をスローする', async () => {
      mockGameRepo.getById.mockResolvedValue(createGameEntity());
      mockCandidateRepo.listByTurn.mockResolvedValue([createCandidateEntity({ status: 'CLOSED' })]);

      await expect(service.createVote(GAME_ID, TURN_NUMBER, CANDIDATE_ID, USER_ID)).rejects.toThrow(
        VotingClosedError
      );
    });

    it('既に投票済みの場合 AlreadyVotedError をスローする', async () => {
      mockGameRepo.getById.mockResolvedValue(createGameEntity());
      mockCandidateRepo.listByTurn.mockResolvedValue([createCandidateEntity()]);
      mockVoteRepo.getByUser.mockResolvedValue(createVoteEntity());

      await expect(service.createVote(GAME_ID, TURN_NUMBER, CANDIDATE_ID, USER_ID)).rejects.toThrow(
        AlreadyVotedError
      );
    });
  });

  describe('changeVote - 正常系', () => {
    const NEW_CANDIDATE_ID = '111e2222-e89b-12d3-a456-426614174099';
    const OLD_CANDIDATE_ID = CANDIDATE_ID;

    function setupSuccessScenario() {
      const existingVote = createVoteEntity({ candidateId: OLD_CANDIDATE_ID });
      const updatedVote = createVoteEntity({
        candidateId: NEW_CANDIDATE_ID,
        updatedAt: '2024-01-16T00:00:00.000Z',
      });
      mockGameRepo.getById.mockResolvedValue(createGameEntity());
      mockCandidateRepo.listByTurn.mockResolvedValue([
        createCandidateEntity({ candidateId: OLD_CANDIDATE_ID }),
        createCandidateEntity({ candidateId: NEW_CANDIDATE_ID }),
      ]);
      mockVoteRepo.getByUser.mockResolvedValue(existingVote);
      mockVoteRepo.upsertWithTransaction.mockResolvedValue(updatedVote);
      return { existingVote, updatedVote };
    }

    it('有効なリクエストで投票が変更される', async () => {
      setupSuccessScenario();

      const result = await service.changeVote(GAME_ID, TURN_NUMBER, NEW_CANDIDATE_ID, USER_ID);

      expect(result.gameId).toBe(GAME_ID);
      expect(result.turnNumber).toBe(TURN_NUMBER);
      expect(result.userId).toBe(USER_ID);
      expect(result.candidateId).toBe(NEW_CANDIDATE_ID);
    });

    it('レスポンスに必須フィールドがすべて含まれる（gameId, turnNumber, userId, candidateId, createdAt, updatedAt）', async () => {
      setupSuccessScenario();

      const result = await service.changeVote(GAME_ID, TURN_NUMBER, NEW_CANDIDATE_ID, USER_ID);

      expect(result).toHaveProperty('gameId');
      expect(result).toHaveProperty('turnNumber');
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('candidateId');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });

    it('日時フィールドがISO 8601形式である', async () => {
      setupSuccessScenario();

      const result = await service.changeVote(GAME_ID, TURN_NUMBER, NEW_CANDIDATE_ID, USER_ID);

      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
      expect(result.createdAt).toMatch(iso8601Regex);
      expect(result.updatedAt).toMatch(iso8601Regex);
    });

    it('upsertWithTransaction が oldCandidateId 付きで呼ばれる', async () => {
      setupSuccessScenario();

      await service.changeVote(GAME_ID, TURN_NUMBER, NEW_CANDIDATE_ID, USER_ID);

      expect(mockVoteRepo.upsertWithTransaction).toHaveBeenCalledWith({
        gameId: GAME_ID,
        turnNumber: TURN_NUMBER,
        userId: USER_ID,
        candidateId: NEW_CANDIDATE_ID,
        oldCandidateId: OLD_CANDIDATE_ID,
      });
    });
  });

  describe('changeVote - エラー系', () => {
    const NEW_CANDIDATE_ID = '111e2222-e89b-12d3-a456-426614174099';
    const OLD_CANDIDATE_ID = CANDIDATE_ID;

    it('ゲームが存在しない場合 GameNotFoundError をスローする', async () => {
      mockGameRepo.getById.mockResolvedValue(null);

      await expect(
        service.changeVote(GAME_ID, TURN_NUMBER, NEW_CANDIDATE_ID, USER_ID)
      ).rejects.toThrow(GameNotFoundError);
    });

    it('ゲームが非アクティブの場合 VotingClosedError をスローする', async () => {
      mockGameRepo.getById.mockResolvedValue(createGameEntity({ status: 'FINISHED' }));

      await expect(
        service.changeVote(GAME_ID, TURN_NUMBER, NEW_CANDIDATE_ID, USER_ID)
      ).rejects.toThrow(VotingClosedError);
    });

    it('ターンが存在しない場合 TurnNotFoundError をスローする', async () => {
      mockGameRepo.getById.mockResolvedValue(createGameEntity({ currentTurn: 3 }));

      await expect(
        service.changeVote(GAME_ID, TURN_NUMBER, NEW_CANDIDATE_ID, USER_ID)
      ).rejects.toThrow(TurnNotFoundError);
    });

    it('候補が存在しない場合 CandidateNotFoundError をスローする', async () => {
      mockGameRepo.getById.mockResolvedValue(createGameEntity());
      mockCandidateRepo.listByTurn.mockResolvedValue([
        createCandidateEntity({ candidateId: 'other-candidate-id' }),
      ]);

      await expect(
        service.changeVote(GAME_ID, TURN_NUMBER, NEW_CANDIDATE_ID, USER_ID)
      ).rejects.toThrow(CandidateNotFoundError);
    });

    it('投票締切済みの場合 VotingClosedError をスローする', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      mockGameRepo.getById.mockResolvedValue(createGameEntity());
      mockCandidateRepo.listByTurn.mockResolvedValue([
        createCandidateEntity({ candidateId: NEW_CANDIDATE_ID, votingDeadline: pastDate }),
      ]);

      await expect(
        service.changeVote(GAME_ID, TURN_NUMBER, NEW_CANDIDATE_ID, USER_ID)
      ).rejects.toThrow(VotingClosedError);
    });

    it('候補ステータスがVOTINGでない場合 VotingClosedError をスローする', async () => {
      mockGameRepo.getById.mockResolvedValue(createGameEntity());
      mockCandidateRepo.listByTurn.mockResolvedValue([
        createCandidateEntity({ candidateId: NEW_CANDIDATE_ID, status: 'CLOSED' }),
      ]);

      await expect(
        service.changeVote(GAME_ID, TURN_NUMBER, NEW_CANDIDATE_ID, USER_ID)
      ).rejects.toThrow(VotingClosedError);
    });

    it('未投票の場合 NotVotedError をスローする', async () => {
      mockGameRepo.getById.mockResolvedValue(createGameEntity());
      mockCandidateRepo.listByTurn.mockResolvedValue([
        createCandidateEntity({ candidateId: NEW_CANDIDATE_ID }),
      ]);
      mockVoteRepo.getByUser.mockResolvedValue(null);

      await expect(
        service.changeVote(GAME_ID, TURN_NUMBER, NEW_CANDIDATE_ID, USER_ID)
      ).rejects.toThrow(NotVotedError);
    });

    it('同一候補への変更の場合 SameCandidateError をスローする', async () => {
      mockGameRepo.getById.mockResolvedValue(createGameEntity());
      mockCandidateRepo.listByTurn.mockResolvedValue([
        createCandidateEntity({ candidateId: OLD_CANDIDATE_ID }),
      ]);
      mockVoteRepo.getByUser.mockResolvedValue(createVoteEntity({ candidateId: OLD_CANDIDATE_ID }));

      await expect(
        service.changeVote(GAME_ID, TURN_NUMBER, OLD_CANDIDATE_ID, USER_ID)
      ).rejects.toThrow(SameCandidateError);
    });
  });
});
