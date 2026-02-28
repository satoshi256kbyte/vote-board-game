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

    // 見出しが存在することを確認
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('投票対局');

    // 説明文が存在することを確認
    const description = page.locator('p');
    await expect(description).toBeVisible();
  });
});
