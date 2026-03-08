# Implementation Plan: 投票変更 API

## Overview

このタスクリストは、投票変更API（PUT /api/games/:gameId/turns/:turnNumber/votes/me）の実装を段階的に進めるためのものです。既存の投票API（20-vote-api）のファイルに追加する形で実装します。リポジトリレイヤーは変更不要で、既存の `upsertWithTransaction` の `oldCandidateId` パラメータを活用します。

## Tasks

- [x] 1. スキーマ・型定義の追加
  - [x] 1.1 投票変更リクエストの Zod スキーマを追加
    - `packages/api/src/schemas/vote.ts` に追加
    - `putVoteBodySchema`: candidateId（UUID v4 形式）のバリデーション
    - `putVoteParamSchema`: gameId（UUID v4）、turnNumber（0以上の整数、coerce）のバリデーション
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 1.2 投票変更レスポンス型を追加
    - `packages/api/src/types/vote.ts` に追加
    - `VoteChangeResponse`: gameId, turnNumber, userId, candidateId, createdAt, updatedAt を含むレスポンス型
    - _Requirements: 9.3, 9.4_

  - [x] 1.3 スキーマのユニットテストを追加
    - `packages/api/src/schemas/vote.test.ts` に追加
    - 有効な PUT リクエストボディのテスト
    - 無効な candidateId（非UUID、空文字列、未指定）のテスト
    - 無効なパスパラメータ（非UUID gameId、負の turnNumber）のテスト
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2. サービスレイヤーの拡張
  - [x] 2.1 新規エラークラスの追加
    - `packages/api/src/services/vote.ts` に追加
    - `NotVotedError` - まだ投票していない場合のエラー
    - `SameCandidateError` - 同じ候補への変更の場合のエラー
    - _Requirements: 6.2, 7.2_

  - [x] 2.2 VoteService.changeVote メソッドを実装
    - `packages/api/src/services/vote.ts` の VoteService クラスに追加
    - ゲーム存在確認 → ゲームステータス確認 → ターン存在確認 → 候補一覧取得 → 新候補存在確認 → 投票締切チェック → 候補ステータスチェック → 既存投票確認（未投票チェック） → 同一候補チェック → upsertWithTransaction（oldCandidateId 付き）実行
    - _Requirements: 3.1, 3.2, 4.1, 4.2, 4.3, 5.1, 6.1, 7.1, 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 2.3 サービスレイヤーのユニットテストを追加
    - `packages/api/src/services/vote.test.ts` に追加
    - 正常系: 有効なリクエストで投票が変更される
    - エラー系: ゲーム未存在（GameNotFoundError）
    - エラー系: ターン未存在（TurnNotFoundError）
    - エラー系: ゲーム非アクティブ（VotingClosedError）
    - エラー系: 候補未存在（CandidateNotFoundError）
    - エラー系: 投票締切済み（VotingClosedError）
    - エラー系: 候補ステータスが VOTING でない（VotingClosedError）
    - エラー系: 未投票（NotVotedError）
    - エラー系: 同一候補（SameCandidateError）
    - upsertWithTransaction が oldCandidateId 付きで呼ばれることの検証
    - レスポンスフィールドの検証（gameId, turnNumber, userId, candidateId, createdAt, updatedAt）
    - _Requirements: 3.1, 3.2, 4.1, 4.2, 4.3, 5.1, 6.1, 7.1, 8.1, 8.2, 8.3, 8.4, 8.5, 9.3, 9.4_

- [x] 3. チェックポイント - サービスレイヤーの確認
  - すべてのテストが成功することを確認し、ユーザーに質問があれば確認する。

- [x] 4. ルーティングレイヤーの拡張
  - [x] 4.1 PUT エンドポイントを追加
    - `packages/api/src/routes/votes.ts` の `createGameVotesRouter` に追加
    - PUT /games/:gameId/turns/:turnNumber/votes/me エンドポイントを実装
    - zValidator でパスパラメータ（putVoteParamSchema）とリクエストボディ（putVoteBodySchema）をバリデーション
    - 認証コンテキストから userId を取得
    - VoteService.changeVote を呼び出し
    - 成功時 200 OK でレスポンスを返却
    - NotVotedError → 409 NOT_VOTED、SameCandidateError → 400 SAME_CANDIDATE のエラーハンドリングを追加
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 9.1, 9.2, 10.1, 10.2_

  - [x] 4.2 index.ts の認証ミドルウェア設定を更新
    - `packages/api/src/index.ts` を更新
    - PUT /api/games/:gameId/turns/:turnNumber/votes/me に認証ミドルウェアを適用
    - _Requirements: 1.1, 1.2, 1.3, 11.1, 11.2, 11.3_

  - [x] 4.3 エンドポイントのユニットテストを追加
    - `packages/api/src/routes/votes.test.ts` に追加
    - 正常系: 200 OK のテスト
    - バリデーションエラー: 400 VALIDATION_ERROR のテスト
    - ゲーム未存在: 404 NOT_FOUND のテスト
    - ターン未存在: 404 NOT_FOUND のテスト
    - 候補未存在: 404 NOT_FOUND のテスト
    - 投票締切済み: 400 VOTING_CLOSED のテスト
    - 未投票: 409 NOT_VOTED のテスト
    - 同一候補: 400 SAME_CANDIDATE のテスト
    - 認証なし: 401 UNAUTHORIZED のテスト
    - _Requirements: 1.1, 3.1, 3.2, 4.1, 4.2, 5.1, 6.1, 7.1, 9.1, 10.1, 10.2_

- [ ] 5. プロパティベーステスト
  - [~] 5.1 リクエストバリデーションのプロパティテストを追加
    - `packages/api/src/schemas/vote.property.test.ts` に追加
    - **Property 2: リクエストバリデーション**
    - 不正な candidateId / gameId / turnNumber に対するバリデーションエラー検証
    - fast-check で不正な値を生成
    - `numRuns: 10`, `endOnFailure: true`
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

  - [~] 5.2 未投票ユーザー拒否のプロパティテストを追加
    - `packages/api/src/services/vote.property.test.ts` に追加
    - **Property 5: 未投票ユーザーの拒否**
    - ランダムなユーザーで既存投票がない場合に NotVotedError がスローされることを検証
    - `numRuns: 10`, `endOnFailure: true`
    - **Validates: Requirements 6.1, 6.2**

  - [~] 5.3 同一候補変更拒否のプロパティテストを追加
    - `packages/api/src/services/vote.property.test.ts` に追加
    - **Property 6: 同一候補への変更の拒否**
    - ランダムな candidateId で既存投票と同一の場合に SameCandidateError がスローされることを検証
    - `numRuns: 10`, `endOnFailure: true`
    - **Validates: Requirements 7.1, 7.2**

  - [~] 5.4 アトミックな投票数更新のプロパティテストを追加
    - `packages/api/src/services/vote.property.test.ts` に追加
    - **Property 7: アトミックな投票数更新**
    - upsertWithTransaction が oldCandidateId（旧候補ID）付きで呼ばれることを検証
    - `numRuns: 10`, `endOnFailure: true`
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4**

  - [~] 5.5 成功レスポンス形式のプロパティテストを追加
    - `packages/api/src/services/vote.property.test.ts` に追加
    - **Property 8: 成功レスポンスの形式**
    - 成功レスポンスに gameId, turnNumber, userId, candidateId, createdAt, updatedAt が含まれ、日時フィールドが ISO 8601 形式であることを検証
    - `numRuns: 10`, `endOnFailure: true`
    - **Validates: Requirements 8.5, 9.1, 9.2, 9.3, 9.4**

  - [~] 5.6 エラーレスポンス一貫性のプロパティテストを追加
    - `packages/api/src/routes/votes.property.test.ts` に追加
    - **Property 9: エラーレスポンスの一貫性**
    - 各種エラーケースで `{ error, message }` 構造が返されることを検証
    - `numRuns: 10`, `endOnFailure: true`
    - **Validates: Requirements 10.1, 10.2**

- [ ] 6. 最終チェックポイント - すべてのテストが成功することを確認
  - すべてのテスト（ユニット、プロパティ）が成功することを確認し、ユーザーに質問があれば確認する。
  - TypeScript の型チェックが成功することを確認
  - ESLint のチェックが成功することを確認

## Notes

- 既存の投票API（20-vote-api）のファイルに追加する形で実装するため、新規ファイルの作成は不要
- 既存の `VoteRepository.upsertWithTransaction` の `oldCandidateId` パラメータを活用するため、リポジトリレイヤーの変更は不要
- `GameNotFoundError` と `TurnNotFoundError` は `services/candidate.ts` から再利用
- 既存の認証ミドルウェア（`createAuthMiddleware`）を活用
- プロパティテストは `numRuns: 10`、`endOnFailure: true` で設定（JSDOM 環境での安定性のため）
- タスクに `*` が付いているものはオプション（テスト関連のサブタスク）でスキップ可能
- 各タスクは特定の要件を参照しており、トレーサビリティを確保
