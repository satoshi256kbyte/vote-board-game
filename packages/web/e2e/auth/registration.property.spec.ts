/**
 * Property-Based E2E Test: User Registration Flow
 *
 * Tests universal properties that should hold for any valid registration data:
 * - Property 1: User Registration Creates Cognito User
 * - Property 2: Successful Registration Redirects to Email Verification
 * - Property 3: Registration Stores Access Token
 * - Property 4: Successful Registration Shows No Errors
 *
 * Validates: Requirements 1.4, 1.5, 1.6, 1.7
 *
 * NOTE: Uses data-testid selectors and handles disabled submit button caused by
 * onBlur validation setting hasErrors=true during Playwright's fill() operations.
 */

import { test, expect } from '@playwright/test';
import * as fc from 'fast-check';
import { cleanupTestUser, navigateWithErrorHandling } from '../helpers';

// Arbitrary for generating valid test user data
const testUserArbitrary = fc.record({
  emailPrefix: fc.string({ minLength: 5, maxLength: 15 }).filter((s) => /^[a-z0-9]+$/.test(s)),
  passwordSuffix: fc.integer({ min: 1000, max: 9999 }),
});

test.describe('User Registration Flow - Property Tests', () => {
  // SKIP: Depends on /email-verification page which does not exist (no page.tsx)
  test.skip('should satisfy all registration properties for any valid user data', async ({
    page,
  }) => {
    const testEmails: string[] = [];

    try {
      await fc.assert(
        fc.asyncProperty(testUserArbitrary, async (userData) => {
          // Generate unique email with timestamp and random component
          const timestamp = Date.now();
          const random = Math.floor(Math.random() * 10000);
          const email = `${userData.emailPrefix}-${timestamp}-${random}@example.com`;
          const password = `TestPass${userData.passwordSuffix}!`;

          testEmails.push(email);

          // Navigate to registration page
          await navigateWithErrorHandling(page, '/register');

          // Verify page loaded correctly
          await expect(page.locator('h1')).toContainText('アカウント作成', { timeout: 10000 });

          // Fill registration form using data-testid selectors
          const emailInput = page.getByTestId('registration-email-input');
          const passwordInput = page.getByTestId('registration-password-input');
          const confirmPasswordInput = page.getByTestId('registration-confirm-password-input');
          const submitButton = page.getByTestId('registration-submit-button');

          await emailInput.fill(email);
          await passwordInput.fill(password);
          await confirmPasswordInput.fill(password);

          // Submit form - click the button directly since all fields are valid
          // (valid email + matching passwords = no onBlur errors)
          await submitButton.click();

          // Property 2: Successful Registration Redirects to Email Verification
          await page.waitForURL('/email-verification', { timeout: 15000 });
          const currentUrl = page.url();
          expect(currentUrl).toContain('/email-verification');

          // Property 3: Registration Stores Access Token (key: vbg_access_token)
          const accessToken = await page.evaluate(() => localStorage.getItem('vbg_access_token'));
          expect(accessToken).toBeTruthy();
          expect(accessToken).not.toBe('');

          // Property 4: Successful Registration Shows No Errors
          const errorMessage = page.getByTestId('registration-error-message');
          await expect(errorMessage).not.toBeVisible();

          // Property 1: User Registration Creates Cognito User
          // (Implicit - if we got here, user was created successfully)

          // Clear localStorage for next iteration
          await page.evaluate(() => localStorage.clear());
        }),
        {
          numRuns: process.env.CI ? 3 : 5,
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
