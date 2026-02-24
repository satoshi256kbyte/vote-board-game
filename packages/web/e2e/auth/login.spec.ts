/**
 * E2E Test: User Login Flow
 *
 * Tests the complete user login flow including:
 * - Pre-registration of test user
 * - Navigation to login page
 * - Form input and submission
 * - Redirect to home page
 * - Access token and refresh token storage
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
 */

import { test, expect } from '@playwright/test';
import { generateTestUser, cleanupTestUser, navigateWithErrorHandling } from '../helpers';

test.describe('User Login Flow', () => {
  test('should successfully login with registered user', async ({ page }) => {
    // Generate unique test user
    const testUser = generateTestUser();

    try {
      // Step 1: Pre-register the test user
      await navigateWithErrorHandling(page, '/register');
      await page.fill('input[name="username"]', testUser.username);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.fill('input[name="confirmPassword"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      // Step 2: Requirement 2.1: Navigate to login page
      await navigateWithErrorHandling(page, '/login');

      // Requirement 2.2: Verify page title contains "ログイン"
      await expect(page.locator('h1')).toContainText('ログイン');

      // Requirement 2.3: Fill login form with valid credentials
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);

      // Requirement 2.4: Submit form and authenticate with Cognito
      await page.click('button[type="submit"]');

      // Requirement 2.5: Should redirect to home page "/"
      await page.waitForURL('/');

      // Requirement 2.6: Access token should exist in localStorage
      const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'));
      expect(accessToken).toBeTruthy();
      expect(accessToken).not.toBe('');

      // Requirement 2.7: Refresh token should exist in localStorage
      const refreshToken = await page.evaluate(() => localStorage.getItem('refreshToken'));
      expect(refreshToken).toBeTruthy();
      expect(refreshToken).not.toBe('');
    } finally {
      // Clean up test user after test
      await cleanupTestUser(testUser.email);
    }
  });
});
