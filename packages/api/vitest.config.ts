import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test-setup.ts'],
    env: {
      COGNITO_USER_POOL_ID: 'ap-northeast-1_TestPool',
      ICON_BUCKET_NAME: 'test-icon-bucket',
      CDN_DOMAIN: 'test-cdn.example.com',
      ALLOWED_ORIGINS: 'http://localhost:3000,https://*.vercel.app',
    },
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.config.*'],
    },
  },
});
