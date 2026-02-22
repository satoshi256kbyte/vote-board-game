import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: [
      '**/node_modules/**',
      '**/e2e/**',
      '**/playwright.config.test.ts', // Task 1.1 - not yet implemented
    ],
  },
});
