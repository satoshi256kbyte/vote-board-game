# Implementation Plan: 次の一手候補一覧取得API

## Overview

このタスクリストは、次の一手候補一覧取得API（GET /api/games/:gameId/turns/:turnNumber/candidates）の実装を段階的に進めるためのものです。既存のリポジトリ（GameRepository、CandidateRepository）を活用し、新しいサービスレイヤーとルーティングレイヤーを実装します。

## Tasks

- [ ] 1. スキーマ定義とバリデーション
  - [ ] 1.1 パスパラメータのZodスキーマを定義
    - `packages/api/src/schemas/candidate.ts` にスキーマを作成
    - gameId（UUID v4形式）とturnNumber（正の整数）のバリデーションルールを定義
    - _Requirements: 2.1, 2.2_

  - [ ]\* 1.2 スキーマのユニットテストを作成
    - 有効なパラメータのテスト
    - 無効なgameId（非UUID、空文字列）のテスト
    - 無効なturnNumber（負の数、小数、文字列）のテスト
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 2. サービスレイヤーの実装
  - [ ] 2.1 CandidateServiceクラスを実装
    - `packages/api/src/services/candidate.ts` にサービスを作成
    - listCandidatesメソッドを実装（ゲーム存在確認、ターン存在確認、候補取得、ソート処理）
    - GameNotFoundError、TurnNotFoundErrorのカスタムエラークラスを定義
    - _Requirements: 1.1, 1.2, 3.1, 3.2_

  - [ ]\* 2.2 サービスレイヤーのユニットテストを作成
    - モックリポジトリを使用したテスト
    - 正常系（候補一覧の取得とソート）のテスト
    - エラー系（ゲーム未存在、ターン未存在）のテスト
    - 空の候補一覧のテスト
    - _Requirements: 1.1, 1.2, 3.1, 3.2, 4.1_

  - [ ]\* 2.3 投票数降順ソートのプロパティテストを作成
    - **Property 2: 投票数降順ソート**
    - **Validates: Requirements 1.2**
    - fast-checkを使用してランダムな候補一覧でソートの正確性を検証
    - すべての隣接ペアで降順を確認
    - _Requirements: 1.2_

- [ ] 3. ルーティングレイヤーの実装
  - [ ] 3.1 候補一覧取得エンドポイントを実装
    - `packages/api/src/routes/candidates.ts` にルーターを作成
    - GET /games/:gameId/turns/:turnNumber/candidates エンドポイントを定義
    - zValidatorミドルウェアでパスパラメータをバリデーション
    - CandidateServiceを呼び出して候補一覧を取得
    - レスポンスをJSON形式で返却（200 OK）
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.3, 6.4_

  - [ ] 3.2 エラーハンドリングを実装
    - バリデーションエラー（400）のハンドリング
    - Not Foundエラー（404）のハンドリング
    - Internal Server Error（500）のハンドリング
    - エラーログの出力（CloudWatch Logs）
    - _Requirements: 2.3, 2.4, 3.3, 3.4, 5.4_

  - [ ] 3.3 メインアプリケーションにルーターを統合
    - `packages/api/src/index.ts` に候補ルーターを追加
    - `/api` プレフィックスでマウント
    - CORSミドルウェアが適用されていることを確認
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ]\* 3.4 エンドポイントのユニットテストを作成
    - 正常系（200 OK）のテスト
    - バリデーションエラー（400）のテスト
    - Not Foundエラー（404）のテスト
    - 空の候補一覧（200 OK）のテスト
    - _Requirements: 1.3, 1.4, 2.3, 2.4, 3.3, 3.4, 4.2, 4.3_

- [ ] 4. Checkpoint - 基本機能の動作確認
  - すべてのテストが成功することを確認
  - ローカル環境でエンドポイントの動作を確認
  - 質問があればユーザーに確認

- [ ] 5. プロパティベーステストの実装
  - [ ]\* 5.1 レスポンス形式のプロパティテストを作成
    - **Property 3: 成功レスポンスの形式**
    - **Validates: Requirements 1.3, 1.4, 4.2, 4.3, 6.1, 6.2**
    - ステータスコード200、Content-Type、JSON構造を検証
    - _Requirements: 1.3, 1.4, 4.2, 4.3, 6.1, 6.2_

  - [ ]\* 5.2 必須フィールドのプロパティテストを作成
    - **Property 4: 候補オブジェクトの必須フィールド**
    - **Validates: Requirements 1.5, 6.3**
    - すべての候補オブジェクトに必須フィールドが含まれることを検証
    - _Requirements: 1.5, 6.3_

  - [ ]\* 5.3 日時フィールドのプロパティテストを作成
    - **Property 5: 日時フィールドのISO 8601形式**
    - **Validates: Requirements 6.4**
    - votingDeadlineとcreatedAtがISO 8601形式であることを検証
    - _Requirements: 6.4_

  - [ ]\* 5.4 バリデーションエラーのプロパティテストを作成
    - **Property 6: gameIdバリデーションエラー**
    - **Property 7: turnNumberバリデーションエラー**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
    - 無効な入力に対して400エラーが返されることを検証
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]\* 5.5 認証不要アクセスのプロパティテストを作成
    - **Property 13: 認証不要のアクセス**
    - **Property 14: 認証状態に依存しないデータ**
    - **Validates: Requirements 8.1, 8.2, 8.3**
    - 認証トークンなしでアクセス可能であることを検証
    - 認証状態に関わらず同じデータが返されることを検証
    - _Requirements: 8.1, 8.2, 8.3_

- [ ] 6. 統合テストの実装
  - [ ]\* 6.1 エンドツーエンド統合テストを作成
    - `packages/api/src/routes/candidates.integration.test.ts` を作成
    - モックDynamoDBを使用した統合テスト
    - 実際のリポジトリとサービスを使用したテスト
    - 主要なシナリオ（正常系、エラー系）をカバー
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 4.1_

- [ ] 7. Final Checkpoint - 全体の動作確認
  - すべてのテスト（ユニット、プロパティ、統合）が成功することを確認
  - TypeScriptの型チェックが成功することを確認
  - ESLintのチェックが成功することを確認
  - 質問があればユーザーに確認

## Notes

- タスクに `*` が付いているものはオプションで、MVP開発を高速化するためにスキップ可能です
- 各タスクは特定の要件を参照しており、トレーサビリティを確保しています
- Checkpointタスクは段階的な検証を行い、問題の早期発見を可能にします
- プロパティテストは普遍的な正確性プロパティを検証し、ユニットテストは特定の例とエッジケースを検証します
- 既存のリポジトリ（GameRepository、CandidateRepository）を活用するため、新規実装は最小限です
