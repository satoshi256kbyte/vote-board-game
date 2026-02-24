import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest configuration for E2E helper unit tests
 * These tests verify the helper functions used in E2E tests
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['e2e/helpers/**/*.test.ts'],
    testTimeout: 15000,
    hookTimeout: 15000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
