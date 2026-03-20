# 実装計画: E2Eテストデータクリーンアップ

## 概要

E2Eテストで作成された対局データがDynamoDBに残留する問題を解決するため、タグベースのデータ識別・フィルタリング・自動クリーンアップ機構を実装する。データ層（型定義・リポジトリ）→ API層（スキーマ・サービス・ルート）→ インフラ層（CDK）→ E2Eテスト層（ヘルパー・フィクスチャ・グローバルティアダウン）の順に段階的に構築する。

## タスク

- [ ] 1. DynamoDB型定義とGameRepositoryの拡張
  - [ ] 1.1 `packages/api/src/lib/dynamodb/types.ts` の `GameEntity` に `tags?: string[]` と `GSI3PK?: string` 属性を追加し、`GSIKeys` に `gamesByTag` ヘルパー関数を追加する
    - `GameEntity` インターフェースに `tags?: string[]` と `GSI3PK?: string` を追加
    - `GSIKeys` オブジェクトに `gamesByTag: (tag: string) => ({ GSI3PK: \`TAG#${tag}\` })` を追加
    - _要件: 1.1, 1.4, 1.5_
  - [ ] 1.2 `packages/api/src/lib/dynamodb/repositories/game.ts` の `create` メソッドに `tags` パラメータを追加し、E2Eタグ時に `GSI3PK` を設定するロジックを実装する
    - `create` メソッドの `params` に `tags?: string[]` を追加
    - `tags` 未指定時はデフォルト `[]` を設定
    - `tags` に `E2E` が含まれる場合、`GSI3PK` を `TAG#E2E` に設定
    - 既存の `create` テスト（`game.test.ts`）が壊れないことを確認
    - _要件: 1.2, 1.3, 1.5_
  - [ ] 1.3 `packages/api/src/lib/dynamodb/repositories/game.ts` に `listByTag` メソッドを追加し、GSI3を使用してタグでゲームを検索する機能を実装する
    - `QueryCommand` で `IndexName: 'GSI3'`, `KeyConditionExpression: 'GSI3PK = :gsi3pk'` を使用
    - ページネーション対応（全件取得のためループ）
    - _要件: 4.1_
  - [ ] 1.4 `packages/api/src/lib/dynamodb/repositories/game.test.ts` に `tags` 関連のユニットテストを追加する
    - `create` メソッド: tags指定時の保存、tags未指定時のデフォルト値（空配列）、E2Eタグ時のGSI3PK設定
    - `listByTag` メソッド: GSI3クエリの正確性、空結果の処理
    - _要件: 1.1, 1.2, 1.3, 1.5, 4.1_
  - [ ]\* 1.5 `packages/api/src/lib/dynamodb/repositories/game.test.ts` にプロパティベーステストを追加する
    - **Property 1: タグのラウンドトリップ** — 任意の文字列配列 `tags` で `create` → `getById` した結果の `tags` が元の配列と一致する
    - **検証対象: 要件 1.1, 1.3**
    - **Property 2: E2EタグとGSI3PKの連動** — 任意の文字列配列 `tags` に対して、`E2E` を含む場合のみ `GSI3PK` が `TAG#E2E` に設定される
    - **検証対象: 要件 1.5**

- [ ] 2. チェックポイント - テスト実行と確認
  - `pnpm test` で全テストがpassすることを確認し、ユーザーに質問があれば確認する

- [ ] 3. ゲーム作成スキーマとGameServiceの拡張
  - [ ] 3.1 `packages/api/src/schemas/game.ts` の `createGameSchema` に `tags` フィールド（`z.array(z.string()).optional().default([])`）を追加する
    - _要件: 2.1, 2.2, 2.3_
  - [ ] 3.2 `packages/api/src/schemas/game.test.ts` に `tags` フィールドのバリデーションテストを追加する
    - 正常系: tags指定あり、tags指定なし（デフォルト空配列）
    - 異常系: 数値、オブジェクト、ネストされた配列など不正な値
    - _要件: 2.3_
  - [ ]\* 3.3 `packages/api/src/schemas/game.property.test.ts` にプロパティベーステストを追加する
    - **Property 3: tagsフィールドのバリデーション** — 任意の文字列配列でない値を `tags` に指定した場合、バリデーションエラーとなる
    - **検証対象: 要件 2.3**
  - [ ] 3.4 `packages/api/src/services/game.ts` の `createGame` メソッドに `tags` パラメータを追加し、リポジトリに渡す
    - `createGame` の `params` に `tags?: string[]` を追加
    - `repository.create` 呼び出し時に `tags` を渡す
    - _要件: 2.1, 2.2_
  - [ ] 3.5 `packages/api/src/services/game.ts` の `listGames` メソッドでE2Eタグ付きゲームをフィルタリングする
    - リポジトリから取得した結果から `tags` に `E2E` を含むゲームを除外
    - フィルタリング後の件数が `limit` を満たすようにページネーションを考慮
    - `GameSummary` 型に `tags` を追加し、レスポンスに含める
    - _要件: 5.1, 5.2, 2.4_
  - [ ] 3.6 `packages/api/src/services/game.test.ts` に `tags` 関連のユニットテストを追加する
    - `createGame`: tags引数のリポジトリへの受け渡し
    - `listGames`: E2Eタグ付きゲームのフィルタリング、フィルタリング後のレスポンスにtags属性が含まれること
    - _要件: 2.1, 2.4, 5.1_
  - [ ]\* 3.7 `packages/api/src/services/game.property.test.ts` にプロパティベーステストを追加する
    - **Property 4: レスポンスにtags属性を含む** — 任意のタグ配列を持つゲームに対して、GET /api/games のレスポンスの各ゲームが `tags` 属性を持つ
    - **検証対象: 要件 2.4**
    - **Property 5: E2Eタグ付きゲームの除外とlimit遵守** — E2Eタグ付きとタグなしの混在ゲーム集合に対して、レスポンスにE2Eタグ付きゲームが含まれず、件数がlimit以下である
    - **検証対象: 要件 5.1, 5.2**

- [ ] 4. ゲームルートの拡張
  - [ ] 4.1 `packages/api/src/routes/games.ts` の POST /api/games で `tags` フィールドを受け取り、`GameService.createGame` に渡す
    - `c.req.valid('json')` から `tags` を取得
    - `service.createGame` に `tags` を渡す
    - _要件: 2.1, 2.2_
  - [ ] 4.2 `packages/api/src/routes/games.ts` の GET /api/games レスポンスに `tags` 属性を含める
    - `GameSummary` に `tags` が含まれていることを確認（3.5で対応済みのはず）
    - _要件: 2.4_
  - [ ] 4.3 `packages/api/src/routes/games.test.ts` と `packages/api/src/routes/games.integration.test.ts` に `tags` 関連のテストを追加する
    - POST /api/games: tags付きゲーム作成、tags未指定時のデフォルト
    - GET /api/games: レスポンスにtags属性が含まれること、E2Eタグ付きゲームが除外されること
    - _要件: 2.1, 2.2, 2.4, 5.1_

- [ ] 5. チェックポイント - テスト実行と確認
  - `pnpm test` で全テストがpassすることを確認し、ユーザーに質問があれば確認する

- [ ] 6. CDKスタックにGSI3を追加
  - [ ] 6.1 `packages/infra/lib/vote-board-game-stack.ts` のDynamoDBテーブル定義にGSI3（パーティションキー: `GSI3PK`、ソートキーなし）を追加する
    - `table.addGlobalSecondaryIndex({ indexName: 'GSI3', partitionKey: { name: 'GSI3PK', type: dynamodb.AttributeType.STRING } })`
    - _要件: 1.4_
  - [ ]\* 6.2 CDKスナップショットテストを更新し、GSI3が追加されていることを検証する
    - スナップショットの更新（`pnpm test -- -u` でスナップショット再生成）
    - Fine-grained assertionでGSI3の存在を検証
    - _要件: 1.4_

- [ ] 7. チェックポイント - テスト実行と確認
  - `pnpm test` で全テストがpassすることを確認し、ユーザーに質問があれば確認する

- [ ] 8. E2Eテストデータヘルパーとフィクスチャの拡張
  - [ ] 8.1 `packages/web/e2e/helpers/test-data.ts` の `createTestGame` 関数でGame_Entityに `tags: ["E2E"]` と `GSI3PK: "TAG#E2E"` を設定する
    - DynamoDB PutCommand の Item に `tags: ['E2E']` と `GSI3PK: 'TAG#E2E'` を追加
    - _要件: 3.1, 3.2_
  - [ ] 8.2 `packages/web/e2e/helpers/test-data.test.ts` のテストを更新し、tags と GSI3PK が正しく設定されることを検証する
    - _要件: 3.1, 3.2_

- [ ] 9. Global Teardownの実装
  - [ ] 9.1 `packages/web/e2e/global-teardown.ts` を新規作成し、E2Eテスト終了時のクリーンアップ処理を実装する
    - GSI3で `TAG#E2E` のゲームを検索（`QueryCommand` で `IndexName: 'GSI3'`）
    - 各ゲームの関連データ（Candidate_Entity: `PK = GAME#<gameId>#TURN#*`）を検索・削除
    - ゲーム本体を削除
    - エラー発生時はログに記録し、残りのデータの削除を継続
    - 削除件数をログ出力
    - `DYNAMODB_TABLE_NAME` 未設定時は警告ログを出力してスキップ
    - `withCredentialRefresh` でAWS認証情報期限切れに対応
    - _要件: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [ ] 9.2 `packages/web/playwright.config.ts` に `globalTeardown: './e2e/global-teardown.ts'` 設定を追加する
    - `createPlaywrightConfig` の返却オブジェクトに `globalTeardown` を追加
    - _要件: 4.4, 6.4_
  - [ ]\* 9.3 `packages/web/e2e/global-teardown.test.ts` を新規作成し、クリーンアップロジックのユニットテストを追加する
    - DynamoDBクライアントをモックしてクリーンアップフローを検証
    - エラー発生時の継続動作を検証
    - 削除件数のログ出力を検証
    - **Property 6: クリーンアップによる完全削除** — 任意の数のE2Eタグ付きGame_Entityに対して、クリーンアップ実行後にGSI3検索結果が空である
    - **検証対象: 要件 4.2**
    - _要件: 4.1, 4.2, 4.3, 4.5_

- [ ] 10. チェックポイント - テスト実行と確認
  - `pnpm test` で全テストがpassすることを確認し、ユーザーに質問があれば確認する

- [ ] 11. GitHub Actionsワークフローの確認
  - [ ] 11.1 `.github/workflows/cd-development.yml` と `.github/workflows/e2e-game.yml` でPlaywrightの `globalTeardown` 設定により自動的にクリーンアップが実行されることを確認する
    - Playwright設定に `globalTeardown` が追加されているため、ワークフロー側の追加ステップは不要
    - テスト失敗時もteardownが実行されることを確認
    - 必要に応じてワークフローファイルにコメントを追加
    - _要件: 6.1, 6.2, 6.3, 6.4_

- [ ] 12. 最終チェックポイント - 全テスト実行と確認
  - `pnpm test` で全テストがpassすることを確認し、ユーザーに質問があれば確認する

## 備考

- `*` マーク付きのタスクはオプションであり、スキップ可能
- 各タスクは特定の要件を参照しており、トレーサビリティを確保
- チェックポイントで段階的に検証を実施
- プロパティベーステストは `fast-check` を使用し、`numRuns: 10〜20`、`endOnFailure: true` を設定
- タスク完了条件: `pnpm test` 全pass → `git commit` → `git push`
