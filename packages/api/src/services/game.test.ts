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
      getById: vi.fn(),
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

  describe('checkAndFinishGame', () => {
    it('should finish game when board is full', async () => {
      // Create a full board with more black discs
      const fullBoard = Array(8)
        .fill(null)
        .map(() => Array(8).fill(1)); // All black
      fullBoard[0][0] = 2; // One white disc

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
        currentTurn: 60,
        boardState: JSON.stringify({ board: fullBoard }),
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T01:00:00.000Z',
      };

      mockRepository.finish = vi.fn().mockResolvedValue(undefined);
      vi.mocked(mockRepository.getById).mockResolvedValue(mockEntity);

      await service.checkAndFinishGame('test-id');

      expect(mockRepository.finish).toHaveBeenCalledWith('test-id', 'AI');
    });

    it('should not finish game when game is already finished', async () => {
      const mockEntity: GameEntity = {
        PK: 'GAME#test-id',
        SK: 'GAME#test-id',
        GSI1PK: 'GAME#STATUS#FINISHED',
        GSI1SK: '2024-01-01T00:00:00.000Z',
        entityType: 'GAME',
        gameId: 'test-id',
        gameType: 'OTHELLO',
        status: 'FINISHED',
        aiSide: 'BLACK',
        currentTurn: 60,
        boardState: JSON.stringify({ board: [] }),
        winner: 'AI',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T01:00:00.000Z',
      };

      mockRepository.finish = vi.fn();
      vi.mocked(mockRepository.getById).mockResolvedValue(mockEntity);

      await service.checkAndFinishGame('test-id');

      expect(mockRepository.finish).not.toHaveBeenCalled();
    });

    it('should not finish game when game does not exist', async () => {
      mockRepository.finish = vi.fn();
      vi.mocked(mockRepository.getById).mockResolvedValue(null);

      await service.checkAndFinishGame('non-existent-id');

      expect(mockRepository.finish).not.toHaveBeenCalled();
    });

    it('should determine AI winner when AI side has more discs', async () => {
      // Create board with more black discs (AI is BLACK)
      const board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(0));
      // 40 black discs, 24 white discs
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 8; j++) {
          board[i][j] = 1; // Black
        }
      }
      for (let i = 5; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          board[i][j] = 2; // White
        }
      }

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
        currentTurn: 60,
        boardState: JSON.stringify({ board }),
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T01:00:00.000Z',
      };

      mockRepository.finish = vi.fn().mockResolvedValue(undefined);
      vi.mocked(mockRepository.getById).mockResolvedValue(mockEntity);

      await service.checkAndFinishGame('test-id');

      expect(mockRepository.finish).toHaveBeenCalledWith('test-id', 'AI');
    });

    it('should determine COLLECTIVE winner when collective side has more discs', async () => {
      // Create board with more white discs (AI is BLACK, so WHITE is COLLECTIVE)
      const board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(0));
      // 24 black discs, 40 white discs
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 8; j++) {
          board[i][j] = 1; // Black
        }
      }
      for (let i = 3; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          board[i][j] = 2; // White
        }
      }

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
        currentTurn: 60,
        boardState: JSON.stringify({ board }),
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T01:00:00.000Z',
      };

      mockRepository.finish = vi.fn().mockResolvedValue(undefined);
      vi.mocked(mockRepository.getById).mockResolvedValue(mockEntity);

      await service.checkAndFinishGame('test-id');

      expect(mockRepository.finish).toHaveBeenCalledWith('test-id', 'COLLECTIVE');
    });

    it('should determine DRAW when disc counts are equal', async () => {
      // Create board with equal discs
      const board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(0));
      // 32 black discs, 32 white discs
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 8; j++) {
          board[i][j] = 1; // Black
        }
      }
      for (let i = 4; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          board[i][j] = 2; // White
        }
      }

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
        currentTurn: 60,
        boardState: JSON.stringify({ board }),
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T01:00:00.000Z',
      };

      mockRepository.finish = vi.fn().mockResolvedValue(undefined);
      vi.mocked(mockRepository.getById).mockResolvedValue(mockEntity);

      await service.checkAndFinishGame('test-id');

      expect(mockRepository.finish).toHaveBeenCalledWith('test-id', 'DRAW');
    });
  });

  describe('getGame', () => {
    it('should return game with parsed boardState when game exists', async () => {
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
        currentTurn: 5,
        boardState: JSON.stringify({
          board: [
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 2, 1, 0, 0, 0],
            [0, 0, 0, 1, 2, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
          ],
        }),
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T01:00:00.000Z',
      };

      vi.mocked(mockRepository.getById).mockResolvedValue(mockEntity);

      const result = await service.getGame('test-id');

      expect(result).not.toBeNull();
      expect(result?.gameId).toBe('test-id');
      expect(result?.gameType).toBe('OTHELLO');
      expect(result?.status).toBe('ACTIVE');
      expect(result?.aiSide).toBe('BLACK');
      expect(result?.currentTurn).toBe(5);
      expect(result?.boardState).toBeDefined();
      expect(result?.boardState.board).toHaveLength(8);
      expect(result?.boardState.board[3][3]).toBe(2);
      expect(result?.boardState.board[3][4]).toBe(1);
      expect(result?.createdAt).toBe('2024-01-01T00:00:00.000Z');
      expect(result?.updatedAt).toBe('2024-01-01T01:00:00.000Z');
    });

    it('should return null when game does not exist', async () => {
      vi.mocked(mockRepository.getById).mockResolvedValue(null);

      const result = await service.getGame('non-existent-id');

      expect(result).toBeNull();
      expect(mockRepository.getById).toHaveBeenCalledWith('non-existent-id');
    });

    it('should parse boardState from JSON string to object', async () => {
      const boardData = {
        board: [
          [0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 1, 0, 0, 0],
          [0, 0, 0, 2, 1, 0, 0, 0],
          [0, 0, 0, 1, 2, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0],
        ],
      };

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
        currentTurn: 3,
        boardState: JSON.stringify(boardData),
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:30:00.000Z',
      };

      vi.mocked(mockRepository.getById).mockResolvedValue(mockEntity);

      const result = await service.getGame('test-id');

      expect(result).not.toBeNull();
      expect(result?.boardState).toEqual(boardData);
      expect(typeof result?.boardState).toBe('object');
      expect(result?.boardState.board[2][4]).toBe(1);
    });

    it('should include winner when game is finished', async () => {
      const mockEntity: GameEntity = {
        PK: 'GAME#test-id',
        SK: 'GAME#test-id',
        GSI1PK: 'GAME#STATUS#FINISHED',
        GSI1SK: '2024-01-01T00:00:00.000Z',
        entityType: 'GAME',
        gameId: 'test-id',
        gameType: 'OTHELLO',
        status: 'FINISHED',
        aiSide: 'BLACK',
        currentTurn: 60,
        boardState: JSON.stringify({ board: [] }),
        winner: 'AI',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T02:00:00.000Z',
      };

      vi.mocked(mockRepository.getById).mockResolvedValue(mockEntity);

      const result = await service.getGame('test-id');

      expect(result).not.toBeNull();
      expect(result?.status).toBe('FINISHED');
      expect(result?.winner).toBe('AI');
    });

    it('should use createdAt as updatedAt when updatedAt is missing', async () => {
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
        // updatedAt is missing
      };

      vi.mocked(mockRepository.getById).mockResolvedValue(mockEntity);

      const result = await service.getGame('test-id');

      expect(result).not.toBeNull();
      expect(result?.updatedAt).toBe('2024-01-01T00:00:00.000Z');
    });
  });
});
