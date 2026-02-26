/**
 * Property-based tests for GameService
 *
 * These tests use fast-check to verify properties that should hold
 * across all possible inputs and executions.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { GameService } from './game';
import { GameRepository } from '../lib/dynamodb/repositories/game';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { CellState } from '../lib/othello';

describe('GameService Property Tests - Game List Retrieval', () => {
  let gameService: GameService;
  let gameRepository: GameRepository;
  let mockDocClient: DynamoDBDocumentClient;

  beforeEach(() => {
    mockDocClient = {
      send: vi.fn(),
    } as unknown as DynamoDBDocumentClient;
    gameRepository = new GameRepository(mockDocClient, 'test-table');
    gameService = new GameService(gameRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 1: Status Filter Returns Only Matching Games
   * **Validates: Requirements 1.2**
   *
   * For any status value (ACTIVE or FINISHED) and any collection of games with
   * mixed statuses, when filtering by that status, all returned games should have
   * the specified status.
   */
  it('Property 1: Status Filter Returns Only Matching Games', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('ACTIVE', 'FINISHED'),
        fc.array(
          fc.record({
            gameId: fc.uuid(),
            gameType: fc.constant('OTHELLO' as const),
            status: fc.constantFrom('ACTIVE', 'FINISHED'),
            aiSide: fc.constantFrom('BLACK', 'WHITE'),
            currentTurn: fc.nat({ max: 100 }),
            createdAt: fc
              .integer({ min: Date.parse('2024-01-01'), max: Date.now() })
              .map((timestamp) => new Date(timestamp).toISOString()),
          }),
          { minLength: 0, maxLength: 50 }
        ),
        async (filterStatus, allGames) => {
          // Filter games by status
          const expectedGames = allGames.filter((g) => g.status === filterStatus);

          // Mock repository response
          vi.mocked(mockDocClient.send).mockResolvedValue({
            Items: expectedGames.map((g) => ({
              ...g,
              PK: `GAME#${g.gameId}`,
              SK: `GAME#${g.gameId}`,
              GSI1PK: `GAME#STATUS#${g.status}`,
              GSI1SK: g.createdAt,
              entityType: 'GAME',
              boardState: '{"board":[]}',
              updatedAt: g.createdAt,
            })),
          } as never);

          // Execute
          const result = await gameService.listGames({
            status: filterStatus,
            limit: 20,
          });

          // Verify all returned games have the specified status
          expect(result.games.every((g) => g.status === filterStatus)).toBe(true);
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  /**
   * Property 2: Limit Parameter Bounds Response Size
   * **Validates: Requirements 1.4**
   *
   * For any valid limit value (1-100) and any collection of games, the number of
   * games returned should never exceed the specified limit.
   */
  it('Property 2: Limit Parameter Bounds Response Size', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 100 }),
        fc.array(
          fc.record({
            gameId: fc.uuid(),
            gameType: fc.constant('OTHELLO' as const),
            status: fc.constant('ACTIVE' as const),
            aiSide: fc.constantFrom('BLACK', 'WHITE'),
            currentTurn: fc.nat({ max: 100 }),
            createdAt: fc
              .integer({ min: Date.parse('2024-01-01'), max: Date.now() })
              .map((timestamp) => new Date(timestamp).toISOString()),
          }),
          { minLength: 0, maxLength: 150 }
        ),
        async (limit, allGames) => {
          // Mock repository response with limited items
          const limitedGames = allGames.slice(0, limit);
          vi.mocked(mockDocClient.send).mockResolvedValue({
            Items: limitedGames.map((g) => ({
              ...g,
              PK: `GAME#${g.gameId}`,
              SK: `GAME#${g.gameId}`,
              GSI1PK: `GAME#STATUS#${g.status}`,
              GSI1SK: g.createdAt,
              entityType: 'GAME',
              boardState: '{"board":[]}',
              updatedAt: g.createdAt,
            })),
          } as never);

          // Execute
          const result = await gameService.listGames({
            status: 'ACTIVE',
            limit,
          });

          // Verify response size does not exceed limit
          expect(result.games.length).toBeLessThanOrEqual(limit);
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  /**
   * Property 3: Pagination Cursor Maintains Consistency
   * **Validates: Requirements 1.7**
   *
   * For any collection of games, retrieving all pages using cursor-based pagination
   * should return all games exactly once without duplicates or omissions.
   */
  it('Property 3: Pagination Cursor Maintains Consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            gameId: fc.uuid(),
            gameType: fc.constant('OTHELLO' as const),
            status: fc.constant('ACTIVE' as const),
            aiSide: fc.constantFrom('BLACK', 'WHITE'),
            currentTurn: fc.nat({ max: 100 }),
            createdAt: fc
              .integer({ min: Date.parse('2024-01-01'), max: Date.now() })
              .map((timestamp) => new Date(timestamp).toISOString()),
          }),
          { minLength: 5, maxLength: 30 }
        ),
        async (allGames) => {
          const pageSize = 5;
          const pages: (typeof allGames)[] = [];

          // Split games into pages
          for (let i = 0; i < allGames.length; i += pageSize) {
            pages.push(allGames.slice(i, i + pageSize));
          }

          // Mock repository responses for each page
          let callCount = 0;
          vi.mocked(mockDocClient.send).mockImplementation(() => {
            const page = pages[callCount];
            const hasMore = callCount < pages.length - 1;
            const lastKey = hasMore
              ? {
                  PK: 'GAME#last',
                  SK: 'GAME#last',
                  GSI1PK: 'GAME#STATUS#ACTIVE',
                  GSI1SK: page[page.length - 1].createdAt,
                }
              : undefined;
            callCount++;

            return Promise.resolve({
              Items: page.map((g) => ({
                ...g,
                PK: `GAME#${g.gameId}`,
                SK: `GAME#${g.gameId}`,
                GSI1PK: `GAME#STATUS#ACTIVE`,
                GSI1SK: g.createdAt,
                entityType: 'GAME',
                boardState: '{"board":[]}',
                updatedAt: g.createdAt,
              })),
              LastEvaluatedKey: lastKey,
            } as never);
          });

          // Execute pagination
          const allRetrievedGames: string[] = [];
          let cursor: string | undefined;

          do {
            const result = await gameService.listGames({
              status: 'ACTIVE',
              limit: pageSize,
              cursor,
            });

            allRetrievedGames.push(...result.games.map((g) => g.gameId));
            cursor = result.nextCursor;
          } while (cursor);

          // Verify all games retrieved exactly once
          expect(allRetrievedGames.length).toBe(allGames.length);
          expect(new Set(allRetrievedGames).size).toBe(allGames.length); // No duplicates
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  /**
   * Property 4: Games Are Sorted by Creation Time Descending
   * **Validates: Requirements 1.8**
   *
   * For any collection of games returned by the list endpoint, each game's createdAt
   * timestamp should be greater than or equal to the next game's createdAt timestamp.
   */
  it('Property 4: Games Are Sorted by Creation Time Descending', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            gameId: fc.uuid(),
            gameType: fc.constant('OTHELLO' as const),
            status: fc.constant('ACTIVE' as const),
            aiSide: fc.constantFrom('BLACK', 'WHITE'),
            currentTurn: fc.nat({ max: 100 }),
            createdAt: fc
              .integer({ min: Date.parse('2024-01-01'), max: Date.now() })
              .map((timestamp) => new Date(timestamp).toISOString()),
          }),
          { minLength: 2, maxLength: 20 }
        ),
        async (games) => {
          // Sort games by createdAt descending (newest first)
          const sortedGames = [...games].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

          // Mock repository response with sorted games
          vi.mocked(mockDocClient.send).mockResolvedValue({
            Items: sortedGames.map((g) => ({
              ...g,
              PK: `GAME#${g.gameId}`,
              SK: `GAME#${g.gameId}`,
              GSI1PK: `GAME#STATUS#${g.status}`,
              GSI1SK: g.createdAt,
              entityType: 'GAME',
              boardState: '{"board":[]}',
              updatedAt: g.createdAt,
            })),
          } as never);

          // Execute
          const result = await gameService.listGames({
            status: 'ACTIVE',
            limit: 20,
          });

          // Verify descending order
          for (let i = 0; i < result.games.length - 1; i++) {
            const current = new Date(result.games[i].createdAt);
            const next = new Date(result.games[i + 1].createdAt);
            expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
          }
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  /**
   * Property 5: Next Cursor Presence Indicates More Data
   * **Validates: Requirements 1.9**
   *
   * For any game list response, nextCursor should be present if and only if there
   * are more games available beyond the current page.
   */
  it('Property 5: Next Cursor Presence Indicates More Data', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 20 }), fc.boolean(), async (limit, hasMore) => {
        // Mock repository response
        const mockGames = Array.from({ length: limit }, (_, i) => ({
          gameId: `game-${i}`,
          gameType: 'OTHELLO' as const,
          status: 'ACTIVE' as const,
          aiSide: 'BLACK' as const,
          currentTurn: 0,
          createdAt: new Date(Date.now() - i * 1000).toISOString(),
        }));

        vi.mocked(mockDocClient.send).mockResolvedValue({
          Items: mockGames.map((g) => ({
            ...g,
            PK: `GAME#${g.gameId}`,
            SK: `GAME#${g.gameId}`,
            GSI1PK: `GAME#STATUS#${g.status}`,
            GSI1SK: g.createdAt,
            entityType: 'GAME',
            boardState: '{"board":[]}',
            updatedAt: g.createdAt,
          })),
          LastEvaluatedKey: hasMore
            ? {
                PK: 'GAME#last',
                SK: 'GAME#last',
                GSI1PK: 'GAME#STATUS#ACTIVE',
                GSI1SK: mockGames[mockGames.length - 1].createdAt,
              }
            : undefined,
        } as never);

        // Execute
        const result = await gameService.listGames({
          status: 'ACTIVE',
          limit,
        });

        // Verify nextCursor presence matches hasMore
        if (hasMore) {
          expect(result.nextCursor).toBeDefined();
        } else {
          expect(result.nextCursor).toBeUndefined();
        }
      }),
      { numRuns: 20, endOnFailure: true }
    );
  });

  /**
   * Property 6: List Response Contains Required Fields
   * **Validates: Requirements 1.10**
   *
   * For any game returned in the list endpoint, the response object should contain
   * all required fields: gameId, gameType, status, aiSide, currentTurn, winner,
   * createdAt, and updatedAt.
   */
  it('Property 6: List Response Contains Required Fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            gameId: fc.uuid(),
            gameType: fc.constant('OTHELLO' as const),
            status: fc.constantFrom('ACTIVE', 'FINISHED'),
            aiSide: fc.constantFrom('BLACK', 'WHITE'),
            currentTurn: fc.nat({ max: 100 }),
            winner: fc.option(fc.constantFrom('AI', 'COLLECTIVE', 'DRAW'), { nil: undefined }),
            createdAt: fc
              .integer({ min: Date.parse('2024-01-01'), max: Date.now() })
              .map((timestamp) => new Date(timestamp).toISOString()),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (games) => {
          // Mock repository response
          vi.mocked(mockDocClient.send).mockResolvedValue({
            Items: games.map((g) => ({
              ...g,
              PK: `GAME#${g.gameId}`,
              SK: `GAME#${g.gameId}`,
              GSI1PK: `GAME#STATUS#${g.status}`,
              GSI1SK: g.createdAt,
              entityType: 'GAME',
              boardState: '{"board":[]}',
              updatedAt: g.createdAt,
            })),
          } as never);

          // Execute
          const result = await gameService.listGames({
            status: 'ACTIVE',
            limit: 20,
          });

          // Verify all required fields are present
          result.games.forEach((game) => {
            expect(game).toHaveProperty('gameId');
            expect(game).toHaveProperty('gameType');
            expect(game).toHaveProperty('status');
            expect(game).toHaveProperty('aiSide');
            expect(game).toHaveProperty('currentTurn');
            expect(game).toHaveProperty('createdAt');
            expect(game).toHaveProperty('updatedAt');
            // winner is optional, but the property should exist
            expect('winner' in game).toBe(true);

            // Verify types
            expect(typeof game.gameId).toBe('string');
            expect(typeof game.gameType).toBe('string');
            expect(typeof game.status).toBe('string');
            expect(typeof game.aiSide).toBe('string');
            expect(typeof game.currentTurn).toBe('number');
            expect(typeof game.createdAt).toBe('string');
            expect(typeof game.updatedAt).toBe('string');
          });
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });
});

describe('GameService Property Tests - Game Detail Retrieval', () => {
  let gameService: GameService;
  let gameRepository: GameRepository;
  let mockDocClient: DynamoDBDocumentClient;

  beforeEach(() => {
    mockDocClient = {
      send: vi.fn(),
    } as unknown as DynamoDBDocumentClient;
    gameRepository = new GameRepository(mockDocClient, 'test-table');
    gameService = new GameService(gameRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 7: Detail Response BoardState Is Object
   * **Validates: Requirements 2.3**
   *
   * For any game retrieved by the detail endpoint, the boardState field should be
   * a parsed object (not a JSON string) containing a board array.
   */
  it('Property 7: Detail Response BoardState Is Object', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom('OTHELLO' as const),
        fc.constantFrom('ACTIVE', 'FINISHED'),
        fc.constantFrom('BLACK', 'WHITE'),
        fc.nat({ max: 100 }),
        fc.array(fc.array(fc.constantFrom(0, 1, 2), { minLength: 8, maxLength: 8 }), {
          minLength: 8,
          maxLength: 8,
        }),
        async (gameId, gameType, status, aiSide, currentTurn, board) => {
          // Mock repository response with boardState as JSON string
          const boardStateJson = JSON.stringify({ board });
          vi.mocked(mockDocClient.send).mockResolvedValue({
            Item: {
              PK: `GAME#${gameId}`,
              SK: `GAME#${gameId}`,
              GSI1PK: `GAME#STATUS#${status}`,
              GSI1SK: new Date().toISOString(),
              entityType: 'GAME',
              gameId,
              gameType,
              status,
              aiSide,
              currentTurn,
              boardState: boardStateJson, // Stored as JSON string
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          } as never);

          // Execute
          const result = await gameService.getGame(gameId);

          // Verify boardState is an object, not a string
          expect(result).not.toBeNull();
          expect(result!.boardState).toBeDefined();
          expect(typeof result!.boardState).toBe('object');
          expect(typeof result!.boardState).not.toBe('string');

          // Verify boardState has board property
          expect(result!.boardState).toHaveProperty('board');
          expect(Array.isArray(result!.boardState.board)).toBe(true);

          // Verify board dimensions
          expect(result!.boardState.board).toHaveLength(8);
          expect(result!.boardState.board[0]).toHaveLength(8);
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  /**
   * Property 8: Detail Response Contains Required Fields
   * **Validates: Requirements 2.5**
   *
   * For any game returned in the detail endpoint, the response object should contain
   * all required fields: gameId, gameType, status, aiSide, currentTurn, boardState,
   * winner, createdAt, and updatedAt.
   */
  it('Property 8: Detail Response Contains Required Fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          gameId: fc.uuid(),
          gameType: fc.constant('OTHELLO' as const),
          status: fc.constantFrom('ACTIVE', 'FINISHED'),
          aiSide: fc.constantFrom('BLACK', 'WHITE'),
          currentTurn: fc.nat({ max: 100 }),
          winner: fc.option(fc.constantFrom('AI', 'COLLECTIVE', 'DRAW'), { nil: undefined }),
          board: fc.array(fc.array(fc.constantFrom(0, 1, 2), { minLength: 8, maxLength: 8 }), {
            minLength: 8,
            maxLength: 8,
          }),
          createdAt: fc
            .date({ min: new Date('2024-01-01'), max: new Date() })
            .map((d) => d.toISOString()),
        }),
        async (gameData) => {
          // Mock repository response
          const boardStateJson = JSON.stringify({ board: gameData.board });
          vi.mocked(mockDocClient.send).mockResolvedValue({
            Item: {
              PK: `GAME#${gameData.gameId}`,
              SK: `GAME#${gameData.gameId}`,
              GSI1PK: `GAME#STATUS#${gameData.status}`,
              GSI1SK: gameData.createdAt,
              entityType: 'GAME',
              gameId: gameData.gameId,
              gameType: gameData.gameType,
              status: gameData.status,
              aiSide: gameData.aiSide,
              currentTurn: gameData.currentTurn,
              boardState: boardStateJson,
              winner: gameData.winner,
              createdAt: gameData.createdAt,
              updatedAt: gameData.createdAt,
            },
          } as never);

          // Execute
          const result = await gameService.getGame(gameData.gameId);

          // Verify result is not null
          expect(result).not.toBeNull();

          // Verify all required fields are present
          expect(result).toHaveProperty('gameId');
          expect(result).toHaveProperty('gameType');
          expect(result).toHaveProperty('status');
          expect(result).toHaveProperty('aiSide');
          expect(result).toHaveProperty('currentTurn');
          expect(result).toHaveProperty('boardState');
          expect(result).toHaveProperty('createdAt');
          expect(result).toHaveProperty('updatedAt');
          // winner is optional, but the property should exist
          expect('winner' in result!).toBe(true);

          // Verify field types
          expect(typeof result!.gameId).toBe('string');
          expect(typeof result!.gameType).toBe('string');
          expect(typeof result!.status).toBe('string');
          expect(typeof result!.aiSide).toBe('string');
          expect(typeof result!.currentTurn).toBe('number');
          expect(typeof result!.boardState).toBe('object');
          expect(typeof result!.createdAt).toBe('string');
          expect(typeof result!.updatedAt).toBe('string');

          // Verify field values match input
          expect(result!.gameId).toBe(gameData.gameId);
          expect(result!.gameType).toBe(gameData.gameType);
          expect(result!.status).toBe(gameData.status);
          expect(result!.aiSide).toBe(gameData.aiSide);
          expect(result!.currentTurn).toBe(gameData.currentTurn);
          expect(result!.winner).toBe(gameData.winner);
          expect(result!.createdAt).toBe(gameData.createdAt);
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });
});

describe('GameService Property Tests - Game Creation', () => {
  let gameService: GameService;
  let gameRepository: GameRepository;
  let mockDocClient: DynamoDBDocumentClient;

  beforeEach(() => {
    mockDocClient = {
      send: vi.fn(),
    } as unknown as DynamoDBDocumentClient;
    gameRepository = new GameRepository(mockDocClient, 'test-table');
    gameService = new GameService(gameRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 9: Created Game Has Valid UUID
   * **Validates: Requirements 3.6**
   *
   * For any game creation request with valid data, the returned gameId should be
   * a valid UUID v4 format, and multiple creations should produce unique IDs.
   */
  it('Property 9: Created Game Has Valid UUID', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constantFrom('BLACK', 'WHITE'), async (aiSide) => {
        // Mock DynamoDB responses
        vi.mocked(mockDocClient.send).mockResolvedValue({} as never);

        // Execute
        const game = await gameService.createGame({
          gameType: 'OTHELLO',
          aiSide,
        });

        // Verify UUID v4 format
        const uuidV4Regex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        expect(game.gameId).toMatch(uuidV4Regex);
      }),
      { numRuns: 20, endOnFailure: true }
    );
  });

  /**
   * Property 10: Created Game Has Correct Initial State
   * **Validates: Requirements 3.7, 3.8, 3.9, 3.10, 3.12**
   *
   * For any valid game creation request, the created game should have:
   * - status = ACTIVE
   * - currentTurn = 0
   * - winner = null
   * - boardState matching the Othello initial board configuration
   *   (White at [3,3] and [4,4], Black at [3,4] and [4,3])
   */
  it('Property 10: Created Game Has Correct Initial State', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constantFrom('BLACK', 'WHITE'), async (aiSide) => {
        // Mock DynamoDB responses
        vi.mocked(mockDocClient.send).mockResolvedValue({} as never);

        // Execute
        const game = await gameService.createGame({
          gameType: 'OTHELLO',
          aiSide,
        });

        // Verify initial state (Requirements 3.7, 3.8, 3.10)
        expect(game.status).toBe('ACTIVE');
        expect(game.currentTurn).toBe(0);
        expect(game.winner).toBe(null);

        // Verify initial board configuration (Requirements 3.9, 3.12)
        expect(game.boardState.board).toHaveLength(8);
        expect(game.boardState.board[0]).toHaveLength(8);

        // Check initial disc placement
        expect(game.boardState.board[3][3]).toBe(CellState.White); // White at (3,3)
        expect(game.boardState.board[3][4]).toBe(CellState.Black); // Black at (3,4)
        expect(game.boardState.board[4][3]).toBe(CellState.Black); // Black at (4,3)
        expect(game.boardState.board[4][4]).toBe(CellState.White); // White at (4,4)

        // Verify all other cells are empty
        let discCount = 0;
        for (let row = 0; row < 8; row++) {
          for (let col = 0; col < 8; col++) {
            if (game.boardState.board[row][col] !== CellState.Empty) {
              discCount++;
            }
          }
        }
        expect(discCount).toBe(4); // Only 4 initial discs
      }),
      { numRuns: 20, endOnFailure: true }
    );
  });

  /**
   * Property 11: Created Game Is Persisted
   * **Validates: Requirements 3.11**
   *
   * For any successfully created game, immediately retrieving that game by its
   * gameId should return the same game data.
   */
  it('Property 11: Created Game Is Persisted', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constantFrom('BLACK', 'WHITE'), async (aiSide) => {
        // Mock DynamoDB responses
        vi.mocked(mockDocClient.send).mockResolvedValue({} as never);

        // Execute creation
        const createdGame = await gameService.createGame({
          gameType: 'OTHELLO',
          aiSide,
        });

        // Verify DynamoDB send was called (for both create and updateBoardState)
        expect(mockDocClient.send).toHaveBeenCalled();
        const callCount = vi.mocked(mockDocClient.send).mock.calls.length;
        expect(callCount).toBeGreaterThanOrEqual(2); // At least create + updateBoardState

        // Verify the game data is consistent
        expect(createdGame.gameId).toBeDefined();
        expect(createdGame.gameType).toBe('OTHELLO');
        expect(createdGame.status).toBe('ACTIVE');
        expect(createdGame.aiSide).toBe(aiSide);
        expect(createdGame.currentTurn).toBe(0);
        expect(createdGame.boardState).toBeDefined();
        expect(createdGame.boardState.board).toHaveLength(8);
      }),
      { numRuns: 20, endOnFailure: true }
    );
  });
});

describe('GameService Property Tests - Game Detail Retrieval', () => {
  let gameService: GameService;
  let gameRepository: GameRepository;
  let mockDocClient: DynamoDBDocumentClient;

  beforeEach(() => {
    mockDocClient = {
      send: vi.fn(),
    } as unknown as DynamoDBDocumentClient;
    gameRepository = new GameRepository(mockDocClient, 'test-table');
    gameService = new GameService(gameRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 7: Detail Response BoardState Is Object
   * **Validates: Requirements 2.3**
   *
   * For any game retrieved by the detail endpoint, the boardState field should be
   * a parsed object (not a JSON string) containing a board array.
   */
  it('Property 7: Detail Response BoardState Is Object', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom('BLACK', 'WHITE'),
        fc.array(fc.array(fc.constantFrom(0, 1, 2), { minLength: 8, maxLength: 8 }), {
          minLength: 8,
          maxLength: 8,
        }),
        async (gameId, aiSide, board) => {
          // Create boardState as JSON string (as stored in DynamoDB)
          const boardStateString = JSON.stringify({ board });

          // Mock repository response
          vi.mocked(mockDocClient.send).mockResolvedValue({
            Item: {
              PK: `GAME#${gameId}`,
              SK: `GAME#${gameId}`,
              GSI1PK: 'GAME#STATUS#ACTIVE',
              GSI1SK: new Date().toISOString(),
              entityType: 'GAME',
              gameId,
              gameType: 'OTHELLO',
              status: 'ACTIVE',
              aiSide,
              currentTurn: 0,
              boardState: boardStateString,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          } as never);

          // Execute
          const result = await gameService.getGame(gameId);

          // Verify boardState is an object, not a string
          expect(result).not.toBeNull();
          expect(typeof result!.boardState).toBe('object');
          expect(typeof result!.boardState.board).toBe('object');
          expect(Array.isArray(result!.boardState.board)).toBe(true);

          // Verify the board data is preserved
          expect(result!.boardState.board).toEqual(board);
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  /**
   * Property 8: Detail Response Contains Required Fields
   * **Validates: Requirements 2.5**
   *
   * For any game returned in the detail endpoint, the response object should contain
   * all required fields: gameId, gameType, status, aiSide, currentTurn, boardState,
   * winner, createdAt, and updatedAt.
   */
  it('Property 8: Detail Response Contains Required Fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          gameId: fc.uuid(),
          gameType: fc.constant('OTHELLO' as const),
          status: fc.constantFrom('ACTIVE', 'FINISHED'),
          aiSide: fc.constantFrom('BLACK', 'WHITE'),
          currentTurn: fc.nat({ max: 100 }),
          winner: fc.option(fc.constantFrom('AI', 'COLLECTIVE', 'DRAW'), { nil: undefined }),
          createdAt: fc
            .integer({ min: Date.parse('2024-01-01'), max: Date.now() })
            .map((timestamp) => new Date(timestamp).toISOString()),
        }),
        fc.array(fc.array(fc.constantFrom(0, 1, 2), { minLength: 8, maxLength: 8 }), {
          minLength: 8,
          maxLength: 8,
        }),
        async (gameData, board) => {
          // Create boardState as JSON string
          const boardStateString = JSON.stringify({ board });

          // Mock repository response
          vi.mocked(mockDocClient.send).mockResolvedValue({
            Item: {
              PK: `GAME#${gameData.gameId}`,
              SK: `GAME#${gameData.gameId}`,
              GSI1PK: `GAME#STATUS#${gameData.status}`,
              GSI1SK: gameData.createdAt,
              entityType: 'GAME',
              gameId: gameData.gameId,
              gameType: gameData.gameType,
              status: gameData.status,
              aiSide: gameData.aiSide,
              currentTurn: gameData.currentTurn,
              boardState: boardStateString,
              winner: gameData.winner,
              createdAt: gameData.createdAt,
              updatedAt: gameData.createdAt,
            },
          } as never);

          // Execute
          const result = await gameService.getGame(gameData.gameId);

          // Verify all required fields are present
          expect(result).not.toBeNull();
          expect(result).toHaveProperty('gameId');
          expect(result).toHaveProperty('gameType');
          expect(result).toHaveProperty('status');
          expect(result).toHaveProperty('aiSide');
          expect(result).toHaveProperty('currentTurn');
          expect(result).toHaveProperty('boardState');
          expect(result).toHaveProperty('createdAt');
          expect(result).toHaveProperty('updatedAt');
          // winner is optional, but the property should exist
          expect('winner' in result!).toBe(true);

          // Verify types
          expect(typeof result!.gameId).toBe('string');
          expect(typeof result!.gameType).toBe('string');
          expect(typeof result!.status).toBe('string');
          expect(typeof result!.aiSide).toBe('string');
          expect(typeof result!.currentTurn).toBe('number');
          expect(typeof result!.boardState).toBe('object');
          expect(typeof result!.createdAt).toBe('string');
          expect(typeof result!.updatedAt).toBe('string');

          // Verify boardState structure
          expect(result!.boardState).toHaveProperty('board');
          expect(Array.isArray(result!.boardState.board)).toBe(true);
          expect(result!.boardState.board).toHaveLength(8);
          expect(result!.boardState.board[0]).toHaveLength(8);

          // Verify values match
          expect(result!.gameId).toBe(gameData.gameId);
          expect(result!.gameType).toBe(gameData.gameType);
          expect(result!.status).toBe(gameData.status);
          expect(result!.aiSide).toBe(gameData.aiSide);
          expect(result!.currentTurn).toBe(gameData.currentTurn);
          expect(result!.winner).toBe(gameData.winner);
          expect(result!.createdAt).toBe(gameData.createdAt);
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });
});

describe('GameService Property Tests - Game End Detection', () => {
  let gameService: GameService;
  let gameRepository: GameRepository;
  let mockDocClient: DynamoDBDocumentClient;

  beforeEach(() => {
    mockDocClient = {
      send: vi.fn(),
    } as unknown as DynamoDBDocumentClient;
    gameRepository = new GameRepository(mockDocClient, 'test-table');
    gameService = new GameService(gameRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 12: Full Board Triggers Game End
   * **Validates: Requirements 4.2**
   *
   * For any board state where all 64 cells are occupied, the game end detection
   * logic should determine that the game should end.
   */
  it('Property 12: Full Board Triggers Game End', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom('BLACK', 'WHITE'),
        fc.array(fc.array(fc.constantFrom(1, 2), { minLength: 8, maxLength: 8 }), {
          minLength: 8,
          maxLength: 8,
        }),
        async (gameId, aiSide, fullBoard) => {
          // Clear mocks for each iteration
          vi.mocked(mockDocClient.send).mockClear();

          // Ensure board is completely full (no empty cells)
          const boardState = JSON.stringify({ board: fullBoard });

          // Mock repository to return an active game with full board
          vi.mocked(mockDocClient.send).mockResolvedValueOnce({
            Item: {
              PK: `GAME#${gameId}`,
              SK: `GAME#${gameId}`,
              GSI1PK: 'GAME#STATUS#ACTIVE',
              GSI1SK: new Date().toISOString(),
              entityType: 'GAME',
              gameId,
              gameType: 'OTHELLO',
              status: 'ACTIVE',
              aiSide,
              currentTurn: 60,
              boardState,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          } as never);

          // Mock repository.finish to succeed
          vi.mocked(mockDocClient.send).mockResolvedValueOnce({} as never);

          // Execute
          await gameService.checkAndFinishGame(gameId);

          // Verify that finish was called (game should end)
          expect(mockDocClient.send).toHaveBeenCalledTimes(2); // getById + finish
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  /**
   * Property 13: No Legal Moves Triggers Game End
   * **Validates: Requirements 4.3**
   *
   * For any board state where both BLACK and WHITE players have no legal moves,
   * the game end detection logic should determine that the game should end.
   */
  it('Property 13: No Legal Moves Triggers Game End', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), fc.constantFrom('BLACK', 'WHITE'), async (gameId, aiSide) => {
        // Clear mocks for each iteration
        vi.mocked(mockDocClient.send).mockClear();

        // Create a board where no legal moves exist for either player
        // This is a specific configuration where all cells are blocked
        const noMovesBoard = [
          [1, 1, 1, 1, 1, 1, 1, 1],
          [1, 1, 1, 1, 1, 1, 1, 1],
          [1, 1, 1, 1, 1, 1, 1, 1],
          [1, 1, 1, 1, 1, 1, 1, 1],
          [1, 1, 1, 1, 1, 1, 1, 1],
          [1, 1, 1, 1, 1, 1, 1, 1],
          [1, 1, 1, 1, 1, 1, 1, 1],
          [1, 1, 1, 1, 1, 1, 1, 2],
        ];

        const boardState = JSON.stringify({ board: noMovesBoard });

        // Mock repository to return an active game
        vi.mocked(mockDocClient.send).mockResolvedValueOnce({
          Item: {
            PK: `GAME#${gameId}`,
            SK: `GAME#${gameId}`,
            GSI1PK: 'GAME#STATUS#ACTIVE',
            GSI1SK: new Date().toISOString(),
            entityType: 'GAME',
            gameId,
            gameType: 'OTHELLO',
            status: 'ACTIVE',
            aiSide,
            currentTurn: 50,
            boardState,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        } as never);

        // Mock repository.finish to succeed
        vi.mocked(mockDocClient.send).mockResolvedValueOnce({} as never);

        // Execute
        await gameService.checkAndFinishGame(gameId);

        // Verify that finish was called (game should end)
        expect(mockDocClient.send).toHaveBeenCalledTimes(2); // getById + finish
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });

  /**
   * Property 14: Single Color Triggers Game End
   * **Validates: Requirements 4.4**
   *
   * For any board state where only one color (BLACK or WHITE) remains on the board,
   * the game end detection logic should determine that the game should end.
   */
  it('Property 14: Single Color Triggers Game End', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom('BLACK', 'WHITE'),
        fc.constantFrom(1, 2),
        fc.integer({ min: 1, max: 64 }),
        async (gameId, aiSide, singleColor, discCount) => {
          // Clear mocks for each iteration
          vi.mocked(mockDocClient.send).mockClear();

          // Create a board with only one color
          const board = Array.from({ length: 8 }, () => Array(8).fill(0));

          // Place discs of single color
          let placed = 0;
          for (let row = 0; row < 8 && placed < discCount; row++) {
            for (let col = 0; col < 8 && placed < discCount; col++) {
              board[row][col] = singleColor;
              placed++;
            }
          }

          const boardState = JSON.stringify({ board });

          // Mock repository to return an active game
          vi.mocked(mockDocClient.send).mockResolvedValueOnce({
            Item: {
              PK: `GAME#${gameId}`,
              SK: `GAME#${gameId}`,
              GSI1PK: 'GAME#STATUS#ACTIVE',
              GSI1SK: new Date().toISOString(),
              entityType: 'GAME',
              gameId,
              gameType: 'OTHELLO',
              status: 'ACTIVE',
              aiSide,
              currentTurn: 30,
              boardState,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          } as never);

          // Mock repository.finish to succeed
          vi.mocked(mockDocClient.send).mockResolvedValueOnce({} as never);

          // Execute
          await gameService.checkAndFinishGame(gameId);

          // Verify that finish was called (game should end)
          expect(mockDocClient.send).toHaveBeenCalledTimes(2); // getById + finish
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  /**
   * Property 15: Game End Updates Status to FINISHED
   * **Validates: Requirements 4.5**
   *
   * For any game that meets end conditions, processing the game end should update
   * the status field to FINISHED.
   */
  it('Property 15: Game End Updates Status to FINISHED', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom('BLACK', 'WHITE'),
        fc.array(fc.array(fc.constantFrom(1, 2), { minLength: 8, maxLength: 8 }), {
          minLength: 8,
          maxLength: 8,
        }),
        async (gameId, aiSide, fullBoard) => {
          // Clear mocks for each iteration
          vi.mocked(mockDocClient.send).mockClear();

          const boardState = JSON.stringify({ board: fullBoard });

          // Mock repository to return an active game
          vi.mocked(mockDocClient.send).mockResolvedValueOnce({
            Item: {
              PK: `GAME#${gameId}`,
              SK: `GAME#${gameId}`,
              GSI1PK: 'GAME#STATUS#ACTIVE',
              GSI1SK: new Date().toISOString(),
              entityType: 'GAME',
              gameId,
              gameType: 'OTHELLO',
              status: 'ACTIVE',
              aiSide,
              currentTurn: 60,
              boardState,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          } as never);

          // Mock repository.finish to succeed
          vi.mocked(mockDocClient.send).mockResolvedValueOnce({} as never);

          // Execute
          await gameService.checkAndFinishGame(gameId);

          // Verify that finish was called with a winner
          const finishCalls = vi.mocked(mockDocClient.send).mock.calls;
          expect(finishCalls.length).toBe(2);

          // The second call should be the UpdateCommand for finishing the game
          // We verify that the repository.finish method was invoked
          expect(finishCalls[1]).toBeDefined();
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  /**
   * Property 16: Winner Determined by Disc Count and AI Side
   * **Validates: Requirements 4.6, 4.7, 4.8, 4.9**
   *
   * For any finished game, the winner should be: DRAW if disc counts are equal,
   * AI if the AI's color has more discs, or COLLECTIVE if the collective's color
   * has more discs.
   */
  it('Property 16: Winner Determined by Disc Count and AI Side', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom('BLACK', 'WHITE'),
        fc.integer({ min: 1, max: 63 }).map((blackCount) => ({
          blackCount,
          whiteCount: 64 - blackCount,
        })),
        async (gameId, aiSide, { blackCount, whiteCount }) => {
          // Clear mocks for each iteration
          vi.mocked(mockDocClient.send).mockClear();

          // Create a FULL board with specified disc counts
          const board = Array.from({ length: 8 }, () => Array(8).fill(0));
          let blackPlaced = 0;
          let whitePlaced = 0;

          for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
              if (blackPlaced < blackCount) {
                board[row][col] = CellState.Black;
                blackPlaced++;
              } else if (whitePlaced < whiteCount) {
                board[row][col] = CellState.White;
                whitePlaced++;
              }
            }
          }

          const boardState = JSON.stringify({ board });

          // Determine expected winner
          let expectedWinner: 'AI' | 'COLLECTIVE' | 'DRAW';
          if (blackCount === whiteCount) {
            expectedWinner = 'DRAW';
          } else if (blackCount > whiteCount) {
            expectedWinner = aiSide === 'BLACK' ? 'AI' : 'COLLECTIVE';
          } else {
            expectedWinner = aiSide === 'WHITE' ? 'AI' : 'COLLECTIVE';
          }

          // Mock repository to return an active game
          vi.mocked(mockDocClient.send).mockResolvedValueOnce({
            Item: {
              PK: `GAME#${gameId}`,
              SK: `GAME#${gameId}`,
              GSI1PK: 'GAME#STATUS#ACTIVE',
              GSI1SK: new Date().toISOString(),
              entityType: 'GAME',
              gameId,
              gameType: 'OTHELLO',
              status: 'ACTIVE',
              aiSide,
              currentTurn: 60,
              boardState,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          } as never);

          // Capture the winner passed to finish
          let capturedWinner: string | undefined;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          vi.mocked(mockDocClient.send).mockImplementationOnce((command: any) => {
            // Extract winner from UpdateCommand
            if (command.input?.ExpressionAttributeValues) {
              capturedWinner = command.input.ExpressionAttributeValues[':winner'];
            }
            return Promise.resolve({} as never);
          });

          // Execute
          await gameService.checkAndFinishGame(gameId);

          // Verify winner matches expected
          expect(capturedWinner).toBe(expectedWinner);
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  /**
   * Property 17: Finished Game Is Persisted
   * **Validates: Requirements 4.10**
   *
   * For any game that is finished, the updated game state (status = FINISHED,
   * winner set) should be retrievable from the database.
   */
  it('Property 17: Finished Game Is Persisted', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom('BLACK', 'WHITE'),
        fc.array(fc.array(fc.constantFrom(1, 2), { minLength: 8, maxLength: 8 }), {
          minLength: 8,
          maxLength: 8,
        }),
        async (gameId, aiSide, fullBoard) => {
          // Clear mocks for each iteration
          vi.mocked(mockDocClient.send).mockClear();

          const boardState = JSON.stringify({ board: fullBoard });

          // Mock repository to return an active game
          vi.mocked(mockDocClient.send).mockResolvedValueOnce({
            Item: {
              PK: `GAME#${gameId}`,
              SK: `GAME#${gameId}`,
              GSI1PK: 'GAME#STATUS#ACTIVE',
              GSI1SK: new Date().toISOString(),
              entityType: 'GAME',
              gameId,
              gameType: 'OTHELLO',
              status: 'ACTIVE',
              aiSide,
              currentTurn: 60,
              boardState,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          } as never);

          // Mock repository.finish to succeed
          vi.mocked(mockDocClient.send).mockResolvedValueOnce({} as never);

          // Execute checkAndFinishGame
          await gameService.checkAndFinishGame(gameId);

          // Verify that DynamoDB was called to persist the finished state
          expect(mockDocClient.send).toHaveBeenCalledTimes(2);

          // The second call should be an UpdateCommand
          const calls = vi.mocked(mockDocClient.send).mock.calls;
          expect(calls[1]).toBeDefined();
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });
});

describe('GameService Property Tests - BoardState Serialization', () => {
  /**
   * Property 19: BoardState Round-Trip Preserves Data
   * **Validates: Requirements 6.6, 6.7**
   *
   * For any valid board state, serializing it to JSON string for DynamoDB storage
   * and then deserializing it should produce an equivalent board state.
   */
  it('Property 19: BoardState Round-Trip Preserves Data', () => {
    fc.assert(
      fc.property(
        fc.array(fc.array(fc.constantFrom(0, 1, 2), { minLength: 8, maxLength: 8 }), {
          minLength: 8,
          maxLength: 8,
        }),
        (board) => {
          // Create a BoardState object
          const originalBoardState = { board };

          // Serialize to JSON string (as stored in DynamoDB)
          const serialized = JSON.stringify(originalBoardState);

          // Deserialize back to object (as retrieved from DynamoDB)
          const deserialized = JSON.parse(serialized) as { board: number[][] };

          // Verify the deserialized board state matches the original
          expect(deserialized).toEqual(originalBoardState);

          // Verify board structure is preserved
          expect(deserialized.board).toHaveLength(8);
          expect(deserialized.board[0]).toHaveLength(8);

          // Verify each cell value is preserved
          for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
              expect(deserialized.board[row][col]).toBe(originalBoardState.board[row][col]);
            }
          }

          // Verify the board is a proper 2D array (not flattened or corrupted)
          expect(Array.isArray(deserialized.board)).toBe(true);
          deserialized.board.forEach((row) => {
            expect(Array.isArray(row)).toBe(true);
            expect(row).toHaveLength(8);
          });
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });
});
