# クロスブラウザテストガイド

## 概要

このドキュメントは、投票ボードゲームアプリケーションのE2Eテストをクロスブラウザ環境で実行するためのガイドです。

## サポートブラウザ

以下の3つのブラウザでテストを実行します：

1. **Chromium** - Chrome、Edge、その他Chromiumベースのブラウザ
2. **Firefox** - Mozilla Firefox
3. **WebKit** - Safari（macOS/iOS）

## ブラウザのインストール

### すべてのブラウザをインストール

```bash
pnpm playwright:install:all
```

### 個別にインストール

```bash
# Chromiumのみ
npx playwright install --with-deps chromium

# Firefoxのみ
npx playwright install --with-deps firefox

# WebKitのみ
npx playwright install --with-deps webkit
```

## テストの実行

### すべてのブラウザで実行

```bash
# ヘッドレスモード（デフォルト）
pnpm test:e2e

# ビジュアルモード
pnpm test:e2e:headed
```

### 個別のブラウザで実行

```bash
# Chromium
pnpm test:e2e:chromium

# Firefox
pnpm test:e2e:firefox

# WebKit
pnpm test:e2e:webkit
```

### クロスブラウザテストスクリプト

すべてのブラウザで順次テストを実行し、個別のレポートを生成：

```bash
pnpm test:e2e:all-browsers
```

## テストレポート

### HTMLレポートの表示

```bash
pnpm test:e2e:report
```

### レポートの場所

- **統合レポート**: `playwright-report/index.html`
- **ブラウザ別レポート**: CI/CD環境で生成される場合、各ブラウザごとに個別のアーティファクトとして保存

### レポートに含まれる情報

- テスト実行結果（合格/不合格）
- 実行時間
- 失敗時のスクリーンショット
- 失敗時のトレース（デバッグ用）
- ブラウザ情報

## CI/CD環境での実行

### GitHub Actions

`.github/workflows/e2e-tests.yml`ワークフローが自動的に：

1. すべてのブラウザでテストを並列実行
2. 各ブラウザごとに個別のレポートを生成
3. 失敗時のスクリーンショットをアップロード
4. テスト結果をアーティファクトとして保存

### 環境変数

CI/CD環境では以下の環境変数を設定してください：

```bash
BASE_URL=http://localhost:3000
AWS_REGION=ap-northeast-1
COGNITO_USER_POOL_ID=your-test-user-pool-id
COGNITO_CLIENT_ID=your-test-client-id
```

## ブラウザ固有の問題

### Chromium

- **特徴**: 最も高速で安定
- **注意点**: Chrome DevToolsプロトコルに依存する機能は他のブラウザで動作しない可能性

### Firefox

- **特徴**: Geckoエンジン、独自のレンダリング
- **注意点**:
  - CSSの一部プロパティの挙動が異なる場合がある
  - タイミング関連のテストで微妙な差異が出る可能性

### WebKit

- **特徴**: Safariと同じエンジン、macOS/iOS環境を再現
- **注意点**:
  - 日付/時刻フォーマットがブラウザ固有
  - 一部のWeb APIの実装が異なる場合がある
  - Linuxでの実行は完全なSafari互換性を保証しない

## トラブルシューティング

### テストが特定のブラウザでのみ失敗する

1. **スクリーンショットを確認**

   ```bash
   # 失敗したブラウザで再実行（ビジュアルモード）
   pnpm exec playwright test --project=firefox --headed
   ```

2. **ブラウザ固有のセレクタ問題**
   - `data-testid`属性を使用しているか確認
   - CSSセレクタがブラウザ固有でないか確認

3. **タイミング問題**
   - 明示的な待機を追加
   - `waitForLoadState('networkidle')`を使用

### WebKitでのみ失敗する

WebKitは他のブラウザと異なる挙動を示すことがあります：

```typescript
// 悪い例: ブラウザ固有の機能に依存
await page.evaluate(() => window.chrome.runtime);

// 良い例: 標準的なWeb APIを使用
await page.evaluate(() => navigator.userAgent);
```

### タイムアウトエラー

ブラウザによって実行速度が異なる場合：

```typescript
// playwright.config.tsでブラウザごとにタイムアウトを調整
{
  name: 'webkit',
  use: {
    ...devices['Desktop Safari'],
    navigationTimeout: 45 * 1000, // WebKitは少し長めに
  },
}
```

## ベストプラクティス

### 1. ブラウザ非依存のコードを書く

```typescript
// 悪い例
const isChrome = await page.evaluate(() => !!window.chrome);

// 良い例
const hasFeature = await page.evaluate(() => 'serviceWorker' in navigator);
```

### 2. 安定したセレクタを使用

```typescript
// 悪い例: CSSクラスに依存
await page.click('.btn-primary');

// 良い例: data-testid属性を使用
await page.click('[data-testid="submit-button"]');
```

### 3. 明示的な待機を使用

```typescript
// ネットワークリクエストの完了を待機
await page.waitForLoadState('networkidle');

// 特定の要素が表示されるまで待機
await page.waitForSelector('[data-testid="game-board"]', { state: 'visible' });
```

### 4. ブラウザ固有のテストを避ける

すべてのテストは3つのブラウザすべてで動作する必要があります。ブラウザ固有の機能をテストする必要がある場合は、テストをスキップする：

```typescript
test('browser-specific feature', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Chromium only feature');
  // テストコード
});
```

## パフォーマンス最適化

### 並列実行

```typescript
// playwright.config.ts
export default defineConfig({
  // CI環境では1ワーカー、ローカルでは並列実行
  workers: process.env.CI ? 1 : undefined,

  // すべてのテストを並列実行
  fullyParallel: true,
});
```

### テストの独立性

各テストは独立して実行可能である必要があります：

```typescript
// 各テストで独自のテストデータを作成
test('vote submission', async ({ page }) => {
  const testUser = await createTestUser();
  const testGame = await createTestGame();

  // テスト実行

  // クリーンアップ
  await cleanupTestUser(testUser);
  await cleanupTestGame(testGame);
});
```

## 参考資料

- [Playwright Cross-browser Testing](https://playwright.dev/docs/browsers)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Browser Compatibility](https://playwright.dev/docs/browser-contexts)
