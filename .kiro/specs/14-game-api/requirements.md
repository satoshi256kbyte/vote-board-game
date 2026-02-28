# Requirements Document

## Introduction

Game API エンドポイントは、投票対局アプリケーションにおけるゲーム管理の中核機能を提供します。このAPIは、ゲームの作成、取得、一覧表示、およびゲーム終了検知のロジックを実装します。既存のOthelloゲームロジック（spec 13）を活用し、DynamoDBとの統合を通じて、スケーラブルで型安全なゲーム管理システムを構築します。

## Glossary

- **Game_API**: ゲーム管理のためのRESTful APIエンドポイント群
- **Game_Repository**: DynamoDBとのデータアクセスを抽象化するリポジトリクラス
- **Othello_Logic**: オセロゲームのルールと盤面操作を実装するラpイブラリ（packages/api/src/lib/othello）
- **Board_State**: ゲームの盤面状態を表すJSON文字列
- **Game_Entity**: DynamoDBに保存されるゲームエンティティ
- **Hono_Framework**: 軽量で高速なWebフレームワーク
- **Lambda_Function**: AWS Lambda上で実行されるサーバーレス関数

## Requirements

### Requirement 1: ゲーム一覧取得API

**User Story:** As a user, I want to retrieve a list of games, so that I can browse active or finished games.

#### Acceptance Criteria

1. WHEN a GET request is sent to /games, THE Game_API SHALL return a list of games with status 200
2. WHERE status query parameter is provided, THE Game_API SHALL filter games by the specified status (ACTIVE or FINISHED)
3. WHERE status query parameter is not provided, THE Game_API SHALL default to ACTIVE status
4. WHERE limit query parameter is provided, THE Game_API SHALL return at most the specified number of games
5. WHERE limit query parameter is not provided, THE Game_API SHALL default to 20 games
6. WHERE limit query parameter exceeds 100, THE Game_API SHALL return at most 100 games
7. WHERE cursor query parameter is provided, THE Game_API SHALL return games starting from the cursor position
8. THE Game_API SHALL return games in descending order by creation time (newest first)
9. THE Game_API SHALL include nextCursor in the response when more games are available
10. THE Game_API SHALL return game objects containing gameId, gameType, status, aiSide, currentTurn, winner, createdAt, and updatedAt fields

### Requirement 2: ゲーム詳細取得API

**User Story:** As a user, I want to retrieve detailed information about a specific game, so that I can view the current board state and game progress.

#### Acceptance Criteria

1. WHEN a GET request is sent to /games/:gameId, THE Game_API SHALL return the game details with status 200
2. THE Game_API SHALL include boardState in the response
3. THE Game_API SHALL parse boardState from JSON string to object before returning
4. IF the specified gameId does not exist, THEN THE Game_API SHALL return status 404 with error code NOT_FOUND
5. THE Game_API SHALL return game objects containing gameId, gameType, status, aiSide, currentTurn, boardState, winner, createdAt, and updatedAt fields

### Requirement 3: ゲーム作成API

**User Story:** As a user, I want to create a new game, so that I can start a new match between AI and collective intelligence.

#### Acceptance Criteria

1. WHEN a POST request is sent to /games with valid data, THE Game_API SHALL create a new game and return status 201
2. THE Game_API SHALL require gameType field in the request body
3. THE Game_API SHALL require aiSide field in the request body
4. THE Game_API SHALL validate that gameType is OTHELLO
5. THE Game_API SHALL validate that aiSide is either BLACK or WHITE
6. THE Game_API SHALL generate a unique gameId using UUID v4
7. THE Game_API SHALL initialize the board state using Othello_Logic.createInitialBoard()
8. THE Game_API SHALL set status to ACTIVE
9. THE Game_API SHALL set currentTurn to 0
10. THE Game_API SHALL set winner to null
11. THE Game_API SHALL store the game in DynamoDB via Game_Repository
12. THE Game_API SHALL return the created game with boardState parsed as object
13. IF validation fails, THEN THE Game_API SHALL return status 400 with error code VALIDATION_ERROR

### Requirement 4: ゲーム終了検知ロジック

**User Story:** As a system, I want to detect when a game has ended, so that I can update the game status and determine the winner.

#### Acceptance Criteria

1. THE Game_API SHALL use Othello_Logic.shouldEndGame() to detect game end conditions
2. WHEN the board is full, THE Game_API SHALL determine that the game should end
3. WHEN both players have no legal moves, THE Game_API SHALL determine that the game should end
4. WHEN only one color remains on the board, THE Game_API SHALL determine that the game should end
5. WHEN a game should end, THE Game_API SHALL update the game status to FINISHED
6. WHEN a game should end, THE Game_API SHALL determine the winner based on disc count
7. WHERE Black has more discs than White, THE Game_API SHALL set winner to AI if aiSide is BLACK, otherwise COLLECTIVE
8. WHERE White has more discs than Black, THE Game_API SHALL set winner to AI if aiSide is WHITE, otherwise COLLECTIVE
9. WHERE Black and White have equal disc counts, THE Game_API SHALL set winner to DRAW
10. THE Game_API SHALL update the game in DynamoDB via Game_Repository.finish()

### Requirement 5: エラーハンドリング

**User Story:** As a developer, I want proper error handling, so that API consumers receive clear and consistent error responses.

#### Acceptance Criteria

1. WHEN an error occurs, THE Game_API SHALL return a JSON response with error, message, and details fields
2. WHEN validation fails, THE Game_API SHALL return status 400 with error code VALIDATION_ERROR
3. WHEN a resource is not found, THE Game_API SHALL return status 404 with error code NOT_FOUND
4. WHEN an internal error occurs, THE Game_API SHALL return status 500 with error code INTERNAL_ERROR
5. THE Game_API SHALL log all errors to CloudWatch for debugging
6. THE Game_API SHALL not expose sensitive information in error messages

### Requirement 6: 型安全性とバリデーション

**User Story:** As a developer, I want type-safe API implementation, so that I can prevent runtime errors and ensure data consistency.

#### Acceptance Criteria

1. THE Game_API SHALL use Zod schemas for request validation
2. THE Game_API SHALL use TypeScript strict mode
3. THE Game_API SHALL define request and response types for all endpoints
4. THE Game_API SHALL validate all incoming request data before processing
5. THE Game_API SHALL return validation errors with field-level details
6. THE Game_API SHALL ensure boardState is properly serialized when storing in DynamoDB
7. THE Game_API SHALL ensure boardState is properly deserialized when retrieving from DynamoDB
