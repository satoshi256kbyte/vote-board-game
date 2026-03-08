/**
 * CandidateService ユニットテスト
 *
 * Requirements: 1.1, 1.2, 3.1, 3.2, 4.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CandidateService, GameNotFoundError, TurnNotFoundError } from './candidate.js';
import type { CandidateRepository } from '../lib/dynamodb/repositories/candidate.js';
import type { GameRepository } from '../lib/dynamodb/repositories/game.js';
import type { CandidateEntity, GameEntity } from '../lib/dynamodb/types.js';

// モックリポジトリの作成
function createMockCandidateRepo(): { listByTurn: ReturnType<typeof vi.fn> } {
  return { listByTurn: vi.fn() };
}

function createMockGameRepo(): { getById: ReturnType<typeof vi.fn> } {
  return { getById: vi.fn() };
}

function createCandidateEntity(overrides: Partial<CandidateEntity> = {}): CandidateEntity {
  return {
    PK: 'GAME#game-1#TURN#1',
    SK: 'CANDIDATE#c1',
    entityType: 'CANDIDATE',
    candidateId: 'c1',
    gameId: 'game-1',
    turnNumber: 1,
    position: '3,4',
    description: 'テスト候補',
    voteCount: 10,
    createdBy: 'AI',
    status: 'VOTING',
    votingDeadline: '2024-01-15T23:59:59.999Z',
    createdAt: '2024-01-14T00:00:00.000Z',
    ...overrides,
  };
}

function createGameEntity(overrides: Partial<GameEntity> = {}): GameEntity {
  return {
    PK: 'GAME#game-1',
    SK: 'GAME#game-1',
    entityType: 'GAME',
    GSI1PK: 'GAME#STATUS#ACTIVE',
    GSI1SK: '2024-01-14T00:00:00.000Z',
    gameId: 'game-1',
    gameType: 'OTHELLO',
    status: 'ACTIVE',
    aiSide: 'BLACK',
    currentTurn: 5,
    boardState: '{}',
    createdAt: '2024-01-14T00:00:00.000Z',
    ...overrides,
  };
}

describe('CandidateService', () => {
  let service: CandidateService;
  let mockCandidateRepo: ReturnType<typeof createMockCandidateRepo>;
  let mockGameRepo: ReturnType<typeof createMockGameRepo>;

  beforeEach(() => {
    mockCandidateRepo = createMockCandidateRepo();
    mockGameRepo = createMockGameRepo();
    service = new CandidateService(
      mockCandidateRepo as unknown as CandidateRepository,
      mockGameRepo as unknown as GameRepository
    );
  });

  describe('listCandidates - 正常系', () => {
    it('候補一覧を投票数降順で返す', async () => {
      mockGameRepo.getById.mockResolvedValue(createGameEntity());
      mockCandidateRepo.listByTurn.mockResolvedValue([
        createCandidateEntity({ candidateId: 'c1', voteCount: 5 }),
        createCandidateEntity({ candidateId: 'c2', voteCount: 42 }),
        createCandidateEntity({ candidateId: 'c3', voteCount: 20 }),
      ]);

      const result = await service.listCandidates('game-1', 1);

      expect(result.candidates).toHaveLength(3);
      expect(result.candidates[0].voteCount).toBe(42);
      expect(result.candidates[1].voteCount).toBe(20);
      expect(result.candidates[2].voteCount).toBe(5);
    });

    it('レスポンスに必須フィールドが含まれる', async () => {
      mockGameRepo.getById.mockResolvedValue(createGameEntity());
      mockCandidateRepo.listByTurn.mockResolvedValue([createCandidateEntity()]);

      const result = await service.listCandidates('game-1', 1);
      const candidate = result.candidates[0];

      expect(candidate).toHaveProperty('candidateId');
      expect(candidate).toHaveProperty('position');
      expect(candidate).toHaveProperty('description');
      expect(candidate).toHaveProperty('voteCount');
      expect(candidate).toHaveProperty('createdBy');
      expect(candidate).toHaveProperty('status');
      expect(candidate).toHaveProperty('votingDeadline');
      expect(candidate).toHaveProperty('createdAt');
    });

    it('同じ投票数の候補がある場合も正常に返す', async () => {
      mockGameRepo.getById.mockResolvedValue(createGameEntity());
      mockCandidateRepo.listByTurn.mockResolvedValue([
        createCandidateEntity({ candidateId: 'c1', voteCount: 10 }),
        createCandidateEntity({ candidateId: 'c2', voteCount: 10 }),
      ]);

      const result = await service.listCandidates('game-1', 1);

      expect(result.candidates).toHaveLength(2);
      expect(result.candidates[0].voteCount).toBe(10);
      expect(result.candidates[1].voteCount).toBe(10);
    });
  });

  describe('listCandidates - 空の候補一覧', () => {
    it('候補が存在しない場合は空配列を返す', async () => {
      mockGameRepo.getById.mockResolvedValue(createGameEntity());
      mockCandidateRepo.listByTurn.mockResolvedValue([]);

      const result = await service.listCandidates('game-1', 1);

      expect(result.candidates).toEqual([]);
    });
  });

  describe('listCandidates - エラー系', () => {
    it('ゲームが存在しない場合 GameNotFoundError をスロー', async () => {
      mockGameRepo.getById.mockResolvedValue(null);

      await expect(service.listCandidates('nonexistent-game', 1)).rejects.toThrow(
        GameNotFoundError
      );
    });

    it('ターンが存在しない場合 TurnNotFoundError をスロー', async () => {
      mockGameRepo.getById.mockResolvedValue(createGameEntity({ currentTurn: 3 }));

      await expect(service.listCandidates('game-1', 10)).rejects.toThrow(TurnNotFoundError);
    });

    it('GameNotFoundError のメッセージが正しい', async () => {
      mockGameRepo.getById.mockResolvedValue(null);

      await expect(service.listCandidates('game-1', 1)).rejects.toThrow('Game not found');
    });

    it('TurnNotFoundError のメッセージが正しい', async () => {
      mockGameRepo.getById.mockResolvedValue(createGameEntity({ currentTurn: 2 }));

      await expect(service.listCandidates('game-1', 5)).rejects.toThrow('Turn not found');
    });
  });
});
