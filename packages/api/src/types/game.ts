/**
 * Game API のリクエスト/レスポンス型定義
 *
 * このファイルは、Game API エンドポイントで使用される型を定義します。
 * Requirements: 1.10, 2.5, 3.1
 */

/**
 * ゲーム一覧取得APIのクエリパラメータ
 * GET /api/games
 */
export interface GetGamesQuery {
  /** ゲームステータスでフィルタリング（デフォルト: 'ACTIVE'） */
  status?: 'ACTIVE' | 'FINISHED';
  /** 取得件数の上限（デフォルト: 20, 最大: 100） */
  limit?: number;
  /** ページネーション用カーソル */
  cursor?: string;
}

/**
 * ゲーム一覧取得APIのレスポンス
 * GET /api/games
 */
export interface GetGamesResponse {
  /** ゲームのリスト */
  games: GameSummary[];
  /** 次のページが存在する場合のカーソル */
  nextCursor?: string;
}

/**
 * ゲーム一覧に含まれるゲームのサマリー情報
 */
export interface GameSummary {
  /** ゲームID（UUID v4） */
  gameId: string;
  /** ゲームの種類 */
  gameType: 'OTHELLO' | 'CHESS' | 'GO' | 'SHOGI';
  /** ゲームのステータス */
  status: 'ACTIVE' | 'FINISHED';
  /** AIが担当する色 */
  aiSide: 'BLACK' | 'WHITE';
  /** 現在のターン数 */
  currentTurn: number;
  /** 勝者（ゲーム終了時のみ） */
  winner?: 'AI' | 'COLLECTIVE' | 'DRAW';
  /** 作成日時（ISO 8601形式） */
  createdAt: string;
  /** 更新日時（ISO 8601形式） */
  updatedAt: string;
}

/**
 * ゲーム詳細取得APIのレスポンス
 * GET /api/games/:gameId
 */
export interface GetGameResponse {
  /** ゲームID（UUID v4） */
  gameId: string;
  /** ゲームの種類 */
  gameType: 'OTHELLO' | 'CHESS' | 'GO' | 'SHOGI';
  /** ゲームのステータス */
  status: 'ACTIVE' | 'FINISHED';
  /** AIが担当する色 */
  aiSide: 'BLACK' | 'WHITE';
  /** 現在のターン数 */
  currentTurn: number;
  /** 盤面の状態（パース済みオブジェクト） */
  boardState: {
    /** 8x8の盤面配列（0=空, 1=黒, 2=白） */
    board: number[][];
  };
  /** 勝者（ゲーム終了時のみ） */
  winner?: 'AI' | 'COLLECTIVE' | 'DRAW';
  /** 作成日時（ISO 8601形式） */
  createdAt: string;
  /** 更新日時（ISO 8601形式） */
  updatedAt: string;
}

/**
 * ゲーム作成APIのリクエストボディ
 * POST /api/games
 */
export interface CreateGameRequest {
  /** ゲームの種類（MVPではOTHELLOのみ） */
  gameType: 'OTHELLO';
  /** AIが担当する色 */
  aiSide: 'BLACK' | 'WHITE';
}

/**
 * ゲーム作成APIのレスポンス
 * POST /api/games
 */
export interface CreateGameResponse {
  /** ゲームID（UUID v4） */
  gameId: string;
  /** ゲームの種類 */
  gameType: 'OTHELLO';
  /** ゲームのステータス（常にACTIVE） */
  status: 'ACTIVE';
  /** AIが担当する色 */
  aiSide: 'BLACK' | 'WHITE';
  /** 現在のターン数（常に0） */
  currentTurn: 0;
  /** 盤面の状態（パース済みオブジェクト） */
  boardState: {
    /** 8x8の盤面配列（0=空, 1=黒, 2=白） */
    board: number[][];
  };
  /** 勝者（常にnull） */
  winner: null;
  /** 作成日時（ISO 8601形式） */
  createdAt: string;
  /** 更新日時（ISO 8601形式） */
  updatedAt: string;
}
