import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfilePage } from './profile-page';
import type { Page } from '@playwright/test';

describe('ProfilePage', () => {
    let mockPage: Page;
    let profilePage: ProfilePage;

    beforeEach(() => {
        mockPage = {
            goto: vi.fn().mockResolvedValue(undefined),
            waitForLoadState: vi.fn().mockResolvedValue(undefined),
            getByTestId: vi.fn(),
        } as unknown as Page;

        profilePage = new ProfilePage(mockPage);
    });

    describe('goto', () => {
        it('should navigate to profile page', async () => {
            await profilePage.goto();

            expect(mockPage.goto).toHaveBeenCalledWith('/profile');
            expect(mockPage.waitForLoadState).toHaveBeenCalledWith('networkidle');
        });
    });

    describe('fillDisplayName', () => {
        it('should fill display name input', async () => {
            const mockElement = {
                fill: vi.fn().mockResolvedValue(undefined),
            };
            vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

            await profilePage.fillDisplayName('John Doe');

            expect(mockPage.getByTestId).toHaveBeenCalledWith(
                'profile-display-name-input'
            );
            expect(mockElement.fill).toHaveBeenCalledWith('John Doe');
        });
    });

    describe('submitUpdate', () => {
        it('should click submit button', async () => {
            const mockElement = {
                click: vi.fn().mockResolvedValue(undefined),
            };
            vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

            await profilePage.submitUpdate();

            expect(mockPage.getByTestId).toHaveBeenCalledWith('profile-submit-button');
            expect(mockElement.click).toHaveBeenCalled();
        });
    });

    describe('updateProfile', () => {
        it('should fill display name and submit', async () => {
            const mockElement = {
                fill: vi.fn().mockResolvedValue(undefined),
                click: vi.fn().mockResolvedValue(undefined),
            };
            vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

            await profilePage.updateProfile({ displayName: 'Jane Doe' });

            expect(mockPage.getByTestId).toHaveBeenCalledWith(
                'profile-display-name-input'
            );
            expect(mockPage.getByTestId).toHaveBeenCalledWith('profile-submit-button');
        });
    });

    describe('expectProfileDataVisible', () => {
        it('should verify profile data is visible', async () => {
            const mockElement = {
                toBeVisible: vi.fn().mockResolvedValue(undefined),
                toContainText: vi.fn().mockResolvedValue(undefined),
            };
            vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

            await profilePage.expectProfileDataVisible({ displayName: 'John Doe' });

            expect(mockPage.getByTestId).toHaveBeenCalledWith('profile-display-name');
        });

        it('should verify profile data without checking text when displayName is empty', async () => {
            const mockElement = {
                toBeVisible: vi.fn().mockResolvedValue(undefined),
                toContainText: vi.fn().mockResolvedValue(undefined),
            };
            vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

            await profilePage.expectProfileDataVisible({ displayName: '' });

            expect(mockPage.getByTestId).toHaveBeenCalledWith('profile-display-name');
            expect(mockElement.toContainText).not.toHaveBeenCalled();
        });
    });

    describe('expectVotingHistoryVisible', () => {
        it('should verify voting history is visible', async () => {
            const mockElement = {
                toBeVisible: vi.fn().mockResolvedValue(undefined),
            };
            vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

            await profilePage.expectVotingHistoryVisible();

            expect(mockPage.getByTestId).toHaveBeenCalledWith(
                'profile-voting-history'
            );
        });
    });

    describe('expectSuccessMessage', () => {
        it('should verify success message is visible', async () => {
            const mockElement = {
                toBeVisible: vi.fn().mockResolvedValue(undefined),
            };
            vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

            await profilePage.expectSuccessMessage();

            expect(mockPage.getByTestId).toHaveBeenCalledWith(
                'profile-success-message'
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

            await profilePage.expectErrorMessage('Update failed');

            expect(mockPage.getByTestId).toHaveBeenCalledWith('profile-error-message');
        });
    });
});
