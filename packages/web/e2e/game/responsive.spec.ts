/**
 * E2E tests for responsive design - Task 4
 * Tests that game list and game detail pages adapt correctly to different viewport sizes
 *
 * Requirements: 7.1-7.7
 */

import { test, expect } from '../fixtures';
import { TIMEOUTS } from '../helpers/wait-utils';

// Desktop viewport tests (Task 4.1)
test.describe('Responsive Design - Desktop Viewport (Task 4.1)', () => {
  test.use({
    viewport: { width: 1280, height: 720 },
  });

  test('should display game list in grid layout on desktop', async ({
    authenticatedPage,
    game: _game,
  }) => {
    // Navigate to game list page
    await authenticatedPage.goto('/');

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify game cards container uses grid layout (Requirement 7.1)
    const gameCardsContainer = authenticatedPage.locator('[data-testid="game-cards-container"]');

    // Check if container exists, if not, look for the parent of game cards
    const containerExists = await gameCardsContainer.count();
    let gridContainer;

    if (containerExists > 0) {
      gridContainer = gameCardsContainer;
    } else {
      // Find the container by looking at the parent of game cards
      const firstCard = authenticatedPage.locator('[data-testid="game-card"]').first();
      gridContainer = firstCard.locator('..').locator('..');
    }

    // Verify grid layout classes are present
    const containerClass = await gridContainer.getAttribute('class');
    expect(containerClass).toContain('grid');

    // Verify multiple columns on desktop (should have grid-cols-* class)
    const hasMultipleColumns =
      containerClass?.includes('grid-cols-2') ||
      containerClass?.includes('grid-cols-3') ||
      containerClass?.includes('md:grid-cols') ||
      containerClass?.includes('lg:grid-cols');
    expect(hasMultipleColumns).toBe(true);
  });

  test('should display game detail in two-column layout on desktop', async ({
    authenticatedPage,
    game,
  }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify two-column layout (Requirement 7.3)
    // The main content should use grid with lg:grid-cols-3 (2 columns for board, 1 for sidebar)
    const mainContent = authenticatedPage.locator('main > div > div.grid');

    const gridClass = await mainContent.getAttribute('class');
    expect(gridClass).toContain('grid');
    expect(gridClass).toContain('lg:grid-cols-3');

    // Verify board section takes 2 columns
    const boardSection = authenticatedPage.locator('.lg\\:col-span-2');
    await expect(boardSection).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
  });

  test('should display board cells at 40px on desktop', async ({ authenticatedPage, game }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Get a board cell (Requirement 7.5)
    const board = authenticatedPage.locator('role=grid[name="オセロの盤面"]');
    await expect(board).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    const firstCell = board.locator('role=gridcell').first();
    await expect(firstCell).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Get cell dimensions
    const cellBox = await firstCell.boundingBox();
    expect(cellBox).toBeTruthy();

    // Verify cell size is approximately 40px (allow small variance for borders/padding)
    expect(cellBox!.width).toBeGreaterThanOrEqual(38);
    expect(cellBox!.width).toBeLessThanOrEqual(42);
    expect(cellBox!.height).toBeGreaterThanOrEqual(38);
    expect(cellBox!.height).toBeLessThanOrEqual(42);
  });

  test('should verify all desktop responsive elements together', async ({
    authenticatedPage,
    game,
  }) => {
    // Verify game list
    await authenticatedPage.goto('/');
    await authenticatedPage.waitForLoadState('networkidle');

    const gameCard = authenticatedPage.locator('[data-testid="game-card"]').first();
    const gridContainer = gameCard.locator('..').locator('..');
    const containerClass = await gridContainer.getAttribute('class');
    expect(containerClass).toContain('grid');

    // Verify game detail
    await authenticatedPage.goto(`/games/${game.gameId}`);
    await authenticatedPage.waitForLoadState('networkidle');

    const mainContent = authenticatedPage.locator('main > div > div.grid');
    const gridClass = await mainContent.getAttribute('class');
    expect(gridClass).toContain('lg:grid-cols-3');

    // Verify board cell size
    const board = authenticatedPage.locator('role=grid[name="オセロの盤面"]');
    const firstCell = board.locator('role=gridcell').first();
    const cellBox = await firstCell.boundingBox();
    expect(cellBox!.width).toBeGreaterThanOrEqual(38);
    expect(cellBox!.width).toBeLessThanOrEqual(42);
  });
});

// Mobile viewport tests (Task 4.2)
test.describe('Responsive Design - Mobile Viewport (Task 4.2)', () => {
  test.use({
    viewport: { width: 375, height: 667 },
  });

  test('should display game list in single column layout on mobile', async ({
    authenticatedPage,
    game: _game,
  }) => {
    // Navigate to game list page
    await authenticatedPage.goto('/');

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify game cards are stacked vertically (Requirement 7.2)
    const gameCards = authenticatedPage.locator('[data-testid="game-card"]');
    const cardCount = await gameCards.count();
    expect(cardCount).toBeGreaterThan(0);

    // Get positions of first two cards to verify they're stacked
    if (cardCount >= 2) {
      const firstCardBox = await gameCards.nth(0).boundingBox();
      const secondCardBox = await gameCards.nth(1).boundingBox();

      expect(firstCardBox).toBeTruthy();
      expect(secondCardBox).toBeTruthy();

      // Second card should be below first card (y position is greater)
      expect(secondCardBox!.y).toBeGreaterThan(firstCardBox!.y + firstCardBox!.height - 10);

      // Cards should have similar x positions (aligned vertically)
      expect(Math.abs(secondCardBox!.x - firstCardBox!.x)).toBeLessThan(20);
    }
  });

  test('should display game detail in single column layout on mobile', async ({
    authenticatedPage,
    game,
  }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify single column layout (Requirement 7.4)
    // On mobile, the grid should collapse to single column

    // Verify board section is visible
    const boardSection = authenticatedPage.locator('h2:has-text("盤面")').locator('..');
    await expect(boardSection).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Verify candidates section is visible and below board
    const candidatesSection = authenticatedPage
      .locator('h2:has-text("次の一手候補")')
      .locator('..');
    await expect(candidatesSection).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Get positions to verify stacking
    const boardBox = await boardSection.boundingBox();
    const candidatesBox = await candidatesSection.boundingBox();

    expect(boardBox).toBeTruthy();
    expect(candidatesBox).toBeTruthy();

    // Candidates should be below board on mobile
    expect(candidatesBox!.y).toBeGreaterThan(boardBox!.y);
  });

  test('should display board cells at 30px on mobile', async ({ authenticatedPage, game }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);

    // Wait for page to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Get a board cell (Requirement 7.6)
    const board = authenticatedPage.locator('role=grid[name="オセロの盤面"]');
    await expect(board).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    const firstCell = board.locator('role=gridcell').first();
    await expect(firstCell).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Get cell dimensions
    const cellBox = await firstCell.boundingBox();
    expect(cellBox).toBeTruthy();

    // Verify cell size is approximately 30px (allow small variance for borders/padding)
    expect(cellBox!.width).toBeGreaterThanOrEqual(28);
    expect(cellBox!.width).toBeLessThanOrEqual(32);
    expect(cellBox!.height).toBeGreaterThanOrEqual(28);
    expect(cellBox!.height).toBeLessThanOrEqual(32);
  });

  test('should verify mobile viewport is correctly sized', async ({ authenticatedPage }) => {
    // Navigate to any page
    await authenticatedPage.goto('/');
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify viewport size (Requirement 7.7)
    const viewportSize = authenticatedPage.viewportSize();
    expect(viewportSize).toBeTruthy();
    expect(viewportSize!.width).toBe(375);
    expect(viewportSize!.height).toBe(667);
  });

  test('should verify all mobile responsive elements together', async ({
    authenticatedPage,
    game,
  }) => {
    // Verify viewport size
    const viewportSize = authenticatedPage.viewportSize();
    expect(viewportSize!.width).toBe(375);
    expect(viewportSize!.height).toBe(667);

    // Verify game list single column
    await authenticatedPage.goto('/');
    await authenticatedPage.waitForLoadState('networkidle');

    const gameCards = authenticatedPage.locator('[data-testid="game-card"]');
    const cardCount = await gameCards.count();
    expect(cardCount).toBeGreaterThan(0);

    // Verify game detail single column
    await authenticatedPage.goto(`/games/${game.gameId}`);
    await authenticatedPage.waitForLoadState('networkidle');

    const boardSection = authenticatedPage.locator('h2:has-text("盤面")').locator('..');
    await expect(boardSection).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Verify board cell size
    const board = authenticatedPage.locator('role=grid[name="オセロの盤面"]');
    const firstCell = board.locator('role=gridcell').first();
    const cellBox = await firstCell.boundingBox();
    expect(cellBox!.width).toBeGreaterThanOrEqual(28);
    expect(cellBox!.width).toBeLessThanOrEqual(32);
  });
});

// Cross-viewport comparison tests
test.describe('Responsive Design - Viewport Comparison', () => {
  test('should adapt layout when switching from desktop to mobile', async ({
    authenticatedPage,
    game,
  }) => {
    // Start with desktop viewport
    await authenticatedPage.setViewportSize({ width: 1280, height: 720 });
    await authenticatedPage.goto(`/games/${game.gameId}`);
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify desktop cell size
    const board = authenticatedPage.locator('role=grid[name="オセロの盤面"]');
    const firstCell = board.locator('role=gridcell').first();
    let cellBox = await firstCell.boundingBox();
    expect(cellBox!.width).toBeGreaterThanOrEqual(38);

    // Switch to mobile viewport
    await authenticatedPage.setViewportSize({ width: 375, height: 667 });
    await authenticatedPage.waitForTimeout(500); // Wait for layout to adjust

    // Verify mobile cell size
    cellBox = await firstCell.boundingBox();
    expect(cellBox!.width).toBeGreaterThanOrEqual(28);
    expect(cellBox!.width).toBeLessThanOrEqual(32);
  });

  test('should maintain functionality across viewports', async ({
    authenticatedPage,
    game: _game,
  }) => {
    // Test on desktop
    await authenticatedPage.setViewportSize({ width: 1280, height: 720 });
    await authenticatedPage.goto('/');
    await authenticatedPage.waitForLoadState('networkidle');

    // Click game card on desktop
    const gameCard = authenticatedPage.locator('[data-testid="game-card"]').first();
    await gameCard.click();
    await authenticatedPage.waitForURL(/\/games\/[a-zA-Z0-9-]+/);

    // Verify navigation worked
    let heading = authenticatedPage.locator('h1');
    await expect(heading).toContainText('オセロ対局');

    // Go back and test on mobile
    await authenticatedPage.goto('/');
    await authenticatedPage.setViewportSize({ width: 375, height: 667 });
    await authenticatedPage.waitForTimeout(500);

    // Click game card on mobile
    const mobileGameCard = authenticatedPage.locator('[data-testid="game-card"]').first();
    await mobileGameCard.click();
    await authenticatedPage.waitForURL(/\/games\/[a-zA-Z0-9-]+/);

    // Verify navigation worked on mobile
    heading = authenticatedPage.locator('h1');
    await expect(heading).toContainText('オセロ対局');
  });
});
