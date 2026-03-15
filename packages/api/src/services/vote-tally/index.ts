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
import type { Board } from '../../lib/othello/index.js';
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
    // TODO: タスク 3.5 で実装
    return {
      totalGames: 0,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
      passedCount: 0,
      finishedCount: 0,
      results: [],
    };
  }

  /**
   * 対局単位の投票集計処理
   */
  async processGame(_game: GameEntity): Promise<VoteTallyGameResult> {
    // TODO: タスク 3.4 で実装
    return { gameId: _game.gameId, status: 'skipped', reason: 'Not implemented' };
  }

  /**
   * 最多得票候補の特定
   * voteCount 降順、同票時は createdAt 昇順でソートし先頭を返す
   */
  findWinningCandidate(_candidates: CandidateEntity[]): CandidateEntity | null {
    // TODO: タスク 3.2 で実装
    return null;
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
