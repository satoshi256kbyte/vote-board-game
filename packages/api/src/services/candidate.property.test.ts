/**
 * Feature: get-move-candidates-api, Property 2: 投票数降順ソート
 * For any 候補一覧に対して、返される配列は投票数（voteCount）の降順でソートされている
 *
 * Validates: Requirements 1.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { CandidateService } from './candidate.js';
import type { CandidateRepository } from '../lib/dynamodb/repositories/candidate.js';
import type { GameRepository } from '../lib/dynamodb/repositories/game.js';
import type { CandidateEntity, GameEntity } from '../lib/dynamodb/types.js';

function createMockCandidateRepo(): { listByTurn: ReturnType<typeof vi.fn> } {
  return { listByTurn: vi.fn() };
}

function createMockGameRepo(): { getById: ReturnType<typeof vi.fn> } {
  return { getById: vi.fn() };
}

const mockGame: GameEntity = {
  PK: 'GAME#game-1',
  SK: 'GAME#game-1',
  entityType: 'GAME',
  GSI1PK: 'GAME#STATUS#ACTIVE',
  GSI1SK: '2024-01-14T00:00:00.000Z',
  gameId: 'game-1',
  gameType: 'OTHELLO',
  status: 'ACTIVE',
  aiSide: 'BLACK',
  currentTurn: 100,
  boardState: '{}',
  createdAt: '2024-01-14T00:00:00.000Z',
};

const candidateEntityArb = fc.record({
  PK: fc.constant('GAME#game-1#TURN#1'),
  SK: fc.string().map((s) => `CANDIDATE#${s}`),
  entityType: fc.constant('CANDIDATE' as const),
  candidateId: fc.uuid(),
  gameId: fc.constant('game-1'),
  turnNumber: fc.constant(1),
  position: fc
    .tuple(fc.integer({ min: 0, max: 7 }), fc.integer({ min: 0, max: 7 }))
    .map(([r, c]) => `${r},${c}`),
  description: fc.string({ maxLength: 200 }),
  voteCount: fc.nat({ max: 10000 }),
  createdBy: fc.oneof(
    fc.constant('AI'),
    fc.uuid().map((id) => `USER#${id}`)
  ),
  status: fc.constant('VOTING' as const),
  votingDeadline: fc.constant('2024-01-15T23:59:59.999Z'),
  createdAt: fc.constant('2024-01-14T00:00:00.000Z'),
}) as fc.Arbitrary<CandidateEntity>;

describe('Property 2: 投票数降順ソート', () => {
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

  it('should always return candidates sorted by voteCount in descending order', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(candidateEntityArb, { maxLength: 20 }), async (entities) => {
        mockGameRepo.getById.mockResolvedValue(mockGame);
        mockCandidateRepo.listByTurn.mockResolvedValue(entities);

        const result = await service.listCandidates('game-1', 1);

        for (let i = 0; i < result.candidates.length - 1; i++) {
          expect(result.candidates[i].voteCount).toBeGreaterThanOrEqual(
            result.candidates[i + 1].voteCount
          );
        }
      }),
      { numRuns: 20, endOnFailure: true }
    );
  });
});

/**
 * Property 7: 同一ポジション重複拒否 (Requirements: 6.1, 6.2)
 */
import { DuplicatePositionError } from './candidate.js';
import { createInitialBoard } from '../lib/othello/board.js';

describe('Property 7: 同一ポジション重複拒否', () => {
  let service: CandidateService;
  let mockCandidateRepo: {
    listByTurn: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  let mockGameRepo: { getById: ReturnType<typeof vi.fn> };

  const initialBoardState = JSON.stringify({ board: createInitialBoard() });
  const futureDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  beforeEach(() => {
    mockCandidateRepo = {
      listByTurn: vi.fn(),
      create: vi.fn(),
    };
    mockGameRepo = { getById: vi.fn() };
    service = new CandidateService(
      mockCandidateRepo as unknown as CandidateRepository,
      mockGameRepo as unknown as GameRepository
    );
  });

  it('should throw DuplicatePositionError when candidate with same position exists', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 7 }),
        fc.integer({ min: 0, max: 7 }),
        async (row, col) => {
          const position = `${row},${col}`;
          const game: GameEntity = {
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
          };

          const existingCandidate: CandidateEntity = {
            PK: 'GAME#game-1#TURN#0',
            SK: `CANDIDATE#existing`,
            entityType: 'CANDIDATE',
            candidateId: 'existing',
            gameId: 'game-1',
            turnNumber: 0,
            position,
            description: '既存の候補',
            voteCount: 5,
            createdBy: 'USER#other-user',
            status: 'VOTING',
            votingDeadline: futureDeadline,
            createdAt: '2024-01-14T00:00:00.000Z',
          };

          mockGameRepo.getById.mockResolvedValue(game);
          mockCandidateRepo.listByTurn.mockResolvedValue([existingCandidate]);

          await expect(
            service.createCandidate('game-1', 0, position, 'テスト', 'user-123')
          ).rejects.toThrow(DuplicatePositionError);
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });
});
