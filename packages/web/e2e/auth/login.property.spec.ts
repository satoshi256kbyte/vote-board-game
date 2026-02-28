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

          console.log(`[Property Test] Testing with user: ${email}`);
          testEmails.push(email);

          try {
            // Step 1: Pre-register the test user
            console.log(`[Property Test] Step 1: Navigating to /register`);
            await navigateWithErrorHandling(page, '/register');
            await expect(page.locator('h1')).toContainText('アカウント作成', { timeout: 10000 });

            console.log(`[Property Test] Step 1: Filling registration form`);
            await page.fill('input[name="username"]', username);
            await page.fill('input[name="email"]', email);
            await page.fill('input[name="password"]', password);
            await page.fill('input[name="confirmPassword"]', password);

            console.log(`[Property Test] Step 1: Submitting registration form`);
            await page.click('button[type="submit"]');

            console.log(`[Property Test] Step 1: Waiting for redirect to /`);
            await page.waitForURL('/', { timeout: 15000 });
            console.log(
              `[Property Test] Step 1: Registration successful, redirected to ${page.url()}`
            );

            // Clear localStorage after registration
            await page.evaluate(() => localStorage.clear());

            // Step 2: Navigate to login page
            console.log(`[Property Test] Step 2: Navigating to /login`);
            await navigateWithErrorHandling(page, '/login');
            await expect(page.locator('h1')).toContainText('ログイン', { timeout: 10000 });

            // Step 3: Fill login form with valid credentials
            console.log(`[Property Test] Step 3: Filling login form`);
            await page.fill('input[name="email"]', email);
            await page.fill('input[name="password"]', password);

            // Step 4: Submit form
            console.log(`[Property Test] Step 4: Submitting login form`);
            await page.click('button[type="submit"]');

            // Property 6: Successful Login Redirects to Home
            console.log(`[Property Test] Step 4: Waiting for redirect to /`);
            await page.waitForURL('/', { timeout: 15000 });
            const currentUrl = page.url();
            console.log(`[Property Test] Step 4: Login successful, redirected to ${currentUrl}`);
            expect(currentUrl).toContain('/');

            // Property 7: Login Stores Authentication Tokens (Access Token)
            console.log(`[Property Test] Step 5: Checking access token`);
            const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'));
            expect(accessToken).toBeTruthy();
            expect(accessToken).not.toBe('');
            console.log(
              `[Property Test] Step 5: Access token found: ${accessToken?.substring(0, 20)}...`
            );

            // Property 7: Login Stores Authentication Tokens (Refresh Token)
            console.log(`[Property Test] Step 5: Checking refresh token`);
            const refreshToken = await page.evaluate(() => localStorage.getItem('refreshToken'));
            expect(refreshToken).toBeTruthy();
            expect(refreshToken).not.toBe('');
            console.log(
              `[Property Test] Step 5: Refresh token found: ${refreshToken?.substring(0, 20)}...`
            );

            // Property 5: User Login Authenticates with Cognito
            // (Implicit - if we got here with tokens, authentication succeeded)
            // The fact that we have both tokens confirms successful Cognito authentication

            // Clear localStorage for next iteration
            await page.evaluate(() => localStorage.clear());
            console.log(`[Property Test] Test completed successfully for ${email}`);
          } catch (error) {
            console.error(`[Property Test] Test failed for ${email}:`, error);
            console.error(`[Property Test] Current URL: ${page.url()}`);

            // Capture page content for debugging
            const pageContent = await page.content();
            console.error(`[Property Test] Page content length: ${pageContent.length}`);

            // Check for error messages on the page
            const errorElements = await page.locator('[role="alert"], .error, .text-red-500').all();
            if (errorElements.length > 0) {
              console.error(`[Property Test] Found ${errorElements.length} error elements on page`);
              for (let i = 0; i < errorElements.length; i++) {
                const errorText = await errorElements[i].textContent();
                console.error(`[Property Test] Error ${i + 1}: ${errorText}`);
              }
            }

            throw error;
          }
        }),
        {
          // Reduce runs in CI environment to avoid timeouts
          numRuns: process.env.CI ? 3 : 15,
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
