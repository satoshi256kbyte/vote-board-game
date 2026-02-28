import { type Page, expect } from '@playwright/test';
import {
  waitForNetworkIdle,
  waitForLoadingComplete,
  retryAssertion,
  waitForDynamicContent,
  TIMEOUTS,
} from '../helpers/wait-utils';

export class GameDetailPage {
  constructor(private page: Page) {}

  // Navigation
  async goto(gameId: string): Promise<void> {
    await this.page.goto(`/games/${gameId}`);
    await waitForNetworkIdle(this.page);
    await waitForLoadingComplete(this.page);
  }

  // Actions
  async clickJoinGame(): Promise<void> {
    const joinButton = this.page.getByTestId('game-join-button');
    await expect(joinButton).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await expect(joinButton).toBeEnabled({ timeout: TIMEOUTS.MEDIUM });
    await joinButton.click();
  }

  async clickShare(): Promise<void> {
    const shareButton = this.page.getByTestId('game-share-button');
    await expect(shareButton).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await shareButton.click();
  }

  async getShareUrl(): Promise<string> {
    await this.clickShare();

    // Wait for share dialog or URL to be displayed
    const shareUrlElement = this.page.getByTestId('game-share-url');
    await expect(shareUrlElement).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    const shareUrl = await shareUrlElement.textContent();
    return shareUrl || '';
  }

  // Assertions
  async expectBoardStateVisible(): Promise<void> {
    await retryAssertion(async () => {
      await waitForDynamicContent(this.page, '[data-testid="game-board"]');
      const boardElement = this.page.getByTestId('game-board');
      await expect(boardElement).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    });
  }

  async expectMoveHistoryVisible(): Promise<void> {
    await retryAssertion(async () => {
      await waitForDynamicContent(this.page, '[data-testid="game-move-history"]');
      const historyElement = this.page.getByTestId('game-move-history');
      await expect(historyElement).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    });
  }

  async expectAICommentaryVisible(): Promise<void> {
    await retryAssertion(async () => {
      await waitForDynamicContent(this.page, '[data-testid="game-ai-commentary"]');
      const commentaryElement = this.page.getByTestId('game-ai-commentary');
      await expect(commentaryElement).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    });
  }

  async expectJoinButtonVisible(): Promise<void> {
    await retryAssertion(async () => {
      const joinButton = this.page.getByTestId('game-join-button');
      await expect(joinButton).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    });
  }
}
