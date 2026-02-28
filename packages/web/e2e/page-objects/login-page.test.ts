import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginPage } from './login-page';
import type { Page } from '@playwright/test';

describe('LoginPage', () => {
    let mockPage: Page;
    let loginPage: LoginPage;

    beforeEach(() => {
        mockPage = {
            goto: vi.fn().mockResolvedValue(undefined),
            waitForLoadState: vi.fn().mockResolvedValue(undefined),
            waitForURL: vi.fn().mockResolvedValue(undefined),
            url: vi.fn().mockReturnValue('http://localhost:3000/games'),
            getByTestId: vi.fn().mockReturnValue({
                fill: vi.fn().mockResolvedValue(undefined),
                click: vi.fn().mockResolvedValue(undefined),
                toBeVisible: vi.fn().mockResolvedValue(undefined),
                toContainText: vi.fn().mockResolvedValue(undefined),
            }),
        } as unknown as Page;

        loginPage = new LoginPage(mockPage);
    });

    describe('goto', () => {
        it('should navigate to login page', async () => {
            await loginPage.goto();

            expect(mockPage.goto).toHaveBeenCalledWith('/login');
            expect(mockPage.waitForLoadState).toHaveBeenCalledWith('networkidle');
        });
    });

    describe('fillEmail', () => {
        it('should fill email input', async () => {
            const mockElement = {
                fill: vi.fn().mockResolvedValue(undefined),
            };
            vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

            await loginPage.fillEmail('test@example.com');

            expect(mockPage.getByTestId).toHaveBeenCalledWith('login-email-input');
            expect(mockElement.fill).toHaveBeenCalledWith('test@example.com');
        });
    });

    describe('fillPassword', () => {
        it('should fill password input', async () => {
            const mockElement = {
                fill: vi.fn().mockResolvedValue(undefined),
            };
            vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

            await loginPage.fillPassword('password123');

            expect(mockPage.getByTestId).toHaveBeenCalledWith('login-password-input');
            expect(mockElement.fill).toHaveBeenCalledWith('password123');
        });
    });

    describe('clickSubmit', () => {
        it('should click submit button', async () => {
            const mockElement = {
                click: vi.fn().mockResolvedValue(undefined),
            };
            vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

            await loginPage.clickSubmit();

            expect(mockPage.getByTestId).toHaveBeenCalledWith('login-submit-button');
            expect(mockElement.click).toHaveBeenCalled();
        });
    });

    describe('login', () => {
        it('should fill email, password and submit', async () => {
            const mockElement = {
                fill: vi.fn().mockResolvedValue(undefined),
                click: vi.fn().mockResolvedValue(undefined),
            };
            vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

            await loginPage.login('test@example.com', 'password123');

            expect(mockPage.getByTestId).toHaveBeenCalledWith('login-email-input');
            expect(mockPage.getByTestId).toHaveBeenCalledWith('login-password-input');
            expect(mockPage.getByTestId).toHaveBeenCalledWith('login-submit-button');
        });
    });

    describe('clickForgotPassword', () => {
        it('should click forgot password link', async () => {
            const mockElement = {
                click: vi.fn().mockResolvedValue(undefined),
            };
            vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

            await loginPage.clickForgotPassword();

            expect(mockPage.getByTestId).toHaveBeenCalledWith(
                'login-forgot-password-link'
            );
            expect(mockElement.click).toHaveBeenCalled();
        });
    });

    describe('expectRedirectToGameList', () => {
        it('should verify redirect to games page', async () => {
            vi.mocked(mockPage.url).mockReturnValue('http://localhost:3000/games');

            await loginPage.expectRedirectToGameList();

            expect(mockPage.waitForURL).toHaveBeenCalledWith('/games', {
                timeout: 10000,
            });
        });
    });
});
