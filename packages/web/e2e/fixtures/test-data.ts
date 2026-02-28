/**
 * Combined test data fixtures for E2E tests
 * Exports all fixtures for convenient importing
 */

export { authenticatedUser } from './authenticated-user';
export { testGame } from './test-game';

/**
 * Usage examples:
 *
 * 1. Using authenticated user fixture:
 * ```typescript
 * import { authenticatedUser } from './fixtures/test-data';
 *
 * authenticatedUser('should access profile', async ({ authenticatedPage }) => {
 *   await authenticatedPage.goto('/profile');
 *   // User is already logged in
 * });
 * ```
 *
 * 2. Using test game fixture:
 * ```typescript
 * import { testGame } from './fixtures/test-data';
 *
 * testGame('should display game', async ({ game, page }) => {
 *   await page.goto(`/games/${game.gameId}`);
 *   // Game is already created
 * });
 * ```
 *
 * 3. Combining fixtures:
 * ```typescript
 * import { authenticatedUser } from './fixtures/authenticated-user';
 * import { testGame } from './fixtures/test-game';
 *
 * const test = authenticatedUser.extend(testGame);
 *
 * test('should vote on game', async ({ authenticatedPage, game }) => {
 *   await authenticatedPage.goto(`/games/${game.gameId}/vote`);
 *   // User is logged in and game exists
 * });
 * ```
 */
