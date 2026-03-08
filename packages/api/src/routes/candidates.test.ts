/**
 * Candidate API Routes Unit Tests
 *
 * Requirements: 1.1, 1.3, 1.4, 2.3, 2.4, 2.7, 3.3, 3.4, 4.2, 4.3, 5.3, 6.2, 8.1, 8.3, 9.1
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Hono } from 'hono';
import { createGameCandidatesRouter } from './candidates.js';
import {
  GameNotFoundError,
  TurnNotFoundError,
  InvalidMoveError,
  VotingClosedError,
  DuplicatePositionError,
} from '../services/candidate.js';
import type { AuthVariables } from '../lib/auth/types.js';
import type { GetCandidatesResponse, PostCandidateResponse } from '../types/candidate.js';

describe('GET /api/games/:gameId/turns/:turnNumber/candidates', () => {
  let app: Hono;
  let mockService: {
    listCandidates: ReturnType<typeof vi.fn>;
  };

  const validGameId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    mockService = {
      listCandidates: vi.fn(),
    };
    app = new Hono();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    app.route('/api', createGameCandidatesRouter(mockService as any));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('正常系 (200 OK)', () => {
    it('候補一覧を取得して200を返す', async () => {
      const mockResponse: GetCandidatesResponse = {
        candidates: [
          {
            candidateId: 'c1a2b3c4-d5e6-7f8g-9h0i-1j2k3l4m5n6o',
            position: '3,4',
            description: '中央を制圧する手',
            voteCount: 42,
            createdBy: 'AI',
            status: 'VOTING',
            votingDeadline: '2024-01-15T23:59:59.999Z',
            createdAt: '2024-01-14T00:00:00.000Z',
          },
        ],
      };
      mockService.listCandidates.mockResolvedValue(mockResponse);

      const res = await app.request(`/api/games/${validGameId}/turns/5/candidates`);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.candidates).toHaveLength(1);
      expect(data.candidates[0].voteCount).toBe(42);
      expect(mockService.listCandidates).toHaveBeenCalledWith(validGameId, 5);
    });
  });

  describe('空の候補一覧 (200 OK)', () => {
    it('候補が存在しない場合は空配列で200を返す', async () => {
      mockService.listCandidates.mockResolvedValue({ candidates: [] });

      const res = await app.request(`/api/games/${validGameId}/turns/1/candidates`);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual({ candidates: [] });
    });
  });

  describe('バリデーションエラー (400)', () => {
    it('無効なgameIdで400を返す', async () => {
      const res = await app.request('/api/games/not-a-uuid/turns/1/candidates');
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
      expect(data.details.fields).toHaveProperty('gameId');
    });

    it('空のgameIdで400を返す', async () => {
      const res = await app.request('/api/games//turns/1/candidates');

      // Honoのルーティングでは空パスはマッチしない（404になる可能性）
      expect([400, 404]).toContain(res.status);
    });

    it('負のturnNumberで400を返す', async () => {
      const res = await app.request(`/api/games/${validGameId}/turns/-1/candidates`);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
    });

    it('小数のturnNumberで400を返す', async () => {
      const res = await app.request(`/api/games/${validGameId}/turns/1.5/candidates`);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
    });

    it('文字列のturnNumberで400を返す', async () => {
      const res = await app.request(`/api/games/${validGameId}/turns/abc/candidates`);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('Not Foundエラー (404)', () => {
    it('ゲームが存在しない場合404を返す', async () => {
      mockService.listCandidates.mockRejectedValue(new GameNotFoundError(validGameId));

      const res = await app.request(`/api/games/${validGameId}/turns/1/candidates`);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('NOT_FOUND');
      expect(data.message).toBe('Game not found');
    });

    it('ターンが存在しない場合404を返す', async () => {
      mockService.listCandidates.mockRejectedValue(new TurnNotFoundError(validGameId, 99));

      const res = await app.request(`/api/games/${validGameId}/turns/99/candidates`);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('NOT_FOUND');
      expect(data.message).toBe('Turn not found');
    });
  });

  describe('Internal Server Error (500)', () => {
    it('予期しないエラーで500を返す', async () => {
      mockService.listCandidates.mockRejectedValue(new Error('DynamoDB connection failed'));

      const res = await app.request(`/api/games/${validGameId}/turns/1/candidates`);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('INTERNAL_ERROR');
      expect(data.message).toBe('Failed to retrieve candidates');
    });
  });
});

describe('POST /api/games/:gameId/turns/:turnNumber/candidates', () => {
  let app: Hono<{ Variables: AuthVariables }>;
  let mockService: {
    listCandidates: ReturnType<typeof vi.fn>;
    createCandidate: ReturnType<typeof vi.fn>;
  };

  const validGameId = '550e8400-e29b-41d4-a716-446655440000';
  const validUserId = 'user-123';

  const mockPostResponse: PostCandidateResponse = {
    candidateId: 'c1a2b3c4-d5e6-7f8g-9h0i-1j2k3l4m5n6o',
    gameId: validGameId,
    turnNumber: 5,
    position: '2,3',
    description: '攻撃的な手。相手の陣地を削る。',
    voteCount: 0,
    createdBy: `USER#${validUserId}`,
    status: 'VOTING',
    votingDeadline: '2025-02-20T14:59:59.999Z',
    createdAt: '2025-02-19T15:30:00.000Z',
  };

  function createPostRequest(
    gameId: string,
    turnNumber: number | string,
    body: Record<string, unknown>,
    _authenticated = true
  ) {
    const url = `/api/games/${gameId}/turns/${turnNumber}/candidates`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    return app.request(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  }

  beforeEach(() => {
    mockService = {
      listCandidates: vi.fn(),
      createCandidate: vi.fn(),
    };
    app = new Hono<{ Variables: AuthVariables }>();
    // 認証ミドルウェアのシミュレーション（POST のみ）
    app.use('/api/games/:gameId/turns/:turnNumber/candidates', async (c, next) => {
      if (c.req.method === 'POST') {
        c.set('userId', validUserId);
      }
      await next();
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    app.route('/api', createGameCandidatesRouter(mockService as any));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('正常系 (201 Created)', () => {
    it('有効なリクエストで候補が作成され201を返す', async () => {
      mockService.createCandidate.mockResolvedValue(mockPostResponse);

      const res = await createPostRequest(validGameId, 5, {
        position: '2,3',
        description: '攻撃的な手。相手の陣地を削る。',
      });
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.candidateId).toBe(mockPostResponse.candidateId);
      expect(data.gameId).toBe(validGameId);
      expect(data.turnNumber).toBe(5);
      expect(data.position).toBe('2,3');
      expect(data.voteCount).toBe(0);
      expect(data.status).toBe('VOTING');
      expect(data.createdBy).toBe(`USER#${validUserId}`);
      expect(mockService.createCandidate).toHaveBeenCalledWith(
        validGameId,
        5,
        '2,3',
        '攻撃的な手。相手の陣地を削る。',
        validUserId
      );
    });
  });

  describe('バリデーションエラー (400 VALIDATION_ERROR)', () => {
    it('無効なgameIdで400を返す', async () => {
      const res = await createPostRequest('not-a-uuid', 5, {
        position: '2,3',
        description: 'テスト',
      });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
      expect(data.details.fields).toHaveProperty('gameId');
    });

    it('負のturnNumberで400を返す', async () => {
      const res = await createPostRequest(validGameId, -1, {
        position: '2,3',
        description: 'テスト',
      });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
    });

    it('無効なposition形式で400を返す', async () => {
      const res = await createPostRequest(validGameId, 5, {
        position: 'a,b',
        description: 'テスト',
      });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
      expect(data.details.fields).toHaveProperty('position');
    });

    it('範囲外のposition（8,0）で400を返す', async () => {
      const res = await createPostRequest(validGameId, 5, {
        position: '8,0',
        description: 'テスト',
      });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
    });

    it('空のdescriptionで400を返す', async () => {
      const res = await createPostRequest(validGameId, 5, {
        position: '2,3',
        description: '',
      });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
      expect(data.details.fields).toHaveProperty('description');
    });

    it('201文字のdescriptionで400を返す', async () => {
      const res = await createPostRequest(validGameId, 5, {
        position: '2,3',
        description: 'a'.repeat(201),
      });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
      expect(data.details.fields).toHaveProperty('description');
    });
  });

  describe('ゲーム未存在 (404 NOT_FOUND)', () => {
    it('ゲームが存在しない場合404を返す', async () => {
      mockService.createCandidate.mockRejectedValue(new GameNotFoundError(validGameId));

      const res = await createPostRequest(validGameId, 5, {
        position: '2,3',
        description: 'テスト',
      });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('NOT_FOUND');
      expect(data.message).toBe('Game not found');
    });
  });

  describe('ターン未存在 (404 NOT_FOUND)', () => {
    it('ターンが存在しない場合404を返す', async () => {
      mockService.createCandidate.mockRejectedValue(new TurnNotFoundError(validGameId, 99));

      const res = await createPostRequest(validGameId, 99, {
        position: '2,3',
        description: 'テスト',
      });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('NOT_FOUND');
      expect(data.message).toBe('Turn not found');
    });
  });

  describe('無効な手 (400 INVALID_MOVE)', () => {
    it('オセロルール上無効な手で400を返す', async () => {
      mockService.createCandidate.mockRejectedValue(
        new InvalidMoveError('0,0', 'Move would not flip any discs')
      );

      const res = await createPostRequest(validGameId, 5, {
        position: '0,0',
        description: 'テスト',
      });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('INVALID_MOVE');
      expect(data.message).toContain('Invalid move');
    });
  });

  describe('投票締切済み (400 VOTING_CLOSED)', () => {
    it('投票締切済みの場合400を返す', async () => {
      mockService.createCandidate.mockRejectedValue(new VotingClosedError());

      const res = await createPostRequest(validGameId, 5, {
        position: '2,3',
        description: 'テスト',
      });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('VOTING_CLOSED');
      expect(data.message).toBe('Voting period has ended');
    });
  });

  describe('重複ポジション (409 CONFLICT)', () => {
    it('同じポジションの候補が既に存在する場合409を返す', async () => {
      mockService.createCandidate.mockRejectedValue(new DuplicatePositionError('2,3'));

      const res = await createPostRequest(validGameId, 5, {
        position: '2,3',
        description: 'テスト',
      });
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.error).toBe('CONFLICT');
      expect(data.message).toContain('2,3');
    });
  });

  describe('認証なし (401 UNAUTHORIZED)', () => {
    it('userIdが設定されていない場合401を返す', async () => {
      // 認証ミドルウェアなしのアプリを作成
      const unauthApp = new Hono<{ Variables: AuthVariables }>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      unauthApp.route('/api', createGameCandidatesRouter(mockService as any));

      const res = await unauthApp.request(`/api/games/${validGameId}/turns/5/candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          position: '2,3',
          description: 'テスト',
        }),
      });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('UNAUTHORIZED');
    });
  });

  describe('Internal Server Error (500)', () => {
    it('予期しないエラーで500を返す', async () => {
      mockService.createCandidate.mockRejectedValue(new Error('DynamoDB connection failed'));

      const res = await createPostRequest(validGameId, 5, {
        position: '2,3',
        description: 'テスト',
      });
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('INTERNAL_ERROR');
      expect(data.message).toBe('Failed to create candidate');
    });
  });
});
