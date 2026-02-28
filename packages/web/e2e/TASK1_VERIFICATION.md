# タスク1: Playwright環境のセットアップ - 検証レポート

## 実施日時

2025年1月

## 受け入れ基準の検証

### ✅ 1. `packages/web`にPlaywrightをインストール

**ステータス:** 完了

**検証:**

- `package.json`に`@playwright/test`が`devDependencies`として含まれている
- バージョン: `^1.58.2`

```json
"@playwright/test": "^1.58.2"
```

### ✅ 2. `playwright.config.ts`を作成

**ステータス:** 完了

**検証:**

- `packages/web/playwright.config.ts`が存在
- 設定ファイルは`createPlaywrightConfig`関数を使用して構造化されている
- 環境変数からの設定読み込みをサポート

### ✅ 3. Chromium、Firefox、WebKitブラウザを設定

**ステータス:** 完了

**検証:**
`playwright.config.ts`の`projects`セクションに3つのブラウザが設定されている:

```typescript
projects: [
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
  },
  {
    name: 'firefox',
    use: { ...devices['Desktop Firefox'] },
  },
  {
    name: 'webkit',
    use: { ...devices['Desktop Safari'] },
  },
];
```

### ✅ 4. ヘッドレスモードとビジュアルモードを設定

**ステータス:** 完了

**検証:**

- CI環境では自動的にヘッドレスモード
- ローカル環境では`--headed`フラグで制御可能
- `package.json`に`test:e2e:headed`スクリプトが存在

```typescript
headless: isCI ? true : undefined,
```

```json
"test:e2e": "playwright test",
"test:e2e:headed": "playwright test --headed",
"test:e2e:ui": "playwright test --ui"
```

### ✅ 5. ベースURLを環境変数から読み込む設定

**ステータス:** 完了

**検証:**

- `BASE_URL`環境変数から読み込み
- 環境変数が設定されていない場合はエラーを投げる

```typescript
export default defineConfig(createPlaywrightConfig(process.env.BASE_URL, !!process.env.CI));
```

- `.env.example`に`BASE_URL`の設定例を追加済み

### ✅ 6. テストタイムアウトを15秒に設定

**ステータス:** 完了

**検証:**

```typescript
timeout: 15 * 1000, // 15秒
```

### ✅ 7. スクリーンショット設定（失敗時のみ）

**ステータス:** 完了

**検証:**

```typescript
screenshot: 'only-on-failure',
```

### ✅ 8. 並列実行の設定

**ステータス:** 完了

**検証:**

```typescript
fullyParallel: true,
workers: isCI ? 1 : undefined, // ローカルでは並列実行
```

### ✅ 9. `e2e/`ディレクトリ構造を作成

**ステータス:** 完了

**検証:**
以下のディレクトリ構造が作成されている:

```
packages/web/e2e/
├── auth/                    # 認証フローテスト
├── game/                    # ゲームフローテスト
├── voting/                  # 投票フローテスト
├── profile/                 # プロフィール管理テスト
├── sharing/                 # ソーシャルシェアテスト
├── error-handling/          # エラーハンドリングテスト
├── fixtures/                # Playwrightフィクスチャ
├── helpers/                 # テストヘルパー関数
├── page-objects/            # Page Object Models
├── global-setup.ts          # グローバルセットアップ
└── README.md                # ドキュメント
```

### ✅ 10. `.gitignore`にPlaywrightの出力を追加

**ステータス:** 完了

**検証:**
`.gitignore`に以下のエントリが追加されている:

```
# Playwright
packages/web/playwright-report/
packages/web/test-results/
packages/web/.playwright/
```

## 追加の設定

### レポーター設定

- HTMLレポート: `playwright-report/`ディレクトリに出力
- リストレポート: コンソールに出力

### リトライ設定

- CI環境: 2回リトライ
- ローカル環境: リトライなし

### トレース設定

- 最初のリトライ時にトレースを記録

### ナビゲーションタイムアウト

- 30秒に設定

## NPMスクリプト

以下のスクリプトが`package.json`に追加されている:

```json
"test:e2e": "playwright test",
"test:e2e:headed": "playwright test --headed",
"test:e2e:ui": "playwright test --ui",
"test:e2e:report": "playwright show-report",
"playwright:install": "playwright install --with-deps chromium"
```

## 実行方法

### ヘッドレスモードで実行

```bash
BASE_URL=http://localhost:3000 pnpm test:e2e
```

### ビジュアルモードで実行

```bash
BASE_URL=http://localhost:3000 pnpm test:e2e:headed
```

### UIモードで実行

```bash
BASE_URL=http://localhost:3000 pnpm test:e2e:ui
```

### レポートを表示

```bash
pnpm test:e2e:report
```

## 結論

すべての受け入れ基準が満たされており、Playwright環境のセットアップは完了しています。

- ✅ Playwrightがインストールされている
- ✅ 設定ファイルが適切に構成されている
- ✅ 3つのブラウザ（Chromium、Firefox、WebKit）が設定されている
- ✅ ヘッドレス/ビジュアルモードの切り替えが可能
- ✅ 環境変数からの設定読み込みが実装されている
- ✅ タイムアウト、スクリーンショット、並列実行が適切に設定されている
- ✅ ディレクトリ構造が作成されている
- ✅ .gitignoreが更新されている

タスク1は正常に完了しました。
