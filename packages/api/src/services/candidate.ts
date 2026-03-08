/**
 * CandidateService - 候補管理のビジネスロジック
 *
 * Requirements: 1.1, 1.2, 3.1, 3.2
 */

import { CandidateRepository } from '../lib/dynamodb/repositories/candidate';
import { GameRepository } from '../lib/dynamodb/repositories/game';
import type { CandidateResponse, GetCandidatesResponse } from '../types/candidate';
import type { CandidateEntity } from '../lib/dynamodb/types';

/**
 * ゲームが存在しない場合のエラー
 */
export class GameNotFoundError extends Error {
  constructor(_gameId: string) {
    super(`Game not found`);
    this.name = 'GameNotFoundError';
  }
}

/**
 * ターンが存在しない場合のエラー
 */
export class TurnNotFoundError extends Error {
  constructor(_gameId: string, _turnNumber: number) {
    super(`Turn not found`);
    this.name = 'TurnNotFoundError';
  }
}

/**
 * CandidateEntity を CandidateResponse に変換
 */
function toCandidateResponse(entity: CandidateEntity): CandidateResponse {
  return {
    candidateId: entity.candidateId,
    position: entity.position,
    description: entity.description,
    voteCount: entity.voteCount,
    createdBy: entity.createdBy,
    status: entity.status,
    votingDeadline: entity.votingDeadline,
    createdAt: entity.createdAt,
  };
}

export class CandidateService {
  constructor(
    private candidateRepository: CandidateRepository,
    private gameRepository: GameRepository
  ) {}

  /**
   * 候補一覧を取得
   * @param gameId - 対局ID
   * @param turnNumber - ターン番号
   * @returns 投票数降順でソートされた候補一覧
   * @throws GameNotFoundError - ゲームが存在しない場合
   * @throws TurnNotFoundError - ターンが存在しない場合
   *
   * Requirements: 1.1, 1.2, 3.1, 3.2
   */
  async listCandidates(gameId: string, turnNumber: number): Promise<GetCandidatesResponse> {
    // 1. ゲームの存在確認
    const game = await this.gameRepository.getById(gameId);
    if (!game) {
      throw new GameNotFoundError(gameId);
    }

    // 2. ターンの存在確認（currentTurnより大きい場合は存在しない）
    if (turnNumber > game.currentTurn) {
      throw new TurnNotFoundError(gameId, turnNumber);
    }

    // 3. 候補一覧を取得
    const entities = await this.candidateRepository.listByTurn(gameId, turnNumber);

    // 4. 投票数の降順でソート
    const sorted = [...entities].sort((a, b) => b.voteCount - a.voteCount);

    // 5. CandidateResponse に変換
    const candidates = sorted.map(toCandidateResponse);

    return { candidates };
  }
}
