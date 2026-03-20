/**
 * GameService - ゲーム管理のビジネスロジック
 */

import { randomUUID } from 'crypto';
import { GameRepository } from '../lib/dynamodb/repositories/game';
import { MoveRepository } from '../lib/dynamodb/repositories/move';
import {
  createInitialBoard,
  executeMove,
  shouldEndGame,
  countDiscs,
  CellState,
  type Board,
} from '../lib/othello';
import type {
  CreateGameResponse,
  GetGameResponse,
  GetGameTurnResponse,
  GetGamesResponse,
  GameSummary,
} from '../types/game';

export class GameService {
  constructor(
    private repository: GameRepository,
    private moveRepository?: MoveRepository
  ) {}

  /**
   * ゲーム一覧を取得
   * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 5.1, 5.2
   */
  async listGames(params: {
    status: 'ACTIVE' | 'FINISHED';
    limit: number;
    cursor?: string;
  }): Promise<GetGamesResponse> {
    // limitを1-100の範囲に制限
    const effectiveLimit = Math.min(Math.max(params.limit, 1), 100);

    const games: GameSummary[] = [];
    let currentCursor = params.cursor;
    let lastEvaluatedKey: Record<string, unknown> | undefined;

    // E2Eタグ付きゲームを除外しつつ、limit件数を満たすまでページネーション
    while (games.length < effectiveLimit) {
      // 不足分 + バッファを考慮して多めに取得
      const fetchLimit = Math.min((effectiveLimit - games.length) * 2, 100);

      const result = await this.repository.listByStatus(params.status, fetchLimit, currentCursor);

      // E2Eタグ付きゲームを除外してGameSummaryに変換
      for (const entity of result.items) {
        if (games.length >= effectiveLimit) break;
        if (entity.tags?.includes('E2E')) continue;

        games.push({
          gameId: entity.gameId,
          gameType: entity.gameType,
          status: entity.status,
          aiSide: entity.aiSide,
          currentTurn: entity.currentTurn,
          winner: entity.winner,
          tags: entity.tags || [],
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt || entity.createdAt,
        });
      }

      lastEvaluatedKey = result.lastEvaluatedKey;

      // これ以上データがない場合はループを抜ける
      if (!result.lastEvaluatedKey) break;

      // 次のページのカーソルを更新
      currentCursor = Buffer.from(JSON.stringify(result.lastEvaluatedKey)).toString('base64');
    }

    // nextCursorを生成（LastEvaluatedKeyが存在し、まだデータがある可能性がある場合）
    const nextCursor = lastEvaluatedKey
      ? Buffer.from(JSON.stringify(lastEvaluatedKey)).toString('base64')
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
   * 特定ターンの盤面を取得
   * 初期盤面から手履歴をリプレイして該当ターンの盤面を再構築する
   * Requirements: 2.1, 2.3
   */
  async getGameTurn(gameId: string, turnNumber: number): Promise<GetGameTurnResponse | null> {
    // 1. ゲームの存在確認
    const entity = await this.repository.getById(gameId);
    if (!entity) {
      return null;
    }

    // 2. ターン番号がゲームの現在ターン以下であることを確認
    if (turnNumber > entity.currentTurn) {
      return null;
    }

    // 3. MoveRepository が必要
    if (!this.moveRepository) {
      throw new Error('MoveRepository is required for getGameTurn');
    }

    // 4. 手履歴を取得
    const moves = await this.moveRepository.listByGame(gameId);

    // 5. ターン番号順にソート
    const sortedMoves = [...moves].sort((a, b) => a.turnNumber - b.turnNumber);

    // 6. 初期盤面から指定ターンまでリプレイ
    let board: number[][] = createInitialBoard().map((row) => [...row]);

    for (const move of sortedMoves) {
      if (move.turnNumber >= turnNumber) {
        break;
      }

      const [row, col] = move.position.split(',').map(Number);
      const player = move.side === 'BLACK' ? CellState.Black : CellState.White;

      board = executeMove(board as Board, { row, col }, player) as unknown as number[][];
    }

    // 7. 該当ターンの手番を決定（偶数ターン=黒、奇数ターン=白）
    const currentPlayer: 'BLACK' | 'WHITE' = turnNumber % 2 === 0 ? 'BLACK' : 'WHITE';

    return {
      gameId,
      turnNumber,
      boardState: { board },
      currentPlayer,
    };
  }

  /**
   * ゲームを作成
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12
   */
  async createGame(params: {
    gameType: 'OTHELLO';
    aiSide: 'BLACK' | 'WHITE';
    tags?: string[];
  }): Promise<CreateGameResponse> {
    const gameId = randomUUID();
    const initialBoard = createInitialBoard();
    const boardState = JSON.stringify({
      board: initialBoard.map((row) => [...row]),
    });

    // Create game with initial board state in a single operation
    const entity = await this.repository.create({
      gameId,
      gameType: params.gameType,
      aiSide: params.aiSide,
      boardState, // Pass initial board state to create method
      tags: params.tags,
    });

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
