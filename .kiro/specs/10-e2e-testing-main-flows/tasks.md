# Implementation Plan: E2E Testing Main Flows

## Overview

認証フローの主要なハッピーパスをカバーする最小限のE2Eテストを実装する。Playwrightを使用して、ユーザー登録、ログイン、パスワードリセットの3つの基本フローをテストし、CI/CDパイプラインに統合する。

## Tasks

- [x] 1. E2Eテストの基盤セットアップ
  - [x] 1.1 Playwrightの設定ファイルを作成
    - `playwright.config.ts` を作成し、baseURL、timeout、retries、headlessモードなどを設定
    - CI環境とローカル環境で異なる設定を適用できるようにする
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  - [x] 1.2 テストヘルパー関数を実装
    - `e2e/helpers/test-user.ts` を作成し、`generateTestUser()` 関数を実装
    - タイムスタンプを使用した一意のメールアドレス生成
    - セキュリティ要件を満たすパスワード生成
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 1.3 テストユーザークリーンアップ機能を実装
    - `e2e/helpers/cleanup.ts` を作成し、`cleanupTestUser()` 関数を実装
    - AWS SDK v3を使用してCognitoからテストユーザーを削除
    - エラーハンドリングとログ出力を実装
    - _Requirements: 4.4, 4.5, 8.2, 10.2_

- [x] 2. ユーザー登録フローのE2Eテスト実装
  - [x] 2.1 登録フローのテストファイルを作成
    - `e2e/auth/registration.spec.ts` を作成
    - 登録ページへのナビゲーション、フォーム入力、送信、リダイレクト検証を実装
    - localStorageのアクセストークン検証を実装
    - エラーメッセージが表示されないことを検証
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_
  - [x] 2.2 登録フローのプロパティテスト
    - **Property 1: User Registration Creates Cognito User**
    - **Property 2: Successful Registration Redirects to Home**
    - **Property 3: Registration Stores Access Token**
    - **Property 4: Successful Registration Shows No Errors**
    - **Validates: Requirements 1.4, 1.5, 1.6, 1.7**

- [x] 3. ログインフローのE2Eテスト実装
  - [x] 3.1 ログインフローのテストファイルを作成
    - `e2e/auth/login.spec.ts` を作成
    - ログインページへのナビゲーション、フォーム入力、送信、リダイレクト検証を実装
    - localStorageのアクセストークンとリフレッシュトークン検証を実装
    - 事前にテストユーザーを登録してからログインテストを実行
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_
  - [x] 3.2 ログインフローのプロパティテスト
    - **Property 5: User Login Authenticates with Cognito**
    - **Property 6: Successful Login Redirects to Home**
    - **Property 7: Login Stores Authentication Tokens**
    - **Validates: Requirements 2.4, 2.5, 2.6, 2.7**

- [x] 4. パスワードリセットフローのE2Eテスト実装
  - [x] 4.1 パスワードリセットフローのテストファイルを作成
    - `e2e/auth/password-reset.spec.ts` を作成
    - パスワードリセットページへのナビゲーション、メール送信、確認コード入力フィールドの表示検証を実装
    - 確認コードの取得方法を実装（モックまたはテストメール）
    - 新しいパスワードでのログイン検証を実装
    - 古いパスワードでログインできないことを検証
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_
  - [x] 4.2 パスワードリセットフローのプロパティテスト
    - **Property 8: Password Reset Sends Confirmation Code**
    - **Property 9: Confirmation Code Shows Input Field**
    - **Property 10: Valid Code Updates Password**
    - **Property 11: Successful Reset Shows Success Message**
    - **Property 12: New Password Enables Login**
    - **Property 13: Old Password Becomes Invalid**
    - **Validates: Requirements 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**

- [x] 5. Checkpoint - 基本的なE2Eテストの動作確認
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. エラーハンドリングとリトライロジックの実装
  - [x] 6.1 ネットワークエラーハンドリングを実装
    - アプリケーションが到達不可能な場合のエラーメッセージを実装
    - タイムアウト時のスクリーンショット保存を実装
    - _Requirements: 7.1, 7.4_
  - [x] 6.2 Cognitoサービスエラーハンドリングを実装
    - Cognitoが利用できない場合のテストスキップロジックを実装
    - 警告メッセージの出力を実装
    - _Requirements: 7.2_
  - [x] 6.3 既存ユーザーエラーハンドリングを実装
    - テストユーザーが既に存在する場合の削除とリトライロジックを実装
    - _Requirements: 7.3_
  - [~] 6.4 アサーションエラーハンドリングを実装
    - アサーション失敗時のスクリーンショットと詳細エラーメッセージ保存を実装
    - _Requirements: 7.5_
  - [~] 6.5 CI環境でのリトライ設定を実装
    - Playwright設定でCI環境では2回までリトライするように設定
    - _Requirements: 7.6_

- [ ] 7. テスト独立性の確保
  - [~] 7.1 各テストで一意のテストユーザーを使用
    - 各テストケースで `generateTestUser()` を呼び出し、一意のユーザーを生成
    - _Requirements: 8.1_
  - [~] 7.2 テスト後のクリーンアップを実装
    - 各テストの `afterEach` または `afterAll` でテストユーザーを削除
    - _Requirements: 8.2_
  - [~] 7.3 テスト失敗時の影響を分離
    - 各テストが独立して実行できることを確認
    - テスト失敗が後続テストに影響しないことを確認
    - _Requirements: 8.3_
  - [~] 7.4 並列実行時のリソース競合テスト
    - **Property 31: Parallel Tests Have No Resource Conflicts**
    - **Validates: Requirements 8.4**

- [ ] 8. パフォーマンス最適化
  - [~] 8.1 テストタイムアウトを30秒に設定
    - Playwright設定でテストタイムアウトを30秒に設定
    - _Requirements: 9.1_
  - [~] 8.2 CI環境でのワーカー数を設定
    - CI環境では1ワーカー、ローカルでは並列実行を許可
    - _Requirements: 9.2, 9.3_
  - [~] 8.3 ブラウザリソースのクリーンアップを実装
    - テスト完了後に即座にブラウザを閉じる処理を実装
    - _Requirements: 9.4_
  - [~] 8.4 パフォーマンステスト
    - **Property 32: Tests Complete Within Time Limit**
    - **Property 33: Browser Closes After Test Completion**
    - **Validates: Requirements 9.1, 9.4**

- [ ] 9. セキュリティ対策の実装
  - [~] 9.1 環境変数からの認証情報読み込みを実装
    - GitHub SecretsまたはローカルのDotenvから認証情報を読み込む
    - _Requirements: 10.1_
  - [~] 9.2 スクリーンショットからのパスワード除外を実装
    - パスワード入力フィールドをマスクする設定を追加
    - _Requirements: 10.3_
  - [~] 9.3 ログからのパスワード除外を実装
    - エラーログにパスワードが含まれないようにフィルタリング
    - _Requirements: 10.4_
  - [~] 9.4 本番環境での実行防止を実装
    - 本番環境URLでのテスト実行を防ぐチェックを追加
    - _Requirements: 10.5_
  - [~] 9.5 セキュリティプロパティテスト
    - **Property 34: Screenshots Don't Contain Passwords**
    - **Property 35: Error Logs Don't Contain Passwords**
    - **Validates: Requirements 10.3, 10.4**

- [~] 10. Checkpoint - セキュリティとパフォーマンスの確認
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. CI/CDパイプライン統合
  - [~] 11.1 GitHub ActionsワークフローにE2Eテストジョブを追加
    - `.github/workflows/deploy.yml` にE2Eテストジョブを追加
    - デプロイジョブの完了後にE2Eテストジョブをトリガー
    - CloudFront URLをE2Eテストジョブに渡す
    - _Requirements: 5.1, 5.2_
  - [~] 11.2 E2Eテストジョブの実装
    - Playwright環境のセットアップステップを追加
    - E2Eテスト実行ステップを追加
    - テスト結果のレポートステップを追加
    - _Requirements: 5.3_
  - [~] 11.3 テスト失敗時のビルド失敗設定
    - E2Eテストが失敗した場合にビルドを失敗とマークする設定を追加
    - _Requirements: 5.4_
  - [~] 11.4 テスト失敗時のアーティファクト保存
    - スクリーンショットとエラーログをGitHub Actionsアーティファクトとして保存
    - _Requirements: 5.5_
  - [~] 11.5 テスト成功時のビルド成功設定
    - すべてのE2Eテストが成功した場合にビルドを成功とマークする設定を追加
    - _Requirements: 5.6_

- [~] 12. 最終チェックポイント - すべてのテストとCI/CD統合の確認
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- `*` マークのタスクはオプションで、MVP実装では省略可能
- 各タスクは特定の要件を参照しており、トレーサビリティを確保
- チェックポイントタスクで段階的な検証を実施
- プロパティテストは正確性プロパティを検証
- ユニットテストは特定の例とエッジケースを検証
