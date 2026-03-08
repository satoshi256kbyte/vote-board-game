/**
 * VoteService - 投票のビジネスロジック
 *
 * Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 5.1, 5.2, 6.1, 6.2, 7.1-7.5
 */

import { VoteRepository } from '../lib/dynamodb/repositories/vote.js';
import { CandidateRepository } from '../lib/dynamodb/repositories/candidate.js';
import { GameRepository } from '../lib/dynamodb/repositories/game.js';
import { GameNotFoundError, TurnNotFoundError } from './candidate.js';
import type { VoteEntity } from '../lib/dynamodb/types.js';
import type { VoteResponse, VoteChangeResponse } from '../types/vote.js';

/**
 * 候補が存在しない場合のエラー
 */
export class CandidateNotFoundError extends Error {
  constructor(_candidateId: string) {
    super('Candidate not found');
    this.name = 'CandidateNotFoundError';
  }
}

/**
 * 投票締切済みまたはゲーム非アクティブの場合のエラー
 */
export class VotingClosedError extends Error {
  constructor() {
    super('Voting period has ended');
    this.name = 'VotingClosedError';
  }
}

/**
 * 既に投票済みの場合のエラー
 */
export class AlreadyVotedError extends Error {
  constructor() {
    super('Already voted in this turn');
    this.name = 'AlreadyVotedError';
  }
}

/**
 * まだ投票していない場合のエラー
 */
export class NotVotedError extends Error {
  constructor() {
    super('Not voted yet in this turn');
    this.name = 'NotVotedError';
  }
}

/**
 * 同じ候補への変更の場合のエラー
 */
export class SameCandidateError extends Error {
  constructor() {
    super('Already voting for this candidate');
    this.name = 'SameCandidateError';
  }
}

/**
 * VoteEntity を VoteResponse に変換
 */
function toVoteResponse(entity: VoteEntity): VoteResponse {
  return {
    gameId: entity.gameId,
    turnNumber: entity.turnNumber,
    userId: entity.userId,
    candidateId: entity.candidateId,
    createdAt: entity.createdAt,
  };
}

/**
 * VoteEntity を VoteChangeResponse に変換
 */
function toVoteChangeResponse(entity: VoteEntity): VoteChangeResponse {
  return {
    gameId: entity.gameId,
    turnNumber: entity.turnNumber,
    userId: entity.userId,
    candidateId: entity.candidateId,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt ?? entity.createdAt,
  };
}

export class VoteService {
  constructor(
    private voteRepository: VoteRepository,
    private candidateRepository: CandidateRepository,
    private gameRepository: GameRepository
  ) {}

  /**
   * 投票を作成
   * @throws GameNotFoundError - ゲームが存在しない場合
   * @throws TurnNotFoundError - ターンが存在しない場合
   * @throws CandidateNotFoundError - 候補が存在しない場合
   * @throws VotingClosedError - 投票締切済みの場合
   * @throws AlreadyVotedError - 既に投票済みの場合
   */
  async createVote(
    gameId: string,
    turnNumber: number,
    candidateId: string,
    userId: string
  ): Promise<VoteResponse> {
    // Step 1: ゲームの存在確認
    const game = await this.gameRepository.getById(gameId);
    if (!game) throw new GameNotFoundError(gameId);

    // Step 2: ゲームがアクティブであることを確認
    if (game.status !== 'ACTIVE') throw new VotingClosedError();

    // Step 3: ターンの存在確認
    if (turnNumber > game.currentTurn) throw new TurnNotFoundError(gameId, turnNumber);

    // Step 4: 候補一覧の取得
    const candidates = await this.candidateRepository.listByTurn(gameId, turnNumber);

    // Step 5: 候補の存在確認
    const targetCandidate = candidates.find((c) => c.candidateId === candidateId);
    if (!targetCandidate) throw new CandidateNotFoundError(candidateId);

    // Step 6: 投票締切チェック
    const deadline = new Date(targetCandidate.votingDeadline);
    if (deadline < new Date()) throw new VotingClosedError();

    // Step 7: 候補のステータスチェック
    if (targetCandidate.status !== 'VOTING') throw new VotingClosedError();

    // Step 8: 既存投票の確認（重複チェック）
    const existingVote = await this.voteRepository.getByUser(gameId, turnNumber, userId);
    if (existingVote) throw new AlreadyVotedError();

    // Step 9: トランザクションで投票作成 + 候補の投票数更新
    const voteEntity = await this.voteRepository.upsertWithTransaction({
      gameId,
      turnNumber,
      userId,
      candidateId,
    });

    // Step 10: レスポンスの構築
    return toVoteResponse(voteEntity);
  }

  /**
   * 投票先を変更
   * @throws GameNotFoundError - ゲームが存在しない場合
   * @throws TurnNotFoundError - ターンが存在しない場合
   * @throws CandidateNotFoundError - 候補が存在しない場合
   * @throws VotingClosedError - 投票締切済みの場合
   * @throws NotVotedError - まだ投票していない場合
   * @throws SameCandidateError - 同じ候補への変更の場合
   */
  async changeVote(
    gameId: string,
    turnNumber: number,
    candidateId: string,
    userId: string
  ): Promise<VoteChangeResponse> {
    // Step 1: ゲームの存在確認
    const game = await this.gameRepository.getById(gameId);
    if (!game) throw new GameNotFoundError(gameId);

    // Step 2: ゲームがアクティブであることを確認
    if (game.status !== 'ACTIVE') throw new VotingClosedError();

    // Step 3: ターンの存在確認
    if (turnNumber > game.currentTurn) throw new TurnNotFoundError(gameId, turnNumber);

    // Step 4: 候補一覧の取得
    const candidates = await this.candidateRepository.listByTurn(gameId, turnNumber);

    // Step 5: 新候補の存在確認
    const targetCandidate = candidates.find((c) => c.candidateId === candidateId);
    if (!targetCandidate) throw new CandidateNotFoundError(candidateId);

    // Step 6: 投票締切チェック
    const deadline = new Date(targetCandidate.votingDeadline);
    if (deadline < new Date()) throw new VotingClosedError();

    // Step 7: 候補のステータスチェック
    if (targetCandidate.status !== 'VOTING') throw new VotingClosedError();

    // Step 8: 既存投票の確認（未投票チェック）
    const existingVote = await this.voteRepository.getByUser(gameId, turnNumber, userId);
    if (!existingVote) throw new NotVotedError();

    // Step 9: 同一候補チェック
    if (existingVote.candidateId === candidateId) throw new SameCandidateError();

    // Step 10: トランザクションで投票更新 + 旧候補 voteCount -1 + 新候補 voteCount +1
    const voteEntity = await this.voteRepository.upsertWithTransaction({
      gameId,
      turnNumber,
      userId,
      candidateId,
      oldCandidateId: existingVote.candidateId,
    });

    // Step 11: レスポンスの構築
    return toVoteChangeResponse(voteEntity);
  }
}
