import { type Page, expect } from '@playwright/test';
import {
  waitForNetworkIdle,
  waitForNavigation,
  retryAssertion,
  TIMEOUTS,
} from '../helpers/wait-utils';

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
    await waitForNetworkIdle(this.page, '/api/auth', { timeout: TIMEOUTS.LONG });
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
      const errorElement = this.page.getByRole('alert');
      await expect(errorElement).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
      if (message) {
        await expect(errorElement).toContainText(message);
      }
    });
  }

  async expectRedirectToGameList(): Promise<void> {
    await waitForNavigation(this.page, '/games', { timeout: TIMEOUTS.NAVIGATION });
    await retryAssertion(async () => {
      expect(this.page.url()).toContain('/games');
    });
  }
}
