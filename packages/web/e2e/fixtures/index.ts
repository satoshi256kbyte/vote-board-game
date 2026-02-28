/**
 * Combined fixtures for E2E tests
 * Exports all fixtures with proper type definitions
 */

import { test as base, type Page } from '@playwright/test';
import { createTestUser, loginUser, type TestUser } from '../helpers/test-user';
import { cleanupTestUser } from '../helpers/cleanup';
import { createTestGame, cleanupTestGame, type TestGame } from '../helpers/test-data';

/**
 * Combined test fixture with both authenticated user and test game
 *
 * Usage:
 * ```typescript
 * import { test } from './fixtures';
 *
 * test('should vote on game', async ({ authenticatedPage, game }) => {
 *   await authenticatedPage.goto(`/games/${game.gameId}/vote`);
 *   // User is logged in and game exists
 * });
 * ```
 */
export const test = base.extend<{
  authenticatedPage: Page;
  testUser: TestUser;
  game: TestGame;
}>({
  authenticatedPage: async ({ page }, use) => {
    let testUser: TestUser | null = null;

    try {
      testUser = await createTestUser();
      await loginUser(page, testUser);
      await use(page);
    } finally {
      if (testUser) {
        await cleanupTestUser(testUser.email);
      }
    }
  },

  testUser: async ({}, use) => {
    let testUser: TestUser | null = null;

    try {
      testUser = await createTestUser();
      await use(testUser);
    } finally {
      if (testUser) {
        await cleanupTestUser(testUser.email);
      }
    }
  },

  game: async ({}, use) => {
    let game: TestGame | null = null;

    try {
      game = await createTestGame();
      await use(game);
    } finally {
      if (game) {
        await cleanupTestGame(game);
      }
    }
  },
});

export { expect } from '@playwright/test';
export { authenticatedUser } from './authenticated-user';
export { testGame } from './test-game';
