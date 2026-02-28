import { type Page, expect } from '@playwright/test';
import {
  waitForNetworkIdle,
  waitForNavigation,
  retryAssertion,
  waitForApiResponse,
  TIMEOUTS,
} from '../helpers/wait-utils';

export class RegistrationPage {
  constructor(private page: Page) {}

  // Navigation
  async goto(): Promise<void> {
    await this.page.goto('/register');
    await waitForNetworkIdle(this.page);
  }

  // Actions
  async fillEmail(email: string): Promise<void> {
    const emailInput = this.page.getByTestId('registration-email-input');
    await expect(emailInput).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await emailInput.fill(email);
  }

  async fillPassword(password: string): Promise<void> {
    const passwordInput = this.page.getByTestId('registration-password-input');
    await expect(passwordInput).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await passwordInput.fill(password);
  }

  async fillConfirmPassword(password: string): Promise<void> {
    const confirmPasswordInput = this.page.getByTestId('registration-confirm-password-input');
    await expect(confirmPasswordInput).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await confirmPasswordInput.fill(password);
  }

  async clickSubmit(): Promise<void> {
    const submitButton = this.page.getByTestId('registration-submit-button');
    await expect(submitButton).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await submitButton.click();

    // Wait for registration API call
    await waitForApiResponse(this.page, /\/api\/auth\/register/, { timeout: TIMEOUTS.LONG });
  }

  async register(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.fillConfirmPassword(password);
    await this.clickSubmit();
  }

  // Assertions
  async expectErrorMessage(message: string): Promise<void> {
    await retryAssertion(async () => {
      const errorElement = this.page.getByTestId('registration-error-message');
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
