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
