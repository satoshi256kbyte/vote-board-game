/**
 * Candidate API Integration Tests
 *
 * 候補一覧取得APIの統合テスト：
 * - ゲーム存在確認→候補取得→投票数降順ソートの完全フロー
 * - ゲーム未存在時の404エラー
 * - ターン未存在時の404エラー
 * - 空の候補一覧の取得
 * - バリデーションエラー
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 4.1
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Hono } from 'hono';
import type { CandidateEntity, GameEntity } from '../lib/dynamodb/types.js';

// Mock CandidateRepository
const mockListByTurn = vi.fn();

vi.mock('../lib/dynamodb/repositories/candidate.js', () => ({
  CandidateRepository: vi.fn(function (this: { listByTurn: typeof mockListByTurn }) {
    this.listByTurn = mockListByTurn;
    return this;
  }),
}));

// Mock GameRepository
const mockGetById = vi.fn();

vi.mock('../lib/dynamodb/repositories/game.js', () => ({
  GameRepository: vi.fn(function (this: { getById: typeof mockGetById }) {
    this.getById = mockGetById;
    return this;
  }),
}));

describe('Candidate API Integration Tests', () => {
  let app: Hono;

  beforeEach(async () => {
    vi.clearAllMocks();

    app = new Hono();

    const { createGameCandidatesRouter } = await import('./candidates.js');
    const { CandidateService } = await import('../services/candidate.js');
    const { CandidateRepository } = await import('../lib/dynamodb/repositories/candidate.js');
    const { GameRepository } = await import('../lib/dynamodb/repositories/game.js');

    const candidateRepository = new CandidateRepository();
    const gameRepository = new GameRepository();
    const candidateService = new CandidateService(candidateRepository, gameRepository);
    app.route('/api', createGameCandidatesRouter(candidateService));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const validGameId = '550e8400-e29b-41d4-a716-446655440000';
  const createdAt = '2024-06-01T00:00:00.000Z';

  function createMockGame(overrides?: Partial<GameEntity>): GameEntity {
    return {
      PK: `GAME#${validGameId}`,
      SK: `GAME#${validGameId}`,
      GSI1PK: 'GAME#STATUS#ACTIVE',
      GSI1SK: createdAt,
      entityType: 'GAME',
      gameId: validGameId,
      gameType: 'OTHELLO',
      status: 'ACTIVE',
      aiSide: 'BLACK',
      currentTurn: 3,
      boardState: '{"board":[]}',
      createdAt,
      updatedAt: createdAt,
      ...overrides,
    };
  }

  function createMockCandidate(
    candidateId: string,
    voteCount: number,
    overrides?: Partial<CandidateEntity>
  ): CandidateEntity {
    return {
      PK: `GAME#${validGameId}#TURN#1`,
      SK: `CANDIDATE#${candidateId}`,
      entityType: 'CANDIDATE',
      candidateId,
      gameId: validGameId,
      turnNumber: 1,
      position: '3,2',
      description: `候補 ${candidateId}`,
      voteCount,
      createdBy: 'AI',
      status: 'VOTING',
      votingDeadline: '2024-06-02T00:00:00.000Z',
      createdAt,
      updatedAt: createdAt,
      ...overrides,
    };
  }

  describe('候補取得→投票数降順ソートの完全フロー', () => {
    it('ゲーム存在確認→候補取得→投票数降順ソートで返却される', async () => {
      const mockGame = createMockGame();
      mockGetById.mockResolvedValue(mockGame);

      const candidates: CandidateEntity[] = [
        createMockCandidate('cand-1', 5),
        createMockCandidate('cand-2', 15),
        createMockCandidate('cand-3', 10),
        createMockCandidate('cand-4', 3),
      ];
      mockListByTurn.mockResolvedValue(candidates);

      const res = await app.request(`/api/games/${validGameId}/turns/1/candidates`);

      expect(res.status).toBe(200);
      const data = await res.json();

      // 投票数降順でソートされていることを確認
      expect(data.candidates).toHaveLength(4);
      expect(data.candidates[0].candidateId).toBe('cand-2'); // 15票
      expect(data.candidates[1].candidateId).toBe('cand-3'); // 10票
      expect(data.candidates[2].candidateId).toBe('cand-1'); // 5票
      expect(data.candidates[3].candidateId).toBe('cand-4'); // 3票

      // GameRepository.getById が正しく呼ばれたことを確認
      expect(mockGetById).toHaveBeenCalledWith(validGameId);

      // CandidateRepository.listByTurn が正しく呼ばれたことを確認
      expect(mockListByTurn).toHaveBeenCalledWith(validGameId, 1);
    });

    it('複数ターンの候補を個別に取得できる', async () => {
      const mockGame = createMockGame({ currentTurn: 5 });
      mockGetById.mockResolvedValue(mockGame);

      // ターン1の候補
      const turn1Candidates = [
        createMockCandidate('t1-cand-1', 20),
        createMockCandidate('t1-cand-2', 8),
      ];

      // ターン3の候補
      const turn3Candidates = [
        createMockCandidate('t3-cand-1', 12),
        createMockCandidate('t3-cand-2', 25),
        createMockCandidate('t3-cand-3', 3),
      ];

      // ターン1を取得
      mockListByTurn.mockResolvedValueOnce(turn1Candidates);
      const res1 = await app.request(`/api/games/${validGameId}/turns/1/candidates`);
      expect(res1.status).toBe(200);
      const data1 = await res1.json();
      expect(data1.candidates).toHaveLength(2);
      expect(data1.candidates[0].candidateId).toBe('t1-cand-1');

      // ターン3を取得
      mockListByTurn.mockResolvedValueOnce(turn3Candidates);
      const res3 = await app.request(`/api/games/${validGameId}/turns/3/candidates`);
      expect(res3.status).toBe(200);
      const data3 = await res3.json();
      expect(data3.candidates).toHaveLength(3);
      expect(data3.candidates[0].candidateId).toBe('t3-cand-2'); // 25票が最多
    });
  });

  describe('レスポンスフィールドの検証', () => {
    it('すべての必須フィールドが含まれる', async () => {
      mockGetById.mockResolvedValue(createMockGame());
      mockListByTurn.mockResolvedValue([
        createMockCandidate('cand-1', 10, {
          position: '5,3',
          description: '角を取る手',
          createdBy: 'USER#user-123',
          status: 'VOTING',
          votingDeadline: '2024-06-02T15:00:00.000Z',
        }),
      ]);

      const res = await app.request(`/api/games/${validGameId}/turns/1/candidates`);
      const data = await res.json();

      const candidate = data.candidates[0];
      expect(candidate).toHaveProperty('candidateId', 'cand-1');
      expect(candidate).toHaveProperty('position', '5,3');
      expect(candidate).toHaveProperty('description', '角を取る手');
      expect(candidate).toHaveProperty('voteCount', 10);
      expect(candidate).toHaveProperty('createdBy', 'USER#user-123');
      expect(candidate).toHaveProperty('status', 'VOTING');
      expect(candidate).toHaveProperty('votingDeadline', '2024-06-02T15:00:00.000Z');
      expect(candidate).toHaveProperty('createdAt');

      // DynamoDB内部フィールドが含まれないことを確認
      expect(candidate).not.toHaveProperty('PK');
      expect(candidate).not.toHaveProperty('SK');
      expect(candidate).not.toHaveProperty('entityType');
      expect(candidate).not.toHaveProperty('updatedAt');
      expect(candidate).not.toHaveProperty('gameId');
      expect(candidate).not.toHaveProperty('turnNumber');
    });
  });

  describe('空の候補一覧', () => {
    it('候補が0件の場合、空配列を返す', async () => {
      mockGetById.mockResolvedValue(createMockGame());
      mockListByTurn.mockResolvedValue([]);

      const res = await app.request(`/api/games/${validGameId}/turns/1/candidates`);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.candidates).toEqual([]);
    });
  });

  describe('エラー系: ゲーム未存在', () => {
    it('存在しないゲームIDで404を返す', async () => {
      mockGetById.mockResolvedValue(null);

      const nonExistentGameId = '00000000-0000-0000-0000-000000000000';
      const res = await app.request(`/api/games/${nonExistentGameId}/turns/1/candidates`);

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe('NOT_FOUND');
      expect(data.message).toBe('Game not found');

      // CandidateRepository は呼ばれないことを確認
      expect(mockListByTurn).not.toHaveBeenCalled();
    });
  });

  describe('エラー系: ターン未存在', () => {
    it('currentTurnより大きいターン番号で404を返す', async () => {
      mockGetById.mockResolvedValue(createMockGame({ currentTurn: 3 }));

      const res = await app.request(`/api/games/${validGameId}/turns/10/candidates`);

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe('NOT_FOUND');
      expect(data.message).toBe('Turn not found');
    });
  });

  describe('エラー系: バリデーションエラー', () => {
    it('無効なgameId形式で400を返す', async () => {
      const res = await app.request('/api/games/not-a-uuid/turns/1/candidates');

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('VALIDATION_ERROR');
      expect(data.details.fields).toHaveProperty('gameId');
    });

    it('負のturnNumberで400を返す', async () => {
      const res = await app.request(`/api/games/${validGameId}/turns/-1/candidates`);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('VALIDATION_ERROR');
    });

    it('小数のturnNumberで400を返す', async () => {
      const res = await app.request(`/api/games/${validGameId}/turns/1.5/candidates`);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('エラー系: 内部エラー', () => {
    it('リポジトリでエラーが発生した場合500を返す', async () => {
      mockGetById.mockRejectedValue(new Error('DynamoDB connection error'));

      const res = await app.request(`/api/games/${validGameId}/turns/1/candidates`);

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe('INTERNAL_ERROR');
    });
  });
});
