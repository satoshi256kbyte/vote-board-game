/**
 * Authenticated user fixture for E2E tests
 * Provides automatic test user creation, login, and cleanup
 */

import { test as base, type Page } from '@playwright/test';
import { createTestUser, loginUser, type TestUser } from '../helpers/test-user';
import { cleanupTestUser } from '../helpers/cleanup';

/**
 * Authenticated user fixtures
 *
 * Provides:
 * - authenticatedPage: Page instance with logged-in user
 * - testUser: Test user credentials
 *
 * Automatically handles:
 * - Test user creation before test
 * - User login
 * - Test user cleanup after test
 */
export const authenticatedUser = base.extend<{
  authenticatedPage: Page;
  testUser: TestUser;
}>({
  /**
   * Authenticated page fixture
   *
   * Creates a test user, logs them in, and provides the authenticated page.
   * Automatically cleans up the test user after the test completes.
   *
   * Usage:
   * ```typescript
   * authenticatedUser('should access protected page', async ({ authenticatedPage }) => {
   *   await authenticatedPage.goto('/profile');
   *   // User is already logged in
   * });
   * ```
   */
  authenticatedPage: async ({ page }, use) => {
    let testUser: TestUser | null = null;

    try {
      // Create test user
      testUser = await createTestUser();
      console.log(`[AuthenticatedPage] Created test user: ${testUser.email}`);

      // Login user
      await loginUser(page, testUser);
      console.log(`[AuthenticatedPage] Logged in test user: ${testUser.email}`);

      // Provide authenticated page to test
      await use(page);
    } finally {
      // Cleanup test user
      if (testUser) {
        await cleanupTestUser(testUser.email);
        console.log(`[AuthenticatedPage] Cleaned up test user: ${testUser.email}`);
      }
    }
  },

  /**
   * Test user fixture
   *
   * Creates a test user and provides the credentials.
   * Automatically cleans up the test user after the test completes.
   * Does NOT log the user in - use authenticatedPage for that.
   *
   * Usage:
   * ```typescript
   * authenticatedUser('should create user', async ({ testUser, page }) => {
   *   // testUser contains email, password, username
   *   await page.goto('/login');
   *   await page.fill('input[name="email"]', testUser.email);
   *   // ...
   * });
   * ```
   */
  testUser: async ({ page: _page }, use) => {
    let testUser: TestUser | null = null;

    try {
      // Create test user
      testUser = await createTestUser();
      console.log(`[TestUser] Created test user: ${testUser.email}`);

      // Provide test user to test
      await use(testUser);
    } finally {
      // Cleanup test user
      if (testUser) {
        await cleanupTestUser(testUser.email);
        console.log(`[TestUser] Cleaned up test user: ${testUser.email}`);
      }
    }
  },
});
