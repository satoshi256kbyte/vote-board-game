/**
 * AIMoveExecutor - AI手実行サービス
 *
 * アクティブな対局に対してAI側の手番であれば、Bedrock (Nova Pro) を使って
 * 手を決定し、盤面を更新するサービスクラス。
 */

import type { BedrockService } from '../bedrock/index.js';
import type { GameRepository } from '../../lib/dynamodb/repositories/game.js';
import type { MoveRepository } from '../../lib/dynamodb/repositories/move.js';
import type { GameEntity } from '../../lib/dynamodb/types.js';
import {
  getLegalMoves,
  hasLegalMoves,
  executeMove,
  shouldEndGame,
  countDiscs,
  CellState,
} from '../../lib/othello/index.js';
import type { Board, Position, Player } from '../../lib/othello/index.js';
import { isAITurn, buildAIMovePrompt, getAIMoveSystemPrompt } from './prompt-builder.js';
import { parseAIMoveResponse } from './response-parser.js';
import type { AIMoveDecision, AIMoveGameResult, AIMoveProcessingSummary } from './types.js';

interface BoardStateJSON {
  board: number[][];
}

export class AIMoveExecutor {
  constructor(
    private bedrockService: BedrockService,
    private gameRepository: GameRepository,
    private moveRepository: MoveRepository
  ) {}

  async executeAIMoves(): Promise<AIMoveProcessingSummary> {
    console.log(
      JSON.stringify({ type: 'AI_MOVE_EXECUTION_START', timestamp: new Date().toISOString() })
    );

    const { items: activeGames } = await this.gameRepository.listByStatus('ACTIVE');
    const results: AIMoveGameResult[] = [];

    for (const game of activeGames) {
      try {
        const result = await this.processGame(game);
        results.push(result);
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Unknown error';
        console.log(JSON.stringify({ type: 'AI_MOVE_GAME_FAILED', gameId: game.gameId, reason }));
        results.push({ gameId: game.gameId, status: 'failed', reason });
      }
    }

    const summary: AIMoveProcessingSummary = {
      totalGames: activeGames.length,
      successCount: results.filter((r) => r.status === 'success').length,
      failedCount: results.filter((r) => r.status === 'failed').length,
      skippedCount: results.filter((r) => r.status === 'skipped').length,
      passedCount: results.filter((r) => r.status === 'passed').length,
      finishedCount: results.filter((r) => r.status === 'finished').length,
      results,
    };

    console.log(
      JSON.stringify({
        type: 'AI_MOVE_EXECUTION_COMPLETE',
        totalGames: summary.totalGames,
        successCount: summary.successCount,
        failedCount: summary.failedCount,
        skippedCount: summary.skippedCount,
        passedCount: summary.passedCount,
        finishedCount: summary.finishedCount,
      })
    );

    return summary;
  }

  private async processGame(game: GameEntity): Promise<AIMoveGameResult> {
    console.log(JSON.stringify({ type: 'AI_MOVE_GAME_START', gameId: game.gameId }));

    if (!isAITurn(game)) {
      console.log(
        JSON.stringify({ type: 'AI_MOVE_GAME_SKIPPED', gameId: game.gameId, reason: 'Not AI turn' })
      );
      return { gameId: game.gameId, status: 'skipped', reason: 'Not AI turn' };
    }

    const board = this.parseBoardState(game.boardState);
    if (!board) {
      console.log(
        JSON.stringify({
          type: 'AI_MOVE_GAME_SKIPPED',
          gameId: game.gameId,
          reason: 'Failed to parse boardState',
        })
      );
      return { gameId: game.gameId, status: 'skipped', reason: 'Failed to parse boardState' };
    }

    const aiPlayer = game.aiSide === 'BLACK' ? CellState.Black : CellState.White;
    const legalMoves = getLegalMoves(board, aiPlayer);

    if (legalMoves.length === 0) {
      const collectivePlayer = aiPlayer === CellState.Black ? CellState.White : CellState.Black;
      if (!hasLegalMoves(board, collectivePlayer)) {
        const ended = await this.handleGameEnd(game, board, aiPlayer);
        if (ended) {
          return { gameId: game.gameId, status: 'finished' };
        }
      }
      return this.handlePass(game, board, game.currentTurn);
    }

    const decision = await this.decideMove(board, [...legalMoves], game.aiSide);

    const newBoard = executeMove(board, decision.position, aiPlayer);
    const newTurn = game.currentTurn + 1;
    const newBoardState = JSON.stringify({ board: newBoard });

    await this.gameRepository.updateBoardState(game.gameId, newBoardState, newTurn);

    try {
      await this.moveRepository.create({
        gameId: game.gameId,
        turnNumber: game.currentTurn,
        side: game.aiSide,
        position: `${decision.position.row},${decision.position.col}`,
        playedBy: 'AI',
        candidateId: '',
      });
    } catch (moveError) {
      console.log(
        JSON.stringify({
          type: 'AI_MOVE_SAVE_ERROR',
          gameId: game.gameId,
          error: moveError instanceof Error ? moveError.message : 'Unknown error',
        })
      );
    }

    const nextPlayer = aiPlayer === CellState.Black ? CellState.White : CellState.Black;
    if (shouldEndGame(newBoard, nextPlayer)) {
      await this.handleGameEnd(game, newBoard, nextPlayer);
      console.log(
        JSON.stringify({
          type: 'AI_MOVE_GAME_FINISHED',
          gameId: game.gameId,
          position: `${decision.position.row},${decision.position.col}`,
          isFallback: decision.isFallback,
        })
      );
      return { gameId: game.gameId, status: 'finished' };
    }

    console.log(
      JSON.stringify({
        type: 'AI_MOVE_GAME_SUCCESS',
        gameId: game.gameId,
        position: `${decision.position.row},${decision.position.col}`,
        isFallback: decision.isFallback,
      })
    );

    return { gameId: game.gameId, status: 'success' };
  }

  parseBoardState(boardState: string): Board | null {
    try {
      const parsed = JSON.parse(boardState) as BoardStateJSON;
      if (!parsed.board || !Array.isArray(parsed.board) || parsed.board.length !== 8) {
        return null;
      }
      for (const row of parsed.board) {
        if (!Array.isArray(row) || row.length !== 8) return null;
      }
      return parsed.board as unknown as Board;
    } catch {
      return null;
    }
  }

  private async decideMove(
    board: Board,
    legalMoves: Position[],
    aiSide: 'BLACK' | 'WHITE'
  ): Promise<AIMoveDecision> {
    try {
      const prompt = buildAIMovePrompt(board, legalMoves, aiSide);
      const systemPrompt = getAIMoveSystemPrompt();
      const response = await this.bedrockService.generateText({
        prompt,
        systemPrompt,
        maxTokens: 1000,
      });

      console.log(
        JSON.stringify({
          type: 'AI_MOVE_TOKEN_USAGE',
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
          totalTokens: response.usage.totalTokens,
        })
      );

      const parseResult = parseAIMoveResponse(response.text, legalMoves);

      if (parseResult.success && parseResult.position) {
        const [row, col] = parseResult.position.split(',').map(Number);
        return {
          position: { row, col },
          description: parseResult.description || '',
          isFallback: false,
        };
      }

      console.log(
        JSON.stringify({
          type: 'AI_MOVE_PARSE_FAILED',
          error: parseResult.error,
        })
      );
    } catch (error) {
      console.log(
        JSON.stringify({
          type: 'AI_MOVE_BEDROCK_ERROR',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      );
    }

    // フォールバック: 合法手の先頭を選択
    const fallbackMove = legalMoves[0];
    return {
      position: { row: fallbackMove.row, col: fallbackMove.col },
      description: 'AIが自動選択した手です。',
      isFallback: true,
    };
  }

  async handleGameEnd(game: GameEntity, board: Board, _nextPlayer: Player): Promise<boolean> {
    const blackCount = countDiscs(board, CellState.Black);
    const whiteCount = countDiscs(board, CellState.White);

    let winner: 'AI' | 'COLLECTIVE' | 'DRAW';
    const aiColor = game.aiSide === 'BLACK' ? CellState.Black : CellState.White;
    const aiCount = countDiscs(board, aiColor);
    const collectiveCount = aiColor === CellState.Black ? whiteCount : blackCount;

    if (aiCount > collectiveCount) {
      winner = 'AI';
    } else if (collectiveCount > aiCount) {
      winner = 'COLLECTIVE';
    } else {
      winner = 'DRAW';
    }

    await this.gameRepository.finish(game.gameId, winner);

    console.log(
      JSON.stringify({
        type: 'AI_MOVE_GAME_END',
        gameId: game.gameId,
        winner,
        blackCount,
        whiteCount,
      })
    );

    return true;
  }

  private async handlePass(
    game: GameEntity,
    board: Board,
    currentTurn: number
  ): Promise<AIMoveGameResult> {
    const newTurn = currentTurn + 1;
    const boardState = JSON.stringify({ board });

    await this.gameRepository.updateBoardState(game.gameId, boardState, newTurn);

    console.log(
      JSON.stringify({
        type: 'AI_MOVE_GAME_PASSED',
        gameId: game.gameId,
        currentTurn: newTurn,
      })
    );

    return { gameId: game.gameId, status: 'passed' };
  }
}
