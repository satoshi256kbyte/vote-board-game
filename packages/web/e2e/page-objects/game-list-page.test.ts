import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameListPage } from './game-list-page';
import type { Page } from '@playwright/test';

describe('GameListPage', () => {
    let mockPage: Page;
    let gameListPage: GameListPage;

    beforeEach(() => {
        mockPage = {
            goto: vi.fn().mockResolvedValue(undefined),
            waitForLoadState: vi.fn().mockResolvedValue(undefined),
            getByTestId: vi.fn(),
        } as unknown as Page;

        gameListPage = new GameListPage(mockPage);
    });

    describe('goto', () => {
        it('should navigate to games page', async () => {
            await gameListPage.goto();

            expect(mockPage.goto).toHaveBeenCalledWith('/games');
            expect(mockPage.waitForLoadState).toHaveBeenCalledWith('networkidle');
        });
    });

    describe('clickGame', () => {
        it('should click on game card', async () => {
            const mockElement = {
                click: vi.fn().mockResolvedValue(undefined),
            };
            vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

            await gameListPage.clickGame('game-123');

            expect(mockPage.getByTestId).toHaveBeenCalledWith('game-card-game-123');
            expect(mockElement.click).toHaveBeenCalled();
        });
    });

    describe('getActiveGames', () => {
        it('should return list of game IDs', async () => {
            const mockCards = [
                {
                    getAttribute: vi
                        .fn()
                        .mockResolvedValue('game-card-game-1'),
                },
                {
                    getAttribute: vi
                        .fn()
                        .mockResolvedValue('game-card-game-2'),
                },
            ];

            const mockLocator = {
                all: vi.fn().mockResolvedValue(mockCards),
            };

            vi.mocked(mockPage.getByTestId).mockReturnValue(mockLocator as any);

            const gameIds = await gameListPage.getActiveGames();

            expect(gameIds).toEqual(['game-1', 'game-2']);
        });

        it('should handle empty game list', async () => {
            const mockLocator = {
                all: vi.fn().mockResolvedValue([]),
            };

            vi.mocked(mockPage.getByTestId).mockReturnValue(mockLocator as any);

            const gameIds = await gameListPage.getActiveGames();

            expect(gameIds).toEqual([]);
        });
    });

    describe('expectAtLeastOneGame', () => {
        it('should verify at least one game is visible', async () => {
            const mockLocator = {
                first: vi.fn().mockReturnValue({
                    toBeVisible: vi.fn().mockResolvedValue(undefined),
                }),
                count: vi.fn().mockResolvedValue(3),
            };

            vi.mocked(mockPage.getByTestId).mockReturnValue(mockLocator as any);

            await gameListPage.expectAtLeastOneGame();

            expect(mockLocator.count).toHaveBeenCalled();
        });
    });

    describe('expectGameVisible', () => {
        it('should verify specific game is visible', async () => {
            const mockElement = {
                toBeVisible: vi.fn().mockResolvedValue(undefined),
            };
            vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

            await gameListPage.expectGameVisible('game-123');

            expect(mockPage.getByTestId).toHaveBeenCalledWith('game-card-game-123');
        });
    });
});
