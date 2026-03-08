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

import { InvalidMoveError, VotingClosedError, DuplicatePositionError } from './candidate.js';
import { createInitialBoard } from '../lib/othello/board.js';

// createCandidate 用のモックリポジトリ
function createMockCandidateRepoForCreate(): {
  listByTurn: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
} {
  return {
    listByTurn: vi.fn(),
    create: vi.fn(),
  };
}

function createMockGameRepoFull(): {
  getById: ReturnType<typeof vi.fn>;
} {
  return { getById: vi.fn() };
}

// 初期盤面の JSON 文字列
const initialBoardState = JSON.stringify({ board: createInitialBoard() });

// 未来の投票締切
const futureDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
// 過去の投票締切
const pastDeadline = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

function createActiveGame(overrides: Partial<GameEntity> = {}): GameEntity {
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
    currentTurn: 0,
    boardState: initialBoardState,
    createdAt: '2024-01-14T00:00:00.000Z',
    ...overrides,
  };
}

describe('CandidateService - createCandidate', () => {
  let service: CandidateService;
  let mockCandidateRepo: ReturnType<typeof createMockCandidateRepoForCreate>;
  let mockGameRepo: ReturnType<typeof createMockGameRepoFull>;

  beforeEach(() => {
    mockCandidateRepo = createMockCandidateRepoForCreate();
    mockGameRepo = createMockGameRepoFull();
    service = new CandidateService(
      mockCandidateRepo as unknown as CandidateRepository,
      mockGameRepo as unknown as GameRepository
    );
  });

  describe('正常系', () => {
    it('有効なリクエストで候補が作成される', async () => {
      const game = createActiveGame();
      mockGameRepo.getById.mockResolvedValue(game);
      mockCandidateRepo.listByTurn.mockResolvedValue([]);
      mockCandidateRepo.create.mockImplementation(async (params: Record<string, unknown>) => ({
        PK: `GAME#game-1#TURN#0`,
        SK: `CANDIDATE#${params.candidateId}`,
        entityType: 'CANDIDATE',
        candidateId: params.candidateId,
        gameId: params.gameId,
        turnNumber: params.turnNumber,
        position: params.position,
        description: params.description,
        voteCount: 0,
        createdBy: params.createdBy,
        status: 'VOTING',
        votingDeadline: params.votingDeadline,
        createdAt: '2024-01-14T12:00:00.000Z',
      }));

      // aiSide=BLACK → collective=WHITE, valid WHITE moves on initial board: (2,4), (3,5), (4,2), (5,3)
      const result = await service.createCandidate('game-1', 0, '2,4', 'テスト説明', 'user-123');

      expect(result.gameId).toBe('game-1');
      expect(result.turnNumber).toBe(0);
      expect(result.position).toBe('2,4');
      expect(result.description).toBe('テスト説明');
      expect(result.voteCount).toBe(0);
      expect(result.status).toBe('VOTING');
      expect(result.createdBy).toBe('USER#user-123');
      expect(result.candidateId).toBeDefined();
    });

    it('既存候補がある場合、同じ votingDeadline が使用される', async () => {
      const game = createActiveGame();
      mockGameRepo.getById.mockResolvedValue(game);
      mockCandidateRepo.listByTurn.mockResolvedValue([
        createCandidateEntity({
          position: '3,5',
          votingDeadline: futureDeadline,
        }),
      ]);
      mockCandidateRepo.create.mockImplementation(async (params: Record<string, unknown>) => ({
        PK: 'GAME#game-1#TURN#0',
        SK: `CANDIDATE#${params.candidateId}`,
        entityType: 'CANDIDATE',
        candidateId: params.candidateId,
        gameId: params.gameId,
        turnNumber: params.turnNumber,
        position: params.position,
        description: params.description,
        voteCount: 0,
        createdBy: params.createdBy,
        status: 'VOTING',
        votingDeadline: params.votingDeadline,
        createdAt: '2024-01-14T12:00:00.000Z',
      }));

      const result = await service.createCandidate('game-1', 0, '2,4', 'テスト', 'user-123');

      expect(mockCandidateRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ votingDeadline: futureDeadline })
      );
      expect(result.votingDeadline).toBe(futureDeadline);
    });
  });

  describe('エラー系', () => {
    it('ゲームが存在しない場合 GameNotFoundError をスロー', async () => {
      mockGameRepo.getById.mockResolvedValue(null);

      await expect(
        service.createCandidate('nonexistent', 0, '2,4', 'テスト', 'user-123')
      ).rejects.toThrow(GameNotFoundError);
    });

    it('ゲームが FINISHED の場合 VotingClosedError をスロー', async () => {
      mockGameRepo.getById.mockResolvedValue(createActiveGame({ status: 'FINISHED' }));

      await expect(
        service.createCandidate('game-1', 0, '2,4', 'テスト', 'user-123')
      ).rejects.toThrow(VotingClosedError);
    });

    it('ターンが存在しない場合 TurnNotFoundError をスロー', async () => {
      mockGameRepo.getById.mockResolvedValue(createActiveGame({ currentTurn: 3 }));

      await expect(
        service.createCandidate('game-1', 10, '2,4', 'テスト', 'user-123')
      ).rejects.toThrow(TurnNotFoundError);
    });

    it('投票締切済みの場合 VotingClosedError をスロー', async () => {
      mockGameRepo.getById.mockResolvedValue(createActiveGame());
      mockCandidateRepo.listByTurn.mockResolvedValue([
        createCandidateEntity({ votingDeadline: pastDeadline }),
      ]);

      await expect(
        service.createCandidate('game-1', 0, '2,4', 'テスト', 'user-123')
      ).rejects.toThrow(VotingClosedError);
    });

    it('重複ポジションの場合 DuplicatePositionError をスロー', async () => {
      mockGameRepo.getById.mockResolvedValue(createActiveGame());
      mockCandidateRepo.listByTurn.mockResolvedValue([
        createCandidateEntity({
          position: '2,4',
          votingDeadline: futureDeadline,
        }),
      ]);

      await expect(
        service.createCandidate('game-1', 0, '2,4', 'テスト', 'user-123')
      ).rejects.toThrow(DuplicatePositionError);
    });

    it('オセロルール上無効な手の場合 InvalidMoveError をスロー', async () => {
      mockGameRepo.getById.mockResolvedValue(createActiveGame());
      mockCandidateRepo.listByTurn.mockResolvedValue([]);

      // (0,0) は初期盤面では有効な手ではない
      await expect(
        service.createCandidate('game-1', 0, '0,0', 'テスト', 'user-123')
      ).rejects.toThrow(InvalidMoveError);
    });

    it('既に石がある位置の場合 InvalidMoveError をスロー', async () => {
      mockGameRepo.getById.mockResolvedValue(createActiveGame());
      mockCandidateRepo.listByTurn.mockResolvedValue([]);

      // (3,3) は初期盤面で White の石がある
      await expect(
        service.createCandidate('game-1', 0, '3,3', 'テスト', 'user-123')
      ).rejects.toThrow(InvalidMoveError);
    });
  });

  describe('初期値の検証', () => {
    it('voteCount=0, status=VOTING, createdBy=USER# 形式で作成される', async () => {
      mockGameRepo.getById.mockResolvedValue(createActiveGame());
      mockCandidateRepo.listByTurn.mockResolvedValue([]);
      mockCandidateRepo.create.mockImplementation(async (params: Record<string, unknown>) => ({
        PK: 'GAME#game-1#TURN#0',
        SK: `CANDIDATE#${params.candidateId}`,
        entityType: 'CANDIDATE',
        candidateId: params.candidateId,
        gameId: params.gameId,
        turnNumber: params.turnNumber,
        position: params.position,
        description: params.description,
        voteCount: 0,
        createdBy: params.createdBy,
        status: 'VOTING',
        votingDeadline: params.votingDeadline,
        createdAt: '2024-01-14T12:00:00.000Z',
      }));

      const result = await service.createCandidate('game-1', 0, '2,4', 'テスト', 'user-456');

      expect(result.voteCount).toBe(0);
      expect(result.status).toBe('VOTING');
      expect(result.createdBy).toBe('USER#user-456');
    });
  });
});
