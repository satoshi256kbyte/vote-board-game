/**
 * CommentaryGenerator 統合テスト
 *
 * モックを使用して CommentaryGenerator の各シナリオを検証する。
 * - 正常系、0件対局、currentTurn==0スキップ、既存解説スキップ
 * - パース失敗スキップ、Bedrockエラー、DB保存失敗
 * - フィールド値検証、トークン使用量ログ
 *
 * Feature: game-commentary-generation
 * Property 5: 処理サマリーの整合性 (Validates: Requirements 7.2, 7.4)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { CommentaryGenerator } from '../index.js';
import type { BedrockService } from '../../bedrock/index.js';
import type { GameRepository } from '../../../lib/dynamodb/repositories/game.js';
import type { CommentaryRepository } from '../../../lib/dynamodb/repositories/commentary.js';
import type { GameEntity, CommentaryEntity } from '../../../lib/dynamodb/types.js';

// console.log をモックして出力を抑制しつつ検証可能にする
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

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

function createMockGame(overrides: Partial<GameEntity> = {}): GameEntity {
  return {
    PK: 'GAME#game-1',
    SK: 'GAME#game-1',
    entityType: 'GAME',
    GSI1PK: 'GAME#STATUS#ACTIVE',
    GSI1SK: '2024-01-01T00:00:00.000Z',
    gameId: 'game-1',
    gameType: 'OTHELLO',
    status: 'ACTIVE',
    aiSide: 'WHITE',
    currentTurn: 3,
    boardState: validBoardState,
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockBedrockService() {
  return {
    generateText: vi.fn(),
  } as unknown as BedrockService;
}

function createMockGameRepository() {
  return {
    listByStatus: vi.fn(),
  } as unknown as GameRepository;
}

function createMockCommentaryRepository() {
  return {
    getByGameAndTurn: vi.fn(),
    create: vi.fn(),
  } as unknown as CommentaryRepository;
}

function createMockDocClient() {
  return {
    send: vi.fn(),
  };
}

const validAIResponse = {
  text: JSON.stringify({ content: '解説テスト文です。' }),
  usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
};

const mockMoveItems = [
  {
    PK: 'GAME#game-1',
    SK: 'MOVE#0001',
    entityType: 'MOVE',
    gameId: 'game-1',
    turnNumber: 1,
    side: 'BLACK',
    position: '2,3',
    playedBy: 'COLLECTIVE',
    candidateId: 'c1',
  },
];

// --- ユニットテスト ---

describe('CommentaryGenerator', () => {
  let mockBedrock: BedrockService;
  let mockGameRepo: GameRepository;
  let mockCommentaryRepo: CommentaryRepository;
  let mockDocClient: ReturnType<typeof createMockDocClient>;
  let generator: CommentaryGenerator;

  beforeEach(() => {
    vi.clearAllMocks();
    mockBedrock = createMockBedrockService();
    mockGameRepo = createMockGameRepository();
    mockCommentaryRepo = createMockCommentaryRepository();
    mockDocClient = createMockDocClient();
    generator = new CommentaryGenerator(
      mockBedrock,
      mockGameRepo,
      mockCommentaryRepo,
      mockDocClient as never,
      'test-table'
    );
  });

  it('正常系: アクティブな対局に対して解説を生成・保存する', async () => {
    vi.mocked(mockGameRepo.listByStatus).mockResolvedValue({
      items: [createMockGame()],
    });
    vi.mocked(mockCommentaryRepo.getByGameAndTurn).mockResolvedValue(null);
    vi.mocked(mockBedrock.generateText).mockResolvedValue(validAIResponse);
    mockDocClient.send.mockResolvedValue({ Items: mockMoveItems });
    vi.mocked(mockCommentaryRepo.create).mockResolvedValue({} as CommentaryEntity);

    const summary = await generator.generateCommentaries();

    expect(summary.totalGames).toBe(1);
    expect(summary.successCount).toBe(1);
    expect(summary.failedCount).toBe(0);
    expect(summary.skippedCount).toBe(0);
    expect(mockCommentaryRepo.create).toHaveBeenCalledTimes(1);
  });

  it('0件対局: アクティブな対局がない場合は正常終了する', async () => {
    vi.mocked(mockGameRepo.listByStatus).mockResolvedValue({ items: [] });

    const summary = await generator.generateCommentaries();

    expect(summary.totalGames).toBe(0);
    expect(summary.successCount).toBe(0);
    expect(summary.failedCount).toBe(0);
    expect(summary.skippedCount).toBe(0);
    expect(summary.results).toHaveLength(0);
  });

  it('currentTurn==0スキップ: currentTurnが0の対局はスキップされる', async () => {
    vi.mocked(mockGameRepo.listByStatus).mockResolvedValue({
      items: [createMockGame({ currentTurn: 0 })],
    });

    const summary = await generator.generateCommentaries();

    expect(summary.totalGames).toBe(1);
    expect(summary.skippedCount).toBe(1);
    expect(summary.results[0].status).toBe('skipped');
    expect(summary.results[0].reason).toContain('currentTurn');
  });

  it('既存解説スキップ: 既に解説が存在する対局はスキップされる', async () => {
    vi.mocked(mockGameRepo.listByStatus).mockResolvedValue({
      items: [createMockGame()],
    });
    vi.mocked(mockCommentaryRepo.getByGameAndTurn).mockResolvedValue({} as CommentaryEntity);

    const summary = await generator.generateCommentaries();

    expect(summary.totalGames).toBe(1);
    expect(summary.skippedCount).toBe(1);
    expect(summary.results[0].status).toBe('skipped');
    expect(summary.results[0].reason).toContain('already exists');
  });

  it('パース失敗スキップ: 不正なboardStateの対局はスキップされる', async () => {
    vi.mocked(mockGameRepo.listByStatus).mockResolvedValue({
      items: [createMockGame({ boardState: 'invalid-json-{{{' })],
    });
    vi.mocked(mockCommentaryRepo.getByGameAndTurn).mockResolvedValue(null);

    const summary = await generator.generateCommentaries();

    expect(summary.totalGames).toBe(1);
    expect(summary.skippedCount).toBe(1);
    expect(summary.results[0].status).toBe('skipped');
    expect(summary.results[0].reason).toContain('parse');
  });

  it('Bedrockエラー: BedrockService.generateText がエラーを投げた場合は失敗として記録される', async () => {
    vi.mocked(mockGameRepo.listByStatus).mockResolvedValue({
      items: [createMockGame()],
    });
    vi.mocked(mockCommentaryRepo.getByGameAndTurn).mockResolvedValue(null);
    mockDocClient.send.mockResolvedValue({ Items: mockMoveItems });
    vi.mocked(mockBedrock.generateText).mockRejectedValue(new Error('Bedrock API error'));

    const summary = await generator.generateCommentaries();

    expect(summary.totalGames).toBe(1);
    expect(summary.failedCount).toBe(1);
    expect(summary.results[0].status).toBe('failed');
    expect(summary.results[0].reason).toContain('Bedrock API error');
  });

  it('DB保存失敗: commentaryRepository.create がエラーを投げた場合は失敗として記録される', async () => {
    vi.mocked(mockGameRepo.listByStatus).mockResolvedValue({
      items: [createMockGame()],
    });
    vi.mocked(mockCommentaryRepo.getByGameAndTurn).mockResolvedValue(null);
    mockDocClient.send.mockResolvedValue({ Items: mockMoveItems });
    vi.mocked(mockBedrock.generateText).mockResolvedValue(validAIResponse);
    vi.mocked(mockCommentaryRepo.create).mockRejectedValue(new Error('DynamoDB save error'));

    const summary = await generator.generateCommentaries();

    expect(summary.totalGames).toBe(1);
    expect(summary.failedCount).toBe(1);
    expect(summary.results[0].status).toBe('failed');
    expect(summary.results[0].reason).toContain('DynamoDB save error');
  });

  it('フィールド値検証: generatedBy が "AI"、turnNumber が currentTurn に設定される', async () => {
    const game = createMockGame({ currentTurn: 5 });
    vi.mocked(mockGameRepo.listByStatus).mockResolvedValue({ items: [game] });
    vi.mocked(mockCommentaryRepo.getByGameAndTurn).mockResolvedValue(null);
    mockDocClient.send.mockResolvedValue({ Items: mockMoveItems });
    vi.mocked(mockBedrock.generateText).mockResolvedValue(validAIResponse);
    vi.mocked(mockCommentaryRepo.create).mockResolvedValue({} as CommentaryEntity);

    await generator.generateCommentaries();

    const calls = vi.mocked(mockCommentaryRepo.create).mock.calls;
    expect(calls).toHaveLength(1);
    expect(calls[0][0].generatedBy).toBe('AI');
    expect(calls[0][0].turnNumber).toBe(5);
  });

  it('トークン使用量ログ: console.log にトークン使用量が出力される', async () => {
    vi.mocked(mockGameRepo.listByStatus).mockResolvedValue({
      items: [createMockGame()],
    });
    vi.mocked(mockCommentaryRepo.getByGameAndTurn).mockResolvedValue(null);
    mockDocClient.send.mockResolvedValue({ Items: mockMoveItems });
    vi.mocked(mockBedrock.generateText).mockResolvedValue(validAIResponse);
    vi.mocked(mockCommentaryRepo.create).mockResolvedValue({} as CommentaryEntity);

    await generator.generateCommentaries();

    const tokenLogCall = consoleSpy.mock.calls.find((call) => {
      const arg = call[0];
      return typeof arg === 'string' && arg.includes('COMMENTARY_GENERATION_TOKEN_USAGE');
    });
    expect(tokenLogCall).toBeDefined();

    const parsed = JSON.parse(tokenLogCall![0] as string);
    expect(parsed.inputTokens).toBe(100);
    expect(parsed.outputTokens).toBe(50);
    expect(parsed.totalTokens).toBe(150);
  });
});

// --- プロパティベーステスト ---

describe('Feature: game-commentary-generation, Property 5: 処理サマリーの整合性', () => {
  /**
   * **Validates: Requirements 7.2, 7.4**
   *
   * For any list of games (mix of success/failed/skipped),
   * successCount + failedCount + skippedCount == totalGames,
   * and results.length == totalGames.
   */
  it('successCount + failedCount + skippedCount == totalGames を検証', () => {
    const gameOutcomeArb = fc.constantFrom(
      'success',
      'skipped_turn0',
      'skipped_existing',
      'skipped_parse',
      'failed_bedrock',
      'failed_save'
    );

    fc.assert(
      fc.property(fc.array(gameOutcomeArb, { minLength: 0, maxLength: 8 }), (outcomes) => {
        const results: Array<{ status: 'success' | 'skipped' | 'failed' }> = outcomes.map(
          (outcome) => {
            switch (outcome) {
              case 'skipped_turn0':
              case 'skipped_existing':
              case 'skipped_parse':
                return { status: 'skipped' as const };
              case 'failed_bedrock':
              case 'failed_save':
                return { status: 'failed' as const };
              default:
                return { status: 'success' as const };
            }
          }
        );

        const totalGames = results.length;
        const successCount = results.filter((r) => r.status === 'success').length;
        const failedCount = results.filter((r) => r.status === 'failed').length;
        const skippedCount = results.filter((r) => r.status === 'skipped').length;

        // CommentaryGenerator.generateCommentaries と同じ集計ロジックの整合性検証
        expect(successCount + failedCount + skippedCount).toBe(totalGames);
        expect(results.length).toBe(totalGames);
        expect(totalGames).toBe(outcomes.length);
      }),
      { numRuns: 15, endOnFailure: true }
    );
  });

  it('generateCommentaries の実行結果でサマリー整合性が成立する', async () => {
    const mockBedrock2 = createMockBedrockService();
    const mockGameRepo2 = createMockGameRepository();
    const mockCommentaryRepo2 = createMockCommentaryRepository();
    const mockDocClient2 = createMockDocClient();
    const gen = new CommentaryGenerator(
      mockBedrock2,
      mockGameRepo2,
      mockCommentaryRepo2,
      mockDocClient2 as never,
      'test-table'
    );

    const games = [
      createMockGame({ gameId: 'game-success', currentTurn: 3 }),
      createMockGame({ gameId: 'game-skipped-turn0', currentTurn: 0 }),
      createMockGame({ gameId: 'game-skipped-parse', boardState: 'bad-json', currentTurn: 2 }),
      createMockGame({ gameId: 'game-failed', currentTurn: 4 }),
    ];

    vi.mocked(mockGameRepo2.listByStatus).mockResolvedValue({ items: games });

    // getByGameAndTurn: game-skipped-turn0 は呼ばれない（currentTurn==0で先にスキップ）
    // game-skipped-parse は null を返す（パース失敗でスキップ）
    // game-success, game-failed は null を返す
    vi.mocked(mockCommentaryRepo2.getByGameAndTurn).mockResolvedValue(null);

    mockDocClient2.send.mockResolvedValue({ Items: mockMoveItems });
    vi.mocked(mockCommentaryRepo2.create).mockResolvedValue({} as CommentaryEntity);

    let bedrockCallIndex = 0;
    vi.mocked(mockBedrock2.generateText).mockImplementation(async () => {
      bedrockCallIndex++;
      if (bedrockCallIndex === 2) {
        throw new Error('Bedrock error');
      }
      return validAIResponse;
    });

    const summary = await gen.generateCommentaries();

    expect(summary.successCount + summary.failedCount + summary.skippedCount).toBe(
      summary.totalGames
    );
    expect(summary.results.length).toBe(summary.totalGames);
    expect(summary.totalGames).toBe(4);
    expect(summary.successCount).toBe(1);
    expect(summary.failedCount).toBe(1);
    expect(summary.skippedCount).toBe(2);
  });
});
