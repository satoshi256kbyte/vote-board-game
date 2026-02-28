import { type Page, expect } from '@playwright/test';

export interface ProfileData {
    displayName: string;
}

export class ProfilePage {
    constructor(private page: Page) { }

    // Navigation
    async goto(): Promise<void> {
        await this.page.goto('/profile');
        await this.page.waitForLoadState('networkidle');
    }

    // Actions
    async fillDisplayName(name: string): Promise<void> {
        await this.page.getByTestId('profile-display-name-input').fill(name);
    }

    async submitUpdate(): Promise<void> {
        await this.page.getByTestId('profile-submit-button').click();
    }

    async updateProfile(data: ProfileData): Promise<void> {
        await this.fillDisplayName(data.displayName);
        await this.submitUpdate();
    }

    // Assertions
    async expectProfileDataVisible(data: ProfileData): Promise<void> {
        const displayNameElement = this.page.getByTestId('profile-display-name');
        await expect(displayNameElement).toBeVisible();

        if (data.displayName) {
            await expect(displayNameElement).toContainText(data.displayName);
        }
    }

    async expectVotingHistoryVisible(): Promise<void> {
        const historyElement = this.page.getByTestId('profile-voting-history');
        await expect(historyElement).toBeVisible();
    }

    async expectSuccessMessage(): Promise<void> {
        const successElement = this.page.getByTestId('profile-success-message');
        await expect(successElement).toBeVisible();
    }

    async expectErrorMessage(message: string): Promise<void> {
        const errorElement = this.page.getByTestId('profile-error-message');
        await expect(errorElement).toBeVisible();
        await expect(errorElement).toContainText(message);
    }
}
