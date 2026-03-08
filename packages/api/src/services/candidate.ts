/**
 * CandidateService - 候補管理のビジネスロジック
 *
 * Requirements: 1.1, 1.2, 3.1, 3.2, 4.1, 4.2, 4.3, 5.1, 5.2, 6.1, 6.2, 7.1-7.7
 */

import { randomUUID } from 'crypto';
import { CandidateRepository } from '../lib/dynamodb/repositories/candidate';
import { GameRepository } from '../lib/dynamodb/repositories/game';
import type {
  CandidateResponse,
  GetCandidatesResponse,
  PostCandidateResponse,
} from '../types/candidate';
import type { CandidateEntity, GameEntity } from '../lib/dynamodb/types';
import { CellState, validateMove } from '../lib/othello/index.js';
import type { Board, Player } from '../lib/othello/index.js';

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
 * オセロルール上無効な手の場合のエラー
 */
export class InvalidMoveError extends Error {
  constructor(position: string, reason?: string) {
    super(reason ? `Invalid move at ${position}: ${reason}` : `Invalid move at ${position}`);
    this.name = 'InvalidMoveError';
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
 * 同一ポジション重複の場合のエラー
 */
export class DuplicatePositionError extends Error {
  constructor(position: string) {
    super(`Candidate for position ${position} already exists`);
    this.name = 'DuplicatePositionError';
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

/**
 * CandidateEntity を PostCandidateResponse に変換
 */
function toPostCandidateResponse(
  entity: CandidateEntity,
  gameId: string,
  turnNumber: number
): PostCandidateResponse {
  return {
    candidateId: entity.candidateId,
    gameId,
    turnNumber,
    position: entity.position,
    description: entity.description,
    voteCount: entity.voteCount,
    createdBy: entity.createdBy,
    status: entity.status as 'VOTING',
    votingDeadline: entity.votingDeadline,
    createdAt: entity.createdAt,
  };
}

/**
 * 投票締切を算出する
 * 既存候補がある場合はその votingDeadline を使用、なければ当日 JST 23:59:59.999
 */
function calculateVotingDeadline(existingCandidates: CandidateEntity[]): string {
  if (existingCandidates.length > 0) {
    return existingCandidates[0].votingDeadline;
  }
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstNow = new Date(now.getTime() + jstOffset);
  const jstEndOfDay = new Date(
    jstNow.getFullYear(),
    jstNow.getMonth(),
    jstNow.getDate(),
    23,
    59,
    59,
    999
  );
  const utcDeadline = new Date(jstEndOfDay.getTime() - jstOffset);
  return utcDeadline.toISOString();
}

/**
 * 現在のプレイヤー（集合知側）を判定する
 */
function determineCollectivePlayer(game: GameEntity): Player {
  return game.aiSide === 'BLACK' ? CellState.White : CellState.Black;
}

/**
 * ポジション文字列をパースする
 */
function parsePosition(position: string): { row: number; col: number } {
  const [row, col] = position.split(',').map(Number);
  return { row, col };
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

  /**
   * 候補を投稿
   * @param gameId - 対局ID
   * @param turnNumber - ターン番号
   * @param position - 位置（"row,col"形式）
   * @param description - 説明文
   * @param userId - 投稿者のユーザーID
   * @returns 作成された候補のレスポンス
   * @throws GameNotFoundError - ゲームが存在しない場合
   * @throws TurnNotFoundError - ターンが存在しない場合
   * @throws InvalidMoveError - オセロルール上無効な手の場合
   * @throws VotingClosedError - 投票締切済みの場合
   * @throws DuplicatePositionError - 同じポジションの候補が既に存在する場合
   */
  async createCandidate(
    gameId: string,
    turnNumber: number,
    position: string,
    description: string,
    userId: string
  ): Promise<PostCandidateResponse> {
    // 1. ゲームの存在確認
    const game = await this.gameRepository.getById(gameId);
    if (!game) {
      throw new GameNotFoundError(gameId);
    }

    // 2. ゲームがアクティブであることを確認
    if (game.status !== 'ACTIVE') {
      throw new VotingClosedError();
    }

    // 3. ターンの存在確認
    if (turnNumber > game.currentTurn) {
      throw new TurnNotFoundError(gameId, turnNumber);
    }

    // 4. 既存候補の取得
    const existingCandidates = await this.candidateRepository.listByTurn(gameId, turnNumber);

    // 5. 投票締切チェック
    if (existingCandidates.length > 0) {
      const deadline = new Date(existingCandidates[0].votingDeadline);
      if (deadline < new Date()) {
        throw new VotingClosedError();
      }
    }

    // 6. 同一ポジション重複チェック
    const duplicate = existingCandidates.find((c) => c.position === position);
    if (duplicate) {
      throw new DuplicatePositionError(position);
    }

    // 7. ポジションのパース
    const parsed = parsePosition(position);

    // 8. オセロルールに基づく手の有効性検証
    const boardState = JSON.parse(game.boardState);
    const board: Board = boardState.board;
    const currentPlayer: Player = determineCollectivePlayer(game);
    const validation = validateMove(board, parsed, currentPlayer);
    if (!validation.valid) {
      throw new InvalidMoveError(position, validation.reason);
    }

    // 9. 投票締切の算出
    const votingDeadline = calculateVotingDeadline(existingCandidates);

    // 10. 候補の作成
    const candidateId = randomUUID();
    const entity = await this.candidateRepository.create({
      candidateId,
      gameId,
      turnNumber,
      position,
      description,
      createdBy: `USER#${userId}`,
      votingDeadline,
    });

    // 11. レスポンスの構築
    return toPostCandidateResponse(entity, gameId, turnNumber);
  }
}
