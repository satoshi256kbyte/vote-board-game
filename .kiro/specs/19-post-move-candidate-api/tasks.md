# Implementation Plan: 候補投稿 API

## Overview

このタスクリストは、候補投稿API（POST /api/games/:gameId/turns/:turnNumber/candidates）の実装を段階的に進めるためのものです。既存の CandidateService に `createCandidate` メソッドを追加し、既存の candidates ルーターに POST エンドポイントを追加します。既存の CandidateRepository の `create` / `listByTurn` メソッドおよびオセロバリデーションロジックを活用します。

## Tasks

- [ ] 1. スキーマ定義の拡張
  - [x] 1.1 候補投稿リクエストの Zod スキーマを定義
    - `packages/api/src/schemas/candidate.ts` に `postCandidateBodySchema` を追加
    - position（"row,col" 形式、row/col は 0〜7）と description（1〜200文字）のバリデーション
    - `postCandidateParamSchema` を追加（gameId: UUID v4、turnNumber: 0以上の整数）
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [~] 1.2 スキーマのユニットテストを作成
    - `packages/api/src/schemas/candidate.test.ts` に追加
    - 有効なリクエストボディのテスト
    - 無効な position 形式（"a,b"、"8,0"、"-1,3"、空文字列）のテスト
    - 無効な description（空文字列、201文字）のテスト
    - 無効なパスパラメータ（非UUID gameId、負の turnNumber）のテスト
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [ ] 2. 型定義の拡張
  - [~] 2.1 候補投稿のリクエスト/レスポンス型を追加
    - `packages/api/src/types/candidate.ts` に `PostCandidateRequest` と `PostCandidateResponse` を追加
    - PostCandidateResponse には gameId, turnNumber を含める（GET の CandidateResponse との差分）
    - _Requirements: 8.3_

- [ ] 3. サービスレイヤーの拡張
  - [~] 3.1 エラークラスの追加
    - `packages/api/src/services/candidate.ts` に以下のエラークラスを追加:
      - `InvalidMoveError` - オセロルール上無効な手
      - `VotingClosedError` - 投票締切済みまたはゲーム非アクティブ
      - `DuplicatePositionError` - 同一ポジション重複
    - _Requirements: 4.3, 5.3, 6.2_

  - [~] 3.2 createCandidate メソッドを実装
    - `packages/api/src/services/candidate.ts` の CandidateService に追加
    - ゲーム存在確認 → ゲームステータス確認 → ターン存在確認 → 既存候補取得 → 投票締切チェック → 重複チェック → オセロルール検証 → 候補作成
    - 投票締切の算出ロジック（既存候補の deadline を使用、なければ当日 JST 23:59:59.999）
    - 現在のプレイヤー判定（aiSide の反対側が集合知側）
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 5.1, 5.2, 6.1, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [~] 3.3 サービスレイヤーのユニットテストを作成
    - `packages/api/src/services/candidate.test.ts` に追加
    - 正常系: 有効なリクエストで候補が作成される
    - エラー系: ゲーム未存在（GameNotFoundError）
    - エラー系: ターン未存在（TurnNotFoundError）
    - エラー系: ゲーム非アクティブ（VotingClosedError）
    - エラー系: 投票締切済み（VotingClosedError）
    - エラー系: 重複ポジション（DuplicatePositionError）
    - エラー系: 無効な手（InvalidMoveError）
    - 初期値の検証（voteCount=0, status=VOTING, createdBy=USER#<userId>）
    - _Requirements: 3.1, 3.2, 4.1, 4.2, 5.1, 5.2, 6.1, 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 4. ルーティングレイヤーの拡張
  - [~] 4.1 POST エンドポイントを実装
    - `packages/api/src/routes/candidates.ts` の `createGameCandidatesRouter` に POST ハンドラーを追加
    - POST /games/:gameId/turns/:turnNumber/candidates
    - zValidator でパスパラメータとリクエストボディをバリデーション
    - 認証コンテキストから userId を取得
    - CandidateService.createCandidate を呼び出し
    - 成功時 201 Created でレスポンスを返却
    - エラーハンドリング（各エラークラスに応じたステータスコードとエラーレスポンス）
    - _Requirements: 1.1, 1.2, 1.3, 2.7, 3.3, 4.3, 5.3, 6.2, 7.1, 8.1, 8.2, 8.3, 8.4, 9.1, 9.2_

  - [~] 4.2 認証ミドルウェアの適用を確認・更新
    - `packages/api/src/index.ts` で POST /api/games/:gameId/turns/:turnNumber/candidates に認証ミドルウェアが適用されるよう設定
    - GET は認証不要、POST は認証必須
    - _Requirements: 1.1, 1.2, 1.3_

  - [~] 4.3 エンドポイントのユニットテストを作成
    - `packages/api/src/routes/candidates.test.ts` に追加
    - 正常系: 201 Created のテスト
    - バリデーションエラー: 400 VALIDATION_ERROR のテスト
    - ゲーム未存在: 404 NOT_FOUND のテスト
    - ターン未存在: 404 NOT_FOUND のテスト
    - 無効な手: 400 INVALID_MOVE のテスト
    - 投票締切済み: 400 VOTING_CLOSED のテスト
    - 重複ポジション: 409 CONFLICT のテスト
    - 認証なし: 401 UNAUTHORIZED のテスト
    - _Requirements: 1.1, 2.7, 3.3, 4.3, 5.3, 6.2, 8.1, 8.3, 9.1_

- [~] 5. Checkpoint - 基本機能の動作確認
  - すべてのユニットテストが成功することを確認
  - TypeScript の型チェックが成功することを確認
  - 質問があればユーザーに確認

- [ ] 6. プロパティベーステストの実装
  - [~] 6.1 リクエストボディバリデーションのプロパティテストを作成
    - **Property 2: リクエストボディのバリデーション**
    - `packages/api/src/schemas/candidate.property.test.ts` を作成（または既存ファイルに追加）
    - fast-check で不正な position / description を生成し、バリデーションエラーを検証
    - `numRuns: 15`, `endOnFailure: true`
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.7_

  - [~] 6.2 成功レスポンスの形式と初期値のプロパティテストを作成
    - **Property 8: 成功レスポンスの形式** / **Property 9: 初期値の正確性**
    - `packages/api/src/routes/candidates.property.test.ts` に追加
    - 有効なリクエストに対して 201 が返り、全必須フィールドが含まれることを検証
    - voteCount=0, status=VOTING, createdBy=USER# 形式を検証
    - `numRuns: 10`, `endOnFailure: true`
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4_

  - [~] 6.3 エラーレスポンス一貫性のプロパティテストを作成
    - **Property 11: エラーレスポンスの一貫性**
    - `packages/api/src/routes/candidates.property.test.ts` に追加
    - 各種エラーケースで `{ error, message }` 構造が返されることを検証
    - `numRuns: 10`, `endOnFailure: true`
    - _Requirements: 9.1_

  - [~] 6.4 重複ポジション拒否のプロパティテストを作成
    - **Property 7: 同一ポジション重複拒否**
    - `packages/api/src/services/candidate.property.test.ts` に追加
    - ランダムなポジションで候補が既に存在する場合に DuplicatePositionError がスローされることを検証
    - `numRuns: 10`, `endOnFailure: true`
    - _Requirements: 6.1, 6.2_

- [~] 7. Final Checkpoint - 全体の動作確認
  - すべてのテスト（ユニット、プロパティ）が成功することを確認
  - TypeScript の型チェックが成功することを確認
  - ESLint のチェックが成功することを確認
  - 質問があればユーザーに確認

## Notes

- 既存の `CandidateRepository.create` と `CandidateRepository.listByTurn` をそのまま活用するため、リポジトリレイヤーの変更は不要
- 既存の `validateMove` 関数（`lib/othello/validation.ts`）をそのまま使用
- 既存の認証ミドルウェア（`createAuthMiddleware`）を活用
- レガシーの `POST /api/candidates` エンドポイントは残しつつ、新しい RESTful パスに POST を追加
- プロパティテストは `numRuns: 10-15`、`endOnFailure: true` で設定（JSDOM 環境での安定性のため）
- 各タスクは特定の要件を参照しており、トレーサビリティを確保
