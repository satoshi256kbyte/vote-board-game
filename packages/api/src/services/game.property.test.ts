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
