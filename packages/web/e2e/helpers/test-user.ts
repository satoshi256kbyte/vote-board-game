/**
 * Test user helper functions for E2E tests
 * Generates test users with unique emails and secure passwords
 */

import type { Page } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
  userId?: string;
}

/**
 * Generates a test user with unique email and secure password
 *
 * Requirements:
 * - 4.1: Email must be unique using timestamp
 * - 4.2: Password must meet security requirements (8+ characters, uppercase, lowercase, numbers)
 *
 * @returns TestUser object with email and password
 */
export function generateTestUser(): TestUser {
  // Use timestamp with additional random component for uniqueness
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  const uniqueId = `${timestamp}-${random}`;

  const email = `test-${uniqueId}@example.com`;

  // Generate password that meets security requirements:
  // - 8+ characters
  // - At least one uppercase letter
  // - At least one lowercase letter
  // - At least one number
  const password = `TestPass${timestamp}`;

  return {
    email,
    password,
  };
}

/**
 * Creates a test user using the registration API
 *
 * Requirements:
 * - 7.3: Test users should be created with unique identifiers
 * - 7.4: Test users should be created in both Cognito and DynamoDB
 *
 * @returns Promise that resolves to TestUser object with userId
 */
export async function createTestUser(): Promise<TestUser> {
  const testUser = generateTestUser();

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      throw new Error('NEXT_PUBLIC_API_URL environment variable is not set');
    }

    // Generate username (max 20 characters)
    // Use last 10 digits of timestamp + 4 digit random = 14 chars + 'test' prefix = 18 chars
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const shortTimestamp = timestamp.toString().slice(-10); // Last 10 digits
    const username = `test${shortTimestamp}${random}`;

    // Call registration API
    const response = await fetch(`${apiUrl}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password,
        username,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Registration API failed with status ${response.status}: ${JSON.stringify(errorData)}`
      );
    }

    const data = await response.json();
    const userId = data.userId;

    console.log(`[CreateTestUser] Successfully created test user: ${testUser.email}`);

    return {
      ...testUser,
      userId,
    };
  } catch (error) {
    console.error(`[CreateTestUser] Failed to create test user: ${testUser.email}`, error);
    throw error;
  }
}

/**
 * Logs in a test user using the login page
 *
 * Requirements:
 * - Test helper should navigate to login page
 * - Test helper should fill in credentials
 * - Test helper should submit form and wait for redirect
 *
 * @param page - Playwright page instance
 * @param user - Test user credentials
 */
export async function loginUser(page: Page, user: TestUser): Promise<void> {
  try {
    // Navigate to login page
    await page.goto('/login');

    // Fill in credentials
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for successful login (redirect to home page)
    await page.waitForURL('/', { timeout: 10000 });

    console.log(`[LoginUser] Successfully logged in user: ${user.email}`);
  } catch (error) {
    console.error(`[LoginUser] Failed to login user: ${user.email}`, error);
    throw error;
  }
}
