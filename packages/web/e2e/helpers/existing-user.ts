/**
 * Existing user error handling for E2E tests
 * Handles cases where test users already exist in Cognito
 */

import { Page } from '@playwright/test';
import { cleanupTestUser } from './cleanup';
import { TestUser } from './test-user';

/**
 * Checks if an error indicates that a user already exists
 *
 * @param error - Error object or message to check
 * @returns true if the error indicates user already exists
 */
export function isUserAlreadyExistsError(error: unknown): boolean {
  if (!error) return false;

  const errorMessage = typeof error === 'string' ? error : String(error);

  // Check for common "user already exists" error patterns
  return (
    errorMessage.includes('UsernameExistsException') ||
    errorMessage.includes('User already exists') ||
    errorMessage.includes('ユーザーは既に存在') ||
    errorMessage.includes('already exists')
  );
}

/**
 * Registers a user with automatic retry if user already exists
 *
 * Requirements:
 * - 7.3: If test user already exists in Cognito, delete existing user and retry
 *
 * @param page - Playwright page instance
 * @param testUser - Test user data to register
 * @param maxRetries - Maximum number of retry attempts (default: 1)
 * @returns Promise that resolves when registration succeeds
 * @throws Error if registration fails after all retries
 */
export async function registerWithRetry(
  page: Page,
  testUser: TestUser,
  maxRetries: number = 1
): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Fill registration form
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.fill('input[name="password-confirmation"]', testUser.password);

      // Submit form
      await page.click('button[type="submit"]');

      // Wait for redirect to home page (success)
      await page.waitForURL('/', { timeout: 10000 });

      // Registration succeeded
      console.log(`[RegisterWithRetry] Successfully registered user: ${testUser.email}`);
      return;
    } catch (error) {
      lastError = error as Error;

      // Check if error is due to user already existing
      const pageContent = await page.content();
      const isUserExists =
        isUserAlreadyExistsError(pageContent) || isUserAlreadyExistsError(lastError.message);

      if (isUserExists && attempt < maxRetries) {
        console.log(
          `[RegisterWithRetry] User already exists: ${testUser.email}. Deleting and retrying... (attempt ${attempt + 1}/${maxRetries})`
        );

        // Delete existing user
        await cleanupTestUser(testUser.email);

        // Wait a bit before retrying
        await page.waitForTimeout(1000);

        // Navigate back to registration page for retry
        await page.goto('/register');
        continue;
      }

      // If not a "user exists" error, or we've exhausted retries, throw
      throw lastError;
    }
  }

  // Should not reach here, but throw last error if we do
  throw lastError || new Error('Registration failed for unknown reason');
}
