/**
 * E2E tests for game creation flow - Task 3
 * Tests the complete flow of creating a new game
 *
 * Requirements: 4.1-4.14
 */

import { test, expect } from '../fixtures';
import { TIMEOUTS } from '../helpers/wait-utils';

test.describe('Game Creation Flow - Basic Display (Task 3.1)', () => {
  test('should display page title "新しい対局を作成"', async ({ authenticatedPage }) => {
    // Navigate to game creation page
    await authenticatedPage.goto('/games/new');

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify page title is displayed (Requirements 4.1, 4.2, 4.3)
    const heading = authenticatedPage.locator('h1');
    await expect(heading).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await expect(heading).toContainText('新しい対局を作成', { timeout: TIMEOUTS.MEDIUM });
  });

  test('should redirect to login if not authenticated', async ({ page }) => {
    // Navigate to game creation page without authentication
    await page.goto('/games/new');

    // Wait for redirect
    await page.waitForURL('**/login**', { timeout: TIMEOUTS.MEDIUM });

    // Verify redirected to login page with redirect parameter
    expect(page.url()).toContain('/login');
    expect(page.url()).toContain('redirect=/games/new');
  });

  test('should complete within 30 seconds', async ({ authenticatedPage }) => {
    const startTime = Date.now();

    // Navigate to game creation page
    await authenticatedPage.goto('/games/new');

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify title is displayed
    const heading = authenticatedPage.locator('h1');
    await expect(heading).toContainText('新しい対局を作成', { timeout: TIMEOUTS.MEDIUM });

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    // Verify test completed within 30 seconds
    expect(duration).toBeLessThan(30);
  });
});

test.describe('Game Creation Flow - Form Elements (Task 3.2)', () => {
  test('should display game type selection', async ({ authenticatedPage }) => {
    // Navigate to game creation page
    await authenticatedPage.goto('/games/new');

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify game type selection is displayed (Requirement 4.4)
    const gameTypeLabel = authenticatedPage.locator('label[for="gameType"]');
    await expect(gameTypeLabel).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await expect(gameTypeLabel).toContainText('ゲームの種類');

    const gameTypeSelect = authenticatedPage.locator('select#gameType');
    await expect(gameTypeSelect).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Verify "オセロ" option is selected
    await expect(gameTypeSelect).toHaveValue('OTHELLO');
  });

  test('should display game mode selection', async ({ authenticatedPage }) => {
    // Navigate to game creation page
    await authenticatedPage.goto('/games/new');

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify game mode selection is displayed (Requirement 4.5)
    const gameModeLabel = authenticatedPage.locator('label[for="gameMode"]');
    await expect(gameModeLabel).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await expect(gameModeLabel).toContainText('対局モード');

    const gameModeSelect = authenticatedPage.locator('select#gameMode');
    await expect(gameModeSelect).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Verify "AI vs 集合知" option is selected
    await expect(gameModeSelect).toHaveValue('AI_VS_COLLECTIVE');
  });

  test('should display first player (AI side) selection', async ({ authenticatedPage }) => {
    // Navigate to game creation page
    await authenticatedPage.goto('/games/new');

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify AI side selection is displayed (Requirement 4.6)
    const aiSideLabel = authenticatedPage.locator('text=AIが担当する色（先手/後手）');
    await expect(aiSideLabel).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Verify BLACK (先手) radio button
    const blackRadio = authenticatedPage.locator('input[name="aiSide"][value="BLACK"]');
    await expect(blackRadio).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await expect(blackRadio).toBeChecked(); // Default selection

    // Verify WHITE (後手) radio button
    const whiteRadio = authenticatedPage.locator('input[name="aiSide"][value="WHITE"]');
    await expect(whiteRadio).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
  });

  test('should display all form elements together', async ({ authenticatedPage }) => {
    // Navigate to game creation page
    await authenticatedPage.goto('/games/new');

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify all form elements are visible
    await expect(authenticatedPage.locator('label[for="gameType"]')).toBeVisible({
      timeout: TIMEOUTS.MEDIUM,
    });
    await expect(authenticatedPage.locator('select#gameType')).toBeVisible({
      timeout: TIMEOUTS.MEDIUM,
    });
    await expect(authenticatedPage.locator('label[for="gameMode"]')).toBeVisible({
      timeout: TIMEOUTS.MEDIUM,
    });
    await expect(authenticatedPage.locator('select#gameMode')).toBeVisible({
      timeout: TIMEOUTS.MEDIUM,
    });
    await expect(authenticatedPage.locator('text=AIが担当する色（先手/後手）')).toBeVisible({
      timeout: TIMEOUTS.MEDIUM,
    });
    await expect(authenticatedPage.locator('input[name="aiSide"][value="BLACK"]')).toBeVisible({
      timeout: TIMEOUTS.MEDIUM,
    });
    await expect(authenticatedPage.locator('input[name="aiSide"][value="WHITE"]')).toBeVisible({
      timeout: TIMEOUTS.MEDIUM,
    });
  });
});

test.describe('Game Creation Flow - Form Input and Submission (Task 3.3)', () => {
  test('should allow selecting AI side (BLACK)', async ({ authenticatedPage }) => {
    // Navigate to game creation page
    await authenticatedPage.goto('/games/new');

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Select BLACK (先手) - already selected by default
    const blackRadio = authenticatedPage.locator('input[name="aiSide"][value="BLACK"]');
    await expect(blackRadio).toBeChecked();

    // Verify the selection is highlighted (Requirement 4.7)
    await expect(blackRadio).toBeChecked();
  });

  test('should allow selecting AI side (WHITE)', async ({ authenticatedPage }) => {
    // Navigate to game creation page
    await authenticatedPage.goto('/games/new');

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Select WHITE (後手) (Requirement 4.9)
    const whiteRadio = authenticatedPage.locator('input[name="aiSide"][value="WHITE"]');
    await whiteRadio.click();

    // Verify the selection is highlighted
    await expect(whiteRadio).toBeChecked();

    // Verify BLACK is no longer checked
    const blackRadio = authenticatedPage.locator('input[name="aiSide"][value="BLACK"]');
    await expect(blackRadio).not.toBeChecked();
  });

  test('should submit form and send POST request to Game API', async ({
    authenticatedPage,
    context: _context,
  }) => {
    // Navigate to game creation page
    await authenticatedPage.goto('/games/new');

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Set up request interception to verify POST request
    const requestPromise = authenticatedPage.waitForRequest(
      (request) =>
        request.url().includes('/api/games') &&
        request.method() === 'POST' &&
        !request.url().includes('/api/games/'),
      { timeout: TIMEOUTS.LONG }
    );

    // Select AI side (use default BLACK)
    const blackRadio = authenticatedPage.locator('input[name="aiSide"][value="BLACK"]');
    await expect(blackRadio).toBeChecked();

    // Click create button (Requirement 4.10)
    const createButton = authenticatedPage.locator('button[type="submit"]');
    await expect(createButton).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await expect(createButton).toContainText('対局を作成');
    await createButton.click();

    // Wait for POST request to be sent
    const request = await requestPromise;

    // Verify request was sent to correct endpoint
    expect(request.url()).toContain('/api/games');
    expect(request.method()).toBe('POST');

    // Verify request body contains correct data
    const postData = request.postDataJSON();
    expect(postData).toHaveProperty('gameType', 'OTHELLO');
    expect(postData).toHaveProperty('aiSide', 'BLACK');
  });

  test('should disable submit button while submitting', async ({ authenticatedPage }) => {
    // Navigate to game creation page
    await authenticatedPage.goto('/games/new');

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Get submit button
    const createButton = authenticatedPage.locator('button[type="submit"]');
    await expect(createButton).toBeEnabled();

    // Click create button
    await createButton.click();

    // Verify button is disabled during submission
    await expect(createButton).toBeDisabled({ timeout: TIMEOUTS.SHORT });

    // Verify button text changes to "作成中..."
    await expect(createButton).toContainText('作成中...', { timeout: TIMEOUTS.SHORT });
  });
});

test.describe('Game Creation Flow - Success Behavior (Task 3.4)', () => {
  test('should redirect to game detail page after successful creation', async ({
    authenticatedPage,
  }) => {
    // Navigate to game creation page
    await authenticatedPage.goto('/games/new');

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Submit form with default values (BLACK)
    const createButton = authenticatedPage.locator('button[type="submit"]');
    await createButton.click();

    // Wait for redirect to game detail page (Requirement 4.11)
    await authenticatedPage.waitForURL('**/games/**', { timeout: TIMEOUTS.LONG });

    // Verify we're on a game detail page
    const url = authenticatedPage.url();
    expect(url).toMatch(/\/games\/[a-zA-Z0-9-]+$/);

    // Extract game ID from URL
    const match = url.match(/\/games\/([a-zA-Z0-9-]+)$/);
    expect(match).toBeTruthy();
    const gameId = match![1];
    expect(gameId).toBeTruthy();
  });

  test('should display newly created game on detail page', async ({ authenticatedPage }) => {
    // Navigate to game creation page
    await authenticatedPage.goto('/games/new');

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Submit form
    const createButton = authenticatedPage.locator('button[type="submit"]');
    await createButton.click();

    // Wait for redirect to game detail page
    await authenticatedPage.waitForURL('**/games/**', { timeout: TIMEOUTS.LONG });

    // Wait for game detail page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify game detail page is displayed (Requirement 4.12)
    const heading = authenticatedPage.locator('h1');
    await expect(heading).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await expect(heading).toContainText('オセロ対局', { timeout: TIMEOUTS.MEDIUM });

    // Verify board is displayed
    const board = authenticatedPage.locator('role=grid[name="オセロの盤面"]');
    await expect(board).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
  });

  test('should display correct initial board state', async ({ authenticatedPage }) => {
    // Navigate to game creation page
    await authenticatedPage.goto('/games/new');

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Submit form
    const createButton = authenticatedPage.locator('button[type="submit"]');
    await createButton.click();

    // Wait for redirect to game detail page
    await authenticatedPage.waitForURL('**/games/**', { timeout: TIMEOUTS.LONG });

    // Wait for game detail page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify initial board state (Requirement 4.13)
    // Initial Othello board has 2 black discs and 2 white discs in the center
    const board = authenticatedPage.locator('role=grid[name="オセロの盤面"]');
    await expect(board).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Count black and white discs on the board
    const blackDiscs = board.locator('role=gridcell[aria-label*="黒"]');
    const whiteDiscs = board.locator('role=gridcell[aria-label*="白"]');

    // Wait for discs to be rendered
    await expect(blackDiscs.first()).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await expect(whiteDiscs.first()).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Verify initial disc counts (2 black, 2 white)
    const blackCount = await blackDiscs.count();
    const whiteCount = await whiteDiscs.count();

    expect(blackCount).toBe(2);
    expect(whiteCount).toBe(2);

    // Verify disc counts are displayed correctly in the UI
    const discCountSection = authenticatedPage.locator('text=盤面').locator('..').locator('..');
    const blackCountText = await discCountSection
      .locator('.bg-black.rounded-full')
      .locator('..')
      .locator('span.font-semibold')
      .first()
      .textContent();
    const whiteCountText = await discCountSection
      .locator('.bg-white.rounded-full.border-2')
      .locator('..')
      .locator('span.font-semibold')
      .textContent();

    expect(parseInt(blackCountText || '0', 10)).toBe(2);
    expect(parseInt(whiteCountText || '0', 10)).toBe(2);
  });

  test('should complete entire creation flow within 30 seconds', async ({ authenticatedPage }) => {
    const startTime = Date.now();

    // Navigate to game creation page
    await authenticatedPage.goto('/games/new');

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Submit form
    const createButton = authenticatedPage.locator('button[type="submit"]');
    await createButton.click();

    // Wait for redirect to game detail page
    await authenticatedPage.waitForURL('**/games/**', { timeout: TIMEOUTS.LONG });

    // Wait for game detail page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify board is displayed
    const board = authenticatedPage.locator('role=grid[name="オセロの盤面"]');
    await expect(board).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    // Verify entire flow completed within 30 seconds
    expect(duration).toBeLessThan(30);
  });
});

test.describe('Game Creation Flow - Error Handling (Task 3.5)', () => {
  test('should display error message when creation fails', async ({
    authenticatedPage,
    context: _context,
  }) => {
    // Navigate to game creation page
    await authenticatedPage.goto('/games/new');

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Intercept API request and return error
    await authenticatedPage.route('**/api/games', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Internal Server Error',
            message: '対局の作成に失敗しました',
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Submit form
    const createButton = authenticatedPage.locator('button[type="submit"]');
    await createButton.click();

    // Wait for error message to appear (Requirement 4.14)
    const errorMessage = authenticatedPage.locator('.bg-red-50');
    await expect(errorMessage).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await expect(errorMessage).toContainText('対局の作成に失敗しました');

    // Verify we're still on the creation page (not redirected)
    expect(authenticatedPage.url()).toContain('/games/new');

    // Verify submit button is re-enabled
    await expect(createButton).toBeEnabled();
    await expect(createButton).toContainText('対局を作成');
  });

  test('should display network error message', async ({ authenticatedPage }) => {
    // Navigate to game creation page
    await authenticatedPage.goto('/games/new');

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Intercept API request and simulate network error
    await authenticatedPage.route('**/api/games', async (route) => {
      if (route.request().method() === 'POST') {
        await route.abort('failed');
      } else {
        await route.continue();
      }
    });

    // Submit form
    const createButton = authenticatedPage.locator('button[type="submit"]');
    await createButton.click();

    // Wait for error message to appear
    const errorMessage = authenticatedPage.locator('.bg-red-50');
    await expect(errorMessage).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Verify error message is displayed
    const errorText = await errorMessage.textContent();
    expect(errorText).toBeTruthy();

    // Verify we're still on the creation page
    expect(authenticatedPage.url()).toContain('/games/new');
  });

  test('should allow retry after error', async ({ authenticatedPage }) => {
    // Navigate to game creation page
    await authenticatedPage.goto('/games/new');

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');

    let requestCount = 0;

    // Intercept API request - fail first time, succeed second time
    await authenticatedPage.route('**/api/games', async (route) => {
      if (route.request().method() === 'POST') {
        requestCount++;
        if (requestCount === 1) {
          // First request fails
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Internal Server Error',
              message: '対局の作成に失敗しました',
            }),
          });
        } else {
          // Second request succeeds
          await route.continue();
        }
      } else {
        await route.continue();
      }
    });

    // First submission (will fail)
    const createButton = authenticatedPage.locator('button[type="submit"]');
    await createButton.click();

    // Wait for error message
    const errorMessage = authenticatedPage.locator('.bg-red-50');
    await expect(errorMessage).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Verify button is re-enabled
    await expect(createButton).toBeEnabled();

    // Remove route to allow second request to succeed
    await authenticatedPage.unroute('**/api/games');

    // Second submission (will succeed)
    await createButton.click();

    // Wait for redirect to game detail page
    await authenticatedPage.waitForURL('**/games/**', { timeout: TIMEOUTS.LONG });

    // Verify we're on game detail page
    const heading = authenticatedPage.locator('h1');
    await expect(heading).toContainText('オセロ対局', { timeout: TIMEOUTS.MEDIUM });
  });
});
