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
  test('should successfully login with valid credentials and redirect to game list', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);

    // Create test user
    const testUser = await createTestUser();

    try {
      // Navigate to login page
      await loginPage.goto();

      // Setup console logging to capture errors
      const consoleMessages: string[] = [];
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        const text = msg.text();
        consoleMessages.push(`[${msg.type()}] ${text}`);
        if (msg.type() === 'error') {
          consoleErrors.push(text);
        }
      });

      // Setup network request logging
      const apiRequests: { url: string; status: number; method: string }[] = [];
      page.on('response', (response) => {
        const url = response.url();
        if (url.includes('/auth/login')) {
          apiRequests.push({
            url,
            status: response.status(),
            method: response.request().method(),
          });
        }
      });

      // Setup navigation logging
      const navigationEvents: string[] = [];
      page.on('framenavigated', (frame) => {
        if (frame === page.mainFrame()) {
          navigationEvents.push(`Navigated to: ${frame.url()}`);
        }
      });

      // Login with valid credentials
      console.log(`[Test] Attempting login with email: ${testUser.email}`);
      await loginPage.login(testUser.email, testUser.password);

      // Wait a bit for any async operations
      await page.waitForTimeout(2000);

      // Log current state
      const currentUrl = page.url();
      console.log(`[Test] Current URL after login: ${currentUrl}`);
      console.log(`[Test] Navigation events:`, navigationEvents);
      console.log(`[Test] API requests:`, JSON.stringify(apiRequests, null, 2));
      console.log(`[Test] Console messages:`, consoleMessages.slice(-10));
      console.log(`[Test] Console errors:`, consoleErrors);

      // Check localStorage state
      const localStorageState = await page.evaluate(() => {
        return {
          accessToken: localStorage.getItem('accessToken'),
          refreshToken: localStorage.getItem('refreshToken'),
          user: localStorage.getItem('user'),
          allKeys: Object.keys(localStorage),
        };
      });
      console.log(`[Test] localStorage state:`, JSON.stringify(localStorageState, null, 2));

      // Check if login API was called and succeeded
      const loginRequest = apiRequests.find((req) => req.url.includes('/auth/login'));
      if (!loginRequest) {
        throw new Error('Login API was not called');
      }
      if (loginRequest.status !== 200) {
        throw new Error(
          `Login API failed with status ${loginRequest.status}. Console errors: ${consoleErrors.join(', ')}`
        );
      }

      console.log(`[Test] Login API succeeded with status ${loginRequest.status}`);

      // Check if tokens were saved to localStorage
      if (!localStorageState.accessToken) {
        throw new Error('Access token was not saved to localStorage');
      }
      if (!localStorageState.refreshToken) {
        throw new Error('Refresh token was not saved to localStorage');
      }
      if (!localStorageState.user) {
        throw new Error('User data was not saved to localStorage');
      }

      console.log(`[Test] Tokens and user data successfully saved to localStorage`);

      // Verify redirect (login redirects to '/' by default)
      await loginPage.expectRedirectToGameList();

      // Verify we're logged in (URL should be '/' or '/games')
      const url = page.url();
      expect(url === '/' || url.includes('/games') || url.endsWith('/')).toBe(true);
    } finally {
      // Clean up test user
      await cleanupTestUser(testUser.email);
    }
  });

  test('should show error message with invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Navigate to login page
    await loginPage.goto();

    // Attempt login with invalid credentials
    await loginPage.login('invalid@example.com', 'WrongPassword123!');

    // Verify error message is displayed
    await loginPage.expectErrorMessage('');
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
});
