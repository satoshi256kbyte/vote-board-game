import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('homepage loads successfully', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
  });

  test('homepage has title', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });

  test('homepage has main content', async ({ page }) => {
    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // タブナビゲーションが存在することを確認
    const activeTab = page.getByRole('button', { name: '進行中' });
    await expect(activeTab).toBeVisible();

    const finishedTab = page.getByRole('button', { name: '終了' });
    await expect(finishedTab).toBeVisible();
  });
});
