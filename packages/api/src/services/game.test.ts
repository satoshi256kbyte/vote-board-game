/**
 * GameService unit tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameService } from './game';
import { GameRepository } from '../lib/dynamodb/repositories/game';
import type { GameEntity } from '../lib/dynamodb/types';

describe('GameService', () => {
  let service: GameService;
  let mockRepository: GameRepository;

  beforeEach(() => {
    mockRepository = {
      create: vi.fn(),
      updateBoardState: vi.fn(),
    } as unknown as GameRepository;

    service = new GameService(mockRepository);
  });

  describe('createGame', () => {
    it('should create a new game with valid UUID', async () => {
      const mockEntity: GameEntity = {
        PK: 'GAME#test-id',
        SK: 'GAME#test-id',
        GSI1PK: 'GAME#STATUS#ACTIVE',
        GSI1SK: '2024-01-01T00:00:00.000Z',
        entityType: 'GAME',
        gameId: 'test-id',
        gameType: 'OTHELLO',
        status: 'ACTIVE',
        aiSide: 'BLACK',
        currentTurn: 0,
        boardState: JSON.stringify({ board: [] }),
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(mockRepository.create).mockResolvedValue(mockEntity);
      vi.mocked(mockRepository.updateBoardState).mockResolvedValue();

      const result = await service.createGame({
        gameType: 'OTHELLO',
        aiSide: 'BLACK',
      });

      expect(result.gameId).toBeDefined();
      expect(result.gameType).toBe('OTHELLO');
      expect(result.status).toBe('ACTIVE');
      expect(result.aiSide).toBe('BLACK');
      expect(result.currentTurn).toBe(0);
      expect(result.winner).toBe(null);
      expect(result.boardState).toBeDefined();
      expect(result.boardState.board).toHaveLength(8);
      expect(result.boardState.board[0]).toHaveLength(8);
    });

    it('should create initial board with correct disc positions', async () => {
      const mockEntity: GameEntity = {
        PK: 'GAME#test-id',
        SK: 'GAME#test-id',
        GSI1PK: 'GAME#STATUS#ACTIVE',
        GSI1SK: '2024-01-01T00:00:00.000Z',
        entityType: 'GAME',
        gameId: 'test-id',
        gameType: 'OTHELLO',
        status: 'ACTIVE',
        aiSide: 'WHITE',
        currentTurn: 0,
        boardState: JSON.stringify({ board: [] }),
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(mockRepository.create).mockResolvedValue(mockEntity);
      vi.mocked(mockRepository.updateBoardState).mockResolvedValue();

      const result = await service.createGame({
        gameType: 'OTHELLO',
        aiSide: 'WHITE',
      });

      // Check initial Othello board configuration
      // White at [3,3] and [4,4], Black at [3,4] and [4,3]
      expect(result.boardState.board[3][3]).toBe(2); // White
      expect(result.boardState.board[3][4]).toBe(1); // Black
      expect(result.boardState.board[4][3]).toBe(1); // Black
      expect(result.boardState.board[4][4]).toBe(2); // White
    });

    it('should call repository methods correctly', async () => {
      const mockEntity: GameEntity = {
        PK: 'GAME#test-id',
        SK: 'GAME#test-id',
        GSI1PK: 'GAME#STATUS#ACTIVE',
        GSI1SK: '2024-01-01T00:00:00.000Z',
        entityType: 'GAME',
        gameId: 'test-id',
        gameType: 'OTHELLO',
        status: 'ACTIVE',
        aiSide: 'BLACK',
        currentTurn: 0,
        boardState: JSON.stringify({ board: [] }),
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(mockRepository.create).mockResolvedValue(mockEntity);
      vi.mocked(mockRepository.updateBoardState).mockResolvedValue();

      await service.createGame({
        gameType: 'OTHELLO',
        aiSide: 'BLACK',
      });

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          gameType: 'OTHELLO',
          aiSide: 'BLACK',
        })
      );

      expect(mockRepository.updateBoardState).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        0
      );
    });
  });
});
