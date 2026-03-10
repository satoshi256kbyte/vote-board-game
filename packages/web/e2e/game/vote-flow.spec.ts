/**
 * E2E tests for voting flow
 * Tests the complete voting functionality including:
 * - Authenticated user voting on candidates
 * - Vote change flow with confirmation dialog
 * - Unauthenticated user restrictions
 * - Error message display
 *
 * Requirements: 25-vote-button-status-display
 * - Requirement 1: 未認証ユーザーの投票制限
 * - Requirement 2: 投票済み状態の表示
 * - Requirement 3: 投票変更ボタンの表示
 * - Requirement 4: 投票変更の確認
 * - Requirement 5: 投票成功後のUI更新
 * - Requirement 7: エラーメッセージの表示
 */

import { test, expect } from '../fixtures';
import { waitForNetworkIdle, waitForApiResponse, TIMEOUTS } from '../helpers/wait-utils';

test.describe('Vote Flow - Authenticated User', () => {
  test('should allow authenticated user to vote on candidate', async ({
    authenticatedPage,
    game,
  }) => {
    const startTime = Date.now();

    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);
    await waitForNetworkIdle(authenticatedPage);

    // Wait for candidate list to load
    const candidateList = authenticatedPage.getByTestId('candidate-list');
    await expect(candidateList).toBeVisible({ timeout: TIMEOUTS.LONG });

    // Find the first candidate card
    const candidateCard = authenticatedPage.getByTestId('candidate-card').first();
    await expect(candidateCard).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Find and click the vote button
    const voteButton = candidateCard.getByTestId('vote-button');
    await expect(voteButton).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await expect(voteButton).toBeEnabled();
    await expect(voteButton).toContainText('投票する');

    // Click vote button
    await voteButton.click();

    // Verify loading state
    await expect(voteButton).toContainText('投票中...');
    await expect(voteButton).toBeDisabled();

    // Wait for vote API call to complete
    await waitForApiResponse(authenticatedPage, /\/votes/, { timeout: TIMEOUTS.LONG });

    // Verify vote status indicator is displayed
    const voteStatusIndicator = candidateCard.getByTestId('vote-status-indicator');
    await expect(voteStatusIndicator).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await expect(voteStatusIndicator).toContainText('投票済み');

    // Verify test completes within 45 seconds
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(45000);
  });

  test('should display vote change button for other candidates after voting', async ({
    authenticatedPage,
    game,
  }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);
    await waitForNetworkIdle(authenticatedPage);

    // Wait for candidate list to load
    const candidateList = authenticatedPage.getByTestId('candidate-list');
    await expect(candidateList).toBeVisible({ timeout: TIMEOUTS.LONG });

    // Get all candidate cards
    const candidateCards = authenticatedPage.getByTestId('candidate-card');
    const firstCard = candidateCards.first();
    const secondCard = candidateCards.nth(1);

    // Vote on first candidate
    const firstVoteButton = firstCard.getByTestId('vote-button');
    await expect(firstVoteButton).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await firstVoteButton.click();

    // Wait for vote to complete
    await waitForApiResponse(authenticatedPage, /\/votes/, { timeout: TIMEOUTS.LONG });

    // Verify first candidate shows vote status indicator
    const voteStatusIndicator = firstCard.getByTestId('vote-status-indicator');
    await expect(voteStatusIndicator).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Verify second candidate shows vote change button
    const voteChangeButton = secondCard.getByTestId('vote-change-button');
    await expect(voteChangeButton).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await expect(voteChangeButton).toContainText('投票を変更');
  });

  test('should show confirmation dialog when changing vote', async ({
    authenticatedPage,
    game,
  }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);
    await waitForNetworkIdle(authenticatedPage);

    // Wait for candidate list to load
    const candidateList = authenticatedPage.getByTestId('candidate-list');
    await expect(candidateList).toBeVisible({ timeout: TIMEOUTS.LONG });

    // Get candidate cards
    const candidateCards = authenticatedPage.getByTestId('candidate-card');
    const firstCard = candidateCards.first();
    const secondCard = candidateCards.nth(1);

    // Vote on first candidate
    const firstVoteButton = firstCard.getByTestId('vote-button');
    await expect(firstVoteButton).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await firstVoteButton.click();
    await waitForApiResponse(authenticatedPage, /\/votes/, { timeout: TIMEOUTS.LONG });

    // Click vote change button on second candidate
    const voteChangeButton = secondCard.getByTestId('vote-change-button');
    await expect(voteChangeButton).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await voteChangeButton.click();

    // Verify confirmation dialog is displayed
    const dialog = authenticatedPage.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Verify dialog content
    await expect(dialog).toContainText('投票を変更しますか');

    // Verify confirm and cancel buttons are present
    const confirmButton = dialog.getByTestId('confirm-button');
    const cancelButton = dialog.getByTestId('cancel-button');
    await expect(confirmButton).toBeVisible();
    await expect(cancelButton).toBeVisible();
  });

  test('should change vote after confirmation', async ({ authenticatedPage, game }) => {
    const startTime = Date.now();

    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);
    await waitForNetworkIdle(authenticatedPage);

    // Wait for candidate list to load
    const candidateList = authenticatedPage.getByTestId('candidate-list');
    await expect(candidateList).toBeVisible({ timeout: TIMEOUTS.LONG });

    // Get candidate cards
    const candidateCards = authenticatedPage.getByTestId('candidate-card');
    const firstCard = candidateCards.first();
    const secondCard = candidateCards.nth(1);

    // Vote on first candidate
    const firstVoteButton = firstCard.getByTestId('vote-button');
    await firstVoteButton.click();
    await waitForApiResponse(authenticatedPage, /\/votes/, { timeout: TIMEOUTS.LONG });

    // Click vote change button on second candidate
    const voteChangeButton = secondCard.getByTestId('vote-change-button');
    await voteChangeButton.click();

    // Confirm vote change
    const dialog = authenticatedPage.locator('[role="dialog"]');
    const confirmButton = dialog.getByTestId('confirm-button');
    await confirmButton.click();

    // Wait for vote change API call
    await waitForApiResponse(authenticatedPage, /\/votes/, { timeout: TIMEOUTS.LONG });

    // Verify second candidate now shows vote status indicator
    const secondVoteStatus = secondCard.getByTestId('vote-status-indicator');
    await expect(secondVoteStatus).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Verify first candidate now shows vote change button
    const firstVoteChangeButton = firstCard.getByTestId('vote-change-button');
    await expect(firstVoteChangeButton).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Verify test completes within 45 seconds
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(45000);
  });

  test('should cancel vote change when cancel button is clicked', async ({
    authenticatedPage,
    game,
  }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);
    await waitForNetworkIdle(authenticatedPage);

    // Wait for candidate list to load
    const candidateList = authenticatedPage.getByTestId('candidate-list');
    await expect(candidateList).toBeVisible({ timeout: TIMEOUTS.LONG });

    // Get candidate cards
    const candidateCards = authenticatedPage.getByTestId('candidate-card');
    const firstCard = candidateCards.first();
    const secondCard = candidateCards.nth(1);

    // Vote on first candidate
    const firstVoteButton = firstCard.getByTestId('vote-button');
    await firstVoteButton.click();
    await waitForApiResponse(authenticatedPage, /\/votes/, { timeout: TIMEOUTS.LONG });

    // Click vote change button on second candidate
    const voteChangeButton = secondCard.getByTestId('vote-change-button');
    await voteChangeButton.click();

    // Cancel vote change
    const dialog = authenticatedPage.locator('[role="dialog"]');
    const cancelButton = dialog.getByTestId('cancel-button');
    await cancelButton.click();

    // Verify dialog is closed
    await expect(dialog).not.toBeVisible();

    // Verify first candidate still shows vote status indicator
    const firstVoteStatus = firstCard.getByTestId('vote-status-indicator');
    await expect(firstVoteStatus).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Verify second candidate still shows vote change button
    await expect(voteChangeButton).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
  });

  test('should close dialog when ESC key is pressed', async ({ authenticatedPage, game }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);
    await waitForNetworkIdle(authenticatedPage);

    // Wait for candidate list to load
    const candidateList = authenticatedPage.getByTestId('candidate-list');
    await expect(candidateList).toBeVisible({ timeout: TIMEOUTS.LONG });

    // Get candidate cards
    const candidateCards = authenticatedPage.getByTestId('candidate-card');
    const firstCard = candidateCards.first();
    const secondCard = candidateCards.nth(1);

    // Vote on first candidate
    const firstVoteButton = firstCard.getByTestId('vote-button');
    await firstVoteButton.click();
    await waitForApiResponse(authenticatedPage, /\/votes/, { timeout: TIMEOUTS.LONG });

    // Click vote change button on second candidate
    const voteChangeButton = secondCard.getByTestId('vote-change-button');
    await voteChangeButton.click();

    // Verify dialog is open
    const dialog = authenticatedPage.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Press ESC key
    await authenticatedPage.keyboard.press('Escape');

    // Verify dialog is closed
    await expect(dialog).not.toBeVisible();
  });
});

test.describe('Vote Flow - Unauthenticated User', () => {
  test('should disable vote button for unauthenticated user', async ({ page, game }) => {
    // Navigate to game detail page without authentication
    await page.goto(`/games/${game.gameId}`);
    await waitForNetworkIdle(page);

    // Wait for candidate list to load
    const candidateList = page.getByTestId('candidate-list');
    await expect(candidateList).toBeVisible({ timeout: TIMEOUTS.LONG });

    // Find the first candidate card
    const candidateCard = page.getByTestId('candidate-card').first();
    await expect(candidateCard).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Verify vote button is disabled
    const voteButton = candidateCard.getByTestId('vote-button');
    await expect(voteButton).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await expect(voteButton).toBeDisabled();
  });

  test('should show tooltip when hovering over disabled vote button', async ({ page, game }) => {
    // Navigate to game detail page without authentication
    await page.goto(`/games/${game.gameId}`);
    await waitForNetworkIdle(page);

    // Wait for candidate list to load
    const candidateList = page.getByTestId('candidate-list');
    await expect(candidateList).toBeVisible({ timeout: TIMEOUTS.LONG });

    // Find the first candidate card
    const candidateCard = page.getByTestId('candidate-card').first();
    await expect(candidateCard).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Hover over disabled vote button
    const voteButton = candidateCard.getByTestId('vote-button');
    await voteButton.hover();

    // Verify tooltip is displayed
    const tooltip = page.locator('[role="tooltip"]');
    await expect(tooltip).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await expect(tooltip).toContainText('ログインして投票');
  });

  test('should not trigger vote action when clicking disabled button', async ({ page, game }) => {
    // Navigate to game detail page without authentication
    await page.goto(`/games/${game.gameId}`);
    await waitForNetworkIdle(page);

    // Wait for candidate list to load
    const candidateList = page.getByTestId('candidate-list');
    await expect(candidateList).toBeVisible({ timeout: TIMEOUTS.LONG });

    // Find the first candidate card
    const candidateCard = page.getByTestId('candidate-card').first();
    const voteButton = candidateCard.getByTestId('vote-button');

    // Set up request listener to verify no vote API call is made
    let voteApiCalled = false;
    page.on('request', (request) => {
      if (request.url().includes('/votes')) {
        voteApiCalled = true;
      }
    });

    // Try to click disabled button
    await voteButton.click({ force: true });

    // Wait a moment to ensure no API call is made
    await page.waitForTimeout(1000);

    // Verify no vote API call was made
    expect(voteApiCalled).toBe(false);
  });
});

test.describe('Vote Flow - Error Handling', () => {
  test('should display error message when vote fails', async ({ authenticatedPage, game }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);
    await waitForNetworkIdle(authenticatedPage);

    // Wait for candidate list to load
    const candidateList = authenticatedPage.getByTestId('candidate-list');
    await expect(candidateList).toBeVisible({ timeout: TIMEOUTS.LONG });

    // Intercept vote API call and simulate error
    await authenticatedPage.route('**/votes', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    // Find the first candidate card and click vote button
    const candidateCard = authenticatedPage.getByTestId('candidate-card').first();
    const voteButton = candidateCard.getByTestId('vote-button');
    await voteButton.click();

    // Verify error message is displayed
    const errorMessage = candidateCard.getByTestId('error-message');
    await expect(errorMessage).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await expect(errorMessage).toContainText('投票に失敗しました');
  });

  test('should display authentication error message', async ({ authenticatedPage, game }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);
    await waitForNetworkIdle(authenticatedPage);

    // Wait for candidate list to load
    const candidateList = authenticatedPage.getByTestId('candidate-list');
    await expect(candidateList).toBeVisible({ timeout: TIMEOUTS.LONG });

    // Intercept vote API call and simulate 401 error
    await authenticatedPage.route('**/votes', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    });

    // Find the first candidate card and click vote button
    const candidateCard = authenticatedPage.getByTestId('candidate-card').first();
    const voteButton = candidateCard.getByTestId('vote-button');
    await voteButton.click();

    // Verify authentication error message is displayed
    const errorMessage = candidateCard.getByTestId('error-message');
    await expect(errorMessage).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await expect(errorMessage).toContainText('認証が必要です');
  });

  test('should display already voted error message', async ({ authenticatedPage, game }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);
    await waitForNetworkIdle(authenticatedPage);

    // Wait for candidate list to load
    const candidateList = authenticatedPage.getByTestId('candidate-list');
    await expect(candidateList).toBeVisible({ timeout: TIMEOUTS.LONG });

    // Intercept vote API call and simulate 409 ALREADY_VOTED error
    await authenticatedPage.route('**/votes', (route) => {
      route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'ALREADY_VOTED', message: '既に投票済みです' }),
      });
    });

    // Find the first candidate card and click vote button
    const candidateCard = authenticatedPage.getByTestId('candidate-card').first();
    const voteButton = candidateCard.getByTestId('vote-button');
    await voteButton.click();

    // Verify already voted error message is displayed
    const errorMessage = candidateCard.getByTestId('error-message');
    await expect(errorMessage).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await expect(errorMessage).toContainText('既に投票済みです');
  });
});
