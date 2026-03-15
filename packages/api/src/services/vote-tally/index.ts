/**
 * VoteTallyService - 投票締切・集計サービス
 *
 * アクティブな対局に対して集合知側の手番であれば、投票を締め切り、
 * 最多得票の候補を次の一手として確定し、盤面を更新するサービスクラス。
 */

import type { GameRepository } from '../../lib/dynamodb/repositories/game.js';
import type { CandidateRepository } from '../../lib/dynamodb/repositories/candidate.js';
import type { MoveRepository } from '../../lib/dynamodb/repositories/move.js';
import type { GameEntity, CandidateEntity } from '../../lib/dynamodb/types.js';
import {
  getLegalMoves,
  hasLegalMoves,
  executeMove,
  shouldEndGame,
  countDiscs,
  CellState,
} from '../../lib/othello/index.js';
import type { Board } from '../../lib/othello/index.js';
import { isAITurn, determineWinner } from '../../lib/game-utils.js';
import type { VoteTallyGameResult, VoteTallySummary } from './types.js';

interface BoardStateJSON {
  board: number[][];
}

export class VoteTallyService {
  constructor(
    private gameRepository: GameRepository,
    private candidateRepository: CandidateRepository,
    private moveRepository: MoveRepository
  ) {}

  /**
   * 全アクティブ対局の投票集計を実行する
   */
  async tallyVotes(): Promise<VoteTallySummary> {
    console.log(JSON.stringify({ type: 'VOTE_TALLY_START', timestamp: new Date().toISOString() }));

    const { items: activeGames } = await this.gameRepository.listByStatus('ACTIVE');
    const results: VoteTallyGameResult[] = [];

    for (const game of activeGames) {
      try {
        const result = await this.processGame(game);
        results.push(result);
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Unknown error';
        console.log(
          JSON.stringify({ type: 'VOTE_TALLY_GAME_FAILED', gameId: game.gameId, reason })
        );
        results.push({ gameId: game.gameId, status: 'failed', reason });
      }
    }

    const summary: VoteTallySummary = {
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
        type: 'VOTE_TALLY_COMPLETE',
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

  /**
   * 対局単位の投票集計処理
   */
  async processGame(game: GameEntity): Promise<VoteTallyGameResult> {
    console.log(JSON.stringify({ type: 'VOTE_TALLY_GAME_START', gameId: game.gameId }));

    // 1. AI ターン判定 → AI の手番ならスキップ
    if (isAITurn(game)) {
      console.log(
        JSON.stringify({
          type: 'VOTE_TALLY_GAME_SKIPPED',
          gameId: game.gameId,
          reason: 'AI turn',
        })
      );
      return { gameId: game.gameId, status: 'skipped', reason: 'AI turn' };
    }

    // 2. boardState パース → 失敗ならスキップ
    const board = this.parseBoardState(game.boardState);
    if (!board) {
      console.log(
        JSON.stringify({
          type: 'VOTE_TALLY_GAME_SKIPPED',
          gameId: game.gameId,
          reason: 'Failed to parse boardState',
        })
      );
      return { gameId: game.gameId, status: 'skipped', reason: 'Failed to parse boardState' };
    }

    // 集合知側のプレイヤー情報を決定
    const collectivePlayer = game.aiSide === 'BLACK' ? CellState.White : CellState.Black;
    const collectiveSide: 'BLACK' | 'WHITE' = game.aiSide === 'BLACK' ? 'WHITE' : 'BLACK';

    // 3. 集合知側の合法手確認
    const legalMoves = getLegalMoves(board, collectivePlayer);
    if (legalMoves.length === 0) {
      const aiPlayer = game.aiSide === 'BLACK' ? CellState.Black : CellState.White;
      if (!hasLegalMoves(board, aiPlayer)) {
        // 両者合法手なし → 対局終了処理
        return this.handleGameEnd(game, board);
      }
      // 集合知側のみ合法手なし → パス処理
      return this.handlePass(game);
    }

    // 4. 候補取得 → なければスキップ
    const candidates = await this.candidateRepository.listByTurn(game.gameId, game.currentTurn);
    if (candidates.length === 0) {
      console.log(
        JSON.stringify({
          type: 'VOTE_TALLY_GAME_SKIPPED',
          gameId: game.gameId,
          reason: 'No candidates',
        })
      );
      return { gameId: game.gameId, status: 'skipped', reason: 'No candidates' };
    }

    // 5. 投票締切
    await this.candidateRepository.closeVoting(game.gameId, game.currentTurn);

    // 6. 最多得票候補の特定
    const winner = this.findWinningCandidate(candidates);
    if (!winner) {
      console.log(
        JSON.stringify({
          type: 'VOTE_TALLY_GAME_FAILED',
          gameId: game.gameId,
          reason: 'No winning candidate found',
        })
      );
      return { gameId: game.gameId, status: 'failed', reason: 'No winning candidate found' };
    }

    // 7. 候補を ADOPTED に更新
    await this.candidateRepository.markAsAdopted(game.gameId, game.currentTurn, winner.candidateId);

    // 8. position パース → 無効なら failed
    const positionParts = winner.position.split(',');
    if (positionParts.length !== 2) {
      console.log(
        JSON.stringify({
          type: 'VOTE_TALLY_GAME_FAILED',
          gameId: game.gameId,
          reason: 'Invalid position format',
          position: winner.position,
        })
      );
      return { gameId: game.gameId, status: 'failed', reason: 'Invalid position format' };
    }
    const row = Number(positionParts[0]);
    const col = Number(positionParts[1]);
    if (isNaN(row) || isNaN(col)) {
      console.log(
        JSON.stringify({
          type: 'VOTE_TALLY_GAME_FAILED',
          gameId: game.gameId,
          reason: 'Invalid position values',
          position: winner.position,
        })
      );
      return { gameId: game.gameId, status: 'failed', reason: 'Invalid position values' };
    }

    // 9. Othello Engine で盤面更新
    const newBoard = executeMove(board, { row, col }, collectivePlayer);

    // 10. Move レコード作成
    await this.moveRepository.create({
      gameId: game.gameId,
      turnNumber: game.currentTurn,
      side: collectiveSide,
      position: winner.position,
      playedBy: 'COLLECTIVE',
      candidateId: winner.candidateId,
    });

    // 11. Game の boardState と currentTurn 更新
    const newTurn = game.currentTurn + 1;
    const newBoardState = JSON.stringify({ board: newBoard });
    await this.gameRepository.updateBoardState(game.gameId, newBoardState, newTurn);

    // 12. 対局終了判定
    const aiPlayer = game.aiSide === 'BLACK' ? CellState.Black : CellState.White;
    if (shouldEndGame(newBoard, aiPlayer)) {
      await this.finishGame(game, newBoard);
      console.log(
        JSON.stringify({
          type: 'VOTE_TALLY_GAME_FINISHED',
          gameId: game.gameId,
          adoptedCandidateId: winner.candidateId,
          position: winner.position,
        })
      );
      return {
        gameId: game.gameId,
        status: 'finished',
        adoptedCandidateId: winner.candidateId,
        position: winner.position,
      };
    }

    console.log(
      JSON.stringify({
        type: 'VOTE_TALLY_GAME_SUCCESS',
        gameId: game.gameId,
        adoptedCandidateId: winner.candidateId,
        position: winner.position,
      })
    );
    return {
      gameId: game.gameId,
      status: 'success',
      adoptedCandidateId: winner.candidateId,
      position: winner.position,
    };
  }

  /**
   * パス処理（集合知側に合法手がない場合）
   * currentTurn を +1 して次のターンに進める
   */
  private async handlePass(game: GameEntity): Promise<VoteTallyGameResult> {
    const newTurn = game.currentTurn + 1;
    await this.gameRepository.updateBoardState(game.gameId, game.boardState, newTurn);

    console.log(
      JSON.stringify({
        type: 'VOTE_TALLY_GAME_PASSED',
        gameId: game.gameId,
        currentTurn: newTurn,
      })
    );
    return { gameId: game.gameId, status: 'passed' };
  }

  /**
   * 対局終了処理（両者合法手なし等）
   */
  private async handleGameEnd(game: GameEntity, board: Board): Promise<VoteTallyGameResult> {
    await this.finishGame(game, board);

    console.log(
      JSON.stringify({
        type: 'VOTE_TALLY_GAME_FINISHED',
        gameId: game.gameId,
      })
    );
    return { gameId: game.gameId, status: 'finished' };
  }

  /**
   * 対局を終了状態にする（勝者判定 + DB 更新）
   */
  private async finishGame(game: GameEntity, board: Board): Promise<void> {
    const blackCount = countDiscs(board, CellState.Black);
    const whiteCount = countDiscs(board, CellState.White);
    const winner = determineWinner(board, game.aiSide);

    await this.gameRepository.finish(game.gameId, winner);

    console.log(
      JSON.stringify({
        type: 'VOTE_TALLY_GAME_END',
        gameId: game.gameId,
        winner,
        blackCount,
        whiteCount,
      })
    );
  }

  /**
   * 最多得票候補の特定
   * voteCount 降順、同票時は createdAt 昇順でソートし先頭を返す
   */
  findWinningCandidate(candidates: CandidateEntity[]): CandidateEntity | null {
    if (candidates.length === 0) return null;

    const sorted = [...candidates].sort((a, b) => {
      if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
      return a.createdAt.localeCompare(b.createdAt);
    });

    return sorted[0];
  }

  /**
   * boardState JSON をパースして Board を返す
   * 無効な形式の場合は null を返す
   */
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
}
