/**
 * GameStateUpdater - 対局状態更新サービス
 *
 * バッチ処理の最終ステップとして、対局状態の整合性検証・
 * 連続パス検出・次サイクル準備状態の確認を行うサービスクラス。
 *
 * Requirements: 1.1, 2.1, 3.1, 4.1, 6.1, 6.3
 */

import type { GameRepository } from '../../lib/dynamodb/repositories/game.js';
import type { CandidateRepository } from '../../lib/dynamodb/repositories/candidate.js';
import type { GameEntity } from '../../lib/dynamodb/types.js';
import { getLegalMoves, CellState, countDiscs } from '../../lib/othello/index.js';
import type { Board } from '../../lib/othello/index.js';
import { isAITurn, determineWinner } from '../../lib/game-utils.js';

export interface GameStateUpdateResult {
  gameId: string;
  status: 'ok' | 'finished' | 'warning' | 'error';
  reason?: string;
  winner?: 'AI' | 'COLLECTIVE' | 'DRAW';
  blackCount?: number;
  whiteCount?: number;
  hasCandidates?: boolean;
}

export interface GameStateUpdateSummary {
  totalGames: number;
  okCount: number;
  finishedCount: number;
  warningCount: number;
  errorCount: number;
  results: GameStateUpdateResult[];
}

export class GameStateUpdater {
  constructor(
    private gameRepository: GameRepository,
    private candidateRepository: CandidateRepository
  ) {}

  async updateGameStates(): Promise<GameStateUpdateSummary> {
    console.log(
      JSON.stringify({ type: 'GAME_STATE_UPDATE_START', timestamp: new Date().toISOString() })
    );

    const { items: activeGames } = await this.gameRepository.listByStatus('ACTIVE');
    const results: GameStateUpdateResult[] = [];

    for (const game of activeGames) {
      const result = await this.processGame(game);
      results.push(result);

      console.log(
        JSON.stringify({
          type: 'GAME_STATE_UPDATE_GAME_COMPLETE',
          gameId: game.gameId,
          status: result.status,
        })
      );
    }

    const summary: GameStateUpdateSummary = {
      totalGames: results.length,
      okCount: results.filter((r) => r.status === 'ok').length,
      finishedCount: results.filter((r) => r.status === 'finished').length,
      warningCount: results.filter((r) => r.status === 'warning').length,
      errorCount: results.filter((r) => r.status === 'error').length,
      results,
    };

    console.log(
      JSON.stringify({
        type: 'GAME_STATE_UPDATE_COMPLETE',
        totalGames: summary.totalGames,
        okCount: summary.okCount,
        finishedCount: summary.finishedCount,
        warningCount: summary.warningCount,
        errorCount: summary.errorCount,
      })
    );

    return summary;
  }

  private async processGame(game: GameEntity): Promise<GameStateUpdateResult> {
    console.log(JSON.stringify({ type: 'GAME_STATE_UPDATE_GAME_START', gameId: game.gameId }));

    try {
      // 1. 盤面パース & 検証
      const board = this.validateBoardState(game.boardState);
      if (!board) {
        console.error(
          JSON.stringify({
            type: 'GAME_STATE_INVALID_BOARD_ERROR',
            gameId: game.gameId,
          })
        );
        return { gameId: game.gameId, status: 'error', reason: 'Invalid board state' };
      }

      // 2. 連続パス検出
      const blackMoves = getLegalMoves(board, CellState.Black);
      const whiteMoves = getLegalMoves(board, CellState.White);

      if (blackMoves.length === 0 && whiteMoves.length === 0) {
        const winner = determineWinner(board, game.aiSide as 'BLACK' | 'WHITE');
        const blackCount = countDiscs(board, CellState.Black);
        const whiteCount = countDiscs(board, CellState.White);

        try {
          await this.gameRepository.finish(game.gameId, winner);
        } catch (finishError) {
          console.error(
            JSON.stringify({
              type: 'GAME_STATE_FINISH_FAILED',
              gameId: game.gameId,
              error: finishError instanceof Error ? finishError.message : 'Unknown error',
            })
          );
          return {
            gameId: game.gameId,
            status: 'error',
            reason: finishError instanceof Error ? finishError.message : 'Failed to finish game',
          };
        }

        console.log(
          JSON.stringify({
            type: 'GAME_STATE_CONSECUTIVE_PASS',
            gameId: game.gameId,
            winner,
            blackCount,
            whiteCount,
          })
        );

        return {
          gameId: game.gameId,
          status: 'finished',
          winner,
          blackCount,
          whiteCount,
        };
      }

      // 3. 候補存在チェック（AI ターンはスキップ）
      if (isAITurn(game)) {
        console.log(
          JSON.stringify({
            type: 'GAME_STATE_AI_TURN_SKIP',
            gameId: game.gameId,
            currentTurn: game.currentTurn,
          })
        );
        return { gameId: game.gameId, status: 'ok', reason: 'AI turn - candidate check skipped' };
      }

      const candidates = await this.candidateRepository.listByTurn(game.gameId, game.currentTurn);

      if (candidates.length === 0) {
        console.warn(
          JSON.stringify({
            type: 'GAME_STATE_NO_CANDIDATES_WARNING',
            gameId: game.gameId,
            currentTurn: game.currentTurn,
          })
        );
        return {
          gameId: game.gameId,
          status: 'warning',
          reason: 'No candidates for current turn',
          hasCandidates: false,
        };
      }

      return { gameId: game.gameId, status: 'ok', hasCandidates: true };
    } catch (error) {
      return {
        gameId: game.gameId,
        status: 'error',
        reason: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  validateBoardState(boardState: string): Board | null {
    try {
      const parsed = JSON.parse(boardState);
      if (!parsed.board || !Array.isArray(parsed.board) || parsed.board.length !== 8) {
        return null;
      }
      for (const row of parsed.board) {
        if (!Array.isArray(row) || row.length !== 8) {
          return null;
        }
      }
      return parsed.board as Board;
    } catch {
      return null;
    }
  }
}
