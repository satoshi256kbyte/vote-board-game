# E2E Test Fixtures

このディレクトリには、E2Eテストで使用する再利用可能なPlaywrightフィクスチャが含まれています。

## 概要

フィクスチャは、テストの前後で自動的にセットアップとクリーンアップを行う仕組みです。テストデータの作成、ユーザーのログイン、テスト後のクリーンアップなどを自動化します。

## 利用可能なフィクスチャ

### 1. authenticatedUser

認証済みユーザーを提供するフィクスチャです。

#### 提供されるプロパティ

- `authenticatedPage`: ログイン済みのPageインスタンス
- `testUser`: テストユーザーの認証情報

#### 使用例

```typescript
import { authenticatedUser } from './fixtures/test-data';

authenticatedUser('should access profile page', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/profile');
  // ユーザーは既にログイン済み
  await expect(authenticatedPage.locator('h1')).toContainText('プロフィール');
});
```

#### testUserフィクスチャの使用例

ログインせずに認証情報のみが必要な場合:

```typescript
import { authenticatedUser } from './fixtures/test-data';

authenticatedUser('should login manually', async ({ testUser, page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', testUser.email);
  await page.fill('input[name="password"]', testUser.password);
  await page.click('button[type="submit"]');
});
```

### 2. testGame

テストゲームを提供するフィクスチャです。

#### 提供されるプロパティ

- `game`: アクティブなテストゲーム

#### 使用例

```typescript
import { testGame } from './fixtures/test-data';

testGame('should display game board', async ({ game, page }) => {
  await page.goto(`/games/${game.gameId}`);
  // ゲームは既にDynamoDBに作成済み
  await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
});
```

## フィクスチャの組み合わせ

複数のフィクスチャを組み合わせて使用できます:

```typescript
import { authenticatedUser } from './fixtures/authenticated-user';
import { testGame } from './fixtures/test-game';

const test = authenticatedUser.extend(testGame);

test('should vote on game', async ({ authenticatedPage, game }) => {
  await authenticatedPage.goto(`/games/${game.gameId}/vote`);
  // ユーザーはログイン済み、ゲームは作成済み
  await authenticatedPage.click('[data-testid="vote-button"]');
});
```

## 自動クリーンアップ

すべてのフィクスチャは、テスト完了後に自動的にクリーンアップを実行します:

- **authenticatedUser**: Cognitoからテストユーザーを削除
- **testGame**: DynamoDBからテストゲームと関連データを削除

クリーンアップは`finally`ブロックで実行されるため、テストが失敗してもクリーンアップは必ず実行されます。

## エラーハンドリング

フィクスチャは以下のエラーを適切に処理します:

1. **セットアップエラー**: テストユーザーやゲームの作成に失敗した場合、エラーをスローしてテストを失敗させます
2. **クリーンアップエラー**: クリーンアップに失敗した場合、エラーをログに記録しますが、テストは失敗させません

## ベストプラクティス

### 1. 適切なフィクスチャを選択

- ログインが必要な場合: `authenticatedPage`を使用
- 認証情報のみが必要な場合: `testUser`を使用
- ゲームデータが必要な場合: `game`を使用

### 2. フィクスチャの組み合わせ

複数のフィクスチャが必要な場合は、`extend`を使用して組み合わせます:

```typescript
const test = authenticatedUser.extend(testGame);
```

### 3. 環境変数の設定

フィクスチャは以下の環境変数を必要とします:

- `USER_POOL_ID`: Cognito User Pool ID
- `AWS_REGION`: AWSリージョン (デフォルト: ap-northeast-1)
- `DYNAMODB_TABLE_NAME`: DynamoDBテーブル名

これらは`.env.local`または環境変数として設定してください。

## テスト

フィクスチャのユニットテストは以下のコマンドで実行できます:

```bash
pnpm vitest run --config vitest.config.e2e-helpers.ts
```

## ファイル構成

```
fixtures/
├── authenticated-user.ts       # 認証済みユーザーフィクスチャ
├── authenticated-user.test.ts  # ユニットテスト
├── test-game.ts                # テストゲームフィクスチャ
├── test-game.test.ts           # ユニットテスト
├── test-data.ts                # すべてのフィクスチャをエクスポート
├── test-data.test.ts           # エクスポートのテスト
└── README.md                   # このファイル
```

## トラブルシューティング

### テストユーザーの作成に失敗する

- `USER_POOL_ID`環境変数が正しく設定されているか確認
- Cognitoサービスが利用可能か確認
- AWS認証情報が正しく設定されているか確認

### テストゲームの作成に失敗する

- `DYNAMODB_TABLE_NAME`環境変数が正しく設定されているか確認
- DynamoDBテーブルが存在するか確認
- AWS認証情報が正しく設定されているか確認

### クリーンアップが失敗する

クリーンアップの失敗はテストを失敗させませんが、リソースが残る可能性があります。定期的に手動でクリーンアップすることを推奨します。

## 参考資料

- [Playwright Fixtures](https://playwright.dev/docs/test-fixtures)
- [E2E Helpers README](../helpers/README.md)
- [E2E Testing Design Document](../../../.kiro/specs/16-e2e-testing-main-flows/design.md)
