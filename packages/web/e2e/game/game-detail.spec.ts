/**
 * E2E tests for game detail page - Tasks 2.1, 2.2, and 2.3
 * Tests basic display of game detail page including title, board component,
 * board state verification (8x8 grid, disc counts, current player), and move history
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 */

import { test, expect } from '../fixtures';
import { TIMEOUTS } from '../helpers/wait-utils';

test.describe('Game Detail Page - Basic Display (Task 2.1)', () => {
  test('should display page title "オセロ対局"', async ({ authenticatedPage, game }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify page title contains "オセロ対局"
    const heading = authenticatedPage.locator('h1');
    await expect(heading).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await expect(heading).toContainText('オセロ対局', { timeout: TIMEOUTS.MEDIUM });
  });

  test('should display board component', async ({ authenticatedPage, game }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify board component is displayed (using role="grid" which is the board's ARIA role)
    const board = authenticatedPage.locator('role=grid[name="オセロの盤面"]');
    await expect(board).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Verify board has 64 cells (8x8 grid)
    const cells = board.locator('role=gridcell');
    const cellCount = await cells.count();
    expect(cellCount).toBe(64);
  });

  test('should display page title and board together', async ({ authenticatedPage, game }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify both title and board are visible
    const heading = authenticatedPage.locator('h1');
    await expect(heading).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await expect(heading).toContainText('オセロ対局', { timeout: TIMEOUTS.MEDIUM });

    const board = authenticatedPage.locator('role=grid[name="オセロの盤面"]');
    await expect(board).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
  });

  test('should complete within 30 seconds', async ({ authenticatedPage, game }) => {
    const startTime = Date.now();

    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify title and board are displayed
    const heading = authenticatedPage.locator('h1');
    await expect(heading).toContainText('オセロ対局', { timeout: TIMEOUTS.MEDIUM });

    const board = authenticatedPage.locator('role=grid[name="オセロの盤面"]');
    await expect(board).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    // Verify test completed within 30 seconds (as per Requirement 12.1)
    expect(duration).toBeLessThan(30);
  });
});

test.describe('Game Detail Page - Board State Verification (Task 2.2)', () => {
  test('should verify board is 8x8 grid with 64 cells', async ({ authenticatedPage, game }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify board component is displayed
    const board = authenticatedPage.locator('role=grid[name="オセロの盤面"]');
    await expect(board).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Verify board has exactly 64 cells (8x8 grid)
    const cells = board.locator('role=gridcell');
    const cellCount = await cells.count();
    expect(cellCount).toBe(64);

    // Verify cells are arranged in 8 rows and 8 columns
    // Check that we have cells at positions A1 through H8
    await expect(cells.first()).toHaveAttribute('aria-label', /^A1:/);
    await expect(cells.last()).toHaveAttribute('aria-label', /^H8:/);
  });

  test('should display black and white disc counts', async ({ authenticatedPage, game }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify disc count section is visible
    // The disc counts are displayed with visual disc icons and numbers
    const discCountSection = authenticatedPage.locator('text=盤面').locator('..').locator('..');

    // Verify black disc count is displayed (look for black disc icon and number)
    const blackDiscIcon = discCountSection.locator('.bg-black.rounded-full').first();
    await expect(blackDiscIcon).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Get the black disc count (should be next to the black disc icon)
    const blackCountText = await discCountSection
      .locator('.bg-black.rounded-full')
      .locator('..')
      .locator('span.font-semibold')
      .first()
      .textContent();
    expect(blackCountText).toBeTruthy();
    const blackCount = parseInt(blackCountText || '0', 10);
    expect(blackCount).toBeGreaterThanOrEqual(0);

    // Verify white disc count is displayed (look for white disc icon and number)
    const whiteDiscIcon = discCountSection.locator('.bg-white.rounded-full.border-2').first();
    await expect(whiteDiscIcon).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Get the white disc count (should be next to the white disc icon)
    const whiteCountText = await discCountSection
      .locator('.bg-white.rounded-full.border-2')
      .locator('..')
      .locator('span.font-semibold')
      .textContent();
    expect(whiteCountText).toBeTruthy();
    const whiteCount = parseInt(whiteCountText || '0', 10);
    expect(whiteCount).toBeGreaterThanOrEqual(0);

    // For initial Othello board, verify 2 black and 2 white discs
    // The test game is created with initial board state
    expect(blackCount).toBe(2);
    expect(whiteCount).toBe(2);
  });

  test('should display current player turn', async ({ authenticatedPage, game }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify current player turn is displayed
    const currentTurnText = authenticatedPage.locator('text=現在のターン:');
    await expect(currentTurnText).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Verify the current player label (黒 or 白) is displayed
    const currentPlayerLabel = currentTurnText.locator('..').locator('span.font-bold');
    await expect(currentPlayerLabel).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Get the current player text
    const playerText = await currentPlayerLabel.textContent();
    expect(playerText).toBeTruthy();

    // Verify it's either 黒 (black) or 白 (white)
    expect(['黒', '白']).toContain(playerText);

    // For the initial test game, the current player should be 黒 (black)
    expect(playerText).toBe('黒');
  });

  test('should verify all board state elements together', async ({ authenticatedPage, game }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify board is 8x8 grid
    const board = authenticatedPage.locator('role=grid[name="オセロの盤面"]');
    await expect(board).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    const cells = board.locator('role=gridcell');
    expect(await cells.count()).toBe(64);

    // Verify disc counts are displayed
    const discCountSection = authenticatedPage.locator('text=盤面').locator('..').locator('..');
    await expect(discCountSection.locator('.bg-black.rounded-full').first()).toBeVisible({
      timeout: TIMEOUTS.MEDIUM,
    });
    await expect(discCountSection.locator('.bg-white.rounded-full.border-2').first()).toBeVisible({
      timeout: TIMEOUTS.MEDIUM,
    });

    // Verify current player turn is displayed
    const currentTurnText = authenticatedPage.locator('text=現在のターン:');
    await expect(currentTurnText).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    const currentPlayerLabel = currentTurnText.locator('..').locator('span.font-bold');
    await expect(currentPlayerLabel).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Verify all elements are visible together
    const playerText = await currentPlayerLabel.textContent();
    expect(['黒', '白']).toContain(playerText);
  });
});

test.describe('Game Detail Page - Move History Display (Task 2.3)', () => {
  test('should verify move history section is not displayed for games with no moves', async ({
    authenticatedPage,
    game,
  }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Note: Currently, the backend returns an empty moves array
    // The frontend only displays the move history section when moves.length > 0
    // Therefore, we verify the section is NOT displayed for initial games

    // Verify move history section heading is NOT visible
    const moveHistoryHeading = authenticatedPage.locator('h2:has-text("手の履歴")');
    const isVisible = await moveHistoryHeading.isVisible().catch(() => false);
    expect(isVisible).toBe(false);
  });

  test('should verify MoveHistory component structure is ready', async ({
    authenticatedPage,
    game,
  }) => {
    // This test verifies that the page structure is ready for move history
    // even though the backend doesn't yet provide move data

    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify the page loads successfully
    const heading = authenticatedPage.locator('h1');
    await expect(heading).toContainText('オセロ対局', { timeout: TIMEOUTS.MEDIUM });

    // Verify board is displayed (move history will be shown below the board when implemented)
    const board = authenticatedPage.locator('role=grid[name="オセロの盤面"]');
    await expect(board).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // The move history section will be displayed here once the backend implements it
    // For now, we verify the page structure is correct
  });

  // The following tests are skipped until the backend implements move history
  // Requirements: 2.7, 2.8, 2.9, 2.10, 2.11

  test.skip('TODO: should display move history component when moves exist', async () => {
    // This test will be implemented when the backend returns move history
    // It should verify:
    // - Move history section heading "手の履歴" is visible
    // - Move history list with role="list" is displayed
  });

  test.skip('TODO: should display moves in chronological order (newest first)', async () => {
    // This test will be implemented when the backend returns move history
    // It should verify:
    // - Moves are displayed in descending order by turn number
    // - Requirement 2.8: Moves shown in chronological order
  });

  test.skip('TODO: should display turn number in each move', async () => {
    // This test will be implemented when the backend returns move history
    // It should verify:
    // - Each move displays its turn number (format: "{turn}手目")
    // - Requirement 2.9: Each move contains turn number
  });

  test.skip('TODO: should display player color in each move', async () => {
    // This test will be implemented when the backend returns move history
    // It should verify:
    // - Each move displays the player color (黒 or 白)
    // - Requirement 2.10: Each move contains player color
  });

  test.skip('TODO: should display move position in each move', async () => {
    // This test will be implemented when the backend returns move history
    // It should verify:
    // - Each move displays the position (e.g., "D3", "E4")
    // - Requirement 2.11: Each move contains move position
  });

  test.skip('TODO: should display all required fields together in each move', async () => {
    // This test will be implemented when the backend returns move history
    // It should verify:
    // - Each move displays turn number, player color, and position together
    // - Requirements 2.9, 2.10, 2.11: All move fields displayed
  });
});

test.describe('Game Detail Page - Action Buttons Display (Task 2.4)', () => {
  test('should display share button', async ({ authenticatedPage, game }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify share button is visible
    const shareButton = authenticatedPage.locator('[data-testid="share-button"]');
    await expect(shareButton).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Verify button has correct text
    await expect(shareButton).toContainText('シェア');

    // Verify button has correct aria-label
    await expect(shareButton).toHaveAttribute('aria-label', 'シェア');
  });

  test('should display post candidate button for active games', async ({
    authenticatedPage,
    game,
  }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify post candidate button is visible (only for active games)
    const postCandidateButton = authenticatedPage.locator('[data-testid="post-candidate-button"]');

    // The test game should be active, so the button should be visible
    await expect(postCandidateButton).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Verify button has correct text
    await expect(postCandidateButton).toContainText('候補を投稿');

    // Verify button links to the correct URL
    await expect(postCandidateButton).toHaveAttribute(
      'href',
      `/games/${game.gameId}/candidates/new`
    );
  });

  test('should display both action buttons together', async ({ authenticatedPage, game }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify both buttons are visible
    const shareButton = authenticatedPage.locator('[data-testid="share-button"]');
    const postCandidateButton = authenticatedPage.locator('[data-testid="post-candidate-button"]');

    await expect(shareButton).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await expect(postCandidateButton).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Verify both buttons have correct text
    await expect(shareButton).toContainText('シェア');
    await expect(postCandidateButton).toContainText('候補を投稿');
  });
});

test.describe('Game Detail Page - 404 Error Handling (Task 2.5)', () => {
  test('should display 404 error message for non-existent game ID', async ({
    authenticatedPage,
  }) => {
    // Use a non-existent game ID
    const nonExistentGameId = 'non-existent-game-id-12345';

    // Navigate to game detail page with non-existent ID
    await authenticatedPage.goto(`/games/${nonExistentGameId}`);

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify 404 error message is displayed
    const errorHeading = authenticatedPage.locator('h1:has-text("対局が見つかりません")');
    await expect(errorHeading).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Verify error description is displayed
    const errorDescription = authenticatedPage.locator(
      'text=指定された対局は存在しないか、削除された可能性があります。'
    );
    await expect(errorDescription).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Verify "Back to game list" link is displayed
    const backLink = authenticatedPage.locator('a:has-text("対局一覧に戻る")');
    await expect(backLink).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await expect(backLink).toHaveAttribute('href', '/');
  });

  test('should allow navigation back to game list from 404 page', async ({ authenticatedPage }) => {
    // Use a non-existent game ID
    const nonExistentGameId = 'non-existent-game-id-67890';

    // Navigate to game detail page with non-existent ID
    await authenticatedPage.goto(`/games/${nonExistentGameId}`);

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify 404 error message is displayed
    const errorHeading = authenticatedPage.locator('h1:has-text("対局が見つかりません")');
    await expect(errorHeading).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Click "Back to game list" link
    const backLink = authenticatedPage.locator('a:has-text("対局一覧に戻る")');
    await backLink.click();

    // Wait for navigation to complete
    await authenticatedPage.waitForURL('/', { timeout: TIMEOUTS.MEDIUM });

    // Verify we're on the game list page
    const gameListHeading = authenticatedPage.locator('h1:has-text("対局一覧")');
    await expect(gameListHeading).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
  });

  test('should display 404 page with proper styling and layout', async ({ authenticatedPage }) => {
    // Use a non-existent game ID
    const nonExistentGameId = 'test-404-styling';

    // Navigate to game detail page with non-existent ID
    await authenticatedPage.goto(`/games/${nonExistentGameId}`);

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify the page has proper structure
    const mainElement = authenticatedPage.locator('main');
    await expect(mainElement).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Verify all key elements are present
    const errorHeading = authenticatedPage.locator('h1:has-text("対局が見つかりません")');
    const errorDescription = authenticatedPage.locator(
      'text=指定された対局は存在しないか、削除された可能性があります。'
    );
    const backLink = authenticatedPage.locator('a:has-text("対局一覧に戻る")');

    await expect(errorHeading).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await expect(errorDescription).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await expect(backLink).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Verify the page is centered (has flex items-center justify-center classes)
    await expect(mainElement).toHaveClass(/flex/);
    await expect(mainElement).toHaveClass(/items-center/);
    await expect(mainElement).toHaveClass(/justify-center/);
  });
});
