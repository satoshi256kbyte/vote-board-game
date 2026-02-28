/**
 * E2E tests for game list page
 * Tests game viewing and navigation functionality
 */

import { test, expect } from '../fixtures';
import { GameListPage } from '../page-objects/game-list-page';

// Merge fixtures

test.describe('Game List Page', () => {
  test('should display at least one active game', async ({ authenticatedPage, game }) => {
    const gameListPage = new GameListPage(authenticatedPage);

    // Navigate to game list page
    await gameListPage.goto();

    // Verify at least one game is displayed
    await gameListPage.expectAtLeastOneGame();

    // Verify the test game is visible
    await gameListPage.expectGameVisible(game.gameId);
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

  test('should display multiple games when available', async ({ authenticatedPage, game }) => {
    const gameListPage = new GameListPage(authenticatedPage);

    // Navigate to game list page
    await gameListPage.goto();

    // Get list of active games
    const activeGames = await gameListPage.getActiveGames();

    // Verify at least one game exists (our test game)
    expect(activeGames.length).toBeGreaterThan(0);
    expect(activeGames).toContain(game.gameId);
  });

  test('should complete within 45 seconds', async ({ authenticatedPage, game }) => {
    const startTime = Date.now();
    const gameListPage = new GameListPage(authenticatedPage);

    // Navigate to game list page
    await gameListPage.goto();

    // Verify game is displayed
    await gameListPage.expectGameVisible(game.gameId);

    // Click game and navigate to detail
    await gameListPage.clickGame(game.gameId);
    await authenticatedPage.waitForURL(`**/games/${game.gameId}`, { timeout: 10000 });

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    // Verify test completed within 45 seconds
    expect(duration).toBeLessThan(45);
  });
});
