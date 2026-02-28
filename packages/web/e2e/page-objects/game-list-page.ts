import { type Page, expect } from '@playwright/test';
import {
  waitForNetworkIdle,
  waitForLoadingComplete,
  retryAssertion,
  waitForDynamicContent,
  TIMEOUTS,
} from '../helpers/wait-utils';

export class GameListPage {
  constructor(private page: Page) {}

  // Navigation
  async goto(): Promise<void> {
    await this.page.goto('/games');
    await waitForNetworkIdle(this.page);
    await waitForLoadingComplete(this.page);
  }

  // Actions
  async clickGame(gameId: string): Promise<void> {
    const gameCard = this.page.getByTestId(`game-card-${gameId}`);
    await expect(gameCard).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await gameCard.click();
  }

  async getActiveGames(): Promise<string[]> {
    // Wait for game cards to load
    await waitForDynamicContent(this.page, '[data-testid^="game-card-"]');

    const gameCards = await this.page.getByTestId(/^game-card-/).all();

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
    await retryAssertion(async () => {
      await waitForDynamicContent(this.page, '[data-testid^="game-card-"]');
      const gameCards = this.page.getByTestId(/^game-card-/);
      await expect(gameCards.first()).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
      const count = await gameCards.count();
      expect(count).toBeGreaterThan(0);
    });
  }

  async expectGameVisible(gameId: string): Promise<void> {
    await retryAssertion(async () => {
      const gameCard = this.page.getByTestId(`game-card-${gameId}`);
      await expect(gameCard).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    });
  }
}
