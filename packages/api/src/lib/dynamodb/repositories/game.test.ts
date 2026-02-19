import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { GameRepository } from './game';

describe('GameRepository', () => {
  let repository: GameRepository;
  let mockDocClient: DynamoDBDocumentClient;

  beforeEach(() => {
    mockDocClient = {
      send: vi.fn(),
    } as unknown as DynamoDBDocumentClient;
    repository = new GameRepository(mockDocClient, 'test-table');
  });

  describe('create', () => {
    it('should create a new game', async () => {
      vi.mocked(mockDocClient.send).mockResolvedValue({} as never);

      const result = await repository.create({
        gameId: 'game-123',
        gameType: 'OTHELLO',
        aiSide: 'BLACK',
      });

      expect(result.gameId).toBe('game-123');
      expect(result.gameType).toBe('OTHELLO');
      expect(result.status).toBe('ACTIVE');
      expect(result.currentTurn).toBe(0);
      expect(mockDocClient.send).toHaveBeenCalledOnce();
    });
  });

  describe('getById', () => {
    it('should return game when found', async () => {
      const mockGame = {
        PK: 'GAME#game-123',
        SK: 'GAME#game-123',
        gameId: 'game-123',
        status: 'ACTIVE',
      };

      vi.mocked(mockDocClient.send).mockResolvedValue({
        Item: mockGame,
      } as never);

      const result = await repository.getById('game-123');

      expect(result).toEqual(mockGame);
    });

    it('should return null when not found', async () => {
      vi.mocked(mockDocClient.send).mockResolvedValue({} as never);

      const result = await repository.getById('game-123');

      expect(result).toBeNull();
    });
  });

  describe('listByStatus', () => {
    it('should return games by status', async () => {
      const mockGames = [
        { gameId: 'game-1', status: 'ACTIVE' },
        { gameId: 'game-2', status: 'ACTIVE' },
      ];

      vi.mocked(mockDocClient.send).mockResolvedValue({
        Items: mockGames,
      } as never);

      const result = await repository.listByStatus('ACTIVE');

      expect(result).toEqual(mockGames);
      expect(result).toHaveLength(2);
    });
  });
});
