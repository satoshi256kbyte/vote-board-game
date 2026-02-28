import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/login-page';
import { GameListPage } from '../page-objects/game-list-page';
import { VotingPage } from '../page-objects/voting-page';
import { createTestUser, loginUser } from '../helpers/test-user';
import { cleanupTestUser } from '../helpers/cleanup';
import { createTestGame, cleanupTestGame } from '../helpers/test-data';
import type { TestUser } from '../helpers/test-user';
import type { TestGame } from '../helpers/test-data';

/**
 * Session Timeout E2E Tests
 *
 * Requirements:
 * - 12.2: Verify user redirected to login page when simulating session timeout
 * - 8.2: Single test should complete within 30 seconds
 */

test.describe('Session Timeout Handling', () => {
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

  test('should redirect to login page when session expires', async ({ page, context }) => {
    // Login
    await loginUser(page, testUser);

    // Verify user is logged in by checking game list page
    const gameListPage = new GameListPage(page);
    await gameListPage.goto();
    await gameListPage.expectAtLeastOneGame();

    // Simulate session timeout by clearing cookies
    await context.clearCookies();

    // Attempt to access protected page (voting page)
    const votingPage = new VotingPage(page);
    await votingPage.goto(testGame.gameId);

    // Verify redirect to login page
    await page.waitForURL('**/login**', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('should redirect to login page when token is invalid', async ({ page, context }) => {
    // Login
    await loginUser(page, testUser);

    // Verify user is logged in
    const gameListPage = new GameListPage(page);
    await gameListPage.goto();
    await gameListPage.expectAtLeastOneGame();

    // Simulate invalid token by modifying cookies
    const cookies = await context.cookies();
    const authCookie = cookies.find((c) => c.name.includes('auth') || c.name.includes('token'));

    if (authCookie) {
      await context.addCookies([
        {
          ...authCookie,
          value: 'invalid-token-value',
        },
      ]);
    }

    // Attempt to access protected page
    const votingPage = new VotingPage(page);
    await votingPage.goto(testGame.gameId);

    // Verify redirect to login page or error message
    await page.waitForURL('**/login**', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('should show session expired message on login page', async ({ page, context }) => {
    // Login
    await loginUser(page, testUser);

    // Verify user is logged in
    const gameListPage = new GameListPage(page);
    await gameListPage.goto();
    await gameListPage.expectAtLeastOneGame();

    // Simulate session timeout by clearing cookies
    await context.clearCookies();

    // Attempt to access protected page
    const votingPage = new VotingPage(page);
    await votingPage.goto(testGame.gameId);

    // Wait for redirect to login page
    await page.waitForURL('**/login**', { timeout: 10000 });

    // Verify session expired message is displayed
    const messageElement = page.getByTestId('login-session-expired-message');
    await expect(messageElement).toBeVisible({ timeout: 5000 });
  });

  test('should allow re-login after session timeout', async ({ page, context }) => {
    // Login
    await loginUser(page, testUser);

    // Verify user is logged in
    const gameListPage = new GameListPage(page);
    await gameListPage.goto();
    await gameListPage.expectAtLeastOneGame();

    // Simulate session timeout by clearing cookies
    await context.clearCookies();

    // Attempt to access protected page
    const votingPage = new VotingPage(page);
    await votingPage.goto(testGame.gameId);

    // Wait for redirect to login page
    await page.waitForURL('**/login**', { timeout: 10000 });

    // Re-login
    const loginPage = new LoginPage(page);
    await loginPage.login(testUser.email, testUser.password);

    // Verify redirect to game list page
    await loginPage.expectRedirectToGameList();
  });
});
