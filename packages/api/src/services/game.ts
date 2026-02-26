/**
 * GameService - ゲーム管理のビジネスロジック
 */

import { randomUUID } from 'crypto';
import { GameRepository } from '../lib/dynamodb/repositories/game';
import {
  createInitialBoard,
  shouldEndGame,
  countDiscs,
  CellState,
  type Board,
} from '../lib/othello';
import type {
  CreateGameResponse,
  GetGameResponse,
  GetGamesResponse,
  GameSummary,
} from '../types/game';

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

  /**
   * ゲーム詳細を取得
   * Requirements: 2.1, 2.2, 2.3, 2.4
   */
  async getGame(gameId: string): Promise<GetGameResponse | null> {
    // リポジトリからゲームを取得
    const entity = await this.repository.getById(gameId);

    // 存在しない場合はnullを返す
    if (!entity) {
      return null;
    }

    // boardStateをJSONからオブジェクトにパース
    const parsedBoardState = JSON.parse(entity.boardState) as { board: number[][] };

    // GetGameResponseに変換
    const response: GetGameResponse = {
      gameId: entity.gameId,
      gameType: entity.gameType,
      status: entity.status,
      aiSide: entity.aiSide,
      currentTurn: entity.currentTurn,
      boardState: parsedBoardState,
      winner: entity.winner,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt || entity.createdAt,
    };

    return response;
  }

  /**
   * ゲームを作成
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12
   */
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

  /**
   * ゲーム終了を検知して更新
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.10
   */
  async checkAndFinishGame(gameId: string): Promise<void> {
    // 1. ゲームを取得
    const entity = await this.repository.getById(gameId);
    if (!entity || entity.status === 'FINISHED') {
      return;
    }

    // 2. 盤面をパース
    const boardState = JSON.parse(entity.boardState) as { board: number[][] };

    // 3. 終了判定
    const currentPlayer = entity.currentTurn % 2 === 0 ? CellState.Black : CellState.White;
    if (!this.shouldEndGame(boardState.board, currentPlayer)) {
      return;
    }

    // 4. 勝者を決定
    const winner = this.determineWinner(boardState, entity.aiSide);

    // 5. ゲームを終了状態に更新
    await this.repository.finish(gameId, winner);
  }

  /**
   * ゲーム終了判定
   * Requirements: 4.1, 4.2, 4.3, 4.4
   */
  private shouldEndGame(board: number[][], currentPlayer: CellState): boolean {
    return shouldEndGame(board as Board, currentPlayer as CellState.Black | CellState.White);
  }

  /**
   * 勝者を決定
   * Requirements: 4.6, 4.7, 4.8, 4.9
   */
  private determineWinner(
    boardState: { board: number[][] },
    aiSide: 'BLACK' | 'WHITE'
  ): 'AI' | 'COLLECTIVE' | 'DRAW' {
    const board = boardState.board as Board;

    const blackCount = countDiscs(board, CellState.Black);
    const whiteCount = countDiscs(board, CellState.White);

    if (blackCount === whiteCount) {
      return 'DRAW';
    }

    const aiWins =
      (aiSide === 'BLACK' && blackCount > whiteCount) ||
      (aiSide === 'WHITE' && whiteCount > blackCount);

    return aiWins ? 'AI' : 'COLLECTIVE';
  }
}
