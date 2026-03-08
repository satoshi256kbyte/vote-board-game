/**
 * 候補一覧取得API プロパティベーステスト
 *
 * Property 3: 成功レスポンスの形式 (Requirements: 1.3, 1.4, 4.2, 4.3, 6.1, 6.2)
 * Property 4: 候補オブジェクトの必須フィールド (Requirements: 1.5, 6.3)
 * Property 5: 日時フィールドのISO 8601形式 (Requirements: 6.4)
 * Property 6: gameIdバリデーションエラー (Requirements: 2.1, 2.3, 2.4)
 * Property 7: turnNumberバリデーションエラー (Requirements: 2.2, 2.3, 2.4)
 * Property 13: 認証不要のアクセス (Requirements: 8.1)
 * Property 14: 認証状態に依存しないデータ (Requirements: 8.2, 8.3)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fc from 'fast-check';
import { Hono } from 'hono';
import { createGameCandidatesRouter } from './candidates.js';
import type { CandidateResponse } from '../types/candidate.js';

const REQUIRED_FIELDS: (keyof CandidateResponse)[] = [
  'candidateId',
  'position',
  'description',
  'voteCount',
  'createdBy',
  'status',
  'votingDeadline',
  'createdAt',
];

function createMockService() {
  return { listCandidates: vi.fn() };
}

function candidateArb(): fc.Arbitrary<CandidateResponse> {
  return fc.record({
    candidateId: fc.uuid(),
    position: fc
      .tuple(fc.integer({ min: 0, max: 7 }), fc.integer({ min: 0, max: 7 }))
      .map(([r, c]) => `${r},${c}`),
    description: fc.string({ maxLength: 200 }),
    voteCount: fc.nat({ max: 10000 }),
    createdBy: fc.oneof(
      fc.constant('AI'),
      fc.uuid().map((id) => `USER#${id}`)
    ),
    status: fc.constantFrom('VOTING' as const, 'CLOSED' as const, 'ADOPTED' as const),
    votingDeadline: fc
      .integer({ min: new Date('2020-01-01').getTime(), max: new Date('2030-12-31').getTime() })
      .map((ts) => new Date(ts).toISOString()),
    createdAt: fc
      .integer({ min: new Date('2020-01-01').getTime(), max: new Date('2030-12-31').getTime() })
      .map((ts) => new Date(ts).toISOString()),
  });
}

const validGameId = '550e8400-e29b-41d4-a716-446655440000';

describe('Property 3: 成功レスポンスの形式', () => {
  let app: Hono;
  let mockService: ReturnType<typeof createMockService>;

  beforeEach(() => {
    mockService = createMockService();
    app = new Hono();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    app.route('/api', createGameCandidatesRouter(mockService as any));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 with JSON candidates array for any valid candidate list', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(candidateArb(), { maxLength: 10 }), async (candidates) => {
        mockService.listCandidates.mockResolvedValue({ candidates });

        const res = await app.request(`/api/games/${validGameId}/turns/1/candidates`);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('application/json');
        expect(data).toHaveProperty('candidates');
        expect(Array.isArray(data.candidates)).toBe(true);
        expect(data.candidates).toHaveLength(candidates.length);
      }),
      { numRuns: 15, endOnFailure: true }
    );
  });
});

describe('Property 4: 候補オブジェクトの必須フィールド', () => {
  let app: Hono;
  let mockService: ReturnType<typeof createMockService>;

  beforeEach(() => {
    mockService = createMockService();
    app = new Hono();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    app.route('/api', createGameCandidatesRouter(mockService as any));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should include all required fields in every candidate object', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(candidateArb(), { minLength: 1, maxLength: 5 }),
        async (candidates) => {
          mockService.listCandidates.mockResolvedValue({ candidates });

          const res = await app.request(`/api/games/${validGameId}/turns/1/candidates`);
          const data = await res.json();

          for (const candidate of data.candidates) {
            for (const field of REQUIRED_FIELDS) {
              expect(candidate).toHaveProperty(field);
            }
          }
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });
});

describe('Property 5: 日時フィールドのISO 8601形式', () => {
  let app: Hono;
  let mockService: ReturnType<typeof createMockService>;

  beforeEach(() => {
    mockService = createMockService();
    app = new Hono();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    app.route('/api', createGameCandidatesRouter(mockService as any));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return votingDeadline and createdAt in ISO 8601 format', async () => {
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

    await fc.assert(
      fc.asyncProperty(
        fc.array(candidateArb(), { minLength: 1, maxLength: 5 }),
        async (candidates) => {
          mockService.listCandidates.mockResolvedValue({ candidates });

          const res = await app.request(`/api/games/${validGameId}/turns/1/candidates`);
          const data = await res.json();

          for (const candidate of data.candidates) {
            expect(candidate.votingDeadline).toMatch(iso8601Regex);
            expect(candidate.createdAt).toMatch(iso8601Regex);
          }
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });
});

describe('Property 6: gameIdバリデーションエラー', () => {
  let app: Hono;
  let mockService: ReturnType<typeof createMockService>;

  beforeEach(() => {
    mockService = createMockService();
    app = new Hono();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    app.route('/api', createGameCandidatesRouter(mockService as any));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 for any non-UUID gameId', async () => {
    const nonUuidArb = fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s))
      .filter((s) => !s.includes('/'));

    await fc.assert(
      fc.asyncProperty(nonUuidArb, async (invalidGameId) => {
        const res = await app.request(
          `/api/games/${encodeURIComponent(invalidGameId)}/turns/1/candidates`
        );
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toBe('VALIDATION_ERROR');
      }),
      { numRuns: 15, endOnFailure: true }
    );
  });
});

describe('Property 7: turnNumberバリデーションエラー', () => {
  let app: Hono;
  let mockService: ReturnType<typeof createMockService>;

  beforeEach(() => {
    mockService = createMockService();
    app = new Hono();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    app.route('/api', createGameCandidatesRouter(mockService as any));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 for negative turnNumber', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: -10000, max: -1 }), async (negativeTurn) => {
        const res = await app.request(`/api/games/${validGameId}/turns/${negativeTurn}/candidates`);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toBe('VALIDATION_ERROR');
      }),
      { numRuns: 15, endOnFailure: true }
    );
  });

  it('should return 400 for decimal turnNumber', async () => {
    const decimalArb = fc
      .float({ min: Math.fround(0.01), max: Math.fround(100), noNaN: true })
      .filter((n) => !Number.isInteger(n));

    await fc.assert(
      fc.asyncProperty(decimalArb, async (decimalTurn) => {
        const res = await app.request(`/api/games/${validGameId}/turns/${decimalTurn}/candidates`);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toBe('VALIDATION_ERROR');
      }),
      { numRuns: 15, endOnFailure: true }
    );
  });
});

describe('Property 13: 認証不要のアクセス', () => {
  let app: Hono;
  let mockService: ReturnType<typeof createMockService>;

  beforeEach(() => {
    mockService = createMockService();
    app = new Hono();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    app.route('/api', createGameCandidatesRouter(mockService as any));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should accept requests without authentication token', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(candidateArb(), { maxLength: 5 }), async (candidates) => {
        mockService.listCandidates.mockResolvedValue({ candidates });

        // リクエストに認証ヘッダーなし
        const res = await app.request(`/api/games/${validGameId}/turns/1/candidates`);

        expect(res.status).toBe(200);
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });
});

describe('Property 14: 認証状態に依存しないデータ', () => {
  let app: Hono;
  let mockService: ReturnType<typeof createMockService>;

  beforeEach(() => {
    mockService = createMockService();
    app = new Hono();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    app.route('/api', createGameCandidatesRouter(mockService as any));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return same data regardless of authentication state', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(candidateArb(), { maxLength: 5 }), async (candidates) => {
        mockService.listCandidates.mockResolvedValue({ candidates });

        // 認証なしリクエスト
        const resNoAuth = await app.request(`/api/games/${validGameId}/turns/1/candidates`);
        const dataNoAuth = await resNoAuth.json();

        mockService.listCandidates.mockResolvedValue({ candidates });

        // 認証ありリクエスト
        const resWithAuth = await app.request(`/api/games/${validGameId}/turns/1/candidates`, {
          headers: { Authorization: 'Bearer fake-token-123' },
        });
        const dataWithAuth = await resWithAuth.json();

        expect(dataNoAuth).toEqual(dataWithAuth);
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });
});
