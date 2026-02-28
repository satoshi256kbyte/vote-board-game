import { type Page, expect } from '@playwright/test';

export class PasswordResetPage {
    constructor(private page: Page) { }

    // Navigation
    async goto(): Promise<void> {
        await this.page.goto('/password-reset');
        await this.page.waitForLoadState('networkidle');
    }

    // Actions
    async fillEmail(email: string): Promise<void> {
        await this.page.getByTestId('password-reset-email-input').fill(email);
    }

    async clickSubmit(): Promise<void> {
        await this.page.getByTestId('password-reset-submit-button').click();
    }

    // Assertions
    async expectConfirmationMessage(): Promise<void> {
        const confirmationElement = this.page.getByTestId(
            'password-reset-confirmation-message'
        );
        await expect(confirmationElement).toBeVisible();
    }

    async expectErrorMessage(message: string): Promise<void> {
        const errorElement = this.page.getByTestId('password-reset-error-message');
        await expect(errorElement).toBeVisible();
        await expect(errorElement).toContainText(message);
    }
}
