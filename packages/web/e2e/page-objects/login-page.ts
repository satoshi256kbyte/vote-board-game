import { type Page, expect } from '@playwright/test';
import { waitForNetworkIdle, retryAssertion, TIMEOUTS } from '../helpers/wait-utils';

export class LoginPage {
  constructor(private page: Page) {}

  // Navigation
  async goto(): Promise<void> {
    await this.page.goto('/login');
    await waitForNetworkIdle(this.page);
  }

  // Actions
  async fillEmail(email: string): Promise<void> {
    const emailInput = this.page.getByLabel('メールアドレス');
    await expect(emailInput).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await emailInput.fill(email);
  }

  async fillPassword(password: string): Promise<void> {
    const passwordInput = this.page.getByRole('textbox', { name: 'パスワード' });
    await expect(passwordInput).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await passwordInput.fill(password);
  }

  async clickSubmit(): Promise<void> {
    const submitButton = this.page.getByRole('button', { name: 'ログイン' });
    await expect(submitButton).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await submitButton.click();

    // Wait for network request to complete
    await waitForNetworkIdle(this.page, '/auth/login', { timeout: TIMEOUTS.LONG });
  }

  async login(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickSubmit();
  }

  async clickForgotPassword(): Promise<void> {
    const forgotPasswordLink = this.page.getByRole('link', {
      name: 'パスワードをお忘れですか？',
    });
    await expect(forgotPasswordLink).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await forgotPasswordLink.click();
  }

  // Assertions
  async expectErrorMessage(message: string): Promise<void> {
    await retryAssertion(async () => {
      // Filter to get only the error alert (not the route announcer)
      const errorElement = this.page
        .getByRole('alert')
        .filter({ hasText: /メールアドレス|パスワード|ログイン|エラー/ });
      await expect(errorElement).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
      if (message) {
        await expect(errorElement).toContainText(message);
      }
    });
  }

  async expectRedirectToGameList(): Promise<void> {
    // Wait for navigation to complete (login redirects to '/' first, then may go to '/games')
    await this.page.waitForLoadState('networkidle', { timeout: TIMEOUTS.NAVIGATION });
    await retryAssertion(async () => {
      const url = this.page.url();
      // Accept either '/' or '/games' as valid redirect destinations
      const isValid = url === '/' || url.includes('/games') || url.endsWith('/');
      if (!isValid) {
        throw new Error(`Expected URL to be '/' or contain '/games', but got: ${url}`);
      }
      expect(isValid).toBe(true);
    });
  }
}
