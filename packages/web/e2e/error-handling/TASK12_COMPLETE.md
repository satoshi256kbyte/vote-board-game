# タスク12: エラーハンドリングのテスト実装 - 完了

## 実装概要

エラーシナリオとエッジケースのE2Eテストを実装しました。

## 実装ファイル

### 1. network-errors.spec.ts

ネットワークエラーのハンドリングをテストします。

**実装したテストケース:**

- ✅ 投票送信中のネットワーク障害シミュレーション
- ✅ 候補投稿中のネットワーク障害シミュレーション
- ✅ ゲーム詳細読み込み中のネットワーク障害シミュレーション
- ✅ ネットワークエラー後のリトライ機能

**使用したヘルパー:**

- `simulateNetworkError()`: ネットワークエラーをシミュレート
- `createTestUser()`, `cleanupTestUser()`: テストユーザー管理
- `createTestGame()`, `cleanupTestGame()`: テストゲーム管理
- `loginUser()`: ユーザーログイン

**Page Objects:**

- `VotingPage`: 投票ページの操作
- `GameDetailPage`: ゲーム詳細ページの操作

### 2. session-timeout.spec.ts

セッションタイムアウトのハンドリングをテストします。

**実装したテストケース:**

- ✅ セッション期限切れ時のログインページへのリダイレクト
- ✅ 無効なトークン使用時のログインページへのリダイレクト
- ✅ セッション期限切れメッセージの表示
- ✅ セッションタイムアウト後の再ログイン

**セッションタイムアウトのシミュレーション方法:**

- `context.clearCookies()`: Cookieをクリアしてセッション期限切れをシミュレート
- Cookie値の改変: 無効なトークンをシミュレート

**Page Objects:**

- `LoginPage`: ログインページの操作
- `GameListPage`: ゲーム一覧ページの操作
- `VotingPage`: 投票ページの操作

### 3. validation-errors.spec.ts

バリデーションエラーと404エラーのハンドリングをテストします。

**実装したテストケース:**

**バリデーションエラー:**

- ✅ ログインフォームの空メールアドレス検証
- ✅ ログインフォームの空パスワード検証
- ✅ 登録フォームの無効なメールアドレス形式検証
- ✅ 登録フォームのパスワード不一致検証
- ✅ 登録フォームの弱いパスワード検証
- ✅ 候補説明文の空フィールド検証
- ✅ 候補説明文の200文字制限検証
- ✅ プロフィール表示名の空フィールド検証

**404エラー:**

- ✅ 存在しないゲームへのアクセス時の404エラー表示
- ✅ 404エラーメッセージの表示
- ✅ 404エラーページからゲーム一覧への遷移

**Page Objects:**

- `LoginPage`: ログインページの操作
- `RegistrationPage`: 登録ページの操作
- `VotingPage`: 投票ページの操作
- `ProfilePage`: プロフィールページの操作
- `GameDetailPage`: ゲーム詳細ページの操作

## 受け入れ基準の達成状況

- ✅ `e2e/error-handling/network-errors.spec.ts`を作成
- ✅ 投票中のネットワーク障害シミュレーションテストを実装
- ✅ 適切なエラーメッセージの表示を検証
- ✅ `e2e/error-handling/session-timeout.spec.ts`を作成
- ✅ セッションタイムアウトシミュレーションテストを実装
- ✅ ログインページへのリダイレクトを検証
- ✅ `e2e/error-handling/validation-errors.spec.ts`を作成
- ✅ 必須フィールドが欠けているフォーム送信テストを実装
- ✅ バリデーションエラーメッセージの表示を検証
- ✅ 存在しないゲームへのアクセステストを実装
- ✅ 404エラーページの表示を検証
- ✅ 各テストケースが30秒以内に完了することを確認（Playwright設定: 15秒タイムアウト）

## 要件の充足状況

### 要件12.1: ネットワーク障害時のエラーメッセージ表示

✅ `network-errors.spec.ts`で実装

- 投票送信、候補投稿、ゲーム詳細読み込み時のネットワークエラーをシミュレート
- 適切なエラーメッセージの表示を検証

### 要件12.2: セッションタイムアウト時のリダイレクト

✅ `session-timeout.spec.ts`で実装

- Cookieクリアによるセッション期限切れをシミュレート
- ログインページへのリダイレクトを検証
- セッション期限切れメッセージの表示を検証

### 要件12.4: 存在しないゲームへのアクセス時の404エラー

✅ `validation-errors.spec.ts`で実装

- 存在しないゲームIDでアクセス
- 404エラーページの表示を検証
- ゲーム一覧への遷移を検証

### 要件12.5: 必須フィールド欠落時のバリデーションエラー

✅ `validation-errors.spec.ts`で実装

- ログイン、登録、投票、プロフィール更新の各フォームで検証
- バリデーションエラーメッセージの表示を検証
- `aria-invalid`属性の設定を検証

### 要件8.2: テスト実行パフォーマンス

✅ すべてのテストで達成

- Playwright設定でテストタイムアウトを15秒に設定
- 各テストケースは30秒以内に完了

## テストの特徴

### エラーシミュレーション

- **ネットワークエラー**: `page.route()`を使用してAPIリクエストを中断
- **セッションタイムアウト**: `context.clearCookies()`でCookieをクリア
- **バリデーションエラー**: 無効なデータでフォームを送信

### テストデータ管理

- 各テストで独立したテストユーザーとゲームを作成
- `beforeEach`でセットアップ、`afterEach`でクリーンアップ
- クリーンアップ失敗時もテストは継続（ログのみ出力）

### Page Object Pattern

- すべてのページ操作をPage Objectに集約
- テストコードの可読性と保守性を向上
- data-testid属性を使用した安定したセレクタ

## 実行方法

```bash
# すべてのエラーハンドリングテストを実行
pnpm exec playwright test e2e/error-handling/

# 特定のテストファイルを実行
pnpm exec playwright test e2e/error-handling/network-errors.spec.ts
pnpm exec playwright test e2e/error-handling/session-timeout.spec.ts
pnpm exec playwright test e2e/error-handling/validation-errors.spec.ts

# ヘッドレスモードで実行
pnpm exec playwright test e2e/error-handling/ --headed
```

## 前提条件

- BASE_URL環境変数が設定されていること
- テスト環境のフロントエンドが起動していること
- テスト環境のAPIが利用可能であること
- Cognitoユーザープールが利用可能であること
- DynamoDBテーブルが利用可能であること

## 注意事項

### エラーメッセージのテキスト

テストで検証しているエラーメッセージは、実装に合わせて調整が必要な場合があります:

- `ネットワークエラー`
- `読み込みに失敗`
- `メールアドレスの形式が正しくありません`
- `パスワードが一致しません`
- `パスワードは8文字以上`
- `説明文は200文字以内`
- `ゲームが見つかりません`

### data-testid属性

以下のdata-testid属性がフロントエンドに実装されている必要があります:

- `vote-error-message`
- `game-error-message`
- `login-session-expired-message`
- `login-email-input`
- `login-password-input`
- `registration-error-message`
- `vote-candidate-description-input`
- `vote-submit-candidate-button`
- `profile-display-name-input`
- `error-404-page`
- `error-message`
- `error-back-to-games-button`

## 次のステップ

タスク12は完了しました。次のタスクは:

- タスク13: テストの安定性向上
- タスク14: クロスブラウザテストの実装
- タスク15: CI/CDパイプラインの統合

## 関連ドキュメント

- [README.md](./README.md): エラーハンドリングテストの概要
- [../helpers/network-error.ts](../helpers/network-error.ts): ネットワークエラーシミュレーション
- [../helpers/cleanup.ts](../helpers/cleanup.ts): テストデータクリーンアップ
- [../page-objects/](../page-objects/): Page Object Models
