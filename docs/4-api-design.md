---
inclusion: manual
---

# API 設計

RESTful API 設計

## ベース URL

- 開発環境: `https://api-dev.vote-board-game.example.com`
- ステージング環境: `https://api-stg.vote-board-game.example.com`
- 本番環境: `https://api.vote-board-game.example.com`

## 認証

### Authorization ヘッダー

```text
Authorization: Bearer <JWT_TOKEN>
```

### 認証が必要なエンドポイント

- ユーザー情報の取得・更新
- 候補の投稿
- 投票

### 認証が不要なエンドポイント

- ゲーム一覧・詳細の取得
- 候補一覧の取得（閲覧のみ）

## エンドポイント一覧

### 認証

#### POST /auth/register

ユーザー登録

**リクエスト**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "username": "player1"
}
```

**レスポンス (201 Created)**

```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "username": "player1",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

#### POST /auth/login

ログイン

**リクエスト**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**レスポンス (200 OK)**

```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "username": "player1",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

#### POST /auth/refresh

トークンリフレッシュ

**リクエスト**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**レスポンス (200 OK)**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

#### POST /auth/logout

ログアウト

**リクエスト**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**レスポンス (204 No Content)**

### ユーザー

#### GET /users/me

自分のユーザー情報取得

**レスポンス (200 OK)**

```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "username": "player1",
  "iconUrl": "https://example.com/icon.png",
  "createdAt": "2025-02-19T10:00:00Z",
  "updatedAt": "2025-02-19T10:00:00Z"
}
```

#### PATCH /users/me

自分のユーザー情報更新

**リクエスト**

```json
{
  "username": "newplayer1",
  "iconUrl": "https://example.com/new-icon.png"
}
```

**レスポンス (200 OK)**

```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "username": "newplayer1",
  "iconUrl": "https://example.com/new-icon.png",
  "createdAt": "2025-02-19T10:00:00Z",
  "updatedAt": "2025-02-19T15:00:00Z"
}
```

### ゲーム

#### GET /games

ゲーム一覧取得

**クエリパラメータ**

- `status`: `ACTIVE` | `FINISHED` (デフォルト: `ACTIVE`)
- `limit`: 取得件数 (デフォルト: 20, 最大: 100)
- `cursor`: ページネーション用カーソル

**レスポンス (200 OK)**

```json
{
  "games": [
    {
      "gameId": "456e7890-e89b-12d3-a456-426614174001",
      "gameType": "OTHELLO",
      "status": "ACTIVE",
      "aiSide": "BLACK",
      "currentTurn": 5,
      "winner": null,
      "createdAt": "2025-02-19T10:00:00Z",
      "updatedAt": "2025-02-19T15:00:00Z"
    }
  ],
  "nextCursor": "eyJnYW1lSWQiOiI0NTZlNzg5MC1lODliLTEyZDMtYTQ1Ni00MjY2MTQxNzQwMDEifQ=="
}
```

#### POST /games

ゲーム作成

**リクエスト**

```json
{
  "gameType": "OTHELLO",
  "aiSide": "BLACK"
}
```

**レスポンス (201 Created)**

```json
{
  "gameId": "456e7890-e89b-12d3-a456-426614174001",
  "gameType": "OTHELLO",
  "status": "ACTIVE",
  "aiSide": "BLACK",
  "currentTurn": 0,
  "boardState": {
    "board": [[0, 0, 0, 0, 0, 0, 0, 0], "..."]
  },
  "winner": null,
  "createdAt": "2025-02-19T10:00:00Z",
  "updatedAt": "2025-02-19T10:00:00Z"
}
```

#### GET /games/:gameId

ゲーム詳細取得

**レスポンス (200 OK)**

```json
{
  "gameId": "456e7890-e89b-12d3-a456-426614174001",
  "gameType": "OTHELLO",
  "status": "ACTIVE",
  "aiSide": "BLACK",
  "currentTurn": 5,
  "boardState": {
    "board": [[0, 0, 0, 0, 0, 0, 0, 0], "..."]
  },
  "winner": null,
  "createdAt": "2025-02-19T10:00:00Z",
  "updatedAt": "2025-02-19T15:00:00Z"
}
```

#### GET /games/:gameId/moves

ゲームの手履歴取得

**レスポンス (200 OK)**

```json
{
  "moves": [
    {
      "turnNumber": 1,
      "side": "BLACK",
      "position": "D3",
      "playedBy": "AI",
      "candidateId": null,
      "createdAt": "2025-02-19T10:05:00Z"
    },
    {
      "turnNumber": 2,
      "side": "WHITE",
      "position": "C3",
      "playedBy": "COLLECTIVE",
      "candidateId": "789e0123-e89b-12d3-a456-426614174002",
      "createdAt": "2025-02-19T10:10:00Z"
    }
  ]
}
```

#### GET /games/:gameId/commentary

ゲームの解説取得

**レスポンス (200 OK)**

```json
{
  "commentaries": [
    {
      "turnNumber": 1,
      "content": "AIが中央を制圧する手を打ちました。これにより序盤の優位性を確保しています。",
      "generatedBy": "AI",
      "createdAt": "2025-02-19T10:05:00Z"
    }
  ]
}
```

### 候補

#### GET /games/:gameId/turns/:turnNumber/candidates

特定ターンの候補一覧取得

**レスポンス (200 OK)**

```json
{
  "candidates": [
    {
      "candidateId": "789e0123-e89b-12d3-a456-426614174002",
      "position": "D3",
      "description": "中央を制圧する手。相手の選択肢を制限できる。",
      "voteCount": 15,
      "createdBy": "AI",
      "status": "VOTING",
      "votingDeadline": "2025-02-20T00:00:00Z",
      "createdAt": "2025-02-19T15:00:00Z"
    },
    {
      "candidateId": "890e1234-e89b-12d3-a456-426614174003",
      "position": "E3",
      "description": "攻撃的な手。相手の陣地を削る。",
      "voteCount": 8,
      "createdBy": "USER#123e4567-e89b-12d3-a456-426614174000",
      "status": "VOTING",
      "votingDeadline": "2025-02-20T00:00:00Z",
      "createdAt": "2025-02-19T15:30:00Z"
    }
  ]
}
```

#### POST /games/:gameId/turns/:turnNumber/candidates

候補投稿

**リクエスト**

```json
{
  "position": "E3",
  "description": "攻撃的な手。相手の陣地を削る。"
}
```

**レスポンス (201 Created)**

```json
{
  "candidateId": "890e1234-e89b-12d3-a456-426614174003",
  "gameId": "456e7890-e89b-12d3-a456-426614174001",
  "turnNumber": 5,
  "position": "E3",
  "description": "攻撃的な手。相手の陣地を削る。",
  "voteCount": 0,
  "createdBy": "USER#123e4567-e89b-12d3-a456-426614174000",
  "status": "VOTING",
  "votingDeadline": "2025-02-20T00:00:00Z",
  "createdAt": "2025-02-19T15:30:00Z"
}
```

### 投票

#### POST /games/:gameId/turns/:turnNumber/votes

投票

**リクエスト**

```json
{
  "candidateId": "789e0123-e89b-12d3-a456-426614174002"
}
```

**レスポンス (201 Created)**

```json
{
  "gameId": "456e7890-e89b-12d3-a456-426614174001",
  "turnNumber": 5,
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "candidateId": "789e0123-e89b-12d3-a456-426614174002",
  "createdAt": "2025-02-19T16:00:00Z"
}
```

#### GET /games/:gameId/turns/:turnNumber/votes/me

自分の投票取得

**レスポンス (200 OK)**

```json
{
  "gameId": "456e7890-e89b-12d3-a456-426614174001",
  "turnNumber": 5,
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "candidateId": "789e0123-e89b-12d3-a456-426614174002",
  "createdAt": "2025-02-19T16:00:00Z",
  "updatedAt": "2025-02-19T16:00:00Z"
}
```

**レスポンス (404 Not Found) - 投票していない場合**

```json
{
  "error": "NOT_FOUND",
  "message": "Vote not found"
}
```

#### PUT /games/:gameId/turns/:turnNumber/votes/me

投票変更

**リクエスト**

```json
{
  "candidateId": "890e1234-e89b-12d3-a456-426614174003"
}
```

**レスポンス (200 OK)**

```json
{
  "gameId": "456e7890-e89b-12d3-a456-426614174001",
  "turnNumber": 5,
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "candidateId": "890e1234-e89b-12d3-a456-426614174003",
  "createdAt": "2025-02-19T16:00:00Z",
  "updatedAt": "2025-02-19T17:00:00Z"
}
```

## エラーレスポンス

### 共通エラーフォーマット

```json
{
  "error": "ERROR_CODE",
  "message": "Error message",
  "details": {}
}
```

### エラーコード

| コード             | ステータスコード | 説明                   |
| :----------------- | :--------------- | :--------------------- |
| `UNAUTHORIZED`     | 401              | 認証エラー             |
| `FORBIDDEN`        | 403              | 権限エラー             |
| `NOT_FOUND`        | 404              | リソースが見つからない |
| `VALIDATION_ERROR` | 400              | バリデーションエラー   |
| `CONFLICT`         | 409              | リソースの競合         |
| `INTERNAL_ERROR`   | 500              | サーバー内部エラー     |
| `VOTING_CLOSED`    | 400              | 投票締切済み           |
| `ALREADY_VOTED`    | 409              | 既に投票済み           |
| `INVALID_MOVE`     | 400              | 無効な手               |

### エラー例

**バリデーションエラー**

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": {
    "fields": {
      "description": "Description must be 200 characters or less"
    }
  }
}
```

**投票締切エラー**

```json
{
  "error": "VOTING_CLOSED",
  "message": "Voting period has ended"
}
```

## レート制限

- 認証エンドポイント: 5 リクエスト/分
- その他のエンドポイント: 100 リクエスト/分

**レート制限超過時のレスポンス (429 Too Many Requests)**

```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests",
  "retryAfter": 60
}
```

## CORS

### 許可するオリジン

- 開発環境: `http://localhost:3000`
- ステージング環境: `https://stg.vote-board-game.example.com`
- 本番環境: `https://vote-board-game.example.com`

### 許可するメソッド

- `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`

### 許可するヘッダー

- `Content-Type`, `Authorization`

## バージョニング

現在: v1 (URL パスに含めない)

将来的な変更時: `/v2/games` のように URL パスに含める
