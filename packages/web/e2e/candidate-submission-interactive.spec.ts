/**
 * E2E tests for interactive board candidate submission
 * Tests the complete user flow of selecting a cell on the board and submitting a candidate
 *
 * Requirements: 1.1, 2.1, 3.1, 5.1, 6.4, 19.4
 *
 * Test Coverage:
 * - User can click on board cells to select a move
 * - Only legal moves are selectable
 * - Selected cell preview is displayed
 * - Validation errors are shown appropriately
 * - Unauthenticated users see disabled board
 */

import { test, expect } from './fixtures';
import {
  waitForNetworkIdle,
  waitForLoadingComplete,
  retryAssertion,
  TIMEOUTS,
} from './helpers/wait-utils';

test.describe('Interactive Board - Candidate Submission', () => {
  test('should display interactive board on candidate submission page', async ({
    authenticatedPage,
    game,
  }) => {
    // Navigate to candidate submission page
    await authenticatedPage.goto(`/games/${game.gameId}/candidates/new`);
    await waitForNetworkIdle(authenticatedPage);
    await waitForLoadingComplete(authenticatedPage);

    // Verify interactive board is visible
    await retryAssertion(async () => {
      const board = authenticatedPage.getByRole('grid', { name: 'オセロの盤面' });
      await expect(board).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    });

    // Verify board has 64 cells (8x8 grid)
    const cells = authenticatedPage.getByRole('gridcell');
    await expect(cells).toHaveCount(64);
  });

  test('should display legal move indicators on the board', async ({ authenticatedPage, game }) => {
    // Navigate to candidate submission page
    await authenticatedPage.goto(`/games/${game.gameId}/candidates/new`);
    await waitForNetworkIdle(authenticatedPage);
    await waitForLoadingComplete(authenticatedPage);

    // Wait for board to be visible
    const board = authenticatedPage.getByRole('grid', { name: 'オセロの盤面' });
    await expect(board).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Verify at least one legal move indicator is present
    // Legal moves should have "選択可能" in their aria-label
    await retryAssertion(async () => {
      const legalMoveCells = authenticatedPage.getByRole('gridcell', {
        name: /選択可能/,
      });
      const count = await legalMoveCells.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test('should select a cell when clicking on a legal move', async ({
    authenticatedPage,
    game,
  }) => {
    // Navigate to candidate submission page
    await authenticatedPage.goto(`/games/${game.gameId}/candidates/new`);
    await waitForNetworkIdle(authenticatedPage);
    await waitForLoadingComplete(authenticatedPage);

    // Wait for board to be visible
    const board = authenticatedPage.getByRole('grid', { name: 'オセロの盤面' });
    await expect(board).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Find and click a legal move cell
    const legalMoveCell = authenticatedPage.getByRole('gridcell', { name: /選択可能/ }).first();
    await legalMoveCell.click();

    // Verify the cell is now selected (aria-selected="true")
    await retryAssertion(async () => {
      await expect(legalMoveCell).toHaveAttribute('aria-selected', 'true');
    });
  });

  test('should display move preview when a cell is selected', async ({
    authenticatedPage,
    game,
  }) => {
    // Navigate to candidate submission page
    await authenticatedPage.goto(`/games/${game.gameId}/candidates/new`);
    await waitForNetworkIdle(authenticatedPage);
    await waitForLoadingComplete(authenticatedPage);

    // Wait for board to be visible
    const board = authenticatedPage.getByRole('grid', { name: 'オセロの盤面' });
    await expect(board).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Click a legal move cell
    const legalMoveCell = authenticatedPage.getByRole('gridcell', { name: /選択可能/ }).first();
    await legalMoveCell.click();

    // Verify move preview is displayed
    await retryAssertion(async () => {
      const preview = authenticatedPage.getByTestId('move-preview');
      await expect(preview).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    });
  });

  test('should toggle selection when clicking the same cell twice', async ({
    authenticatedPage,
    game,
  }) => {
    // Navigate to candidate submission page
    await authenticatedPage.goto(`/games/${game.gameId}/candidates/new`);
    await waitForNetworkIdle(authenticatedPage);
    await waitForLoadingComplete(authenticatedPage);

    // Wait for board to be visible
    const board = authenticatedPage.getByRole('grid', { name: 'オセロの盤面' });
    await expect(board).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Click a legal move cell
    const legalMoveCell = authenticatedPage.getByRole('gridcell', { name: /選択可能/ }).first();
    await legalMoveCell.click();

    // Verify cell is selected
    await expect(legalMoveCell).toHaveAttribute('aria-selected', 'true');

    // Click the same cell again
    await legalMoveCell.click();

    // Verify cell is no longer selected
    await retryAssertion(async () => {
      const isSelected = await legalMoveCell.getAttribute('aria-selected');
      expect(isSelected).not.toBe('true');
    });
  });

  test('should show validation error when submitting without selecting a cell', async ({
    authenticatedPage,
    game,
  }) => {
    // Navigate to candidate submission page
    await authenticatedPage.goto(`/games/${game.gameId}/candidates/new`);
    await waitForNetworkIdle(authenticatedPage);
    await waitForLoadingComplete(authenticatedPage);

    // Fill in description without selecting a cell
    const descriptionField = authenticatedPage.getByRole('textbox', {
      name: /説明文/,
    });
    await descriptionField.fill('テスト説明文');

    // Click submit button
    const submitButton = authenticatedPage.getByRole('button', {
      name: /候補を投稿/,
    });
    await submitButton.click();

    // Verify validation error is displayed
    await retryAssertion(async () => {
      const errorMessage = authenticatedPage.getByText('位置を選択してください');
      await expect(errorMessage).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    });
  });

  test('should successfully submit a candidate with selected cell and description', async ({
    authenticatedPage,
    game,
  }) => {
    // Navigate to candidate submission page
    await authenticatedPage.goto(`/games/${game.gameId}/candidates/new`);
    await waitForNetworkIdle(authenticatedPage);
    await waitForLoadingComplete(authenticatedPage);

    // Wait for board to be visible
    const board = authenticatedPage.getByRole('grid', { name: 'オセロの盤面' });
    await expect(board).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Select a legal move cell
    const legalMoveCell = authenticatedPage.getByRole('gridcell', { name: /選択可能/ }).first();
    await legalMoveCell.click();

    // Fill in description
    const descriptionField = authenticatedPage.getByRole('textbox', {
      name: /説明文/,
    });
    await descriptionField.fill('この手は相手の石を多く裏返せる良い手です。');

    // Submit the form
    const submitButton = authenticatedPage.getByRole('button', {
      name: /候補を投稿/,
    });
    await submitButton.click();

    // Verify redirect to game detail page
    await retryAssertion(async () => {
      await authenticatedPage.waitForURL(`/games/${game.gameId}`, {
        timeout: TIMEOUTS.LONG,
      });
    });
  });

  test('should show error message when clicking on an illegal move', async ({
    authenticatedPage,
    game,
  }) => {
    // Navigate to candidate submission page
    await authenticatedPage.goto(`/games/${game.gameId}/candidates/new`);
    await waitForNetworkIdle(authenticatedPage);
    await waitForLoadingComplete(authenticatedPage);

    // Wait for board to be visible
    const board = authenticatedPage.getByRole('grid', { name: 'オセロの盤面' });
    await expect(board).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Find a cell that is NOT a legal move (doesn't have "選択可能" in aria-label)
    const allCells = authenticatedPage.getByRole('gridcell');
    const cellCount = await allCells.count();

    // Find an illegal move cell
    let illegalMoveCell = null;
    for (let i = 0; i < cellCount; i++) {
      const cell = allCells.nth(i);
      const ariaLabel = await cell.getAttribute('aria-label');
      if (ariaLabel && !ariaLabel.includes('選択可能')) {
        illegalMoveCell = cell;
        break;
      }
    }

    // If we found an illegal move cell, click it
    if (illegalMoveCell) {
      await illegalMoveCell.click();

      // Verify error message is displayed
      await retryAssertion(async () => {
        const errorAlert = authenticatedPage.getByRole('alert');
        await expect(errorAlert).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
        await expect(errorAlert).toContainText('この位置には石を置けません');
      });
    }
  });

  test('should display "no legal moves" message when no moves are available', async ({
    authenticatedPage: _authenticatedPage,
    game: _game,
  }) => {
    // Note: This test would require a game state with no legal moves
    // For now, we'll skip this test as it requires specific game state setup
    test.skip();
  });

  test('should complete candidate submission within 45 seconds', async ({
    authenticatedPage,
    game,
  }) => {
    const startTime = Date.now();

    // Navigate to candidate submission page
    await authenticatedPage.goto(`/games/${game.gameId}/candidates/new`);
    await waitForNetworkIdle(authenticatedPage);
    await waitForLoadingComplete(authenticatedPage);

    // Wait for board to be visible
    const board = authenticatedPage.getByRole('grid', { name: 'オセロの盤面' });
    await expect(board).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Select a legal move cell
    const legalMoveCell = authenticatedPage.getByRole('gridcell', { name: /選択可能/ }).first();
    await legalMoveCell.click();

    // Fill in description
    const descriptionField = authenticatedPage.getByRole('textbox', {
      name: /説明文/,
    });
    await descriptionField.fill('パフォーマンステスト用の説明文です。');

    // Submit the form
    const submitButton = authenticatedPage.getByRole('button', {
      name: /候補を投稿/,
    });
    await submitButton.click();

    // Wait for redirect
    await authenticatedPage.waitForURL(`/games/${game.gameId}`, {
      timeout: TIMEOUTS.LONG,
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Verify completion time is within 45 seconds
    expect(duration).toBeLessThan(45000);
  });
});

test.describe('Interactive Board - Unauthenticated User', () => {
  test('should display disabled board for unauthenticated users', async ({ page, game }) => {
    // Navigate to candidate submission page without authentication
    await page.goto(`/games/${game.gameId}/candidates/new`);
    await waitForNetworkIdle(page);
    await waitForLoadingComplete(page);

    // Verify board is present but disabled or shows login message
    await retryAssertion(async () => {
      // Check for either disabled board or login message
      const loginMessage = page.getByText(/ログインして投稿/);
      const hasLoginMessage = (await loginMessage.count()) > 0;

      if (hasLoginMessage) {
        await expect(loginMessage).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
      } else {
        // If no login message, board should be disabled
        const board = page.getByRole('grid', { name: 'オセロの盤面' });
        await expect(board).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

        // Verify cells are not clickable (no legal move indicators)
        const legalMoveCells = page.getByRole('gridcell', { name: /選択可能/ });
        const count = await legalMoveCells.count();
        expect(count).toBe(0);
      }
    });
  });

  test('should redirect to login page when unauthenticated user tries to submit', async ({
    page,
    game,
  }) => {
    // Navigate to candidate submission page without authentication
    await page.goto(`/games/${game.gameId}/candidates/new`);
    await waitForNetworkIdle(page);
    await waitForLoadingComplete(page);

    // Try to submit (if submit button is present)
    const submitButton = page.getByRole('button', { name: /候補を投稿/ });
    const submitButtonCount = await submitButton.count();

    if (submitButtonCount > 0) {
      await submitButton.click();

      // Verify redirect to login page
      await retryAssertion(async () => {
        await page.waitForURL(/\/login/, { timeout: TIMEOUTS.LONG });
      });
    } else {
      // If no submit button, verify login message is shown
      const loginMessage = page.getByText(/ログインして投稿/);
      await expect(loginMessage).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    }
  });
});

test.describe('Interactive Board - Accessibility', () => {
  test('should have proper ARIA attributes on board and cells', async ({
    authenticatedPage,
    game,
  }) => {
    // Navigate to candidate submission page
    await authenticatedPage.goto(`/games/${game.gameId}/candidates/new`);
    await waitForNetworkIdle(authenticatedPage);
    await waitForLoadingComplete(authenticatedPage);

    // Verify board has role="grid"
    const board = authenticatedPage.getByRole('grid', { name: 'オセロの盤面' });
    await expect(board).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Verify cells have role="gridcell"
    const cells = authenticatedPage.getByRole('gridcell');
    await expect(cells.first()).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Verify legal move cells have "選択可能" in aria-label
    const legalMoveCells = authenticatedPage.getByRole('gridcell', {
      name: /選択可能/,
    });
    const count = await legalMoveCells.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should support keyboard navigation', async ({ authenticatedPage, game }) => {
    // Navigate to candidate submission page
    await authenticatedPage.goto(`/games/${game.gameId}/candidates/new`);
    await waitForNetworkIdle(authenticatedPage);
    await waitForLoadingComplete(authenticatedPage);

    // Wait for board to be visible
    const board = authenticatedPage.getByRole('grid', { name: 'オセロの盤面' });
    await expect(board).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Focus on the board
    await board.focus();

    // Try to navigate with arrow keys (basic test)
    await authenticatedPage.keyboard.press('ArrowRight');
    await authenticatedPage.keyboard.press('ArrowDown');

    // Try to select with Enter key
    await authenticatedPage.keyboard.press('Enter');

    // Note: Full keyboard navigation testing would require more detailed implementation
    // This is a basic smoke test to verify keyboard events are handled
  });
});
