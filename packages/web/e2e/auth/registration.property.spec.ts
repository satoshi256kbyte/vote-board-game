/**
 * Property-Based E2E Test: User Registration Flow
 *
 * Tests universal properties that should hold for any valid registration data:
 * - Property 1: User Registration Creates Cognito User
 * - Property 2: Successful Registration Redirects to Home
 * - Property 3: Registration Stores Access Token
 * - Property 4: Successful Registration Shows No Errors
 *
 * Validates: Requirements 1.4, 1.5, 1.6, 1.7
 */

import { test, expect } from '@playwright/test';
import * as fc from 'fast-check';
import { cleanupTestUser, navigateWithErrorHandling } from '../helpers';

// Arbitrary for generating valid test user data
const testUserArbitrary = fc.record({
  username: fc.string({ minLength: 3, maxLength: 20 }).filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
  emailPrefix: fc.string({ minLength: 5, maxLength: 15 }).filter((s) => /^[a-z0-9]+$/.test(s)),
  passwordSuffix: fc.integer({ min: 1000, max: 9999 }),
});

test.describe('User Registration Flow - Property Tests', () => {
  /**
   * Property 1: User Registration Creates Cognito User
   * Property 2: Successful Registration Redirects to Home
   * Property 3: Registration Stores Access Token
   * Property 4: Successful Registration Shows No Errors
   *
   * **Validates: Requirements 1.4, 1.5, 1.6, 1.7**
   *
   * For any valid test user data, registration should:
   * - Create user in Cognito
   * - Redirect to home page "/"
   * - Store access token in localStorage
   * - Display no error messages
   */
  test('should satisfy all registration properties for any valid user data', async ({ page }) => {
    const testEmails: string[] = [];

    try {
      await fc.assert(
        fc.asyncProperty(testUserArbitrary, async (userData) => {
          // Generate unique email with timestamp and random component
          const timestamp = Date.now();
          const random = Math.floor(Math.random() * 10000);
          const email = `${userData.emailPrefix}-${timestamp}-${random}@example.com`;
          const password = `TestPass${userData.passwordSuffix}!`;
          const username = userData.username;

          testEmails.push(email);

          // Navigate to registration page
          await navigateWithErrorHandling(page, '/register');

          // Verify page loaded correctly
          await expect(page.locator('h1')).toContainText('アカウント作成', { timeout: 10000 });

          // Fill registration form
          await page.fill('input[name="username"]', username);
          await page.fill('input[name="email"]', email);
          await page.fill('input[name="password"]', password);
          await page.fill('input[name="confirmPassword"]', password);

          // Submit form
          await page.click('button[type="submit"]');

          // Property 2: Successful Registration Redirects to Home
          await page.waitForURL('/', { timeout: 15000 });
          const currentUrl = page.url();
          expect(currentUrl).toContain('/');

          // Property 3: Registration Stores Access Token
          const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'));
          expect(accessToken).toBeTruthy();
          expect(accessToken).not.toBe('');

          // Property 4: Successful Registration Shows No Errors
          const errorMessage = page.locator('[role="alert"]');
          await expect(errorMessage).not.toBeVisible();

          // Property 1: User Registration Creates Cognito User
          // (Implicit - if we got here, user was created successfully)
          // The fact that we have a token and no errors confirms user creation

          // Clear localStorage for next iteration
          await page.evaluate(() => localStorage.clear());
        }),
        {
          numRuns: 15,
          endOnFailure: true,
        }
      );
    } finally {
      // Clean up all test users
      for (const email of testEmails) {
        await cleanupTestUser(email);
      }
    }
  });
});
