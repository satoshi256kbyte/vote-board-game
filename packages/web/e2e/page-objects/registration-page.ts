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

    // When onBlur validation sets errors, hasErrors becomes true and the button is disabled.
    // Playwright's click() waits for the button to be enabled (actionability check),
    // which causes a timeout. Instead, dispatch a submit event on the form directly
    // to trigger validateForm() which will show all validation errors.
    const isDisabled = await submitButton.isDisabled();
    if (isDisabled) {
      await this.page.locator('form').evaluate((form) => {
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      });
    } else {
      await submitButton.click();
    }
  }

  async clickSubmitAndWaitForApi(): Promise<void> {
    const submitButton = this.page.getByTestId('registration-submit-button');
    await expect(submitButton).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await submitButton.click();

    // Wait for registration API call
    await waitForApiResponse(this.page, /\/auth\/register/, { timeout: TIMEOUTS.LONG });
  }

  async register(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.fillConfirmPassword(password);
    await this.clickSubmitAndWaitForApi();
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

  async expectValidationError(message?: string): Promise<void> {
    await retryAssertion(async () => {
      const alerts = this.page.locator('p[role="alert"]');
      await expect(alerts.first()).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
      if (message) {
        await expect(alerts.first()).toContainText(message);
      }
    });
  }

  async expectRedirectToLogin(): Promise<void> {
    await waitForNavigation(this.page, '/email-verification', { timeout: TIMEOUTS.NAVIGATION });
    await retryAssertion(async () => {
      expect(this.page.url()).toContain('/email-verification');
    });
  }
}
