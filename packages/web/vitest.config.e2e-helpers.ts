import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest configuration for E2E helper unit tests
 * These are unit tests for E2E helper functions, not the E2E tests themselves
 */
export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        include: [
            'e2e/helpers/**/*.test.ts',
            'e2e/page-objects/**/*.test.ts',
            'e2e/fixtures/**/*.test.ts',
            'e2e/global-setup.test.ts',
            'e2e/global-setup.integration.test.ts',
        ],
        testTimeout: 10000,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
