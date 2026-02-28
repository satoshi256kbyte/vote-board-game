# Page Object Models

このディレクトリには、各画面のPage Object Model (POM)が含まれます。

## Page Objects

- `login-page.ts` - ログインページ
- `registration-page.ts` - 登録ページ
- `password-reset-page.ts` - パスワードリセットページ
- `game-list-page.ts` - ゲーム一覧ページ
- `game-detail-page.ts` - ゲーム詳細ページ
- `voting-page.ts` - 投票ページ
- `profile-page.ts` - プロフィールページ

## 設計原則

- 各Page Objectは画面固有のセレクタとアクションをカプセル化
- data-testid属性を使用した安定したセレクタ
- 明示的な待機とアサーションメソッド
- 再利用可能で保守しやすいAPI

## 使用方法

### 基本的な使い方

```typescript
import { test } from '@playwright/test';
import { LoginPage } from './page-objects';

test('ユーザーがログインできる', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.login('user@example.com', 'password123');
  await loginPage.expectRedirectToGameList();
});
```

### 複数のPage Objectを使用

```typescript
import { test } from '@playwright/test';
import { LoginPage, GameListPage, GameDetailPage } from './page-objects';

test('ログイン後にゲームを閲覧できる', async ({ page }) => {
  // ログイン
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('user@example.com', 'password123');

  // ゲーム一覧
  const gameListPage = new GameListPage(page);
  await gameListPage.expectAtLeastOneGame();
  const games = await gameListPage.getActiveGames();

  // ゲーム詳細
  const gameDetailPage = new GameDetailPage(page);
  await gameDetailPage.goto(games[0]);
  await gameDetailPage.expectBoardStateVisible();
});
```

## Page Object API

### LoginPage

**ナビゲーション:**

- `goto()` - ログインページに移動

**アクション:**

- `fillEmail(email: string)` - メールアドレスを入力
- `fillPassword(password: string)` - パスワードを入力
- `clickSubmit()` - 送信ボタンをクリック
- `login(email: string, password: string)` - ログイン処理を実行
- `clickForgotPassword()` - パスワードを忘れた場合のリンクをクリック

**アサーション:**

- `expectErrorMessage(message: string)` - エラーメッセージを検証
- `expectRedirectToGameList()` - ゲーム一覧へのリダイレクトを検証

### RegistrationPage

**ナビゲーション:**

- `goto()` - 登録ページに移動

**アクション:**

- `fillEmail(email: string)` - メールアドレスを入力
- `fillPassword(password: string)` - パスワードを入力
- `fillConfirmPassword(password: string)` - パスワード確認を入力
- `clickSubmit()` - 送信ボタンをクリック
- `register(email: string, password: string)` - 登録処理を実行

**アサーション:**

- `expectErrorMessage(message: string)` - エラーメッセージを検証
- `expectRedirectToLogin()` - ログインページへのリダイレクトを検証

### GameListPage

**ナビゲーション:**

- `goto()` - ゲーム一覧ページに移動

**アクション:**

- `clickGame(gameId: string)` - ゲームカードをクリック
- `getActiveGames()` - アクティブなゲームIDのリストを取得

**アサーション:**

- `expectAtLeastOneGame()` - 少なくとも1つのゲームが表示されることを検証
- `expectGameVisible(gameId: string)` - 特定のゲームが表示されることを検証

### GameDetailPage

**ナビゲーション:**

- `goto(gameId: string)` - ゲーム詳細ページに移動

**アクション:**

- `clickJoinGame()` - ゲーム参加ボタンをクリック
- `clickShare()` - シェアボタンをクリック
- `getShareUrl()` - シェアURLを取得

**アサーション:**

- `expectBoardStateVisible()` - 盤面が表示されることを検証
- `expectMoveHistoryVisible()` - 手の履歴が表示されることを検証
- `expectAICommentaryVisible()` - AI解説が表示されることを検証
- `expectJoinButtonVisible()` - 参加ボタンが表示されることを検証

### VotingPage

**ナビゲーション:**

- `goto(gameId: string)` - 投票ページに移動

**アクション:**

- `selectCandidate(candidateId: string)` - 候補を選択
- `submitVote()` - 投票を送信
- `vote(candidateId: string)` - 候補を選択して投票
- `fillCandidateDescription(description: string)` - 候補の説明を入力
- `submitNewCandidate(description: string)` - 新しい候補を投稿

**アサーション:**

- `expectCandidatesVisible()` - 候補一覧が表示されることを検証
- `expectCandidateDescription(candidateId: string, description: string)` - 候補の説明を検証
- `expectSuccessMessage()` - 成功メッセージを検証
- `expectErrorMessage(message: string)` - エラーメッセージを検証
- `expectCandidateInList(description: string)` - 候補が一覧に表示されることを検証

### ProfilePage

**ナビゲーション:**

- `goto()` - プロフィールページに移動

**アクション:**

- `fillDisplayName(name: string)` - 表示名を入力
- `submitUpdate()` - 更新を送信
- `updateProfile(data: ProfileData)` - プロフィールを更新

**アサーション:**

- `expectProfileDataVisible(data: ProfileData)` - プロフィールデータが表示されることを検証
- `expectVotingHistoryVisible()` - 投票履歴が表示されることを検証
- `expectSuccessMessage()` - 成功メッセージを検証
- `expectErrorMessage(message: string)` - エラーメッセージを検証

### PasswordResetPage

**ナビゲーション:**

- `goto()` - パスワードリセットページに移動

**アクション:**

- `fillEmail(email: string)` - メールアドレスを入力
- `clickSubmit()` - 送信ボタンをクリック

**アサーション:**

- `expectConfirmationMessage()` - 確認メッセージを検証
- `expectErrorMessage(message: string)` - エラーメッセージを検証

## data-testid 属性

各Page Objectは以下のdata-testid属性を使用します:

### ログインページ

- `login-email-input` - メールアドレス入力
- `login-password-input` - パスワード入力
- `login-submit-button` - 送信ボタン
- `login-forgot-password-link` - パスワードを忘れた場合のリンク
- `login-error-message` - エラーメッセージ

### 登録ページ

- `registration-email-input` - メールアドレス入力
- `registration-password-input` - パスワード入力
- `registration-confirm-password-input` - パスワード確認入力
- `registration-submit-button` - 送信ボタン
- `registration-error-message` - エラーメッセージ

### ゲーム一覧ページ

- `game-card-{gameId}` - ゲームカード

### ゲーム詳細ページ

- `game-board` - ゲーム盤面
- `game-move-history` - 手の履歴
- `game-ai-commentary` - AI解説
- `game-join-button` - 参加ボタン
- `game-share-button` - シェアボタン
- `game-share-url` - シェアURL

### 投票ページ

- `vote-candidates-list` - 候補一覧
- `vote-candidate-{candidateId}` - 候補
- `vote-submit-button` - 投票送信ボタン
- `vote-candidate-description-input` - 候補説明入力
- `vote-submit-candidate-button` - 候補投稿ボタン
- `vote-success-message` - 成功メッセージ
- `vote-error-message` - エラーメッセージ

### プロフィールページ

- `profile-display-name` - 表示名
- `profile-display-name-input` - 表示名入力
- `profile-submit-button` - 更新ボタン
- `profile-voting-history` - 投票履歴
- `profile-success-message` - 成功メッセージ
- `profile-error-message` - エラーメッセージ

### パスワードリセットページ

- `password-reset-email-input` - メールアドレス入力
- `password-reset-submit-button` - 送信ボタン
- `password-reset-confirmation-message` - 確認メッセージ
- `password-reset-error-message` - エラーメッセージ

## テスト

各Page Objectにはユニットテストが含まれています:

```bash
pnpm vitest --config vitest.config.e2e-helpers.ts --run
```
