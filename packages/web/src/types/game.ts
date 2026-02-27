/**
 * Game type definitions for the frontend
 *
 * These types match the API types from packages/api/src/types/game.ts
 * and extend them with additional frontend-specific types.
 */

/**
 * ゲームの種類
 */
export type GameType = 'OTHELLO' | 'CHESS' | 'GO' | 'SHOGI';

/**
 * ゲームのステータス
 */
export type GameStatus = 'ACTIVE' | 'FINISHED';

/**
 * ゲームモード（MVP: AI vs 集合知のみ）
 */
export type GameMode = 'AI_VS_COLLECTIVE' | 'COLLECTIVE_VS_COLLECTIVE';

/**
 * プレイヤーの色
 */
export type PlayerColor = 'BLACK' | 'WHITE';

/**
 * 勝者
 */
export type Winner = 'AI' | 'COLLECTIVE' | 'DRAW';

/**
 * 盤面の状態
 * 8x8の配列で、0=空、1=黒、2=白
 */
export interface BoardState {
  /** 8x8の盤面配列（0=空, 1=黒, 2=白） */
  board: number[][];
}

/**
 * ゲーム一覧に含まれるゲームのサマリー情報
 */
export interface GameSummary {
  /** ゲームID（UUID v4） */
  gameId: string;
  /** ゲームの種類 */
  gameType: GameType;
  /** ゲームのステータス */
  status: GameStatus;
  /** AIが担当する色 */
  aiSide: PlayerColor;
  /** 現在のターン数 */
  currentTurn: number;
  /** 勝者（ゲーム終了時のみ） */
  winner?: Winner;
  /** 作成日時（ISO 8601形式） */
  createdAt: string;
  /** 更新日時（ISO 8601形式） */
  updatedAt: string;
}

/**
 * ゲーム詳細情報
 */
export interface Game {
  /** ゲームID（UUID v4） */
  gameId: string;
  /** ゲームの種類 */
  gameType: GameType;
  /** ゲームのステータス */
  status: GameStatus;
  /** AIが担当する色 */
  aiSide: PlayerColor;
  /** 現在のターン数 */
  currentTurn: number;
  /** 盤面の状態 */
  boardState: BoardState;
  /** 勝者（ゲーム終了時のみ） */
  winner?: Winner;
  /** 作成日時（ISO 8601形式） */
  createdAt: string;
  /** 更新日時（ISO 8601形式） */
  updatedAt: string;
}

/**
 * 手の情報
 */
export interface Move {
  /** ターン数 */
  turn: number;
  /** プレイヤーの色 */
  player: PlayerColor;
  /** 手の位置（例: "D3"） */
  position: string;
  /** 手を打った日時（ISO 8601形式） */
  timestamp: string;
}

/**
 * 次の一手候補
 */
export interface Candidate {
  /** 候補ID（UUID v4） */
  candidateId: string;
  /** ゲームID */
  gameId: string;
  /** 手の位置（例: "C4"） */
  position: string;
  /** 候補の説明（最大200文字） */
  description: string;
  /** 投稿者のユーザーID */
  userId: string;
  /** 投稿者のユーザー名 */
  username: string;
  /** 投票数 */
  voteCount: number;
  /** 候補が適用された後の盤面状態 */
  resultingBoardState: BoardState;
  /** 作成日時（ISO 8601形式） */
  createdAt: string;
}

/**
 * 投票情報
 */
export interface Vote {
  /** 投票ID（UUID v4） */
  voteId: string;
  /** ゲームID */
  gameId: string;
  /** 候補ID */
  candidateId: string;
  /** 投票者のユーザーID */
  userId: string;
  /** 投票日時（ISO 8601形式） */
  createdAt: string;
}

/**
 * ゲーム作成リクエスト
 */
export interface CreateGameRequest {
  /** ゲームの種類（MVPではOTHELLOのみ） */
  gameType: 'OTHELLO';
  /** AIが担当する色 */
  aiSide: PlayerColor;
}

/**
 * 候補作成リクエスト
 */
export interface CreateCandidateRequest {
  /** 手の位置（例: "C4"） */
  position: string;
  /** 候補の説明（最大200文字） */
  description: string;
}

/**
 * ゲーム一覧取得クエリパラメータ
 */
export interface GetGamesQuery {
  /** ゲームステータスでフィルタリング（デフォルト: 'ACTIVE'） */
  status?: GameStatus;
  /** 取得件数の上限（デフォルト: 20, 最大: 100） */
  limit?: number;
  /** ページネーション用カーソル */
  cursor?: string;
}

/**
 * ゲーム一覧取得レスポンス
 */
export interface GetGamesResponse {
  /** ゲームのリスト */
  games: GameSummary[];
  /** 次のページが存在する場合のカーソル */
  nextCursor?: string;
}
