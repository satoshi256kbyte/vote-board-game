# Implementation Plan: Game API

## Overview

このタスクリストは、Game API機能の実装計画です。既存のOthelloゲームロジック（spec 13）を活用し、DynamoDB Single Table Designと統合して、スケーラブルで型安全なゲーム管理APIを構築します。

実装は、型定義とバリデーションスキーマから始め、リポジトリ層、サービス層、ルート層の順に進めます。各主要コンポーネントの実装後にプロパティテストを配置し、早期にエラーを検出します。

## Tasks

- [ ] 1. 型定義とバリデーションスキーマの作成
  - [x] 1.1 リクエスト/レスポンス型を定義
    - `packages/api/src/types/game.ts` を作成
    - GetGamesQuery, GetGamesResponse, GameSummary 型を定義
    - GetGameResponse, CreateGameRequest, CreateGameResponse 型を定義
    - _Requirements: 1.10, 2.5, 3.1_

  - [x] 1.2 Zodバリデーションスキーマを作成
    - `packages/api/src/schemas/game.ts` を作成
    - getGamesQuerySchema (status, limit, cursor) を定義
    - createGameSchema (gameType, aiSide) を定義
    - gameIdParamSchema (UUID v4 validation) を定義
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 6.1, 6.4_

  - [x] 1.3 バリデーションスキーマのプロパティテストを作成
    - **Property 18: Error Responses Have Required Structure**
    - **Validates: Requirements 5.1, 6.5**

- [ ] 2. GameServiceの実装
  - [x] 2.1 GameServiceクラスの基本構造を作成
    - `packages/api/src/services/game.ts` を作成
    - GameRepository と Othello Logic への依存を注入
    - listGames, getGame, createGame, checkAndFinishGame メソッドのスケルトンを定義
    - _Requirements: 1.1, 2.1, 3.1, 4.1_

  - [x] 2.2 createGameメソッドを実装
    - UUID v4 で gameId を生成
    - createInitialBoard() で初期盤面を作成
    - GameRepository.create() でDynamoDBに保存
    - boardState を JSON からオブジェクトにパース
    - _Requirements: 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12_

  - [x] 2.3 ゲーム作成のプロパティテストを作成
    - **Property 9: Created Game Has Valid UUID**
    - **Property 10: Created Game Has Correct Initial State**
    - **Property 11: Created Game Is Persisted**
    - \*\*Validates: Requirements 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12\_

  - [x] 2.4 listGamesメソッドを実装
    - status パラメータでフィルタリング (デフォルト: ACTIVE)
    - limit パラメータで件数制限 (デフォルト: 20, 最大: 100)
    - cursor パラメータでページネーション
    - GameRepository.listByStatus() を使用
    - createdAt 降順でソート
    - nextCursor の生成
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_

  - [x] 2.5 ゲーム一覧取得のプロパティテストを作成
    - **Property 1: Status Filter Returns Only Matching Games**
    - **Property 2: Limit Parameter Bounds Response Size**
    - **Property 3: Pagination Cursor Maintains Consistency**
    - **Property 4: Games Are Sorted by Creation Time Descending**
    - **Property 5: Next Cursor Presence Indicates More Data**
    - **Property 6: List Response Contains Required Fields**
    - **Validates: Requirements 1.2, 1.4, 1.7, 1.8, 1.9, 1.10**

  - [x] 2.6 getGameメソッドを実装
    - GameRepository.getById() でゲームを取得
    - 存在しない場合は null を返す
    - boardState を JSON からオブジェクトにパース
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 2.7 ゲーム詳細取得のプロパティテストを作成
    - **Property 7: Detail Response BoardState Is Object**
    - **Property 8: Detail Response Contains Required Fields**
    - **Validates: Requirements 2.3, 2.5**

  - [x] 2.8 ゲーム終了検知ロジックを実装
    - checkAndFinishGame メソッドを実装
    - shouldEndGame() でゲーム終了を判定
    - determineWinner() で勝者を決定 (ディスク数をカウント)
    - GameRepository.finish() でステータスと勝者を更新
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10_

  - [x] 2.9 ゲーム終了検知のプロパティテストを作成
    - **Property 12: Full Board Triggers Game End**
    - **Property 13: No Legal Moves Triggers Game End**
    - **Property 14: Single Color Triggers Game End**
    - **Property 15: Game End Updates Status to FINISHED**
    - **Property 16: Winner Determined by Disc Count and AI Side**
    - **Property 17: Finished Game Is Persisted**
    - **Validates: Requirements 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10**

- [x] 3. Checkpoint - サービス層のテストを実行
  - すべてのプロパティテストとユニットテストが通ることを確認
  - 問題があればユーザーに質問

- [ ] 4. GameRepositoryの拡張（必要に応じて）
  - [x] 4.1 既存のGameRepositoryを確認
    - `packages/api/src/lib/dynamodb/repositories/game.ts` を確認
    - 必要なメソッド (create, getById, listByStatus, finish) が存在するか確認
    - _Requirements: 3.11, 4.10_

  - [x] 4.2 不足しているメソッドを追加
    - listByStatus メソッドが存在しない場合は実装
    - GSI1 (GAME#STATUS#<status>) を使用してクエリ
    - ページネーション対応 (ExclusiveStartKey, LastEvaluatedKey)
    - _Requirements: 1.1, 1.2, 1.7_

  - [x] 4.3 BoardState シリアライゼーションのプロパティテストを作成
    - **Property 19: BoardState Round-Trip Preserves Data**
    - **Validates: Requirements 6.6, 6.7**

- [ ] 5. APIルートの実装
  - [x] 5.1 Honoルーターを作成
    - `packages/api/src/routes/games.ts` を作成
    - Hono Router インスタンスを作成
    - GameService を依存注入
    - _Requirements: 1.1, 2.1, 3.1_

  - [x] 5.2 GET /api/games エンドポイントを実装
    - zValidator で getGamesQuerySchema を適用
    - GameService.listGames() を呼び出し
    - 200 OK レスポンスを返す
    - エラーハンドリング (500 INTERNAL_ERROR)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10_

  - [x] 5.3 GET /api/games/:gameId エンドポイントを実装
    - zValidator で gameIdParamSchema を適用
    - GameService.getGame() を呼び出し
    - 200 OK レスポンスを返す
    - 404 NOT_FOUND エラーハンドリング
    - 500 INTERNAL_ERROR エラーハンドリング
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 5.4 POST /api/games エンドポイントを実装
    - zValidator で createGameSchema を適用
    - GameService.createGame() を呼び出し
    - 201 Created レスポンスを返す
    - 400 VALIDATION_ERROR エラーハンドリング
    - 500 INTERNAL_ERROR エラーハンドリング
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13_

  - [~] 5.5 APIエンドポイントのユニットテストを作成
    - `packages/api/src/routes/games.test.ts` を作成
    - GET /api/games の正常系とエラー系をテスト
    - GET /api/games/:gameId の正常系とエラー系をテスト
    - POST /api/games の正常系とエラー系をテスト
    - _Requirements: 1.1, 2.1, 2.4, 3.1, 3.13, 5.2, 5.3, 5.4_

- [ ] 6. メインアプリケーションへの統合
  - [~] 6.1 Honoアプリにゲームルートを追加
    - `packages/api/src/index.ts` を更新
    - games ルーターを `/api/games` パスにマウント
    - _Requirements: 1.1, 2.1, 3.1_

  - [~] 6.2 エラーハンドリングミドルウェアを確認
    - グローバルエラーハンドラーが存在することを確認
    - ErrorResponse 型に準拠していることを確認
    - CloudWatch へのログ出力を確認
    - 本番環境で機密情報を隠蔽していることを確認
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [~] 6.3 依存性注入の設定
    - GameService のインスタンスを作成
    - GameRepository と Othello Logic を注入
    - DynamoDB クライアントの設定を確認
    - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [ ] 7. 統合テストの作成
  - [~] 7.1 DynamoDB Local を使用した統合テストを作成
    - `packages/api/src/routes/games.integration.test.ts` を作成
    - テストテーブルの作成とクリーンアップ
    - ゲーム作成→取得のエンドツーエンドフロー
    - ゲーム一覧取得のページネーション
    - ゲーム終了検知と勝者決定
    - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [~] 8. Final Checkpoint - すべてのテストを実行
  - すべてのユニットテスト、プロパティテスト、統合テストが通ることを確認
  - TypeScript の型チェックが通ることを確認
  - ESLint エラーがないことを確認
  - 問題があればユーザーに質問

## Notes

- `*` マークのタスクはオプションで、MVP を早く完成させたい場合はスキップ可能
- 各タスクは具体的な Requirements を参照し、トレーサビリティを確保
- プロパティテストは実装タスクの直後に配置し、早期にエラーを検出
- Checkpoint タスクで段階的に検証し、問題を早期に発見
- 既存の Othello Logic ライブラリ（spec 13）を最大限活用
- DynamoDB Single Table Design のアクセスパターンに従う
