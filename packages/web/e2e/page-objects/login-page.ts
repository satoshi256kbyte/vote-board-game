import { type Page, expect } from '@playwright/test';

export class LoginPage {
    constructor(private page: Page) { }

    // Navigation
    async goto(): Promise<void> {
        await this.page.goto('/login');
        await this.page.waitForLoadState('networkidle');
    }

    // Actions
    async fillEmail(email: string): Promise<void> {
        await this.page.getByTestId('login-email-input').fill(email);
    }

    async fillPassword(password: string): Promise<void> {
        await this.page.getByTestId('login-password-input').fill(password);
    }

    async clickSubmit(): Promise<void> {
        await this.page.getByTestId('login-submit-button').click();
    }

    async login(email: string, password: string): Promise<void> {
        await this.fillEmail(email);
        await this.fillPassword(password);
        await this.clickSubmit();
    }

    async clickForgotPassword(): Promise<void> {
        await this.page.getByTestId('login-forgot-password-link').click();
    }

    // Assertions
    async expectErrorMessage(message: string): Promise<void> {
        const errorElement = this.page.getByTestId('login-error-message');
        await expect(errorElement).toBeVisible();
        await expect(errorElement).toContainText(message);
    }

    async expectRedirectToGameList(): Promise<void> {
        await this.page.waitForURL('/games', { timeout: 10000 });
        expect(this.page.url()).toContain('/games');
    }
}
