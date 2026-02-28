import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test';

export function createPlaywrightConfig(
    baseURL: string | undefined,
    isCI: boolean
): PlaywrightTestConfig {
    if (!baseURL) {
        throw new Error('BASE_URL environment variable is required for E2E tests');
    }

    return {
        testDir: './e2e',

        // グローバルセットアップ（サービス可用性チェック）
        globalSetup: './e2e/global-setup.ts',

        // 各テストのタイムアウト
        timeout: 15 * 1000,

        // すべてのテストを並列実行
        fullyParallel: true,

        // CI環境でtest.only()を禁止
        forbidOnly: isCI,

        // CI環境では2回リトライ、ローカルでは0回
        retries: isCI ? 2 : 0,

        // CI環境では1ワーカー、ローカルでは並列実行
        workers: isCI ? 1 : undefined,

        // レポーター設定
        reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],

        // 共通設定
        use: {
            // ベースURL
            baseURL,

            // CI環境ではヘッドレスモード、ローカルでは--headedフラグで制御可能
            headless: isCI ? true : undefined,

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
            {
                name: 'firefox',
                use: { ...devices['Desktop Firefox'] },
            },
            {
                name: 'webkit',
                use: { ...devices['Desktop Safari'] },
            },
        ],
    };
}

export default defineConfig(createPlaywrightConfig(process.env.BASE_URL, !!process.env.CI));
