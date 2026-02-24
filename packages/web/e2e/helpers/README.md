# E2E Test Helpers

このディレクトリには、E2Eテストで使用する共通ヘルパー関数が含まれています。

## ファイル一覧

### test-user.ts

テストユーザーの生成機能を提供します。

- `generateTestUser()`: 一意のメールアドレス、セキュアなパスワード、ユーザー名を持つテストユーザーを生成

### cleanup.ts

テストユーザーのクリーンアップ機能を提供します。

- `cleanupTestUser(email)`: Cognitoからテストユーザーを削除

### network-error.ts

ネットワークエラーのハンドリング機能を提供します。

- `isNetworkError(error)`: エラーがネットワークエラーかどうかを判定
- `formatNetworkError(error)`: ネットワークエラーをフォーマット
- `navigateWithErrorHandling(page, url)`: エラーハンドリング付きでページ遷移

### cognito-availability.ts

Cognitoサービスの可用性チェック機能を提供します。

- `isCognitoAvailable()`: Cognitoサービスが利用可能かチェック
- `skipIfCognitoUnavailable(testInfo)`: Cognitoが利用不可の場合テストをスキップ

### existing-user.ts

既存ユーザーエラーのハンドリング機能を提供します。

- `isUserAlreadyExistsError(error)`: エラーがユーザー既存エラーかどうかを判定
- `registerWithRetry(page, testUser, maxRetries)`: ユーザーが既に存在する場合、削除してリトライする登録機能

## 使用例

### 基本的なテストユーザーの生成とクリーンアップ

```typescript
import { generateTestUser, cleanupTestUser } from '../helpers';

test('should register user', async ({ page }) => {
  const testUser = generateTestUser();

  try {
    // テスト実行
    await page.goto('/register');
    await page.fill('input[name="email"]', testUser.email);
    // ...
  } finally {
    await cleanupTestUser(testUser.email);
  }
});
```

### 既存ユーザーエラーのハンドリング

```typescript
import { generateTestUser, registerWithRetry, cleanupTestUser } from '../helpers';

test('should handle existing user', async ({ page }) => {
  const testUser = generateTestUser();

  try {
    await page.goto('/register');

    // ユーザーが既に存在する場合、自動的に削除してリトライ
    await registerWithRetry(page, testUser, 1);

    // 登録成功を確認
    await page.waitForURL('/');
  } finally {
    await cleanupTestUser(testUser.email);
  }
});
```

### Cognitoの可用性チェック

```typescript
import { skipIfCognitoUnavailable } from '../helpers';

test('should test cognito feature', async ({ page }, testInfo) => {
  // Cognitoが利用不可の場合、テストをスキップ
  await skipIfCognitoUnavailable(testInfo);

  // Cognitoを使用するテスト
  // ...
});
```

### ネットワークエラーハンドリング

```typescript
import { navigateWithErrorHandling } from '../helpers';

test('should navigate with error handling', async ({ page }) => {
  // ネットワークエラーを適切にハンドリングしてページ遷移
  await navigateWithErrorHandling(page, '/login');

  // テスト続行
  // ...
});
```

## 要件との対応

- **Requirements 4.1-4.3**: `generateTestUser()` - テストユーザー生成
- **Requirements 4.4-4.5, 8.2, 10.2**: `cleanupTestUser()` - テストユーザークリーンアップ
- **Requirements 7.1, 7.4**: `navigateWithErrorHandling()` - ネットワークエラーハンドリング
- **Requirements 7.2**: `skipIfCognitoUnavailable()` - Cognito可用性チェック
- **Requirements 7.3**: `registerWithRetry()` - 既存ユーザーエラーハンドリング
