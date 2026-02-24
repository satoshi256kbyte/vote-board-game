/**
 * E2E Test: Password Reset Flow
 *
 * Tests the complete password reset flow including:
 * - Navigation to password reset page
 * - Email submission for password reset
 * - Confirmation code input field visibility
 * - New password submission
 * - Success message display
 * - Login with new password
 * - Old password no longer works
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 *
 * NOTE: This test is currently SKIPPED because it requires a real confirmation code from Cognito.
 * The mock implementation in e2e/helpers/cognito-code.ts returns a hardcoded code that won't work
 * with the actual Cognito service.
 *
 * To enable this test, implement one of the following approaches:
 * 1. Use AWS SDK AdminGetUser API to retrieve the confirmation code (requires admin IAM permissions)
 * 2. Integrate with a test email service (e.g., Mailhog, MailSlurp) to capture the email
 * 3. Create a test-specific backend endpoint that returns confirmation codes for test users
 * 4. Mock the Cognito service in the test environment
 */

import { test, expect } from '@playwright/test';
import { generateTestUser, cleanupTestUser, navigateWithErrorHandling } from '../helpers';
import { getPasswordResetCode } from '../helpers/cognito-code';

test.describe('Password Reset Flow', () => {
  test.skip('should successfully reset password and login with new password', async ({ page }) => {
    // Generate unique test user
    const testUser = generateTestUser();
    const newPassword = `NewPass${Date.now()}`;

    try {
      // Step 1: Pre-register the test user
      await navigateWithErrorHandling(page, '/register');
      await page.fill('input[name="username"]', testUser.username);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.fill('input[name="confirmPassword"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      // Step 2: Requirement 3.1: Navigate to password reset page
      await navigateWithErrorHandling(page, '/password-reset');

      // Requirement 3.2: Verify page title contains "パスワードリセット"
      await expect(page.locator('h1')).toContainText('パスワードリセット');

      // Requirement 3.3: Submit email for password reset (Cognito sends confirmation code)
      await page.fill('input[name="email"]', testUser.email);
      await page.click('button[type="submit"]');

      // Requirement 3.4: Code input field should be visible
      await expect(page.locator('input[name="confirmation-code"]')).toBeVisible();

      // Get confirmation code from Cognito
      // NOTE: This is currently a mock implementation
      // See e2e/helpers/cognito-code.ts for details on implementing real code retrieval
      const confirmationCode = await getPasswordResetCode(testUser.email);

      // Requirement 3.5: Submit confirmation code and new password
      await page.fill('input[name="confirmation-code"]', confirmationCode);
      await page.fill('input[name="new-password"]', newPassword);
      await page.fill('input[name="password-confirmation"]', newPassword);
      await page.click('button[type="submit"]');

      // Requirement 3.6: Success message should be displayed
      await expect(page.locator('text=パスワードがリセットされました')).toBeVisible();

      // Step 3: Requirement 3.7: Verify user can login with new password
      await navigateWithErrorHandling(page, '/login');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', newPassword);
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      // Verify successful login
      const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'));
      expect(accessToken).toBeTruthy();

      // Step 4: Requirement 3.8: Verify old password no longer works
      await navigateWithErrorHandling(page, '/login');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');

      // Should show error message or remain on login page
      const errorMessage = page.locator('[role="alert"]');
      await expect(errorMessage).toBeVisible();
    } finally {
      // Clean up test user after test
      await cleanupTestUser(testUser.email);
    }
  });
});
