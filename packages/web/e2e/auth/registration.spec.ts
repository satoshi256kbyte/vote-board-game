/**
 * E2E Test: User Registration Flow
 *
 * Tests the complete user registration flow including:
 * - Navigation to registration page
 * - Form input and submission
 * - Redirect to home page
 * - Access token storage
 * - Error message validation
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */

import { test, expect } from '@playwright/test';
import { generateTestUser, cleanupTestUser, navigateWithErrorHandling } from '../helpers';

test.describe('User Registration Flow', () => {
  test('should successfully register a new user', async ({ page }) => {
    // Generate unique test user
    const testUser = generateTestUser();

    try {
      // Requirement 1.1: Navigate to registration page
      await navigateWithErrorHandling(page, '/register');

      // Requirement 1.2: Verify page title contains "アカウント作成"
      await expect(page.locator('h1')).toContainText('アカウント作成');

      // Requirement 1.3: Fill registration form with valid test user data
      await page.fill('input[name="username"]', testUser.username);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.fill('input[name="confirmPassword"]', testUser.password);

      // Requirement 1.4: Submit form and create user in Cognito
      await page.click('button[type="submit"]');

      // Requirement 1.5: Should redirect to home page "/"
      await page.waitForURL('/');

      // Requirement 1.6: Access token should exist in localStorage
      const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'));
      expect(accessToken).toBeTruthy();
      expect(accessToken).not.toBe('');

      // Requirement 1.7: No error messages should be displayed
      const errorMessage = page.locator('[role="alert"]');
      await expect(errorMessage).not.toBeVisible();
    } finally {
      // Clean up test user after test
      await cleanupTestUser(testUser.email);
    }
  });
});
