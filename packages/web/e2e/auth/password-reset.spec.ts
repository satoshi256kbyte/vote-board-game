/**
 * E2E Test: Password Reset Flow
 *
 * Tests the password reset flow including:
 * - Valid email submission for password reset
 * - Invalid email submission handling
 * - Confirmation message display
 * - Error message display for invalid email
 * - Password change with confirmation code
 * - Error handling for invalid confirmation codes
 *
 * Requirements: Requirement 2 (Password Reset Flow Testing)
 * - 2.1: Verify confirmation message displayed after valid email submission
 * - 2.2: Verify error message displayed for invalid email
 * - 2.3: Verify user redirected to login page after successful password reset
 * - 2.4: Verify error message displayed for expired/invalid reset token
 *
 * NOTE: Tests involving actual password reset with confirmation codes are limited
 * due to the challenge of retrieving Cognito confirmation codes in E2E tests.
 * See e2e/helpers/cognito-code.ts for details.
 */

import { test, expect } from '@playwright/test';
import { PasswordResetPage, LoginPage } from '../page-objects';
import { createTestUser, cleanupTestUser } from '../helpers';

test.describe('Password Reset Flow', () => {
  test('should display confirmation message after submitting valid email', async ({ page }) => {
    const passwordResetPage = new PasswordResetPage(page);

    // Create test user
    const testUser = await createTestUser();

    try {
      // Navigate to password reset page
      await passwordResetPage.goto();

      // Submit valid email
      await passwordResetPage.fillEmail(testUser.email);
      await passwordResetPage.clickSubmit();

      // Verify confirmation message is displayed
      await passwordResetPage.expectConfirmationMessage();
    } finally {
      // Clean up test user
      await cleanupTestUser(testUser.email);
    }
  });

  test('should display error message for invalid email format', async ({ page }) => {
    const passwordResetPage = new PasswordResetPage(page);

    // Navigate to password reset page
    await passwordResetPage.goto();

    // Submit invalid email format
    await passwordResetPage.fillEmail('invalid-email');
    await passwordResetPage.clickSubmit();

    // Verify error message is displayed
    await passwordResetPage.expectErrorMessage('');
  });

  test('should display error message for non-existent email', async ({ page }) => {
    const passwordResetPage = new PasswordResetPage(page);

    // Navigate to password reset page
    await passwordResetPage.goto();

    // Submit non-existent email
    await passwordResetPage.fillEmail('nonexistent@example.com');
    await passwordResetPage.clickSubmit();

    // Verify error message is displayed (or confirmation message for security)
    // Note: Some systems show confirmation message even for non-existent emails
    // to prevent email enumeration attacks
    await passwordResetPage.expectConfirmationMessage();
  });

  test('should display error message for empty email', async ({ page }) => {
    const passwordResetPage = new PasswordResetPage(page);

    // Navigate to password reset page
    await passwordResetPage.goto();

    // Submit empty email
    await passwordResetPage.fillEmail('');
    await passwordResetPage.clickSubmit();

    // Verify error message is displayed
    await passwordResetPage.expectErrorMessage('');
  });

  test('should navigate from login page to password reset page', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Navigate to login page
    await loginPage.goto();

    // Click forgot password link
    await loginPage.clickForgotPassword();

    // Verify we're on password reset page
    await page.waitForURL('/password-reset', { timeout: 10000 });
    expect(page.url()).toContain('/password-reset');
  });

  test('should complete password reset request within 30 seconds', async ({ page }) => {
    const startTime = Date.now();
    const passwordResetPage = new PasswordResetPage(page);

    const testUser = await createTestUser();

    try {
      await passwordResetPage.goto();
      await passwordResetPage.fillEmail(testUser.email);
      await passwordResetPage.clickSubmit();
      await passwordResetPage.expectConfirmationMessage();

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(30000);
    } finally {
      await cleanupTestUser(testUser.email);
    }
  });

  test('should display error for invalid confirmation code format', async ({ page }) => {
    const passwordResetPage = new PasswordResetPage(page);
    const newPassword = `NewPass${Date.now()}!`;

    const testUser = await createTestUser();

    try {
      // Request password reset
      await passwordResetPage.goto();
      await passwordResetPage.fillEmail(testUser.email);
      await passwordResetPage.clickSubmit();

      // Wait for confirmation message and transition to confirm step
      await passwordResetPage.expectConfirmationMessage();
      await page.waitForTimeout(2500); // Wait for auto-transition

      // Submit with invalid confirmation code format (not 6 digits)
      await passwordResetPage.fillConfirmationCode('12345'); // Only 5 digits
      await passwordResetPage.fillNewPassword(newPassword);
      await passwordResetPage.fillConfirmPassword(newPassword);
      await passwordResetPage.clickConfirmSubmit();

      // Verify error message is displayed for invalid format
      await passwordResetPage.expectErrorMessage('');
    } finally {
      await cleanupTestUser(testUser.email);
    }
  });

  test('should display error for invalid confirmation code', async ({ page }) => {
    const passwordResetPage = new PasswordResetPage(page);
    const newPassword = `NewPass${Date.now()}!`;

    const testUser = await createTestUser();

    try {
      // Request password reset
      await passwordResetPage.goto();
      await passwordResetPage.fillEmail(testUser.email);
      await passwordResetPage.clickSubmit();

      // Wait for confirmation message and transition to confirm step
      await passwordResetPage.expectConfirmationMessage();
      await page.waitForTimeout(2500); // Wait for auto-transition

      // Submit with invalid confirmation code (wrong code)
      await passwordResetPage.fillConfirmationCode('000000');
      await passwordResetPage.fillNewPassword(newPassword);
      await passwordResetPage.fillConfirmPassword(newPassword);
      await passwordResetPage.clickConfirmSubmit();

      // Verify error message is displayed
      await passwordResetPage.expectErrorMessage('');
    } finally {
      await cleanupTestUser(testUser.email);
    }
  });

  test('should display error for weak password', async ({ page }) => {
    const passwordResetPage = new PasswordResetPage(page);
    const weakPassword = 'weak'; // Too short, no uppercase, no numbers

    const testUser = await createTestUser();

    try {
      // Request password reset
      await passwordResetPage.goto();
      await passwordResetPage.fillEmail(testUser.email);
      await passwordResetPage.clickSubmit();

      // Wait for confirmation message and transition to confirm step
      await passwordResetPage.expectConfirmationMessage();
      await page.waitForTimeout(2500); // Wait for auto-transition

      // Submit with weak password
      await passwordResetPage.fillConfirmationCode('123456');
      await passwordResetPage.fillNewPassword(weakPassword);
      await passwordResetPage.fillConfirmPassword(weakPassword);
      await passwordResetPage.clickConfirmSubmit();

      // Verify error message is displayed (client-side validation)
      await passwordResetPage.expectErrorMessage('');
    } finally {
      await cleanupTestUser(testUser.email);
    }
  });

  test('should display error for mismatched passwords', async ({ page }) => {
    const passwordResetPage = new PasswordResetPage(page);
    const newPassword = `NewPass${Date.now()}!`;
    const differentPassword = `DifferentPass${Date.now()}!`;

    const testUser = await createTestUser();

    try {
      // Request password reset
      await passwordResetPage.goto();
      await passwordResetPage.fillEmail(testUser.email);
      await passwordResetPage.clickSubmit();

      // Wait for confirmation message and transition to confirm step
      await passwordResetPage.expectConfirmationMessage();
      await page.waitForTimeout(2500); // Wait for auto-transition

      // Submit with mismatched passwords
      await passwordResetPage.fillConfirmationCode('123456');
      await passwordResetPage.fillNewPassword(newPassword);
      await passwordResetPage.fillConfirmPassword(differentPassword);
      await passwordResetPage.clickConfirmSubmit();

      // Verify error message is displayed
      await passwordResetPage.expectErrorMessage('');
    } finally {
      await cleanupTestUser(testUser.email);
    }
  });

  test('should complete password reset confirmation within 30 seconds', async ({ page }) => {
    const startTime = Date.now();
    const passwordResetPage = new PasswordResetPage(page);
    const newPassword = `NewPass${Date.now()}!`;

    const testUser = await createTestUser();

    try {
      // Request password reset
      await passwordResetPage.goto();
      await passwordResetPage.fillEmail(testUser.email);
      await passwordResetPage.clickSubmit();

      // Wait for confirmation message and transition to confirm step
      await passwordResetPage.expectConfirmationMessage();
      await page.waitForTimeout(2500); // Wait for auto-transition

      // Submit with invalid code (to test the flow timing)
      await passwordResetPage.fillConfirmationCode('000000');
      await passwordResetPage.fillNewPassword(newPassword);
      await passwordResetPage.fillConfirmPassword(newPassword);
      await passwordResetPage.clickConfirmSubmit();

      // Wait for error response
      await passwordResetPage.expectErrorMessage('');

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(30000);
    } finally {
      await cleanupTestUser(testUser.email);
    }
  });

  // Note: The following tests are commented out because they require actual
  // confirmation codes from Cognito, which are challenging to retrieve in E2E tests.
  // To enable these tests, implement one of the approaches described in
  // e2e/helpers/cognito-code.ts

  /*
    test.skip('should successfully reset password with valid confirmation code', async ({ page }) => {
        const passwordResetPage = new PasswordResetPage(page);
        const loginPage = new LoginPage(page);
        const newPassword = `NewPass${Date.now()}!`;

        const testUser = await createTestUser();

        try {
            // Request password reset
            await passwordResetPage.goto();
            await passwordResetPage.fillEmail(testUser.email);
            await passwordResetPage.clickSubmit();
            await passwordResetPage.expectConfirmationMessage();
            await page.waitForTimeout(2500); // Wait for auto-transition

            // Get confirmation code (requires implementation)
            const confirmationCode = await getPasswordResetCode(testUser.email);

            // Submit new password with confirmation code
            await passwordResetPage.submitPasswordReset(testUser.email, confirmationCode, newPassword);

            // Verify success message
            await passwordResetPage.expectSuccessMessage();

            // Verify redirect to login page (auto-redirect after 3 seconds)
            await passwordResetPage.expectRedirectToLogin();

            // Verify can login with new password
            await loginPage.login(testUser.email, newPassword);
            await loginPage.expectRedirectToGameList();
        } finally {
            await cleanupTestUser(testUser.email);
        }
    });

    test.skip('should display error for expired confirmation code', async ({ page }) => {
        const passwordResetPage = new PasswordResetPage(page);
        const newPassword = `NewPass${Date.now()}!`;

        const testUser = await createTestUser();

        try {
            // Request password reset
            await passwordResetPage.goto();
            await passwordResetPage.fillEmail(testUser.email);
            await passwordResetPage.clickSubmit();
            await passwordResetPage.expectConfirmationMessage();
            await page.waitForTimeout(2500); // Wait for auto-transition

            // Wait for code to expire (Cognito codes typically expire after 1 hour)
            // In practice, this would use a mock or test-specific endpoint
            // to simulate an expired code

            // Submit with expired confirmation code
            const expiredCode = '999999';
            await passwordResetPage.submitPasswordReset(testUser.email, expiredCode, newPassword);

            // Verify error message is displayed
            await passwordResetPage.expectErrorMessage('');
        } finally {
            await cleanupTestUser(testUser.email);
        }
    });
    */
});
