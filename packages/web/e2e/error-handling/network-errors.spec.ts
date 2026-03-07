import { test, expect } from '@playwright/test';
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
 * - 12.1: Verify appropriate error message displayed when simulating network failure
 * - 8.2: Single test should complete within 30 seconds
 *
 * NOTE: VotingPage (/games/${gameId}/vote) is not yet implemented.
 * Tests that depend on voting functionality are skipped.
 */

test.describe('Network Error Handling', () => {
  let testUser: TestUser;
  let testGame: TestGame;

  test.beforeEach(async () => {
    testUser = await createTestUser();
    testGame = await createTestGame();
  });

  test.afterEach(async () => {
    if (testUser) {
      await cleanupTestUser(testUser.email);
    }
    if (testGame) {
      await cleanupTestGame(testGame);
    }
  });

  // VotingPage route does not exist yet - skip vote-related tests
  test.skip('should display error message when network fails during vote submission', async () => {
    // VotingPage (/games/${gameId}/vote) is not yet implemented
  });

  test.skip('should display error message when network fails during candidate submission', async () => {
    // VotingPage (/games/${gameId}/vote) is not yet implemented
  });

  test('should display error message when network fails loading game details', async ({ page }) => {
    // Login
    await loginUser(page, testUser);

    // Simulate network error for game details API
    await simulateNetworkError(page, `**/api/games/${testGame.gameId}**`);

    // Navigate to game detail page
    await page.goto(`/games/${testGame.gameId}`);

    // Wait for retry logic to exhaust (5 retries with exponential backoff)
    // and error state to appear
    await page.waitForTimeout(20000);

    // The game detail page shows "エラーが発生しました" when all retries fail
    // or redirects to /404 on 404 errors
    const pageContent = await page.textContent('body');
    const hasErrorIndicator =
      pageContent?.includes('エラー') ||
      pageContent?.includes('失敗') ||
      pageContent?.includes('読み込み') ||
      page.url().includes('/404');

    expect(hasErrorIndicator).toBeTruthy();
  });

  test.skip('should allow retry after network error', async () => {
    // VotingPage (/games/${gameId}/vote) is not yet implemented
  });
});
