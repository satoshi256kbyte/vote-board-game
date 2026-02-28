/**
 * E2E tests for social sharing URLs
 * Tests share URL generation and shared content display
 */

import { test, expect } from "../fixtures";;
import { GameDetailPage } from '../page-objects/game-detail-page';
import { VotingPage } from '../page-objects/voting-page';

// Merge fixtures

test.describe('Share URL Generation', () => {
  test('should generate share URL when clicking share button', async ({
    authenticatedPage,
    game,
  }) => {
    const gameDetailPage = new GameDetailPage(authenticatedPage);

    // Navigate to game detail page
    await gameDetailPage.goto(game.gameId);

    // Click share button
    await gameDetailPage.clickShare();

    // Verify share URL is displayed
    const shareUrlElement = authenticatedPage.getByTestId('game-share-url');
    await expect(shareUrlElement).toBeVisible();

    // Verify share URL contains game ID
    const shareUrl = await shareUrlElement.textContent();
    expect(shareUrl).toContain(game.gameId);
  });

  test('should generate valid share URL format', async ({ authenticatedPage, game }) => {
    const gameDetailPage = new GameDetailPage(authenticatedPage);

    // Navigate to game detail page
    await gameDetailPage.goto(game.gameId);

    // Get share URL
    const shareUrl = await gameDetailPage.getShareUrl();

    // Verify URL format
    expect(shareUrl).toMatch(/\/games\/[a-zA-Z0-9-]+/);
    expect(shareUrl).toContain(game.gameId);
  });

  test('should complete within 30 seconds', async ({ authenticatedPage, game }) => {
    const startTime = Date.now();
    const gameDetailPage = new GameDetailPage(authenticatedPage);

    // Navigate to game detail page
    await gameDetailPage.goto(game.gameId);

    // Generate share URL
    const shareUrl = await gameDetailPage.getShareUrl();

    // Verify URL was generated
    expect(shareUrl).toBeTruthy();

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    // Verify test completed within 30 seconds
    expect(duration).toBeLessThan(30);
  });
});

test.describe('Shared Game URL Access', () => {
  test('should display correct game state when accessing shared game URL', async ({
    authenticatedPage,
    game,
  }) => {
    const gameDetailPage = new GameDetailPage(authenticatedPage);

    // Navigate directly to game URL (simulating shared link access)
    await gameDetailPage.goto(game.gameId);

    // Verify correct game state is displayed
    await gameDetailPage.expectBoardStateVisible();
    await gameDetailPage.expectMoveHistoryVisible();
    await gameDetailPage.expectAICommentaryVisible();
  });

  test('should display all game information from shared URL', async ({
    authenticatedPage,
    game,
  }) => {
    const gameDetailPage = new GameDetailPage(authenticatedPage);

    // Access shared game URL
    await gameDetailPage.goto(game.gameId);

    // Verify all key elements are visible
    await gameDetailPage.expectBoardStateVisible();
    await gameDetailPage.expectMoveHistoryVisible();
    await gameDetailPage.expectAICommentaryVisible();
    await gameDetailPage.expectJoinButtonVisible();
  });

  test('should allow interaction with shared game', async ({ authenticatedPage, game }) => {
    const gameDetailPage = new GameDetailPage(authenticatedPage);

    // Access shared game URL
    await gameDetailPage.goto(game.gameId);

    // Verify user can interact with the game
    await gameDetailPage.expectJoinButtonVisible();

    // Click join button
    await gameDetailPage.clickJoinGame();

    // Verify navigation to voting page
    await expect(authenticatedPage).toHaveURL(new RegExp(`/games/${game.gameId}/vote`));
  });

  test('should complete within 30 seconds', async ({ authenticatedPage, game }) => {
    const startTime = Date.now();
    const gameDetailPage = new GameDetailPage(authenticatedPage);

    // Access shared game URL
    await gameDetailPage.goto(game.gameId);

    // Verify game state is displayed
    await gameDetailPage.expectBoardStateVisible();
    await gameDetailPage.expectMoveHistoryVisible();

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    // Verify test completed within 30 seconds
    expect(duration).toBeLessThan(30);
  });
});

test.describe('Shared Candidate URL Access', () => {
  test('should display correct candidate details when accessing shared candidate URL', async ({
    authenticatedPage,
    game,
  }) => {
    const votingPage = new VotingPage(authenticatedPage);

    // Navigate to voting page (simulating shared candidate link access)
    await votingPage.goto(game.gameId);

    // Verify candidates are displayed
    await votingPage.expectCandidatesVisible();
  });

  test('should display candidate descriptions from shared URL', async ({
    authenticatedPage,
    game,
  }) => {
    const votingPage = new VotingPage(authenticatedPage);

    // Access shared candidate URL
    await votingPage.goto(game.gameId);

    // Verify candidates list is visible
    const candidatesContainer = authenticatedPage.getByTestId('vote-candidates-list');
    await expect(candidatesContainer).toBeVisible();

    // Verify at least one candidate is displayed
    const candidates = authenticatedPage.getByTestId(/^vote-candidate-/);
    await expect(candidates.first()).toBeVisible();
  });

  test('should allow voting from shared candidate URL', async ({ authenticatedPage, game }) => {
    const votingPage = new VotingPage(authenticatedPage);

    // Access shared candidate URL
    await votingPage.goto(game.gameId);

    // Verify candidates are visible
    await votingPage.expectCandidatesVisible();

    // Verify submit button is available
    const submitButton = authenticatedPage.getByTestId('vote-submit-button');
    await expect(submitButton).toBeVisible();
  });

  test('should complete within 30 seconds', async ({ authenticatedPage, game }) => {
    const startTime = Date.now();
    const votingPage = new VotingPage(authenticatedPage);

    // Access shared candidate URL
    await votingPage.goto(game.gameId);

    // Verify candidates are displayed
    await votingPage.expectCandidatesVisible();

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    // Verify test completed within 30 seconds
    expect(duration).toBeLessThan(30);
  });
});
