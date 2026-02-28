import { type Page, expect } from '@playwright/test';
import {
  waitForNetworkIdle,
  waitForNavigation,
  retryAssertion,
  waitForApiResponse,
  TIMEOUTS,
} from '../helpers/wait-utils';

export class PasswordResetPage {
  constructor(private page: Page) {}

  // Navigation
  async goto(): Promise<void> {
    await this.page.goto('/password-reset');
    await waitForNetworkIdle(this.page);
  }

  // Actions - Request Step
  async fillEmail(email: string): Promise<void> {
    const emailInput = this.page.getByTestId('password-reset-email-input');
    await expect(emailInput).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await emailInput.fill(email);
  }

  async clickSubmit(): Promise<void> {
    const submitButton = this.page.getByTestId('password-reset-submit-button');
    await expect(submitButton).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await submitButton.click();

    // Wait for password reset request API call
    await waitForApiResponse(this.page, /\/api\/auth\/password-reset/, { timeout: TIMEOUTS.LONG });
  }

  // Actions - Confirmation Step
  async fillConfirmationCode(code: string): Promise<void> {
    const codeInput = this.page.getByTestId('password-reset-confirmation-code-input');
    await expect(codeInput).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await codeInput.fill(code);
  }

  async fillNewPassword(password: string): Promise<void> {
    const passwordInput = this.page.getByTestId('password-reset-new-password-input');
    await expect(passwordInput).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await passwordInput.fill(password);
  }

  async fillConfirmPassword(password: string): Promise<void> {
    const confirmPasswordInput = this.page.getByTestId('password-reset-confirm-password-input');
    await expect(confirmPasswordInput).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await confirmPasswordInput.fill(password);
  }

  async clickConfirmSubmit(): Promise<void> {
    const submitButton = this.page.getByTestId('password-reset-confirm-submit-button');
    await expect(submitButton).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await submitButton.click();

    // Wait for password reset confirmation API call
    await waitForApiResponse(this.page, /\/api\/auth\/password-reset\/confirm/, {
      timeout: TIMEOUTS.LONG,
    });
  }

  // Combined actions
  async submitPasswordReset(email: string, code: string, newPassword: string): Promise<void> {
    await this.fillConfirmationCode(code);
    await this.fillNewPassword(newPassword);
    await this.fillConfirmPassword(newPassword);
    await this.clickConfirmSubmit();
  }

  // Assertions
  async expectConfirmationMessage(): Promise<void> {
    await retryAssertion(async () => {
      const confirmationElement = this.page.getByTestId('password-reset-confirmation-message');
      await expect(confirmationElement).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    });
  }

  async expectSuccessMessage(): Promise<void> {
    await retryAssertion(async () => {
      const successElement = this.page.getByTestId('password-reset-success-message');
      await expect(successElement).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    });
  }

  async expectErrorMessage(message: string): Promise<void> {
    await retryAssertion(async () => {
      const errorElement = this.page.getByTestId('password-reset-error-message');
      await expect(errorElement).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
      if (message) {
        await expect(errorElement).toContainText(message);
      }
    });
  }

  async expectRedirectToLogin(): Promise<void> {
    await waitForNavigation(this.page, '/login', { timeout: TIMEOUTS.NAVIGATION });
    await retryAssertion(async () => {
      expect(this.page.url()).toContain('/login');
    });
  }
}
