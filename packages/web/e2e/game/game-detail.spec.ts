/**
 * E2E tests for game detail page
 * Tests game detail display including board state, move history, and AI commentary
 */

import { test, expect } from "../fixtures";;
import { GameDetailPage } from '../page-objects/game-detail-page';

// Merge fixtures

test.describe('Game Detail Page', () => {
  test('should display current board state', async ({ authenticatedPage, game }) => {
    const gameDetailPage = new GameDetailPage(authenticatedPage);

    // Navigate to game detail page
    await gameDetailPage.goto(game.gameId);

    // Verify board state is visible
    await gameDetailPage.expectBoardStateVisible();
  });

  test('should display move history', async ({ authenticatedPage, game }) => {
    const gameDetailPage = new GameDetailPage(authenticatedPage);

    // Navigate to game detail page
    await gameDetailPage.goto(game.gameId);

    // Verify move history is visible
    await gameDetailPage.expectMoveHistoryVisible();
  });

  test('should display AI commentary', async ({ authenticatedPage, game }) => {
    const gameDetailPage = new GameDetailPage(authenticatedPage);

    // Navigate to game detail page
    await gameDetailPage.goto(game.gameId);

    // Verify AI commentary is visible
    await gameDetailPage.expectAICommentaryVisible();
  });

  test('should display all game information together', async ({ authenticatedPage, game }) => {
    const gameDetailPage = new GameDetailPage(authenticatedPage);

    // Navigate to game detail page
    await gameDetailPage.goto(game.gameId);

    // Verify all key elements are visible
    await gameDetailPage.expectBoardStateVisible();
    await gameDetailPage.expectMoveHistoryVisible();
    await gameDetailPage.expectAICommentaryVisible();
    await gameDetailPage.expectJoinButtonVisible();
  });

  test('should complete within 45 seconds', async ({ authenticatedPage, game }) => {
    const startTime = Date.now();
    const gameDetailPage = new GameDetailPage(authenticatedPage);

    // Navigate to game detail page
    await gameDetailPage.goto(game.gameId);

    // Verify all elements are displayed
    await gameDetailPage.expectBoardStateVisible();
    await gameDetailPage.expectMoveHistoryVisible();
    await gameDetailPage.expectAICommentaryVisible();

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    // Verify test completed within 45 seconds
    expect(duration).toBeLessThan(45);
  });
});
