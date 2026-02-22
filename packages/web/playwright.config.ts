import { defineConfig, devices } from '@playwright/test';

// BASE_URLの検証
if (!process.env.BASE_URL) {
  throw new Error('BASE_URL environment variable is required for E2E tests');
}

export default defineConfig({
  testDir: './e2e',

  // 各テストのタイムアウト
  timeout: 30 * 1000,

  // すべてのテストを並列実行
  fullyParallel: true,

  // CI環境でtest.only()を禁止
  forbidOnly: !!process.env.CI,

  // CI環境では2回リトライ
  retries: process.env.CI ? 2 : 0,

  // CI環境では1ワーカー
  workers: process.env.CI ? 1 : undefined,

  // レポーター設定
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],

  // 共通設定
  use: {
    // ベースURL
    baseURL: process.env.BASE_URL,

    // 最初のリトライ時にトレースを記録
    trace: 'on-first-retry',

    // 失敗時のみスクリーンショット
    screenshot: 'only-on-failure',

    // ナビゲーションタイムアウト
    navigationTimeout: 30 * 1000,
  },

  // ブラウザ設定
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
