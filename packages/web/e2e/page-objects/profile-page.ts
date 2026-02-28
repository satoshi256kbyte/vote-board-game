import { type Page, expect } from '@playwright/test';
import {
  waitForNetworkIdle,
  waitForLoadingComplete,
  retryAssertion,
  waitForApiResponse,
  waitForDynamicContent,
  TIMEOUTS,
} from '../helpers/wait-utils';

export interface ProfileData {
  displayName: string;
}

export class ProfilePage {
  constructor(private page: Page) {}

  // Navigation
  async goto(): Promise<void> {
    await this.page.goto('/profile');
    await waitForNetworkIdle(this.page);
    await waitForLoadingComplete(this.page);
  }

  // Actions
  async fillDisplayName(name: string): Promise<void> {
    const displayNameInput = this.page.getByTestId('profile-display-name-input');
    await expect(displayNameInput).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await displayNameInput.fill(name);
  }

  async submitUpdate(): Promise<void> {
    const submitButton = this.page.getByTestId('profile-submit-button');
    await expect(submitButton).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await submitButton.click();

    // Wait for profile update API call
    await waitForApiResponse(this.page, /\/api\/.*\/profile/, { timeout: TIMEOUTS.LONG });
  }

  async updateProfile(data: ProfileData): Promise<void> {
    await this.fillDisplayName(data.displayName);
    await this.submitUpdate();
  }

  // Assertions
  async expectProfileDataVisible(data: ProfileData): Promise<void> {
    await retryAssertion(async () => {
      await waitForDynamicContent(this.page, '[data-testid="profile-display-name"]');
      const displayNameElement = this.page.getByTestId('profile-display-name');
      await expect(displayNameElement).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

      if (data.displayName) {
        await expect(displayNameElement).toContainText(data.displayName);
      }
    });
  }

  async expectVotingHistoryVisible(): Promise<void> {
    await retryAssertion(async () => {
      await waitForDynamicContent(this.page, '[data-testid="profile-voting-history"]');
      const historyElement = this.page.getByTestId('profile-voting-history');
      await expect(historyElement).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    });
  }

  async expectSuccessMessage(): Promise<void> {
    await retryAssertion(async () => {
      const successElement = this.page.getByTestId('profile-success-message');
      await expect(successElement).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    });
  }

  async expectErrorMessage(message: string): Promise<void> {
    await retryAssertion(async () => {
      const errorElement = this.page.getByTestId('profile-error-message');
      await expect(errorElement).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
      await expect(errorElement).toContainText(message);
    });
  }
}
