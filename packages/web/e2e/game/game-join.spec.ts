/**
 * E2E tests for game join functionality
 * Tests joining a game and accessing the voting interface
 */

import { test, expect } from "../fixtures";;
import { GameDetailPage } from '../page-objects/game-detail-page';
import { VotingPage } from '../page-objects/voting-page';

// Merge fixtures

test.describe('Game Join Functionality', () => {
  test('should display join button on game detail page', async ({ authenticatedPage, game }) => {
    const gameDetailPage = new GameDetailPage(authenticatedPage);

    // Navigate to game detail page
    await gameDetailPage.goto(game.gameId);

    // Verify join button is visible
    await gameDetailPage.expectJoinButtonVisible();
  });

  test('should navigate to voting interface when clicking join button', async ({
    authenticatedPage,
    game,
  }) => {
    const gameDetailPage = new GameDetailPage(authenticatedPage);

    // Navigate to game detail page
    await gameDetailPage.goto(game.gameId);

    // Click join button
    await gameDetailPage.clickJoinGame();

    // Wait for navigation to voting page
    await authenticatedPage.waitForURL(`**/games/${game.gameId}/vote`, { timeout: 10000 });

    // Verify we're on the voting page
    expect(authenticatedPage.url()).toContain(`/games/${game.gameId}/vote`);
  });

  test('should access voting interface and see candidates', async ({ authenticatedPage, game }) => {
    const gameDetailPage = new GameDetailPage(authenticatedPage);
    const votingPage = new VotingPage(authenticatedPage);

    // Navigate to game detail page
    await gameDetailPage.goto(game.gameId);

    // Click join button
    await gameDetailPage.clickJoinGame();

    // Wait for navigation to voting page
    await authenticatedPage.waitForURL(`**/games/${game.gameId}/vote`, { timeout: 10000 });

    // Verify candidates are visible on voting page
    await votingPage.expectCandidatesVisible();
  });

  test('should allow direct access to voting page', async ({ authenticatedPage, game }) => {
    const votingPage = new VotingPage(authenticatedPage);

    // Navigate directly to voting page
    await votingPage.goto(game.gameId);

    // Verify candidates are visible
    await votingPage.expectCandidatesVisible();
  });

  test('should complete within 45 seconds', async ({ authenticatedPage, game }) => {
    const startTime = Date.now();
    const gameDetailPage = new GameDetailPage(authenticatedPage);
    const votingPage = new VotingPage(authenticatedPage);

    // Navigate to game detail page
    await gameDetailPage.goto(game.gameId);

    // Click join button
    await gameDetailPage.clickJoinGame();

    // Wait for navigation to voting page
    await authenticatedPage.waitForURL(`**/games/${game.gameId}/vote`, { timeout: 10000 });

    // Verify voting interface is accessible
    await votingPage.expectCandidatesVisible();

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    // Verify test completed within 45 seconds
    expect(duration).toBeLessThan(45);
  });
});
