import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 15000, // 15 seconds per test
    hookTimeout: 15000, // 15 seconds for hooks
    teardownTimeout: 5000, // 5 seconds for teardown
    exclude: ['**/node_modules/**', '**/e2e/**'],
    reporters: process.env.CI ? ['basic'] : ['default'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
