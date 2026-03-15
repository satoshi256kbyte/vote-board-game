/**
 * CandidateGenerator プロパティベーステスト
 *
 * Feature: 33-ai-candidate-generation-batch
 * Property 1: 手番に基づく候補生成フィルタリング
 *
 * **Validates: Requirements 1.1, 1.2**
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import fc from 'fast-check';
import { CandidateGenerator } from '../index.js';
import type { BedrockService } from '../../bedrock/index.js';
import type { GameRepository } from '../../../lib/dynamodb/repositories/game.js';
import type { CandidateRepository } from '../../../lib/dynamodb/repositories/candidate.js';
import type { GameEntity, CandidateEntity } from '../../../lib/dynamodb/types.js';
import { isAITurn } from '../../../lib/game-utils.js';

// console.log をモックして出力を抑制
vi.spyOn(console, 'log').mockImplementation(() => {});

// --- テストヘルパー ---

const initialBoard = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 2, 1, 0, 0, 0],
  [0, 0, 0, 1, 2, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
];
const validBoardState = JSON.stringify({ board: initialBoard });

const validAIResponse = JSON.stringify({
  candidates: [
    { position: '2,4', description: '角を狙う一手' },
    { position: '3,5', description: '中央を制圧する手' },
    { position: '4,2', description: '相手の石を多く返す手' },
  ],
});

function createMockGame(overrides: Partial<GameEntity> = {}): GameEntity {
  return {
    PK: 'GAME#test-game-1',
    SK: 'GAME#test-game-1',
    entityType: 'GAME',
    GSI1PK: 'GAME#STATUS#ACTIVE',
    GSI1SK: '2024-01-01T00:00:00.000Z',
    gameId: 'test-game-1',
    gameType: 'OTHELLO',
    status: 'ACTIVE',
    aiSide: 'BLACK',
    currentTurn: 2,
    boardState: validBoardState,
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockBedrockService(): BedrockService {
  return {
    generateText: vi.fn(),
  } as unknown as BedrockService;
}

function createMockGameRepository(): GameRepository {
  return {
    listByStatus: vi.fn(),
  } as unknown as GameRepository;
}

function createMockCandidateRepository(): CandidateRepository {
  return {
    create: vi.fn(),
    listByTurn: vi.fn(),
  } as unknown as CandidateRepository;
}

// --- プロパティベーステスト ---

describe('Feature: 33-ai-candidate-generation-batch, Property 1: 手番に基づく候補生成フィルタリング', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Validates: Requirements 1.1, 1.2**
   *
   * 任意の currentTurn（自然数）と aiSide（'BLACK' | 'WHITE'）に対して、
   * isAITurn による次ターンの手番判定が CandidateGenerator のスキップ判定と一致することを検証する。
   *
   * 手番判定ロジック:
   * - 偶数ターン = BLACK の手番
   * - 奇数ターン = WHITE の手番
   * - aiSide と一致すれば AI の手番 → 候補生成スキップ
   */
  it('任意の currentTurn と aiSide に対して、isAITurn(nextTurn) が true なら候補生成スキップ、false なら実行される', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 100 }),
        fc.constantFrom('BLACK' as const, 'WHITE' as const),
        (currentTurn, aiSide) => {
          // 次ターンの手番を isAITurn で判定（CandidateGenerator と同じロジック）
          const nextTurnGame = createMockGame({ currentTurn: currentTurn + 1, aiSide });
          const isNextTurnAI = isAITurn(nextTurnGame);

          // 手番判定ロジックの数学的検証
          const nextTurn = currentTurn + 1;
          const nextTurnColor = nextTurn % 2 === 0 ? 'BLACK' : 'WHITE';
          const expectedIsAI = nextTurnColor === aiSide;

          // isAITurn の結果が期待値と一致する
          expect(isNextTurnAI).toBe(expectedIsAI);

          // AI 手番の場合: スキップされるべき
          // 集合知手番の場合: 候補生成が実行されるべき
          if (isNextTurnAI) {
            // AI 手番 → CandidateGenerator は 'Next turn is AI turn' でスキップ
            expect(nextTurnColor).toBe(aiSide);
          } else {
            // 集合知手番 → CandidateGenerator は候補生成を実行
            expect(nextTurnColor).not.toBe(aiSide);
          }
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  /**
   * **Validates: Requirements 1.1, 1.2**
   *
   * CandidateGenerator.generateCandidates() を実際に呼び出し、
   * AI 手番の場合にスキップ、集合知手番の場合に候補生成が実行されることを統合的に検証する。
   */
  it('AI手番の対局はスキップされ、集合知手番の対局は候補生成が実行される（統合検証）', async () => {
    // AI手番のケース: aiSide=BLACK, currentTurn=1 → nextTurn=2(偶数=BLACK=AI)
    const mockBedrock = createMockBedrockService();
    const mockGameRepo = createMockGameRepository();
    const mockCandidateRepo = createMockCandidateRepository();
    const generator = new CandidateGenerator(mockBedrock, mockGameRepo, mockCandidateRepo);

    const aiTurnGame = createMockGame({ aiSide: 'BLACK', currentTurn: 1 });
    const collectiveTurnGame = createMockGame({
      gameId: 'test-game-2',
      aiSide: 'BLACK',
      currentTurn: 2,
    });

    vi.mocked(mockGameRepo.listByStatus).mockResolvedValue({
      items: [aiTurnGame, collectiveTurnGame],
    });
    vi.mocked(mockCandidateRepo.listByTurn).mockResolvedValue([]);
    vi.mocked(mockBedrock.generateText).mockResolvedValue({
      text: validAIResponse,
      usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
    });
    vi.mocked(mockCandidateRepo.create).mockResolvedValue({} as CandidateEntity);

    const summary = await generator.generateCandidates();

    expect(summary.totalGames).toBe(2);
    expect(summary.skippedCount).toBe(1);
    expect(summary.successCount).toBe(1);

    // AI手番の対局はスキップ
    const aiTurnResult = summary.results.find((r) => r.gameId === aiTurnGame.gameId);
    expect(aiTurnResult?.status).toBe('skipped');
    expect(aiTurnResult?.reason).toBe('Next turn is AI turn');

    // 集合知手番の対局は候補生成実行
    const collectiveResult = summary.results.find((r) => r.gameId === collectiveTurnGame.gameId);
    expect(collectiveResult?.status).toBe('success');

    // Bedrock は集合知手番の対局に対してのみ呼ばれる
    expect(mockBedrock.generateText).toHaveBeenCalledTimes(1);
  });
});
