# Implementation Plan: 投票 API

## Overview

このタスクリストは、投票API（POST /api/games/:gameId/turns/:turnNumber/votes）の実装を段階的に進めるためのものです。新規の VoteService を作成し、既存の votes ルーターをリファクタリングして RESTful エンドポイントを追加します。既存の VoteRepository の `getByUser` / `upsertWithTransaction` メソッドを活用します。

## Tasks

- [x] 1. スキーマ定義の作成
  - [x] 1.1 投票リクエストの Zod スキーマを定義
    - `packages/api/src/schemas/vote.ts` を新規作成
    - `postVoteBodySchema`: candidateId（UUID v4 形式）のバリデーション
    - `postVoteParamSchema`: gameId（UUID v4）、turnNumber（0以上の整数、coerce）のバリデーション
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 1.2 スキーマのユニットテストを作成
    - `packages/api/src/schemas/vote.test.ts` を新規作成
    - 有効なリクエストボディのテスト
    - 無効な candidateId（非UUID、空文字列、未指定）のテスト
    - 無効なパスパラメータ（非UUID gameId、負の turnNumber）のテスト
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2. 型定義の作成
  - [x] 2.1 投票のリクエスト/レスポンス型を追加
    - `packages/api/src/types/vote.ts` を新規作成
    - `PostVoteRequest`: candidateId を含むリクエスト型
    - `VoteResponse`: gameId, turnNumber, userId, candidateId, createdAt を含むレスポンス型
    - _Requirements: 8.3_

- [x] 3. サービスレイヤーの作成
  - [x] 3.1 エラークラスの定義
    - `packages/api/src/services/vote.ts` を新規作成
    - `CandidateNotFoundError` - 候補が存在しない
    - `VotingClosedError` - 投票締切済みまたはゲーム非アクティブ
    - `AlreadyVotedError` - 既に投票済み
    - 既存の `GameNotFoundError`、`TurnNotFoundError` は `services/candidate.ts` から再利用
    - _Requirements: 4.4, 5.2, 6.2_

  - [x] 3.2 VoteService.createVote メソッドを実装
    - `packages/api/src/services/vote.ts` の VoteService クラスに実装
    - ゲーム存在確認 → ゲームステータス確認 → ターン存在確認 → 候補一覧取得 → 候補存在確認 → 投票締切チェック → 候補ステータスチェック → 既存投票チェック → トランザクション実行
    - VoteRepository, CandidateRepository, GameRepository をコンストラクタで注入
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 5.1, 6.1, 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 3.3 サービスレイヤーのユニットテストを作成
    - `packages/api/src/services/vote.test.ts` を新規作成
    - 正常系: 有効なリクエストで投票が作成される
    - エラー系: ゲーム未存在（GameNotFoundError）
    - エラー系: ターン未存在（TurnNotFoundError）
    - エラー系: ゲーム非アクティブ（VotingClosedError）
    - エラー系: 候補未存在（CandidateNotFoundError）
    - エラー系: 投票締切済み（VotingClosedError）
    - エラー系: 候補ステータスが VOTING でない（VotingClosedError）
    - エラー系: 既に投票済み（AlreadyVotedError）
    - レスポンスフィールドの検証（gameId, turnNumber, userId, candidateId, createdAt）
    - _Requirements: 3.1, 3.2, 4.1, 4.2, 4.3, 5.1, 6.1, 7.1, 7.2, 7.3, 7.4, 7.5, 8.3_

- [x] 4. ルーティングレイヤーの実装
  - [x] 4.1 投票ルーターをリファクタリング
    - `packages/api/src/routes/votes.ts` を書き換え
    - `createGameVotesRouter` ファクトリ関数を作成（テスト時にモック注入可能）
    - POST /games/:gameId/turns/:turnNumber/votes エンドポイントを実装
    - zValidator でパスパラメータとリクエストボディをバリデーション
    - 認証コンテキストから userId を取得
    - VoteService.createVote を呼び出し
    - 成功時 201 Created でレスポンスを返却
    - エラーハンドリング（各エラークラスに応じたステータスコードとエラーレスポンス）
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 8.1, 8.2, 9.1, 9.2_

  - [x] 4.2 index.ts のルーティングと認証ミドルウェアを更新
    - `packages/api/src/index.ts` を更新
    - 新しい `gameVotesRouter` を `/api` にマウント
    - POST /api/games/:gameId/turns/:turnNumber/votes に認証ミドルウェアを適用
    - レガシーの `/api/votes` ルートは残す（後方互換性）
    - _Requirements: 1.1, 1.2, 1.3, 10.1, 10.2, 10.3_

  - [x] 4.3 エンドポイントのユニットテストを作成
    - `packages/api/src/routes/votes.test.ts` を新規作成
    - 正常系: 201 Created のテスト
    - バリデーションエラー: 400 VALIDATION_ERROR のテスト
    - ゲーム未存在: 404 NOT_FOUND のテスト
    - ターン未存在: 404 NOT_FOUND のテスト
    - 候補未存在: 404 NOT_FOUND のテスト
    - 投票締切済み: 400 VOTING_CLOSED のテスト
    - 既に投票済み: 409 ALREADY_VOTED のテスト
    - 認証なし: 401 UNAUTHORIZED のテスト
    - _Requirements: 1.1, 3.1, 3.2, 4.1, 4.2, 5.1, 6.1, 8.1, 9.1_

- [x] 5. プロパティベーステスト
  - [x] 5.1 リクエストバリデーションのプロパティテストを作成
    - `packages/api/src/schemas/vote.property.test.ts` を新規作成
    - **Property 2**: 不正な candidateId に対するバリデーションエラー検証
    - **Property 3**: 不正なパスパラメータに対するバリデーションエラー検証
    - fast-check で不正な candidateId / gameId / turnNumber を生成
    - `numRuns: 10`, `endOnFailure: true`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 5.2 成功レスポンスの形式と重複投票拒否のプロパティテストを作成
    - `packages/api/src/services/vote.property.test.ts` を新規作成
    - **Property 8**: 成功レスポンスに gameId, turnNumber, userId, candidateId, createdAt が含まれ、createdAt が ISO 8601 形式であることを検証
    - **Property 7**: ランダムなユーザーで既存投票がある場合に AlreadyVotedError がスローされることを検証
    - `numRuns: 10`, `endOnFailure: true`
    - _Requirements: 6.1, 6.2, 7.4, 7.5, 8.1, 8.3, 8.4_

  - [x] 5.3 エラーレスポンス一貫性のプロパティテストを作成
    - `packages/api/src/routes/votes.property.test.ts` を新規作成
    - **Property 10**: 各種エラーケースで `{ error, message }` 構造が返されることを検証
    - `numRuns: 10`, `endOnFailure: true`
    - _Requirements: 9.1, 9.2_

- [x] 6. 最終確認
  - すべてのテスト（ユニット、プロパティ）が成功することを確認
  - TypeScript の型チェックが成功することを確認
  - ESLint のチェックが成功することを確認

## Notes

- 既存の `VoteRepository.getByUser` と `VoteRepository.upsertWithTransaction` をそのまま活用するため、リポジトリレイヤーの変更は不要
- `GameNotFoundError` と `TurnNotFoundError` は `services/candidate.ts` から re-export して共有
- 既存の認証ミドルウェア（`createAuthMiddleware`）を活用
- レガシーの `POST /api/votes` と `GET /api/votes/my` エンドポイントは残しつつ、新しい RESTful パスに POST を追加
- プロパティテストは `numRuns: 10`、`endOnFailure: true` で設定（JSDOM 環境での安定性のため）
- 各タスクは特定の要件を参照しており、トレーサビリティを確保
