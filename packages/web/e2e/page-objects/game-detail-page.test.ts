import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameDetailPage } from './game-detail-page';
import type { Page } from '@playwright/test';

describe('GameDetailPage', () => {
    let mockPage: Page;
    let gameDetailPage: GameDetailPage;

    beforeEach(() => {
        mockPage = {
            goto: vi.fn().mockResolvedValue(undefined),
            waitForLoadState: vi.fn().mockResolvedValue(undefined),
            getByTestId: vi.fn(),
        } as unknown as Page;

        gameDetailPage = new GameDetailPage(mockPage);
    });

    describe('goto', () => {
        it('should navigate to game detail page', async () => {
            await gameDetailPage.goto('game-123');

            expect(mockPage.goto).toHaveBeenCalledWith('/games/game-123');
            expect(mockPage.waitForLoadState).toHaveBeenCalledWith('networkidle');
        });
    });

    describe('clickJoinGame', () => {
        it('should click join game button', async () => {
            const mockElement = {
                click: vi.fn().mockResolvedValue(undefined),
            };
            vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

            await gameDetailPage.clickJoinGame();

            expect(mockPage.getByTestId).toHaveBeenCalledWith('game-join-button');
            expect(mockElement.click).toHaveBeenCalled();
        });
    });

    describe('clickShare', () => {
        it('should click share button', async () => {
            const mockElement = {
                click: vi.fn().mockResolvedValue(undefined),
            };
            vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

            await gameDetailPage.clickShare();

            expect(mockPage.getByTestId).toHaveBeenCalledWith('game-share-button');
            expect(mockElement.click).toHaveBeenCalled();
        });
    });

    describe('getShareUrl', () => {
        it('should return share URL', async () => {
            const mockShareButton = {
                click: vi.fn().mockResolvedValue(undefined),
            };
            const mockShareUrl = {
                toBeVisible: vi.fn().mockResolvedValue(undefined),
                textContent: vi
                    .fn()
                    .mockResolvedValue('https://example.com/games/game-123'),
            };

            vi.mocked(mockPage.getByTestId).mockImplementation((testId: string) => {
                if (testId === 'game-share-button') return mockShareButton as any;
                if (testId === 'game-share-url') return mockShareUrl as any;
                return {} as any;
            });

            const url = await gameDetailPage.getShareUrl();

            expect(url).toBe('https://example.com/games/game-123');
            expect(mockShareButton.click).toHaveBeenCalled();
        });
    });

    describe('expectBoardStateVisible', () => {
        it('should verify board is visible', async () => {
            const mockElement = {
                toBeVisible: vi.fn().mockResolvedValue(undefined),
            };
            vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

            await gameDetailPage.expectBoardStateVisible();

            expect(mockPage.getByTestId).toHaveBeenCalledWith('game-board');
        });
    });

    describe('expectMoveHistoryVisible', () => {
        it('should verify move history is visible', async () => {
            const mockElement = {
                toBeVisible: vi.fn().mockResolvedValue(undefined),
            };
            vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

            await gameDetailPage.expectMoveHistoryVisible();

            expect(mockPage.getByTestId).toHaveBeenCalledWith('game-move-history');
        });
    });

    describe('expectAICommentaryVisible', () => {
        it('should verify AI commentary is visible', async () => {
            const mockElement = {
                toBeVisible: vi.fn().mockResolvedValue(undefined),
            };
            vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

            await gameDetailPage.expectAICommentaryVisible();

            expect(mockPage.getByTestId).toHaveBeenCalledWith('game-ai-commentary');
        });
    });

    describe('expectJoinButtonVisible', () => {
        it('should verify join button is visible', async () => {
            const mockElement = {
                toBeVisible: vi.fn().mockResolvedValue(undefined),
            };
            vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

            await gameDetailPage.expectJoinButtonVisible();

            expect(mockPage.getByTestId).toHaveBeenCalledWith('game-join-button');
        });
    });
});
