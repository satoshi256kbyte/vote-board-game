/**
 * E2E tests for move candidates display and voting
 * Tests the candidate list display, vote buttons, and vote status indicators
 *
 * Requirements: 23-candidate-list-display, 25-vote-button-status-display
 * - Candidate list display with sorting and filtering
 * - Vote button display and functionality
 * - Vote status indicator display
 * - Responsive design
 */

import { test, expect } from '../fixtures';
import { waitForNetworkIdle, TIMEOUTS } from '../helpers/wait-utils';

test.describe('Move Candidates - Display', () => {
  test('should display candidate list section', async ({ page, game }) => {
    // Navigate to game detail page
    await page.goto(`/games/${game.gameId}`);
    await waitForNetworkIdle(page);

    // Verify candidate list section is visible
    const candidateList = page.getByTestId('candidate-list');
    await expect(candidateList).toBeVisible({ timeout: TIMEOUTS.LONG });
  });

  test('should display candidate cards in the list', async ({ page, game }) => {
    // Navigate to game detail page
    await page.goto(`/games/${game.gameId}`);
    await waitForNetworkIdle(page);

    // Wait for candidate list to load
    const candidateList = page.getByTestId('candidate-list');
    await expect(candidateList).toBeVisible({ timeout: TIMEOUTS.LONG });

    // Verify at least one candidate card is displayed
    const candidateCards = page.getByTestId('candidate-card');
    await expect(candidateCards.first()).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
  });

  test('should display candidate information', async ({ page, game }) => {
    // Navigate to game detail page
    await page.goto(`/games/${game.gameId}`);
    await waitForNetworkIdle(page);

    // Wait for candidate list to load
    const candidateList = page.getByTestId('candidate-list');
    await expect(candidateList).toBeVisible({ timeout: TIMEOUTS.LONG });

    // Get first candidate card
    const candidateCard = page.getByTestId('candidate-card').first();
    await expect(candidateCard).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Verify candidate information is displayed
    await expect(candidateCard.getByTestId('candidate-position')).toBeVisible();
    await expect(candidateCard.getByTestId('candidate-description')).toBeVisible();
    await expect(candidateCard.getByTestId('candidate-poster')).toBeVisible();
    await expect(candidateCard.getByTestId('candidate-vote-count')).toBeVisible();
    await expect(candidateCard.getByTestId('candidate-deadline')).toBeVisible();
  });

  test('should display sort and filter controls', async ({ page, game }) => {
    // Navigate to game detail page
    await page.goto(`/games/${game.gameId}`);
    await waitForNetworkIdle(page);

    // Wait for candidate list to load
    const candidateList = page.getByTestId('candidate-list');
    await expect(candidateList).toBeVisible({ timeout: TIMEOUTS.LONG });

    // Verify sort dropdown is present
    const sortDropdown = page.getByTestId('candidate-sort-dropdown');
    await expect(sortDropdown).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Verify filter dropdown is present
    const filterDropdown = page.getByTestId('candidate-filter-dropdown');
    await expect(filterDropdown).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
  });

  test('should display post candidate button for authenticated users', async ({
    authenticatedPage,
    game,
  }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);
    await waitForNetworkIdle(authenticatedPage);

    // Verify "候補を投稿" button is present
    const postCandidateButton = authenticatedPage.getByTestId('post-candidate-button');
    await expect(postCandidateButton).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await expect(postCandidateButton).toContainText('候補を投稿');
  });
});

test.describe('Move Candidates - Vote Button Display', () => {
  test('should display vote button for unauthenticated users', async ({ page, game }) => {
    // Navigate to game detail page
    await page.goto(`/games/${game.gameId}`);
    await waitForNetworkIdle(page);

    // Wait for candidate list to load
    const candidateList = page.getByTestId('candidate-list');
    await expect(candidateList).toBeVisible({ timeout: TIMEOUTS.LONG });

    // Get first candidate card
    const candidateCard = page.getByTestId('candidate-card').first();
    await expect(candidateCard).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Verify vote button is displayed
    const voteButton = candidateCard.getByTestId('vote-button');
    await expect(voteButton).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await expect(voteButton).toContainText('投票する');
  });

  test('should display disabled vote button for unauthenticated users', async ({ page, game }) => {
    // Navigate to game detail page
    await page.goto(`/games/${game.gameId}`);
    await waitForNetworkIdle(page);

    // Wait for candidate list to load
    const candidateList = page.getByTestId('candidate-list');
    await expect(candidateList).toBeVisible({ timeout: TIMEOUTS.LONG });

    // Get first candidate card
    const candidateCard = page.getByTestId('candidate-card').first();
    const voteButton = candidateCard.getByTestId('vote-button');

    // Verify vote button is disabled
    await expect(voteButton).toBeDisabled();
  });

  test('should display enabled vote button for authenticated users', async ({
    authenticatedPage,
    game,
  }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);
    await waitForNetworkIdle(authenticatedPage);

    // Wait for candidate list to load
    const candidateList = authenticatedPage.getByTestId('candidate-list');
    await expect(candidateList).toBeVisible({ timeout: TIMEOUTS.LONG });

    // Get first candidate card
    const candidateCard = authenticatedPage.getByTestId('candidate-card').first();
    const voteButton = candidateCard.getByTestId('vote-button');

    // Verify vote button is enabled
    await expect(voteButton).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await expect(voteButton).toBeEnabled();
  });

  test('should display vote button with correct text', async ({ authenticatedPage, game }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);
    await waitForNetworkIdle(authenticatedPage);

    // Wait for candidate list to load
    const candidateList = authenticatedPage.getByTestId('candidate-list');
    await expect(candidateList).toBeVisible({ timeout: TIMEOUTS.LONG });

    // Get first candidate card
    const candidateCard = authenticatedPage.getByTestId('candidate-card').first();
    const voteButton = candidateCard.getByTestId('vote-button');

    // Verify vote button text
    await expect(voteButton).toContainText('投票する');
  });

  test('should display vote button with proper accessibility attributes', async ({
    authenticatedPage,
    game,
  }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);
    await waitForNetworkIdle(authenticatedPage);

    // Wait for candidate list to load
    const candidateList = authenticatedPage.getByTestId('candidate-list');
    await expect(candidateList).toBeVisible({ timeout: TIMEOUTS.LONG });

    // Get first candidate card
    const candidateCard = authenticatedPage.getByTestId('candidate-card').first();
    const voteButton = candidateCard.getByTestId('vote-button');

    // Verify aria-label attribute
    await expect(voteButton).toHaveAttribute('aria-label', '投票する');
  });
});

test.describe('Move Candidates - Vote Status Indicator', () => {
  test('should display vote status indicator after voting', async ({ authenticatedPage, game }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);
    await waitForNetworkIdle(authenticatedPage);

    // Wait for candidate list to load
    const candidateList = authenticatedPage.getByTestId('candidate-list');
    await expect(candidateList).toBeVisible({ timeout: TIMEOUTS.LONG });

    // Get first candidate card and vote
    const candidateCard = authenticatedPage.getByTestId('candidate-card').first();
    const voteButton = candidateCard.getByTestId('vote-button');
    await voteButton.click();

    // Wait for vote to complete
    await authenticatedPage.waitForResponse((response) => response.url().includes('/votes'));

    // Verify vote status indicator is displayed
    const voteStatusIndicator = candidateCard.getByTestId('vote-status-indicator');
    await expect(voteStatusIndicator).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
  });

  test('should display checkmark icon in vote status indicator', async ({
    authenticatedPage,
    game,
  }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);
    await waitForNetworkIdle(authenticatedPage);

    // Wait for candidate list to load
    const candidateList = authenticatedPage.getByTestId('candidate-list');
    await expect(candidateList).toBeVisible({ timeout: TIMEOUTS.LONG });

    // Get first candidate card and vote
    const candidateCard = authenticatedPage.getByTestId('candidate-card').first();
    const voteButton = candidateCard.getByTestId('vote-button');
    await voteButton.click();

    // Wait for vote to complete
    await authenticatedPage.waitForResponse((response) => response.url().includes('/votes'));

    // Verify vote status indicator contains checkmark
    const voteStatusIndicator = candidateCard.getByTestId('vote-status-indicator');
    await expect(voteStatusIndicator).toContainText('投票済み');
  });

  test('should display vote count in vote status indicator', async ({
    authenticatedPage,
    game,
  }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);
    await waitForNetworkIdle(authenticatedPage);

    // Wait for candidate list to load
    const candidateList = authenticatedPage.getByTestId('candidate-list');
    await expect(candidateList).toBeVisible({ timeout: TIMEOUTS.LONG });

    // Get first candidate card
    const candidateCard = authenticatedPage.getByTestId('candidate-card').first();

    // Get initial vote count
    const voteCountElement = candidateCard.getByTestId('candidate-vote-count');
    const initialVoteCount = await voteCountElement.textContent();

    // Vote on candidate
    const voteButton = candidateCard.getByTestId('vote-button');
    await voteButton.click();

    // Wait for vote to complete
    await authenticatedPage.waitForResponse((response) => response.url().includes('/votes'));

    // Verify vote count increased
    const updatedVoteCount = await voteCountElement.textContent();
    expect(Number(updatedVoteCount)).toBeGreaterThan(Number(initialVoteCount));
  });
});

test.describe('Move Candidates - Vote Change Button', () => {
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

    // Get candidate cards
    const candidateCards = authenticatedPage.getByTestId('candidate-card');
    const firstCard = candidateCards.first();
    const secondCard = candidateCards.nth(1);

    // Vote on first candidate
    const firstVoteButton = firstCard.getByTestId('vote-button');
    await firstVoteButton.click();
    await authenticatedPage.waitForResponse((response) => response.url().includes('/votes'));

    // Verify second candidate shows vote change button
    const voteChangeButton = secondCard.getByTestId('vote-change-button');
    await expect(voteChangeButton).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await expect(voteChangeButton).toContainText('投票を変更');
  });

  test('should display vote change button with outline variant style', async ({
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
    await authenticatedPage.waitForResponse((response) => response.url().includes('/votes'));

    // Verify second candidate's vote change button has outline variant
    const voteChangeButton = secondCard.getByTestId('vote-change-button');
    await expect(voteChangeButton).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Check if button has outline variant class (this is a visual check)
    const buttonClass = await voteChangeButton.getAttribute('class');
    expect(buttonClass).toContain('outline');
  });
});

test.describe('Move Candidates - Responsive Design', () => {
  test('should display candidates in grid layout on desktop', async ({ page, game }) => {
    // Set viewport to desktop size
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to game detail page
    await page.goto(`/games/${game.gameId}`);
    await waitForNetworkIdle(page);

    // Wait for candidate list to load
    const candidateList = page.getByTestId('candidate-list');
    await expect(candidateList).toBeVisible({ timeout: TIMEOUTS.LONG });

    // Verify candidates grid is displayed
    const candidatesGrid = page.getByTestId('candidates-grid');
    await expect(candidatesGrid).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
  });

  test('should display candidates in single column on mobile', async ({ page, game }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to game detail page
    await page.goto(`/games/${game.gameId}`);
    await waitForNetworkIdle(page);

    // Wait for candidate list to load
    const candidateList = page.getByTestId('candidate-list');
    await expect(candidateList).toBeVisible({ timeout: TIMEOUTS.LONG });

    // Verify candidates grid is displayed
    const candidatesGrid = page.getByTestId('candidates-grid');
    await expect(candidatesGrid).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Verify vote buttons are full width on mobile
    const candidateCard = page.getByTestId('candidate-card').first();
    const voteButton = candidateCard.getByTestId('vote-button');
    await expect(voteButton).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Check button width (should be full width on mobile)
    const buttonBox = await voteButton.boundingBox();
    const cardBox = await candidateCard.boundingBox();

    if (buttonBox && cardBox) {
      // Button should be close to full width of card (accounting for padding)
      expect(buttonBox.width).toBeGreaterThan(cardBox.width * 0.8);
    }
  });

  test('should have minimum touch target size on mobile', async ({ page, game }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to game detail page
    await page.goto(`/games/${game.gameId}`);
    await waitForNetworkIdle(page);

    // Wait for candidate list to load
    const candidateList = page.getByTestId('candidate-list');
    await expect(candidateList).toBeVisible({ timeout: TIMEOUTS.LONG });

    // Get vote button
    const candidateCard = page.getByTestId('candidate-card').first();
    const voteButton = candidateCard.getByTestId('vote-button');
    await expect(voteButton).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Verify button has minimum touch target size (44px)
    const buttonBox = await voteButton.boundingBox();
    expect(buttonBox).not.toBeNull();

    if (buttonBox) {
      expect(buttonBox.height).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe('Move Candidates - Performance', () => {
  test('should load candidate list within 30 seconds', async ({ page, game }) => {
    const startTime = Date.now();

    // Navigate to game detail page
    await page.goto(`/games/${game.gameId}`);
    await waitForNetworkIdle(page);

    // Wait for candidate list to load
    const candidateList = page.getByTestId('candidate-list');
    await expect(candidateList).toBeVisible({ timeout: TIMEOUTS.LONG });

    // Verify loading time
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(30000);
  });

  test('should display all candidate elements within 30 seconds', async ({ page, game }) => {
    const startTime = Date.now();

    // Navigate to game detail page
    await page.goto(`/games/${game.gameId}`);
    await waitForNetworkIdle(page);

    // Wait for all elements to be visible
    const candidateList = page.getByTestId('candidate-list');
    await expect(candidateList).toBeVisible({ timeout: TIMEOUTS.LONG });

    const candidateCard = page.getByTestId('candidate-card').first();
    await expect(candidateCard).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    const sortDropdown = page.getByTestId('candidate-sort-dropdown');
    await expect(sortDropdown).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    const filterDropdown = page.getByTestId('candidate-filter-dropdown');
    await expect(filterDropdown).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Verify loading time
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(30000);
  });
});
