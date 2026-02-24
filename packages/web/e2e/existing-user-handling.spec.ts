/**
 * E2E Test: Existing User Error Handling
 *
 * Tests the handling of cases where test users already exist in Cognito
 * Demonstrates automatic deletion and retry logic
 *
 * Requirements: 7.3
 */

import { test, expect } from '@playwright/test';
import { generateTestUser, cleanupTestUser, registerWithRetry } from './helpers';

test.describe('Existing User Error Handling', () => {
  test('should handle existing user by deleting and retrying', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      // First, register the user normally
      await page.goto('/register');
      await page.fill('input[name="username"]', testUser.username);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.fill('input[name="confirmPassword"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      // Verify registration succeeded
      const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'));
      expect(accessToken).toBeTruthy();

      // Now try to register the same user again using registerWithRetry
      // This should detect the existing user, delete it, and retry
      await page.goto('/register');
      await registerWithRetry(page, testUser, 1);

      // Verify the retry succeeded
      const newAccessToken = await page.evaluate(() => localStorage.getItem('accessToken'));
      expect(newAccessToken).toBeTruthy();
    } finally {
      // Clean up test user
      await cleanupTestUser(testUser.email);
    }
  });
});
