/**
 * CommentaryGenerator - 対局解説生成サービス
 *
 * アクティブな対局に対してAI（Bedrock Nova Pro）を使い、
 * 対局内容の解説を自動生成するサービスクラス。
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4,
 *              3.1-3.10, 4.1-4.6, 5.1-5.6, 7.1-7.4, 8.1-8.4
 */

import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { BedrockService } from '../bedrock/index.js';
import type { GameRepository } from '../../lib/dynamodb/repositories/game.js';
import type { CommentaryRepository } from '../../lib/dynamodb/repositories/commentary.js';
import type { GameEntity, MoveEntity } from '../../lib/dynamodb/types.js';
import { countDiscs, CellState } from '../../lib/othello/index.js';
import type { Board } from '../../lib/othello/index.js';
import { buildCommentaryPrompt, getCommentarySystemPrompt } from './prompt-builder.js';
import { parseCommentaryResponse } from './response-parser.js';
import type { CommentaryGameResult, CommentaryProcessingSummary } from './types.js';

interface BoardStateJSON {
  board: number[][];
}

export class CommentaryGenerator {
  constructor(
    private bedrockService: BedrockService,
    private gameRepository: GameRepository,
    private commentaryRepository: CommentaryRepository,
    private docClient: DynamoDBDocumentClient,
    private tableName: string
  ) {}

  async generateCommentaries(): Promise<CommentaryProcessingSummary> {
    console.log(
      JSON.stringify({ type: 'COMMENTARY_GENERATION_START', timestamp: new Date().toISOString() })
    );
    const { items: activeGames } = await this.gameRepository.listByStatus('ACTIVE');
    const results: CommentaryGameResult[] = [];
    for (const game of activeGames) {
      const result = await this.processGame(game);
      results.push(result);
    }
    const summary: CommentaryProcessingSummary = {
      totalGames: activeGames.length,
      successCount: results.filter((r) => r.status === 'success').length,
      failedCount: results.filter((r) => r.status === 'failed').length,
      skippedCount: results.filter((r) => r.status === 'skipped').length,
      results,
    };
    console.log(
      JSON.stringify({
        type: 'COMMENTARY_GENERATION_COMPLETE',
        totalGames: summary.totalGames,
        successCount: summary.successCount,
        failedCount: summary.failedCount,
        skippedCount: summary.skippedCount,
      })
    );
    return summary;
  }

  private async processGame(game: GameEntity): Promise<CommentaryGameResult> {
    console.log(JSON.stringify({ type: 'COMMENTARY_GENERATION_GAME_START', gameId: game.gameId }));
    try {
      if (game.currentTurn === 0) {
        const reason = 'No moves yet (currentTurn is 0)';
        console.log(
          JSON.stringify({
            type: 'COMMENTARY_GENERATION_GAME_SKIPPED',
            gameId: game.gameId,
            reason,
          })
        );
        return { gameId: game.gameId, status: 'skipped', reason };
      }

      const existingCommentary = await this.commentaryRepository.getByGameAndTurn(
        game.gameId,
        game.currentTurn
      );
      if (existingCommentary) {
        const reason = `Commentary already exists for turn ${game.currentTurn}`;
        console.log(
          JSON.stringify({
            type: 'COMMENTARY_GENERATION_GAME_SKIPPED',
            gameId: game.gameId,
            reason,
          })
        );
        return { gameId: game.gameId, status: 'skipped', reason };
      }

      let board: Board;
      try {
        const parsed = JSON.parse(game.boardState) as BoardStateJSON;
        board = parsed.board as Board;
      } catch {
        const reason = 'Failed to parse boardState';
        console.log(
          JSON.stringify({
            type: 'COMMENTARY_GENERATION_GAME_SKIPPED',
            gameId: game.gameId,
            reason,
          })
        );
        return { gameId: game.gameId, status: 'skipped', reason };
      }

      const moves = await this.getMoveHistory(game.gameId);

      const discCount = {
        black: countDiscs(board, CellState.Black),
        white: countDiscs(board, CellState.White),
      };

      const currentPlayer: 'BLACK' | 'WHITE' =
        moves.length > 0 ? (moves[moves.length - 1].side === 'BLACK' ? 'WHITE' : 'BLACK') : 'BLACK';

      const prompt = buildCommentaryPrompt(board, moves, discCount, currentPlayer, game.aiSide);
      const systemPrompt = getCommentarySystemPrompt();
      const aiResponse = await this.bedrockService.generateText({
        prompt,
        systemPrompt,
        maxTokens: 2000,
      });

      console.log(
        JSON.stringify({
          type: 'COMMENTARY_GENERATION_TOKEN_USAGE',
          gameId: game.gameId,
          inputTokens: aiResponse.usage.inputTokens,
          outputTokens: aiResponse.usage.outputTokens,
          totalTokens: aiResponse.usage.totalTokens,
        })
      );

      const parseResult = parseCommentaryResponse(aiResponse.text);

      if (!parseResult.commentary) {
        const reason = parseResult.error || 'Empty content from parser';
        console.log(
          JSON.stringify({ type: 'COMMENTARY_GENERATION_GAME_FAILED', gameId: game.gameId, reason })
        );
        return { gameId: game.gameId, status: 'failed', reason };
      }

      try {
        await this.commentaryRepository.create({
          gameId: game.gameId,
          turnNumber: game.currentTurn,
          content: parseResult.commentary.content,
          generatedBy: 'AI',
        });
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Failed to save commentary';
        console.log(
          JSON.stringify({
            type: 'COMMENTARY_GENERATION_SAVE_ERROR',
            gameId: game.gameId,
            errorMessage: reason,
          })
        );
        return { gameId: game.gameId, status: 'failed', reason };
      }
      console.log(
        JSON.stringify({
          type: 'COMMENTARY_GENERATION_GAME_COMPLETE',
          gameId: game.gameId,
          turnNumber: game.currentTurn,
        })
      );
      return { gameId: game.gameId, status: 'success' };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown error';
      console.log(
        JSON.stringify({
          type: 'COMMENTARY_GENERATION_GAME_FAILED',
          gameId: game.gameId,
          errorType: error instanceof Error ? error.name : 'UnknownError',
          errorMessage: reason,
        })
      );
      return { gameId: game.gameId, status: 'failed', reason };
    }
  }
  private async getMoveHistory(gameId: string): Promise<MoveEntity[]> {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `GAME#${gameId}`,
          ':sk': 'MOVE#',
        },
        ScanIndexForward: true,
      })
    );
    return (result.Items as MoveEntity[]) || [];
  }
}
