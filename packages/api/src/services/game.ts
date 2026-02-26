/**
 * GameService - ゲーム管理のビジネスロジック
 */

import { randomUUID } from 'crypto';
import { GameRepository } from '../lib/dynamodb/repositories/game';
import { createInitialBoard } from '../lib/othello';
import type { CreateGameResponse, GetGamesResponse, GameSummary } from '../types/game';

export class GameService {
  constructor(private repository: GameRepository) {}

  /**
   * ゲーム一覧を取得
   * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9
   */
  async listGames(params: {
    status: 'ACTIVE' | 'FINISHED';
    limit: number;
    cursor?: string;
  }): Promise<GetGamesResponse> {
    // limitを1-100の範囲に制限
    const effectiveLimit = Math.min(Math.max(params.limit, 1), 100);

    // リポジトリからゲーム一覧を取得
    const result = await this.repository.listByStatus(params.status, effectiveLimit, params.cursor);

    // GameEntityをGameSummaryに変換
    const games: GameSummary[] = result.items.map((entity) => ({
      gameId: entity.gameId,
      gameType: entity.gameType,
      status: entity.status,
      aiSide: entity.aiSide,
      currentTurn: entity.currentTurn,
      winner: entity.winner,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt || entity.createdAt,
    }));

    // nextCursorを生成（LastEvaluatedKeyが存在する場合）
    const nextCursor = result.lastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.lastEvaluatedKey)).toString('base64')
      : undefined;

    return {
      games,
      nextCursor,
    };
  }

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
