/**
 * Test user helper functions for E2E tests
 * Generates test users with unique emails and secure passwords
 */

export interface TestUser {
  email: string;
  password: string;
  username: string;
}

/**
 * Generates a test user with unique email, secure password, and username
 *
 * Requirements:
 * - 4.1: Email must be unique using timestamp
 * - 4.2: Password must meet security requirements (8+ characters, uppercase, lowercase, numbers)
 * - 4.3: Username must be non-empty string
 *
 * @returns TestUser object with email, password, and username
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

  const username = `testuser${timestamp}`;

  return {
    email,
    password,
    username,
  };
}
