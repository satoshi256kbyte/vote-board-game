import { type Page, expect } from '@playwright/test';

export class GameListPage {
    constructor(private page: Page) { }

    // Navigation
    async goto(): Promise<void> {
        await this.page.goto('/games');
        await this.page.waitForLoadState('networkidle');
    }

    // Actions
    async clickGame(gameId: string): Promise<void> {
        await this.page.getByTestId(`game-card-${gameId}`).click();
    }

    async getActiveGames(): Promise<string[]> {
        const gameCards = await this.page
            .getByTestId(/^game-card-/)
            .all();

        const gameIds: string[] = [];
        for (const card of gameCards) {
            const testId = await card.getAttribute('data-testid');
            if (testId) {
                const gameId = testId.replace('game-card-', '');
                gameIds.push(gameId);
            }
        }

        return gameIds;
    }

    // Assertions
    async expectAtLeastOneGame(): Promise<void> {
        const gameCards = this.page.getByTestId(/^game-card-/);
        await expect(gameCards.first()).toBeVisible({ timeout: 10000 });
        const count = await gameCards.count();
        expect(count).toBeGreaterThan(0);
    }

    async expectGameVisible(gameId: string): Promise<void> {
        const gameCard = this.page.getByTestId(`game-card-${gameId}`);
        await expect(gameCard).toBeVisible();
    }
}
