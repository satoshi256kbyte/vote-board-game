import { type Page, expect } from '@playwright/test';

export class RegistrationPage {
    constructor(private page: Page) { }

    // Navigation
    async goto(): Promise<void> {
        await this.page.goto('/register');
        await this.page.waitForLoadState('networkidle');
    }

    // Actions
    async fillEmail(email: string): Promise<void> {
        await this.page.getByTestId('registration-email-input').fill(email);
    }

    async fillPassword(password: string): Promise<void> {
        await this.page.getByTestId('registration-password-input').fill(password);
    }

    async fillConfirmPassword(password: string): Promise<void> {
        await this.page
            .getByTestId('registration-confirm-password-input')
            .fill(password);
    }

    async clickSubmit(): Promise<void> {
        await this.page.getByTestId('registration-submit-button').click();
    }

    async register(email: string, password: string): Promise<void> {
        await this.fillEmail(email);
        await this.fillPassword(password);
        await this.fillConfirmPassword(password);
        await this.clickSubmit();
    }

    // Assertions
    async expectErrorMessage(message: string): Promise<void> {
        const errorElement = this.page.getByTestId('registration-error-message');
        await expect(errorElement).toBeVisible();
        await expect(errorElement).toContainText(message);
    }

    async expectRedirectToLogin(): Promise<void> {
        await this.page.waitForURL('/login', { timeout: 10000 });
        expect(this.page.url()).toContain('/login');
    }
}
