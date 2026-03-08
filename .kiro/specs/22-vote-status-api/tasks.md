# タスク: 投票状況取得 API

## タスク一覧

- [x] 1. 型定義・スキーマの追加
  - [x] 1.1 `types/vote.ts` に `VoteStatusResponse` 型を追加する
  - [x] 1.2 `schemas/vote.ts` に `getVoteParamSchema` を追加する
- [x] 2. サービスレイヤーの実装
  - [x] 2.1 `services/vote.ts` に `VoteNotFoundError` エラークラスを追加する
  - [x] 2.2 `services/vote.ts` に `toVoteStatusResponse` 変換関数を追加する
  - [x] 2.3 `services/vote.ts` の `VoteService` クラスに `getMyVote` メソッドを追加する
- [ ] 3. ルーティングレイヤーの実装
  - [~] 3.1 `routes/votes.ts` の `createGameVotesRouter` に GET `/games/:gameId/turns/:turnNumber/votes/me` エンドポイントを追加する
  - [~] 3.2 `routes/votes.ts` に `VoteNotFoundError` のインポートとエラーハンドリングを追加する
- [ ] 4. ユニットテストの作成
  - [~] 4.1 `schemas/vote.test.ts` に `getVoteParamSchema` のテストケースを追加する
  - [~] 4.2 `services/vote.test.ts` に `getMyVote` メソッドのテストケースを追加する
  - [~] 4.3 `routes/votes.test.ts` に GET エンドポイントのテストケースを追加する
- [ ] 5. プロパティベーステストの作成
  - [~] 5.1 [PBT] `schemas/vote.property.test.ts` に GET パスパラメータのプロパティテストを追加する (Property 2: パスパラメータのバリデーション)
  - [~] 5.2 [PBT] `services/vote.property.test.ts` に成功レスポンスのプロパティテストを追加する (Property 4: 成功レスポンスの形式)
  - [~] 5.3 [PBT] `routes/votes.property.test.ts` にエラーレスポンスのプロパティテストを追加する (Property 6: エラーレスポンスの一貫性)
