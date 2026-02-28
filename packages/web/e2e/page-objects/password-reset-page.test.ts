import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PasswordResetPage } from './password-reset-page';
import type { Page } from '@playwright/test';

describe('PasswordResetPage', () => {
    let mockPage: Page;
    let passwordResetPage: PasswordResetPage;

    beforeEach(() => {
        mockPage = {
            goto: vi.fn().mockResolvedValue(undefined),
            waitForLoadState: vi.fn().mockResolvedValue(undefined),
            getByTestId: vi.fn(),
        } as unknown as Page;

        passwordResetPage = new PasswordResetPage(mockPage);
    });

    describe('goto', () => {
        it('should navigate to password reset page', async () => {
            await passwordResetPage.goto();

            expect(mockPage.goto).toHaveBeenCalledWith('/password-reset');
            expect(mockPage.waitForLoadState).toHaveBeenCalledWith('networkidle');
        });
    });

    describe('fillEmail', () => {
        it('should fill email input', async () => {
            const mockElement = {
                fill: vi.fn().mockResolvedValue(undefined),
            };
            vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

            await passwordResetPage.fillEmail('test@example.com');

            expect(mockPage.getByTestId).toHaveBeenCalledWith(
                'password-reset-email-input'
            );
            expect(mockElement.fill).toHaveBeenCalledWith('test@example.com');
        });
    });

    describe('clickSubmit', () => {
        it('should click submit button', async () => {
            const mockElement = {
                click: vi.fn().mockResolvedValue(undefined),
            };
            vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

            await passwordResetPage.clickSubmit();

            expect(mockPage.getByTestId).toHaveBeenCalledWith(
                'password-reset-submit-button'
            );
            expect(mockElement.click).toHaveBeenCalled();
        });
    });

    describe('expectConfirmationMessage', () => {
        it('should verify confirmation message is visible', async () => {
            const mockElement = {
                toBeVisible: vi.fn().mockResolvedValue(undefined),
            };
            vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

            await passwordResetPage.expectConfirmationMessage();

            expect(mockPage.getByTestId).toHaveBeenCalledWith(
                'password-reset-confirmation-message'
            );
        });
    });

    describe('expectErrorMessage', () => {
        it('should verify error message with text', async () => {
            const mockElement = {
                toBeVisible: vi.fn().mockResolvedValue(undefined),
                toContainText: vi.fn().mockResolvedValue(undefined),
            };
            vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

            await passwordResetPage.expectErrorMessage('Invalid email');

            expect(mockPage.getByTestId).toHaveBeenCalledWith(
                'password-reset-error-message'
            );
        });
    });
});
