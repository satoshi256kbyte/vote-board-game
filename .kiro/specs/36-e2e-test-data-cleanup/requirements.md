# 要件定義書

## はじめに

E2Eテスト（Playwright）で作成された対局データが本番環境のDynamoDBに残留し、対局一覧画面にテストデータが表示される問題を解決する。対局データにタグ情報を追加し、E2Eテストで作成するデータには「E2E」タグを付与する。E2Eテスト終了時に同タグを持つデータを一括削除するクリーンアップ機構を導入する。

## 用語集

- **Game_Entity**: DynamoDBに保存される対局データ（PK: `GAME#<gameId>`, SK: `GAME#<gameId>`）
- **Tag**: 対局データに付与される分類用の文字列属性。E2Eテストデータの識別に使用する
- **E2E_Cleanup**: E2Eテスト終了時に実行されるテストデータ削除処理
- **Playwright_Global_Teardown**: Playwrightの全テスト完了後に1回実行されるグローバル後処理関数
- **Test_Data_Helper**: E2Eテスト用のテストデータ作成・削除を行うヘルパーモジュール（`e2e/helpers/test-data.ts`）
- **Test_Game_Fixture**: Playwrightのテストフィクスチャとしてテスト対局を提供するモジュール（`e2e/fixtures/test-game.ts`）
- **Game_Repository**: DynamoDBのGame_Entityに対するCRUD操作を提供するリポジトリクラス
- **GSI3**: タグによるGame_Entity検索用のGlobal Secondary Index
- **Candidate_Entity**: 対局の手候補データ（PK: `GAME#<gameId>#TURN#<turnNumber>`）
- **API_Server**: Hono上で動作するバックエンドAPIサーバー

## 要件

### 要件1: Game_Entityへのタグ属性追加

**ユーザーストーリー:** 開発者として、対局データにタグ情報を付与したい。それにより、E2Eテストデータと本番データを区別できるようにする。

#### 受け入れ基準

1. THE Game_Entity SHALL タグ情報を格納する `tags` 属性（文字列配列型）を持つ
2. WHEN Game_Entityが作成される際に `tags` が指定されない場合、THE Game_Repository SHALL `tags` を空配列として保存する
3. WHEN Game_Entityが作成される際に `tags` が指定される場合、THE Game_Repository SHALL 指定された `tags` をそのまま保存する
4. THE Game_Entity SHALL タグによる検索を可能にするためのGSI3（パーティションキー: `GSI3PK`）を持つ
5. WHEN `tags` に「E2E」が含まれるGame_Entityが作成される場合、THE Game_Repository SHALL `GSI3PK` を `TAG#E2E` に設定する

### 要件2: ゲーム作成APIのタグ対応

**ユーザーストーリー:** 開発者として、ゲーム作成API経由でタグを指定して対局を作成したい。それにより、E2Eテストから作成する対局にタグを付与できるようにする。

#### 受け入れ基準

1. WHEN POST /api/games リクエストに `tags` フィールドが含まれる場合、THE API_Server SHALL 指定されたタグを含むGame_Entityを作成する
2. WHEN POST /api/games リクエストに `tags` フィールドが含まれない場合、THE API_Server SHALL 空のタグ配列を持つGame_Entityを作成する
3. THE API_Server SHALL `tags` フィールドを文字列配列としてバリデーションする
4. WHEN GET /api/games レスポンスを返す場合、THE API_Server SHALL 各ゲームの `tags` 属性をレスポンスに含める

### 要件3: E2Eテストデータ作成時のタグ付与

**ユーザーストーリー:** 開発者として、E2Eテストで作成される対局データに自動的に「E2E」タグを付与したい。それにより、テストデータを確実に識別できるようにする。

#### 受け入れ基準

1. WHEN Test_Data_Helper がテスト対局を作成する場合、THE Test_Data_Helper SHALL Game_Entityの `tags` に「E2E」を含める
2. WHEN Test_Data_Helper がテスト対局を作成する場合、THE Test_Data_Helper SHALL `GSI3PK` を `TAG#E2E` に設定する
3. WHEN Test_Game_Fixture がテスト対局を作成する場合、THE Test_Game_Fixture SHALL Test_Data_Helperを通じて「E2E」タグ付きの対局を作成する

### 要件4: E2Eテスト終了時のタグベースクリーンアップ

**ユーザーストーリー:** 開発者として、E2Eテスト終了時にテストデータを確実に削除したい。それにより、本番環境にテストデータが残留しないようにする。

#### 受け入れ基準

1. WHEN Playwrightの全テストが完了した場合、THE Playwright_Global_Teardown SHALL GSI3を使用して `TAG#E2E` タグを持つ全てのGame_Entityを検索する
2. WHEN E2Eタグ付きのGame_Entityが見つかった場合、THE E2E_Cleanup SHALL 該当するGame_Entityとその関連データ（Candidate_Entity）を削除する
3. IF E2E_Cleanupの実行中にエラーが発生した場合、THEN THE E2E_Cleanup SHALL エラーをログに記録し、残りのデータの削除を継続する
4. THE E2E_Cleanup SHALL テストの成否にかかわらず実行される
5. WHEN E2E_Cleanupが完了した場合、THE E2E_Cleanup SHALL 削除したGame_Entityの件数をログに出力する

### 要件5: 対局一覧画面でのE2Eテストデータ非表示

**ユーザーストーリー:** ユーザーとして、対局一覧画面でE2Eテストの対局を見たくない。それにより、本物の対局だけを閲覧できるようにする。

#### 受け入れ基準

1. WHEN GET /api/games で対局一覧を取得する場合、THE API_Server SHALL `tags` に「E2E」を含むGame_Entityをレスポンスから除外する
2. WHEN フィルタリングが適用された場合でも、THE API_Server SHALL `limit` パラメータで指定された件数のGame_Entityを返す（E2Eデータ除外後の件数）

### 要件6: GitHub ActionsワークフローでのE2Eクリーンアップ統合

**ユーザーストーリー:** 開発者として、CI/CDパイプラインでE2Eテスト後のクリーンアップが自動実行されることを保証したい。それにより、手動でのデータ削除作業を不要にする。

#### 受け入れ基準

1. THE cd-development.yml ワークフロー SHALL E2Eテストジョブの完了後にE2E_Cleanupを実行するステップを含む
2. THE e2e-game.yml ワークフロー SHALL E2Eテスト実行後にE2E_Cleanupを実行するステップを含む
3. IF E2Eテストが失敗した場合でも、THEN THE ワークフロー SHALL E2E_Cleanupステップを実行する
4. THE E2E_Cleanup ステップ SHALL Playwrightの `globalTeardown` 設定を通じて自動的に実行される
