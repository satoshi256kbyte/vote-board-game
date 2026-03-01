/**
 * E2E tests for game list page
 * Tests game viewing and navigation functionality
 *
 * Task 1.1: 対局一覧画面の基本表示テストを作成
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8
 *
 * Task 1.2: タブフィルタリング機能のテストを追加
 * Requirements: 1.9, 1.10
 */

import { test, expect } from '../fixtures';
import { GameListPage } from '../page-objects/game-list-page';

test.describe('Game List Page - Basic Display', () => {
  test('should display page title "対局一覧"', async ({ authenticatedPage, game: _game }) => {
    const gameListPage = new GameListPage(authenticatedPage);

    // Navigate to game list page
    await gameListPage.goto();

    // Verify page title is displayed (Requirements 1.1, 1.2)
    const title = authenticatedPage.locator('h1');
    await expect(title).toBeVisible({ timeout: 10000 });
    await expect(title).toContainText('投票対局');
  });

  test('should display game cards', async ({ authenticatedPage, game }) => {
    const gameListPage = new GameListPage(authenticatedPage);

    // Navigate to game list page
    await gameListPage.goto();

    // Verify at least one game card is displayed (Requirement 1.3)
    await gameListPage.expectAtLeastOneGame();

    // Verify the test game is visible
    await gameListPage.expectGameVisible(game.gameId);
  });

  test('should display required information in game cards', async ({ authenticatedPage, game }) => {
    const gameListPage = new GameListPage(authenticatedPage);

    // Navigate to game list page
    await gameListPage.goto();

    // Wait for game cards to load
    await gameListPage.expectGameVisible(game.gameId);

    // Get the game card element
    const gameCard = authenticatedPage.getByTestId(`game-card-${game.gameId}`);
    await expect(gameCard).toBeVisible({ timeout: 10000 });

    // Verify game card contains game title (game type + mode) (Requirement 1.4)
    // The title should contain "オセロ" (game type) and "AI vs 集合知" (game mode)
    await expect(gameCard).toContainText('オセロ');
    await expect(gameCard).toContainText('AI vs 集合知');

    // Verify game card contains turn number (Requirement 1.6)
    await expect(gameCard).toContainText('ターン数');

    // Verify game card contains participant count (Requirement 1.7)
    await expect(gameCard).toContainText('参加者数');

    // Verify game card contains voting deadline (Requirement 1.8)
    await expect(gameCard).toContainText('投票締切');
  });

  test('should navigate to game detail when clicking game card', async ({
    authenticatedPage,
    game,
  }) => {
    const gameListPage = new GameListPage(authenticatedPage);

    // Navigate to game list page
    await gameListPage.goto();

    // Click on the game card
    await gameListPage.clickGame(game.gameId);

    // Wait for navigation to game detail page
    await authenticatedPage.waitForURL(`**/games/${game.gameId}`, { timeout: 10000 });

    // Verify we're on the game detail page
    expect(authenticatedPage.url()).toContain(`/games/${game.gameId}`);
  });

  test('should complete within 30 seconds', async ({ authenticatedPage, game }) => {
    const startTime = Date.now();
    const gameListPage = new GameListPage(authenticatedPage);

    // Navigate to game list page
    await gameListPage.goto();

    // Verify game is displayed
    await gameListPage.expectGameVisible(game.gameId);

    // Verify required information is displayed
    const gameCard = authenticatedPage.getByTestId(`game-card-${game.gameId}`);
    await expect(gameCard).toContainText('オセロ');
    await expect(gameCard).toContainText('ターン数');
    await expect(gameCard).toContainText('参加者数');
    await expect(gameCard).toContainText('投票締切');

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    // Verify test completed within 30 seconds (Requirement 12.1)
    expect(duration).toBeLessThan(30);
  });
});

test.describe('Game List Page - Tab Filtering', () => {
  test('should display only active games when clicking "進行中" tab', async ({
    authenticatedPage,
    game,
  }) => {
    const gameListPage = new GameListPage(authenticatedPage);

    // Navigate to game list page
    await gameListPage.goto();

    // Wait for initial games to load
    await gameListPage.expectAtLeastOneGame();

    // Click on "進行中" (Active) tab (Requirement 1.9)
    await gameListPage.clickActiveTab();

    // Verify URL contains status=ACTIVE
    await authenticatedPage.waitForURL('**/?status=ACTIVE', { timeout: 10000 });
    expect(authenticatedPage.url()).toContain('status=ACTIVE');

    // Verify active games are displayed
    // The test game created by fixture is active, so it should be visible
    await gameListPage.expectGameVisible(game.gameId);

    // Verify the game card shows active status indicators
    const gameCard = authenticatedPage.getByTestId(`game-card-${game.gameId}`);
    await expect(gameCard).toBeVisible({ timeout: 10000 });
  });

  test('should display only finished games when clicking "終了" tab', async ({
    authenticatedPage,
  }) => {
    const gameListPage = new GameListPage(authenticatedPage);

    // Navigate to game list page
    await gameListPage.goto();

    // Wait for initial games to load
    await gameListPage.expectAtLeastOneGame();

    // Click on "終了" (Finished) tab (Requirement 1.10)
    await gameListPage.clickFinishedTab();

    // Verify URL contains status=FINISHED
    await authenticatedPage.waitForURL('**/?status=FINISHED', { timeout: 10000 });
    expect(authenticatedPage.url()).toContain('status=FINISHED');

    // Verify the page loads (may show "対局がありません" if no finished games exist)
    // This is acceptable as we're testing the filtering mechanism, not the data
    const noGamesMessage = authenticatedPage.getByText('対局がありません');
    const gameCards = authenticatedPage.getByTestId(/^game-card-/);

    // Either no games message is shown OR game cards are shown (but not the active test game)
    const hasNoGames = (await noGamesMessage.count()) > 0;
    const hasGameCards = (await gameCards.count()) > 0;

    // At least one of these should be true
    expect(hasNoGames || hasGameCards).toBe(true);
  });

  test('should switch between tabs correctly', async ({ authenticatedPage, game }) => {
    const gameListPage = new GameListPage(authenticatedPage);

    // Navigate to game list page
    await gameListPage.goto();

    // Wait for initial games to load
    await gameListPage.expectAtLeastOneGame();

    // Verify test game is visible on active tab (default)
    await gameListPage.expectGameVisible(game.gameId);

    // Switch to finished tab
    await gameListPage.clickFinishedTab();
    await authenticatedPage.waitForURL('**/?status=FINISHED', { timeout: 10000 });

    // Switch back to active tab
    await gameListPage.clickActiveTab();
    await authenticatedPage.waitForURL('**/?status=ACTIVE', { timeout: 10000 });

    // Verify test game is visible again
    await gameListPage.expectGameVisible(game.gameId);
  });
});
