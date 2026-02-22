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

  test('homepage has interactive elements', async ({ page }) => {
    await page.goto('/');

    // ボタンまたはリンクが少なくとも1つ存在
    const buttons = await page.locator('button').count();
    const links = await page.locator('a').count();
    const totalInteractive = buttons + links;

    expect(totalInteractive).toBeGreaterThan(0);
  });
});
