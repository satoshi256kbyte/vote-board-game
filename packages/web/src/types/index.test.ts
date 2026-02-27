import { describe, it, expect } from 'vitest';
import type { GameType, GameStatus, GameMode, PlayerColor, Winner, Game } from './index';

describe('Type Exports from Index', () => {
  it('should export all types from index', () => {
    // This test verifies that all types can be imported from the index file
    // If any type is missing, TypeScript will fail to compile
    const gameType: GameType = 'OTHELLO';
    const status: GameStatus = 'ACTIVE';
    const mode: GameMode = 'AI_VS_COLLECTIVE';
    const color: PlayerColor = 'BLACK';
    const winner: Winner = 'AI';

    expect(gameType).toBe('OTHELLO');
    expect(status).toBe('ACTIVE');
    expect(mode).toBe('AI_VS_COLLECTIVE');
    expect(color).toBe('BLACK');
    expect(winner).toBe('AI');
  });

  it('should allow creating complex types from index', () => {
    const game: Game = {
      gameId: '123e4567-e89b-12d3-a456-426614174000',
      gameType: 'OTHELLO',
      status: 'ACTIVE',
      aiSide: 'WHITE',
      currentTurn: 0,
      boardState: {
        board: Array(8)
          .fill(null)
          .map(() => Array(8).fill(0)),
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    expect(game.gameId).toBeDefined();
    expect(game.boardState.board).toHaveLength(8);
  });
});
