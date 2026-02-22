import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('環境変数チェック', () => {
  const originalEnv = process.env.COGNITO_USER_POOL_ID;

  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // 元の環境変数を復元
    if (originalEnv !== undefined) {
      process.env.COGNITO_USER_POOL_ID = originalEnv;
    } else {
      // テスト環境ではindex.test.tsが先にセットしている可能性があるため、
      // テスト用のデフォルト値を復元
      process.env.COGNITO_USER_POOL_ID = 'ap-northeast-1_TestPool';
    }
  });

  it('COGNITO_USER_POOL_ID未設定時にエラーがスローされる', async () => {
    delete process.env.COGNITO_USER_POOL_ID;

    await expect(import('./index.js')).rejects.toThrow('COGNITO_USER_POOL_ID is required');
  });
});
