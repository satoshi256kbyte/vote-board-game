// DynamoDB エンティティ型定義
// Single Table Design に基づく PK/SK パターン

export interface BaseEntity {
  PK: string;
  SK: string;
  entityType: string;
  createdAt: string;
  updatedAt?: string;
}

// ユーザーエンティティ
export interface UserEntity extends BaseEntity {
  entityType: 'USER';
  userId: string;
  email: string;
  username: string;
  iconUrl?: string;
}

// ゲームエンティティ
export interface GameEntity extends BaseEntity {
  entityType: 'GAME';
  GSI1PK: string; // GAME#STATUS#<status>
  GSI1SK: string; // <createdAt>
  gameId: string;
  gameType: 'OTHELLO' | 'CHESS' | 'GO' | 'SHOGI';
  status: 'ACTIVE' | 'FINISHED';
  aiSide: 'BLACK' | 'WHITE';
  currentTurn: number;
  boardState: string; // JSON string
  winner?: 'AI' | 'COLLECTIVE' | 'DRAW';
}

// 手エンティティ
export interface MoveEntity extends BaseEntity {
  entityType: 'MOVE';
  gameId: string;
  turnNumber: number;
  side: 'BLACK' | 'WHITE';
  position: string;
  playedBy: 'AI' | 'COLLECTIVE';
  candidateId: string;
}

// 候補エンティティ
export interface CandidateEntity extends BaseEntity {
  entityType: 'CANDIDATE';
  GSI2PK?: string; // USER#<userId> (ユーザー作成の場合)
  GSI2SK?: string; // CANDIDATE#<createdAt>
  candidateId: string;
  gameId: string;
  turnNumber: number;
  position: string;
  description: string;
  voteCount: number;
  createdBy: string; // 'AI' or 'USER#<userId>'
  status: 'VOTING' | 'CLOSED' | 'ADOPTED';
  votingDeadline: string;
}

// 投票エンティティ
export interface VoteEntity extends BaseEntity {
  entityType: 'VOTE';
  GSI2PK: string; // USER#<userId>
  GSI2SK: string; // VOTE#<createdAt>
  gameId: string;
  turnNumber: number;
  userId: string;
  candidateId: string;
}

// 解説エンティティ
export interface CommentaryEntity extends BaseEntity {
  entityType: 'COMMENTARY';
  gameId: string;
  turnNumber: number;
  content: string;
  generatedBy: 'AI';
}

// PK/SK 生成ヘルパー
export const Keys = {
  user: (userId: string) => ({
    PK: `USER#${userId}`,
    SK: `USER#${userId}`,
  }),
  game: (gameId: string) => ({
    PK: `GAME#${gameId}`,
    SK: `GAME#${gameId}`,
  }),
  move: (gameId: string, turnNumber: number) => ({
    PK: `GAME#${gameId}`,
    SK: `MOVE#${turnNumber}`,
  }),
  candidate: (gameId: string, turnNumber: number, candidateId: string) => ({
    PK: `GAME#${gameId}#TURN#${turnNumber}`,
    SK: `CANDIDATE#${candidateId}`,
  }),
  vote: (gameId: string, turnNumber: number, userId: string) => ({
    PK: `GAME#${gameId}#TURN#${turnNumber}`,
    SK: `VOTE#${userId}`,
  }),
  commentary: (gameId: string, turnNumber: number) => ({
    PK: `GAME#${gameId}`,
    SK: `COMMENTARY#${turnNumber}`,
  }),
} as const;

// GSI キー生成ヘルパー
export const GSIKeys = {
  gamesByStatus: (status: 'ACTIVE' | 'FINISHED', createdAt: string) => ({
    GSI1PK: `GAME#STATUS#${status}`,
    GSI1SK: createdAt,
  }),
  userCandidates: (userId: string, createdAt: string) => ({
    GSI2PK: `USER#${userId}`,
    GSI2SK: `CANDIDATE#${createdAt}`,
  }),
  userVotes: (userId: string, createdAt: string) => ({
    GSI2PK: `USER#${userId}`,
    GSI2SK: `VOTE#${createdAt}`,
  }),
} as const;
