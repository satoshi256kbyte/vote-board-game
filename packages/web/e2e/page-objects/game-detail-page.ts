import { type Page, expect } from '@playwright/test';

export class GameDetailPage {
    constructor(private page: Page) { }

    // Navigation
    async goto(gameId: string): Promise<void> {
        await this.page.goto(`/games/${gameId}`);
        await this.page.waitForLoadState('networkidle');
    }

    // Actions
    async clickJoinGame(): Promise<void> {
        await this.page.getByTestId('game-join-button').click();
    }

    async clickShare(): Promise<void> {
        await this.page.getByTestId('game-share-button').click();
    }

    async getShareUrl(): Promise<string> {
        await this.clickShare();

        // Wait for share dialog or URL to be displayed
        const shareUrlElement = this.page.getByTestId('game-share-url');
        await expect(shareUrlElement).toBeVisible();

        const shareUrl = await shareUrlElement.textContent();
        return shareUrl || '';
    }

    // Assertions
    async expectBoardStateVisible(): Promise<void> {
        const boardElement = this.page.getByTestId('game-board');
        await expect(boardElement).toBeVisible();
    }

    async expectMoveHistoryVisible(): Promise<void> {
        const historyElement = this.page.getByTestId('game-move-history');
        await expect(historyElement).toBeVisible();
    }

    async expectAICommentaryVisible(): Promise<void> {
        const commentaryElement = this.page.getByTestId('game-ai-commentary');
        await expect(commentaryElement).toBeVisible();
    }

    async expectJoinButtonVisible(): Promise<void> {
        const joinButton = this.page.getByTestId('game-join-button');
        await expect(joinButton).toBeVisible();
    }
}
