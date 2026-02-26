/**
 * GameService - ゲーム管理のビジネスロジック
 */

import { randomUUID } from 'crypto';
import { GameRepository } from '../lib/dynamodb/repositories/game';
import { createInitialBoard } from '../lib/othello';
import type { CreateGameResponse } from '../types/game';

export class GameService {
  constructor(private repository: GameRepository) {}

  async createGame(params: {
    gameType: 'OTHELLO';
    aiSide: 'BLACK' | 'WHITE';
  }): Promise<CreateGameResponse> {
    const gameId = randomUUID();
    const initialBoard = createInitialBoard();
    const boardState = JSON.stringify({
      board: initialBoard.map((row) => [...row]),
    });

    const entity = await this.repository.create({
      gameId,
      gameType: params.gameType,
      aiSide: params.aiSide,
    });

    await this.repository.updateBoardState(gameId, boardState, 0);
    const parsedBoardState = JSON.parse(boardState) as { board: number[][] };

    const response: CreateGameResponse = {
      gameId: entity.gameId,
      gameType: 'OTHELLO',
      status: 'ACTIVE',
      aiSide: entity.aiSide,
      currentTurn: 0,
      boardState: parsedBoardState,
      winner: null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt || entity.createdAt,
    };

    return response;
  }
}
