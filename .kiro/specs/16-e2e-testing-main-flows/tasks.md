# タスク

## タスク1: Playwright環境のセットアップ

**ステータス:** completed
**依存関係:** なし

### 説明

PlaywrightをインストールしてE2Eテストの基本環境を構築する。

### 受け入れ基準

- [x] `packages/web`にPlaywrightをインストール
- [x] `playwright.config.ts`を作成
- [x] Chromium、Firefox、WebKitブラウザを設定
- [x] ヘッドレスモードとビジュアルモードを設定
- [x] ベースURLを環境変数から読み込む設定
- [x] テストタイムアウトを15秒に設定
- [x] スクリーンショット設定(失敗時のみ)
- [x] 並列実行の設定
- [x] `e2e/`ディレクトリ構造を作成
- [x] `.gitignore`にPlaywrightの出力を追加

---

## タスク2: グローバルセットアップの実装

**ステータス:** completed
**依存関係:** タスク1

### 説明

テスト実行前にサービスの可用性を確認するグローバルセットアップを実装する。

### 受け入れ基準

- [x] `e2e/global-setup.ts`を作成
- [x] フロントエンドの可用性チェックを実装
- [x] Cognitoの可用性チェックを実装
- [x] APIの可用性チェックを実装
- [x] サービスが利用不可の場合はフェイルファストする
- [x] タイムアウト設定（30秒）
- [x] エラーメッセージを明確に表示
- [x] `playwright.config.ts`にグローバルセットアップを登録
- [x] ユニットテストを作成

---

## タスク3: テストヘルパーの実装

**ステータス:** completed
**依存関係:** タスク1

### 説明

テストで使用する共通ヘルパー関数を実装する。

### 受け入れ基準

- [x] `e2e/helpers/test-user.ts`を作成
- [x] `createTestUser()`関数を実装
- [x] `cleanupTestUser()`関数を実装
- [x] `loginUser()`関数を実装
- [x] `e2e/helpers/test-data.ts`を作成
- [x] `createTestGame()`関数を実装
- [x] `createTestCandidate()`関数を実装
- [x] `cleanupTestGame()`関数を実装
- [x] `e2e/helpers/cognito-availability.ts`を作成
- [x] `checkCognitoAvailability()`関数を実装
- [x] `waitForCognitoAvailability()`関数を実装
- [x] `e2e/helpers/network-error.ts`を作成
- [x] `simulateNetworkError()`関数を実装
- [x] `simulateSlowNetwork()`関数を実装
- [x] 各ヘルパー関数のユニットテストを作成

---

## タスク4: Page Object Modelsの実装

**ステータス:** completed
**依存関係:** タスク1

### 説明

各画面のPage Object Modelを実装する。

### 受け入れ基準

- [x] `e2e/page-objects/login-page.ts`を作成
- [x] LoginPageクラスを実装（goto, fillEmail, fillPassword, clickSubmit, login, expectErrorMessage, expectRedirectToGameList）
- [x] `e2e/page-objects/registration-page.ts`を作成
- [x] RegistrationPageクラスを実装（goto, fillEmail, fillPassword, fillConfirmPassword, clickSubmit, register, expectErrorMessage, expectRedirectToLogin）
- [x] `e2e/page-objects/game-list-page.ts`を作成
- [x] GameListPageクラスを実装（goto, clickGame, getActiveGames, expectAtLeastOneGame, expectGameVisible）
- [x] `e2e/page-objects/game-detail-page.ts`を作成
- [x] GameDetailPageクラスを実装（goto, clickJoinGame, clickShare, getShareUrl, expectBoardStateVisible, expectMoveHistoryVisible, expectAICommentaryVisible, expectJoinButtonVisible）
- [x] `e2e/page-objects/voting-page.ts`を作成
- [x] VotingPageクラスを実装（goto, selectCandidate, submitVote, vote, fillCandidateDescription, submitNewCandidate, expectCandidatesVisible, expectCandidateDescription, expectSuccessMessage, expectErrorMessage, expectCandidateInList）
- [x] `e2e/page-objects/profile-page.ts`を作成
- [x] ProfilePageクラスを実装（goto, fillDisplayName, submitUpdate, updateProfile, expectProfileDataVisible, expectVotingHistoryVisible, expectSuccessMessage, expectErrorMessage）
- [x] `e2e/page-objects/password-reset-page.ts`を作成
- [x] PasswordResetPageクラスを実装（goto, fillEmail, clickSubmit, expectConfirmationMessage, expectErrorMessage）
- [x] data-testid属性を使用した安定したセレクタを実装
- [x] 各Page Objectのユニットテストを作成

---

## タスク5: Playwrightフィクスチャの実装

**ステータス:** completed
**依存関係:** タスク3

### 説明

再利用可能なテストフィクスチャを実装する。

### 受け入れ基準

- [x] `e2e/fixtures/authenticated-user.ts`を作成
- [x] authenticatedPageフィクスチャを実装
- [x] testUserフィクスチャを実装
- [x] 自動ログインとクリーンアップを実装
- [x] `e2e/fixtures/test-game.ts`を作成
- [x] gameフィクスチャを実装
- [x] 自動ゲーム作成とクリーンアップを実装
- [x] `e2e/fixtures/test-data.ts`を作成
- [x] 各フィクスチャのユニットテストを作成

---

## タスク6: 認証フローのテスト実装

**ステータス:** completed
**依存関係:** タスク4, タスク5

### 説明

ユーザー登録、ログイン、ログアウトのE2Eテストを実装する。

### 受け入れ基準

- [x] `e2e/auth/registration.spec.ts`を作成
- [x] 有効なデータでの登録成功テストを実装
- [x] 無効なデータでの登録失敗テストを実装
- [x] 登録後のログインページへのリダイレクトを検証
- [x] `e2e/auth/login.spec.ts`を作成
- [x] 有効な認証情報でのログイン成功テストを実装
- [x] 無効な認証情報でのログイン失敗テストを実装
- [x] ログイン後のゲーム一覧ページへのリダイレクトを検証
- [x] ログアウト機能のテストを実装
- [x] 未認証でのアクセス制限テストを実装
- [x] 各テストケースが30秒以内に完了することを確認

---

## タスク7: パスワードリセットフローのテスト実装

**ステータス:** completed
**依存関係:** タスク4, タスク5

### 説明

パスワードリセット機能のE2Eテストを実装する。

### 受け入れ基準

- [x] `e2e/auth/password-reset.spec.ts`を作成
- [x] 有効なメールアドレスでのリセット要求テストを実装
- [x] 無効なメールアドレスでのリセット要求失敗テストを実装
- [x] 確認メッセージの表示を検証
- [x] 有効なリセットトークンでのパスワード変更テストを実装
- [x] 無効なリセットトークンでのエラーテストを実装
- [x] パスワード変更後のログインページへのリダイレクトを検証
- [x] 各テストケースが30秒以内に完了することを確認

---

## タスク8: ゲーム閲覧と参加フローのテスト実装

**ステータス:** completed
**依存関係:** タスク4, タスク5

### 説明

ゲーム一覧表示、ゲーム詳細表示、ゲーム参加のE2Eテストを実装する。

### 受け入れ基準

- [x] `e2e/game/game-list.spec.ts`を作成
- [x] ゲーム一覧表示テストを実装
- [x] 少なくとも1つのアクティブなゲームが表示されることを検証
- [x] ゲームカードのクリックでゲーム詳細に遷移することを検証
- [x] `e2e/game/game-detail.spec.ts`を作成
- [x] ゲーム詳細表示テストを実装
- [x] 盤面状態の表示を検証
- [x] 手の履歴の表示を検証
- [x] AIによる解説の表示を検証
- [x] `e2e/game/game-join.spec.ts`を作成
- [x] ゲーム参加ボタンのクリックテストを実装
- [x] 投票インターフェースへのアクセスを検証
- [x] 各テストケースが45秒以内に完了することを確認

---

## タスク9: 投票フローのテスト実装

**ステータス:** completed
**依存関係:** タスク4, タスク5

### 説明

次の一手候補への投票、候補の投稿のE2Eテストを実装する。

### 受け入れ基準

- [x] `e2e/voting/vote-submission.spec.ts`を作成
- [x] 次の一手候補の表示テストを実装
- [x] 候補の選択と投票送信テストを実装
- [x] 成功確認メッセージの表示を検証
- [x] 投票済み表示の検証
- [x] `e2e/voting/vote-validation.spec.ts`を作成
- [x] 同じ投票期間中の重複投票エラーテストを実装
- [x] 投票期間終了後の投票エラーテストを実装
- [x] `e2e/voting/candidate-submission.spec.ts`を作成
- [x] 新しい候補の投稿テストを実装
- [x] 候補の説明文表示を検証
- [x] 無効なデータでの候補投稿エラーテストを実装
- [x] 投稿した候補が一覧に表示されることを検証
- [x] 各テストケースが45秒以内に完了することを確認

---

## タスク10: プロフィール管理フローのテスト実装

**ステータス:** completed
**依存関係:** タスク4, タスク5

### 説明

プロフィール表示と更新のE2Eテストを実装する。

### 受け入れ基準

- [x] `e2e/profile/profile-management.spec.ts`を作成
- [x] プロフィール情報の表示テストを実装
- [x] 現在のプロフィール情報が表示されることを検証
- [x] 投票履歴の表示を検証
- [x] 有効なデータでのプロフィール更新テストを実装
- [x] 成功確認メッセージの表示を検証
- [x] 無効なデータでのプロフィール更新エラーテストを実装
- [x] エラーメッセージの表示を検証
- [x] 各テストケースが30秒以内に完了することを確認

---

## タスク11: ソーシャルシェアフローのテスト実装

**ステータス:** completed
**依存関係:** タスク4, タスク5

### 説明

ソーシャルシェア機能とOGP画像のE2Eテストを実装する。

### 受け入れ基準

- [x] `e2e/sharing/share-url.spec.ts`を作成
- [x] ゲーム詳細ページのシェアボタンテストを実装
- [x] シェアURLの生成を検証
- [x] 共有されたゲームURLへのアクセステストを実装
- [x] 正しいゲーム状態の表示を検証
- [x] 共有された候補URLへのアクセステストを実装
- [x] 正しい候補詳細の表示を検証
- [x] `e2e/sharing/ogp-validation.spec.ts`を作成
- [x] OGPメタタグの存在を検証
- [x] OGP画像URLの有効性を検証
- [x] 各テストケースが30秒以内に完了することを確認

---

## タスク12: エラーハンドリングのテスト実装

**ステータス:** completed
**依存関係:** タスク3, タスク4, タスク5

### 説明

エラーシナリオとエッジケースのE2Eテストを実装する。

### 受け入れ基準

- [x] `e2e/error-handling/network-errors.spec.ts`を作成
- [x] 投票中のネットワーク障害シミュレーションテストを実装
- [x] 適切なエラーメッセージの表示を検証
- [x] `e2e/error-handling/session-timeout.spec.ts`を作成
- [x] セッションタイムアウトシミュレーションテストを実装
- [x] ログインページへのリダイレクトを検証
- [x] `e2e/error-handling/validation-errors.spec.ts`を作成
- [x] 必須フィールドが欠けているフォーム送信テストを実装
- [x] バリデーションエラーメッセージの表示を検証
- [x] 存在しないゲームへのアクセステストを実装
- [x] 404エラーページの表示を検証
- [x] 各テストケースが30秒以内に完了することを確認

---

## タスク13: テストの安定性向上

**ステータス:** completed
**依存関係:** タスク6, タスク7, タスク8, タスク9, タスク10, タスク11, タスク12

### 説明

テストの信頼性と安定性を向上させる。

### 受け入れ基準

- [x] 明示的な待機を実装（適切なタイムアウト値）
- [x] ネットワークリクエストの完了待機を実装
- [x] 失敗したアサーションの再試行（最大3回）を実装
- [x] data-testid属性に基づく安定したセレクタを使用
- [x] ローディング状態の完了待機を実装
- [x] 動的コンテンツの読み込み待機を実装
- [x] フレーキーなテストを特定して修正
- [x] すべてのテストが3回連続で成功することを確認

---

## タスク14: クロスブラウザテストの実装

**ステータス:** completed
**依存関係:** タスク13

### 説明

Chromium、Firefox、WebKitでのクロスブラウザテストを実装する。

### 受け入れ基準

- [x] Chromiumブラウザでのテスト実行を確認
- [x] Firefoxブラウザでのテスト実行を確認
- [x] WebKitブラウザでのテスト実行を確認
- [x] 各ブラウザごとに個別のテストレポートを生成
- [x] ブラウザ固有の問題を特定して修正
- [x] すべてのブラウザでテストが成功することを確認

---

## タスク15: CI/CDパイプラインの統合

**ステータス:** completed
**依存関係:** タスク14

### 説明

GitHub ActionsにE2Eテストを統合する。

### 受け入れ基準

- [x] `.github/workflows/e2e-tests.yml`を作成
- [x] テスト環境のセットアップを実装
- [x] 環境変数の設定（BASE_URL、Cognito設定など）
- [x] Playwrightのインストールと設定
- [x] ヘッドレスモードでのテスト実行
- [x] 3つすべてのブラウザでのテスト実行
- [x] テストレポートのアーティファクトアップロード
- [x] スクリーンショットのアーティファクトアップロード
- [x] テスト失敗時の通知設定
- [x] 10分以内にテストスイート全体が完了することを確認

---

## タスク16: テストレポートの生成

**ステータス:** completed
**依存関係:** タスク14

### 説明

包括的なテストレポートを生成する。

### 受け入れ基準

- [x] HTMLレポートの生成を設定
- [x] 合格/不合格ステータスを表示
- [x] 実行時間を表示
- [x] 失敗時のスクリーンショットを含める
- [x] 失敗時のビデオ録画を含める（オプション）
- [x] ブラウザごとのレポートを生成
- [x] レポートをCI/CDアーティファクトとして保存
- [x] レポートの可読性を確認

---

## タスク17: パフォーマンス最適化

**ステータス:** completed
**依存関係:** タスク15

### 説明

テスト実行のパフォーマンスを最適化する。

### 受け入れ基準

- [x] 並列テスト実行を有効化
- [x] 独立したテストケースを特定
- [x] テストデータの作成を最適化
- [x] 不要な待機時間を削減
- [x] テストのタイムアウト設定を最適化
- [x] 完全なE2Eテストスイートが10分以内に完了することを確認
- [x] 単一の認証テストが30秒以内に完了することを確認
- [x] 単一の投票フローテストが45秒以内に完了することを確認

---

## タスク18: ドキュメントの作成

**ステータス:** completed
**依存関係:** タスク17

### 説明

E2Eテストのドキュメントを作成する。

### 受け入れ基準

- [x] `packages/web/e2e/README.md`を作成
- [x] テストの実行方法を記載
- [x] ローカル環境でのテスト実行手順を記載
- [x] CI/CD環境でのテスト実行手順を記載
- [x] テスト環境のセットアップ手順を記載
- [x] Page Object Modelsの使用方法を記載
- [x] フィクスチャの使用方法を記載
- [x] トラブルシューティングガイドを記載
- [x] 新しいテストの追加方法を記載
- [x] ベストプラクティスを記載

---

## タスク19: テストカバレッジの検証

**ステータス:** completed
**依存関係:** タスク17

### 説明

すべての要件がテストでカバーされていることを検証する。

### 受け入れ基準

- [x] 要件1（認証フロー）のすべての受け入れ基準がテストされていることを確認
- [x] 要件2（パスワードリセットフロー）のすべての受け入れ基準がテストされていることを確認
- [x] 要件3（ゲーム閲覧と参加フロー）のすべての受け入れ基準がテストされていることを確認
- [x] 要件4（投票フロー）のすべての受け入れ基準がテストされていることを確認
- [x] 要件5（プロフィール管理フロー）のすべての受け入れ基準がテストされていることを確認
- [x] 要件6（テスト実行環境）のすべての受け入れ基準がテストされていることを確認
- [x] 要件7（テストデータ管理）のすべての受け入れ基準がテストされていることを確認
- [x] 要件8（テスト実行パフォーマンス）のすべての受け入れ基準がテストされていることを確認
- [x] 要件9（クロスブラウザ互換性テスト）のすべての受け入れ基準がテストされていることを確認
- [x] 要件10（テストの信頼性と安定性）のすべての受け入れ基準がテストされていることを確認
- [x] 要件11（ソーシャルシェアフロー）のすべての受け入れ基準がテストされていることを確認
- [x] 要件12（エラーハンドリングとエッジケース）のすべての受け入れ基準がテストされていることを確認
- [x] カバレッジレポートを生成
- [x] 不足しているテストケースを特定して追加

---

## タスク20: 最終レビューとクリーンアップ

**ステータス:** completed
**依存関係:** タスク18, タスク19

### 説明

E2Eテストの最終レビューとコードクリーンアップを実施する。

### 受け入れ基準

- [x] すべてのテストが成功することを確認
- [x] コードレビューを実施
- [x] ESLintエラーを修正
- [x] Prettierでコードをフォーマット
- [x] 未使用のコードを削除
- [x] 未使用の依存関係を削除
- [x] コメントとドキュメントを更新
- [x] テストの可読性を向上
- [x] ベストプラクティスに従っていることを確認
- [x] 最終的な動作確認を実施
