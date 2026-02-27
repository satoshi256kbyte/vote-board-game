import { describe, it, expect } from 'vitest';
import type {
  GameType,
  GameStatus,
  PlayerColor,
  Winner,
  BoardState,
  GameSummary,
  Game,
  Move,
  Candidate,
  Vote,
  CreateGameRequest,
  CreateCandidateRequest,
  GetGamesQuery,
  GetGamesResponse,
} from './game';

describe('Game Type Definitions', () => {
  describe('Basic Types', () => {
    it('should accept valid GameType values', () => {
      const types: GameType[] = ['OTHELLO', 'CHESS', 'GO', 'SHOGI'];
      expect(types).toHaveLength(4);
    });

    it('should accept valid GameStatus values', () => {
      const statuses: GameStatus[] = ['ACTIVE', 'FINISHED'];
      expect(statuses).toHaveLength(2);
    });

    it('should accept valid PlayerColor values', () => {
      const colors: PlayerColor[] = ['BLACK', 'WHITE'];
      expect(colors).toHaveLength(2);
    });

    it('should accept valid Winner values', () => {
      const winners: Winner[] = ['AI', 'COLLECTIVE', 'DRAW'];
      expect(winners).toHaveLength(3);
    });
  });

  describe('BoardState', () => {
    it('should accept valid board state', () => {
      const boardState: BoardState = {
        board: Array(8)
          .fill(null)
          .map(() => Array(8).fill(0)),
      };
      expect(boardState.board).toHaveLength(8);
      expect(boardState.board[0]).toHaveLength(8);
    });
  });

  describe('GameSummary', () => {
    it('should accept valid game summary', () => {
      const summary: GameSummary = {
        gameId: '123e4567-e89b-12d3-a456-426614174000',
        gameType: 'OTHELLO',
        status: 'ACTIVE',
        aiSide: 'BLACK',
        currentTurn: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      expect(summary.gameId).toBeDefined();
    });

    it('should accept game summary with winner', () => {
      const summary: GameSummary = {
        gameId: '123e4567-e89b-12d3-a456-426614174000',
        gameType: 'OTHELLO',
        status: 'FINISHED',
        aiSide: 'BLACK',
        currentTurn: 60,
        winner: 'AI',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      expect(summary.winner).toBe('AI');
    });
  });

  describe('Game', () => {
    it('should accept valid game', () => {
      const game: Game = {
        gameId: '123e4567-e89b-12d3-a456-426614174000',
        gameType: 'OTHELLO',
        status: 'ACTIVE',
        aiSide: 'WHITE',
        currentTurn: 5,
        boardState: {
          board: Array(8)
            .fill(null)
            .map(() => Array(8).fill(0)),
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      expect(game.boardState.board).toHaveLength(8);
    });
  });

  describe('Move', () => {
    it('should accept valid move', () => {
      const move: Move = {
        turn: 1,
        player: 'BLACK',
        position: 'D3',
        timestamp: '2024-01-01T00:00:00Z',
      };
      expect(move.position).toBe('D3');
    });
  });

  describe('Candidate', () => {
    it('should accept valid candidate', () => {
      const candidate: Candidate = {
        candidateId: '123e4567-e89b-12d3-a456-426614174001',
        gameId: '123e4567-e89b-12d3-a456-426614174000',
        position: 'C4',
        description: 'この手は中央を制圧する重要な一手です',
        userId: 'user123',
        username: 'testuser',
        voteCount: 5,
        resultingBoardState: {
          board: Array(8)
            .fill(null)
            .map(() => Array(8).fill(0)),
        },
        createdAt: '2024-01-01T00:00:00Z',
      };
      expect(candidate.position).toBe('C4');
      expect(candidate.description).toHaveLength(18);
    });
  });

  describe('Vote', () => {
    it('should accept valid vote', () => {
      const vote: Vote = {
        voteId: '123e4567-e89b-12d3-a456-426614174002',
        gameId: '123e4567-e89b-12d3-a456-426614174000',
        candidateId: '123e4567-e89b-12d3-a456-426614174001',
        userId: 'user123',
        createdAt: '2024-01-01T00:00:00Z',
      };
      expect(vote.voteId).toBeDefined();
    });
  });

  describe('CreateGameRequest', () => {
    it('should accept valid create game request', () => {
      const request: CreateGameRequest = {
        gameType: 'OTHELLO',
        aiSide: 'BLACK',
      };
      expect(request.gameType).toBe('OTHELLO');
    });
  });

  describe('CreateCandidateRequest', () => {
    it('should accept valid create candidate request', () => {
      const request: CreateCandidateRequest = {
        position: 'E5',
        description: 'この手は攻撃的な一手です',
      };
      expect(request.position).toBe('E5');
    });
  });

  describe('GetGamesQuery', () => {
    it('should accept valid query with all parameters', () => {
      const query: GetGamesQuery = {
        status: 'ACTIVE',
        limit: 20,
        cursor: 'cursor123',
      };
      expect(query.status).toBe('ACTIVE');
    });

    it('should accept query with optional parameters', () => {
      const query: GetGamesQuery = {};
      expect(query).toBeDefined();
    });
  });

  describe('GetGamesResponse', () => {
    it('should accept valid response', () => {
      const response: GetGamesResponse = {
        games: [
          {
            gameId: '123e4567-e89b-12d3-a456-426614174000',
            gameType: 'OTHELLO',
            status: 'ACTIVE',
            aiSide: 'BLACK',
            currentTurn: 0,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
        nextCursor: 'cursor123',
      };
      expect(response.games).toHaveLength(1);
    });

    it('should accept response without nextCursor', () => {
      const response: GetGamesResponse = {
        games: [],
      };
      expect(response.nextCursor).toBeUndefined();
    });
  });
});
