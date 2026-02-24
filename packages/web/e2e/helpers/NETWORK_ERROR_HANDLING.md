# Network Error Handling

このドキュメントは、E2Eテストにおけるネットワークエラーハンドリングの実装について説明します。

## 要件

- **Requirement 7.1**: アプリケーションが到達不可能な場合、ネットワークエラーメッセージでテストを失敗させる
- **Requirement 7.4**: ページ読み込みがタイムアウトした場合、スクリーンショットを保存してテストを失敗させる

## 実装概要

### 1. Playwright組み込み機能

Playwrightには以下の機能が組み込まれており、`playwright.config.ts`で設定済みです:

```typescript
{
  timeout: 30 * 1000,              // テストタイムアウト: 30秒
  navigationTimeout: 30 * 1000,    // ナビゲーションタイムアウト: 30秒
  screenshot: 'only-on-failure',   // 失敗時のみスクリーンショット保存
  trace: 'on-first-retry',         // 最初のリトライ時にトレース記録
  retries: isCI ? 2 : 0,           // CI環境では2回リトライ
}
```

これらの設定により、以下が自動的に処理されます:

- ページ読み込みが30秒でタイムアウト
- テスト失敗時に自動的にスクリーンショット保存
- CI環境では失敗したテストを2回まで自動リトライ

### 2. カスタムエラーハンドリング

より明確なエラーメッセージを提供するため、以下のヘルパー関数を実装しました:

#### `isNetworkError(error: unknown): boolean`

エラーがネットワーク関連かどうかを判定します。

検出するエラーパターン:

- `net::ERR_CONNECTION_REFUSED`
- `net::ERR_NAME_NOT_RESOLVED`
- `net::ERR_INTERNET_DISCONNECTED`
- `net::ERR_CONNECTION_TIMED_OUT`
- `ECONNREFUSED`
- `ENOTFOUND`
- `ETIMEDOUT`
- `Navigation timeout`
- `page.goto: Timeout`

#### `formatNetworkError(error: unknown, url: string): string`

ネットワークエラーをユーザーフレンドリーなメッセージにフォーマットします。

出力例:

```
❌ Network Error: Application is unreachable

URL: https://example.com

Possible causes:
  • Application is not deployed or not running
  • Incorrect BASE_URL environment variable
  • Network connectivity issues
  • CloudFront distribution is not accessible

Original error: net::ERR_CONNECTION_REFUSED
```

#### `navigateWithErrorHandling(page: Page, url: string): Promise<void>`

ネットワークエラーハンドリング付きでページナビゲーションを実行します。

使用例:

```typescript
import { navigateWithErrorHandling } from './helpers';

test('should navigate to login page', async ({ page }) => {
  await navigateWithErrorHandling(page, '/login');
  // ネットワークエラーが発生した場合、明確なエラーメッセージが表示される
});
```

## 使用方法

### 基本的な使用方法

通常のPlaywrightテストでは、特別な設定は不要です。Playwrightの組み込み機能が自動的に動作します:

```typescript
test('should load home page', async ({ page }) => {
  await page.goto('/');
  // タイムアウトやネットワークエラーは自動的に処理される
  // 失敗時はスクリーンショットが自動保存される
});
```

### より詳細なエラーメッセージが必要な場合

ネットワークエラーに対してより詳細なエラーメッセージを提供したい場合は、ヘルパー関数を使用します:

```typescript
import { navigateWithErrorHandling } from './helpers';

test('should navigate with detailed error handling', async ({ page }) => {
  await navigateWithErrorHandling(page, '/login');
  // ネットワークエラー時に詳細なトラブルシューティング情報が表示される
});
```

### エラーの手動処理

特定のエラーハンドリングロジックが必要な場合:

```typescript
import { isNetworkError, formatNetworkError } from './helpers';

test('should handle network errors manually', async ({ page }) => {
  try {
    await page.goto('/');
  } catch (error) {
    if (isNetworkError(error)) {
      console.error(formatNetworkError(error, page.url()));
      // カスタムエラー処理
    }
    throw error;
  }
});
```

## テスト

ネットワークエラーハンドリングの動作を検証するテストは `e2e/network-error.spec.ts` にあります:

```bash
# ネットワークエラーハンドリングのテストを実行
pnpm test:e2e e2e/network-error.spec.ts
```

## トラブルシューティング

### アプリケーションが到達不可能

エラーメッセージ:

```
❌ Network Error: Application is unreachable
```

確認事項:

1. `BASE_URL` 環境変数が正しく設定されているか
2. アプリケーションがデプロイされているか
3. CloudFrontディストリビューションがアクティブか
4. ネットワーク接続が正常か

### タイムアウトエラー

エラーメッセージ:

```
Navigation timeout of 30000ms exceeded
```

対処方法:

1. アプリケーションの応答速度を確認
2. 必要に応じて `playwright.config.ts` のタイムアウト値を調整
3. ネットワーク遅延の原因を調査

### スクリーンショットが保存されない

確認事項:

1. `playwright.config.ts` で `screenshot: 'only-on-failure'` が設定されているか
2. テストが実際に失敗しているか（成功時はスクリーンショットは保存されない）
3. 書き込み権限があるか

## 参考資料

- [Playwright Configuration](https://playwright.dev/docs/test-configuration)
- [Playwright Timeouts](https://playwright.dev/docs/test-timeouts)
- [Playwright Screenshots](https://playwright.dev/docs/screenshots)
