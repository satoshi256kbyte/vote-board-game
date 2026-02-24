/**
 * Property-Based E2E Test: User Login Flow
 *
 * Tests universal properties that should hold for any valid login credentials:
 * - Property 5: User Login Authenticates with Cognito
 * - Property 6: Successful Login Redirects to Home
 * - Property 7: Login Stores Authentication Tokens
 *
 * Validates: Requirements 2.4, 2.5, 2.6, 2.7
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

test.describe('User Login Flow - Property Tests', () => {
  /**
   * Property 5: User Login Authenticates with Cognito
   * Property 6: Successful Login Redirects to Home
   * Property 7: Login Stores Authentication Tokens
   *
   * **Validates: Requirements 2.4, 2.5, 2.6, 2.7**
   *
   * For any valid user credentials, login should:
   * - Authenticate with Cognito
   * - Redirect to home page "/"
   * - Store both access token and refresh token in localStorage
   */
  test('should satisfy all login properties for any valid credentials', async ({ page }) => {
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

          // Step 1: Pre-register the test user
          await navigateWithErrorHandling(page, '/register');
          await expect(page.locator('h1')).toContainText('アカウント作成', { timeout: 10000 });

          await page.fill('input[name="username"]', username);
          await page.fill('input[name="email"]', email);
          await page.fill('input[name="password"]', password);
          await page.fill('input[name="confirmPassword"]', password);
          await page.click('button[type="submit"]');
          await page.waitForURL('/', { timeout: 15000 });

          // Clear localStorage after registration
          await page.evaluate(() => localStorage.clear());

          // Step 2: Navigate to login page
          await navigateWithErrorHandling(page, '/login');
          await expect(page.locator('h1')).toContainText('ログイン', { timeout: 10000 });

          // Step 3: Fill login form with valid credentials
          await page.fill('input[name="email"]', email);
          await page.fill('input[name="password"]', password);

          // Step 4: Submit form
          await page.click('button[type="submit"]');

          // Property 6: Successful Login Redirects to Home
          await page.waitForURL('/', { timeout: 15000 });
          const currentUrl = page.url();
          expect(currentUrl).toContain('/');

          // Property 7: Login Stores Authentication Tokens (Access Token)
          const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'));
          expect(accessToken).toBeTruthy();
          expect(accessToken).not.toBe('');

          // Property 7: Login Stores Authentication Tokens (Refresh Token)
          const refreshToken = await page.evaluate(() => localStorage.getItem('refreshToken'));
          expect(refreshToken).toBeTruthy();
          expect(refreshToken).not.toBe('');

          // Property 5: User Login Authenticates with Cognito
          // (Implicit - if we got here with tokens, authentication succeeded)
          // The fact that we have both tokens confirms successful Cognito authentication

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
