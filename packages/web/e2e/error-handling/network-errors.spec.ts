import { test, expect } from '@playwright/test';
import { VotingPage } from '../page-objects/voting-page';
import { GameDetailPage } from '../page-objects/game-detail-page';
import { simulateNetworkError } from '../helpers/network-error';
import { createTestUser, loginUser } from '../helpers/test-user';
import { cleanupTestUser } from '../helpers/cleanup';
import { createTestGame, cleanupTestGame } from '../helpers/test-data';
import type { TestUser } from '../helpers/test-user';
import type { TestGame } from '../helpers/test-data';

/**
 * Network Error Handling E2E Tests
 *
 * Requirements:
 * - 12.1: Verify appropriate error message displayed when simulating network failure during voting
 * - 8.2: Single test should complete within 30 seconds
 */

test.describe('Network Error Handling', () => {
  let testUser: TestUser;
  let testGame: TestGame;

  test.beforeEach(async () => {
    // Create test user and game
    testUser = await createTestUser();
    testGame = await createTestGame();
  });

  test.afterEach(async () => {
    // Cleanup test data
    if (testUser) {
      await cleanupTestUser(testUser.email);
    }
    if (testGame) {
      await cleanupTestGame(testGame);
    }
  });

  test('should display error message when network fails during vote submission', async ({
    page,
  }) => {
    // Login
    await loginUser(page, testUser);

    // Navigate to voting page
    const votingPage = new VotingPage(page);
    await votingPage.goto(testGame.gameId);

    // Verify candidates are visible
    await votingPage.expectCandidatesVisible();

    // Simulate network error for vote submission API
    await simulateNetworkError(page, '**/api/votes**');

    // Attempt to vote
    const candidateId = testGame.candidates[0]?.candidateId || 'candidate-1';
    await votingPage.selectCandidate(candidateId);
    await votingPage.submitVote();

    // Verify error message is displayed
    await votingPage.expectErrorMessage('ネットワークエラー');
  });

  test('should display error message when network fails during candidate submission', async ({
    page,
  }) => {
    // Login
    await loginUser(page, testUser);

    // Navigate to voting page
    const votingPage = new VotingPage(page);
    await votingPage.goto(testGame.gameId);

    // Simulate network error for candidate submission API
    await simulateNetworkError(page, '**/api/candidates**');

    // Attempt to submit new candidate
    await votingPage.submitNewCandidate('テスト候補: ネットワークエラーテスト');

    // Verify error message is displayed
    await votingPage.expectErrorMessage('ネットワークエラー');
  });

  test('should display error message when network fails loading game details', async ({ page }) => {
    // Login
    await loginUser(page, testUser);

    // Simulate network error for game details API
    await simulateNetworkError(page, `**/api/games/${testGame.gameId}**`);

    // Navigate to game detail page
    const gameDetailPage = new GameDetailPage(page);
    await gameDetailPage.goto(testGame.gameId);

    // Verify error message or loading failure is displayed
    const errorElement = page.getByTestId('game-error-message');
    await expect(errorElement).toBeVisible({ timeout: 10000 });
    await expect(errorElement).toContainText('読み込みに失敗');
  });

  test('should allow retry after network error', async ({ page }) => {
    // Login
    await loginUser(page, testUser);

    // Navigate to voting page
    const votingPage = new VotingPage(page);
    await votingPage.goto(testGame.gameId);

    // Verify candidates are visible
    await votingPage.expectCandidatesVisible();

    // Simulate network error for vote submission API
    await simulateNetworkError(page, '**/api/votes**');

    // Attempt to vote (should fail)
    const candidateId = testGame.candidates[0]?.candidateId || 'candidate-1';
    await votingPage.selectCandidate(candidateId);
    await votingPage.submitVote();

    // Verify error message is displayed
    await votingPage.expectErrorMessage('ネットワークエラー');

    // Remove network error simulation
    await page.unroute('**/api/votes**');

    // Retry vote submission
    await votingPage.submitVote();

    // Verify success message is displayed
    await votingPage.expectSuccessMessage();
  });
});
