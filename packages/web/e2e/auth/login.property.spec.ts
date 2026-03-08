/**
 * Property-Based E2E Test: User Login Flow
 *
 * Tests universal properties that should hold for any valid login credentials:
 * - Property 5: User Login Authenticates with Cognito
 * - Property 6: Successful Login Redirects to Home
 * - Property 7: Login Stores Authentication Tokens
 *
 * Validates: Requirements 2.4, 2.5, 2.6, 2.7
 *
 * NOTE: Uses createTestUser() (admin API) instead of UI registration because
 * UI registration doesn't auto-confirm email in Cognito, causing login to fail
 * with "サーバーエラーが発生しました" for unverified users.
 */

import { test, expect } from '@playwright/test';
import { createTestUser, cleanupTestUser, navigateWithErrorHandling } from '../helpers';

test.describe('User Login Flow - Property Tests', () => {
  test('should satisfy all login properties for any valid credentials', async ({ page }) => {
    // Skip test if API URL is not configured
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      test.skip(true, 'NEXT_PUBLIC_API_URL is not set - skipping authentication test');
      return;
    }

    const testEmails: string[] = [];

    try {
      // Generate multiple test users upfront using admin API (confirmed + verified)
      const numRuns = process.env.CI ? 3 : 5;
      const testUsers: Array<{ email: string; password: string }> = [];

      for (let i = 0; i < numRuns; i++) {
        const user = await createTestUser();
        testUsers.push(user);
        testEmails.push(user.email);
      }

      // Test login property for each pre-created user
      for (const user of testUsers) {
        console.log(`[Property Test] Testing login with user: ${user.email}`);

        // Clear localStorage BEFORE navigating to /login to prevent auth redirect.
        // After a successful login, tokens are in localStorage. If we navigate to /login
        // with tokens still present, the login page detects them and redirects back to /.
        // So we clear first (on whatever page we're on), then navigate.
        const pageUrl = page.url();
        if (pageUrl && !pageUrl.startsWith('about:')) {
          await page.evaluate(() => localStorage.clear());
        }

        await navigateWithErrorHandling(page, '/login');
        await page.waitForLoadState('domcontentloaded');
        await expect(page.locator('h1')).toContainText('ログイン', { timeout: 10000 });

        // Fill login form
        await page.fill('input[name="email"]', user.email);
        await page.fill('input[name="password"]', user.password);

        // Submit form
        await page.click('button[type="submit"]');

        // Property 6: Successful Login Redirects to Home
        await page.waitForURL('/', { timeout: 15000 });
        const currentUrl = page.url();
        expect(currentUrl).toContain('/');

        // Property 7: Login Stores Authentication Tokens
        const accessToken = await page.evaluate(() => localStorage.getItem('vbg_access_token'));
        expect(accessToken).toBeTruthy();
        expect(accessToken).not.toBe('');

        const refreshToken = await page.evaluate(() => localStorage.getItem('vbg_refresh_token'));
        expect(refreshToken).toBeTruthy();
        expect(refreshToken).not.toBe('');

        // Property 5: User Login Authenticates with Cognito
        // (Implicit - tokens confirm successful authentication)

        console.log(`[Property Test] Login successful for ${user.email}`);
      }
    } finally {
      // Clean up all test users
      for (const email of testEmails) {
        await cleanupTestUser(email);
      }
    }
  });
});
