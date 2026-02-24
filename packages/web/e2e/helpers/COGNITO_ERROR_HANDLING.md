# Cognito Error Handling

このドキュメントは、E2EテストにおけるCognitoサービスエラーハンドリングの実装について説明します。

## 要件

- **Requirement 7.2**: Cognitoサービスが利用できない場合、警告を表示してテストをスキップする

## 実装概要

### 1. グローバルセットアップ

Playwrightのグローバルセットアップ機能を使用して、テスト実行前にCognitoの可用性をチェックします。

```typescript
// e2e/global-setup.ts
export default async function globalSetup() {
  const cognitoAvailable = await isCognitoAvailable();

  if (!cognitoAvailable) {
    console.warn(formatCognitoUnavailableWarning());
  }
}
```

設定は `playwright.config.ts` で有効化されています:

```typescript
{
  globalSetup: './e2e/global-setup.ts',
}
```

### 2. ヘルパー関数

#### `isCognitoAvailable(): Promise<boolean>`

Cognitoサービスが利用可能かどうかをチェックします。

チェック内容:

- `USER_POOL_ID` 環境変数が設定されているか
- Cognito APIへの接続が可能か（ListUserPoolsコマンドを実行）

戻り値:

- `true`: Cognitoが利用可能
- `false`: Cognitoが利用不可

#### `formatCognitoUnavailableWarning(): string`

Cognito利用不可時の警告メッセージをフォーマットします。

出力例:

```
⚠️  Warning: Cognito service is unavailable

Possible causes:
  • USER_POOL_ID environment variable is not set
  • AWS credentials are not configured
  • Cognito service is experiencing issues
  • Network connectivity problems

Tests requiring Cognito will be skipped.
```

#### `skipIfCognitoUnavailable(testInfo): Promise<void>`

テストの開始時にCognitoの可用性をチェックし、利用不可の場合はテストをスキップします。

## 使用方法

### 方法1: テスト内で明示的にスキップ

個別のテストでCognitoの可用性をチェックし、利用不可の場合はスキップします:

```typescript
import { test, expect } from '@playwright/test';
import { skipIfCognitoUnavailable, generateTestUser } from '../helpers';

test('should register user', async ({ page }, testInfo) => {
  // Cognitoが利用不可の場合はテストをスキップ
  await skipIfCognitoUnavailable(testInfo);

  const testUser = generateTestUser();
  // テストの実装...
});
```

### 方法2: describe全体でスキップ

テストスイート全体でCognitoの可用性をチェックする場合:

```typescript
import { test, expect } from '@playwright/test';
import { isCognitoAvailable } from '../helpers';

test.describe('Authentication Tests', () => {
  test.beforeAll(async () => {
    const available = await isCognitoAvailable();
    test.skip(!available, 'Cognito service is unavailable');
  });

  test('should register user', async ({ page }) => {
    // テストの実装...
  });

  test('should login user', async ({ page }) => {
    // テストの実装...
  });
});
```

### 方法3: グローバルセットアップのみ（推奨）

現在の実装では、グローバルセットアップでCognitoの可用性をチェックし、警告を表示します。
個別のテストでは、Cognitoエラーが発生した場合に自動的に失敗します。

この方法の利点:

- テストコードがシンプル
- エラーメッセージが明確
- CI/CDパイプラインで問題を早期発見

## テスト実行時の動作

### Cognitoが利用可能な場合

```bash
$ pnpm test:e2e

🔍 Checking service availability...

✅ Cognito service is available

Running 10 tests...
✓ should register user (2.5s)
✓ should login user (1.8s)
...
```

### Cognitoが利用不可の場合

```bash
$ pnpm test:e2e

🔍 Checking service availability...

⚠️  Warning: Cognito service is unavailable

Possible causes:
  • USER_POOL_ID environment variable is not set
  • AWS credentials are not configured
  • Cognito service is experiencing issues
  • Network connectivity problems

Tests requiring Cognito will be skipped.

⚠️  Some tests may be skipped due to Cognito unavailability

Running 10 tests...
⊘ should register user (skipped)
⊘ should login user (skipped)
...
```

## トラブルシューティング

### USER_POOL_ID が設定されていない

エラー:

```
[Cognito] USER_POOL_ID environment variable is not set
```

対処方法:

1. `.env.local` ファイルに `USER_POOL_ID` を設定
2. CI/CD環境では GitHub Secrets に設定

### AWS認証情報が設定されていない

エラー:

```
[Cognito] Service is unavailable: CredentialsProviderError
```

対処方法:

1. ローカル環境: `aws configure` でAWS CLIを設定
2. CI/CD環境: GitHub Secrets に `AWS_ACCESS_KEY_ID` と `AWS_SECRET_ACCESS_KEY` を設定

### Cognitoサービスがダウンしている

エラー:

```
[Cognito] Service is unavailable: ServiceUnavailableException
```

対処方法:

1. AWS Service Health Dashboard を確認
2. 一時的な問題の場合は時間をおいて再実行
3. リージョンを変更（`AWS_REGION` 環境変数）

## 参考資料

- [Playwright Global Setup](https://playwright.dev/docs/test-global-setup-teardown)
- [Playwright Test Skip](https://playwright.dev/docs/api/class-test#test-skip)
- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
