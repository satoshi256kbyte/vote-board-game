import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      COGNITO_USER_POOL_ID: 'ap-northeast-1_TestPool',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'cdk.out/', '**/*.config.*'],
    },
  },
});
