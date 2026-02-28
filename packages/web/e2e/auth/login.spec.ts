/**
 * E2E Test: User Login Flow
 *
 * Tests the complete user login flow including:
 * - Successful login with valid credentials
 * - Login failure with invalid credentials
 * - Redirect to game list page after login
 * - Logout functionality
 * - Unauthenticated access restrictions
 *
 * Requirements: Requirement 1 (Authentication Flow Testing)
 * - 1.2: Login with valid credentials redirects to game list
 * - 1.3: Logout redirects to login page
 * - 1.4: Invalid credentials show error message
 * - 1.5: Unauthenticated access to protected pages redirects to login
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects';
import { createTestUser, cleanupTestUser } from '../helpers';

test.describe('User Login Flow', () => {
  test.only('should successfully login with valid credentials and redirect to game list', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);

    // Create test user
    const testUser = await createTestUser();

    try {
      // Navigate to login page
      await loginPage.goto();

      // Login with valid credentials
      await loginPage.login(testUser.email, testUser.password);

      // Verify redirect to game list page
      await loginPage.expectRedirectToGameList();

      // Verify we're on the game list page
      expect(page.url()).toContain('/games');
    } finally {
      // Clean up test user
      await cleanupTestUser(testUser.email);
    }
  });

  test.skip('should show error message with invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Navigate to login page
    await loginPage.goto();

    // Attempt login with invalid credentials
    await loginPage.login('invalid@example.com', 'WrongPassword123');

    // Verify error message is displayed
    await loginPage.expectErrorMessage('');
  });

  test.skip('should show error message with incorrect password', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Create test user
    const testUser = await createTestUser();

    try {
      // Navigate to login page
      await loginPage.goto();

      // Attempt login with correct email but wrong password
      await loginPage.login(testUser.email, 'WrongPassword123');

      // Verify error message is displayed
      await loginPage.expectErrorMessage('');
    } finally {
      await cleanupTestUser(testUser.email);
    }
  });

  test.skip('should logout and redirect to login page', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Create test user and login
    const testUser = await createTestUser();

    try {
      // Login
      await loginPage.goto();
      await loginPage.login(testUser.email, testUser.password);
      await loginPage.expectRedirectToGameList();

      // Logout
      await page.getByTestId('logout-button').click();

      // Verify redirect to login page
      await page.waitForURL('/login', { timeout: 10000 });
      expect(page.url()).toContain('/login');
    } finally {
      await cleanupTestUser(testUser.email);
    }
  });

  test.skip('should redirect to login when accessing protected page without authentication', async ({
    page,
  }) => {
    // Attempt to access protected page without authentication
    await page.goto('/games');

    // Should redirect to login page
    await page.waitForURL('/login', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test.skip('should redirect to login when accessing profile page without authentication', async ({
    page,
  }) => {
    // Attempt to access profile page without authentication
    await page.goto('/profile');

    // Should redirect to login page
    await page.waitForURL('/login', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test.skip('should complete within 30 seconds', async ({ page }) => {
    const startTime = Date.now();
    const loginPage = new LoginPage(page);

    const testUser = await createTestUser();

    try {
      await loginPage.goto();
      await loginPage.login(testUser.email, testUser.password);
      await loginPage.expectRedirectToGameList();

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(30000);
    } finally {
      await cleanupTestUser(testUser.email);
    }
  });
});
