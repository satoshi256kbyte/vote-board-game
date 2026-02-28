/**
 * Test user helper functions for E2E tests
 * Generates test users with unique emails and secure passwords
 */

import type { Page } from '@playwright/test';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  MessageActionType,
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

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
 * Creates a test user in Cognito and DynamoDB
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
    const userPoolId = process.env.USER_POOL_ID;
    const tableName = process.env.TABLE_NAME;

    if (!userPoolId) {
      throw new Error('USER_POOL_ID environment variable is not set');
    }

    if (!tableName) {
      throw new Error('TABLE_NAME environment variable is not set');
    }

    const region = process.env.AWS_REGION || 'ap-northeast-1';
    const cognitoClient = new CognitoIdentityProviderClient({ region });

    // Generate username (max 20 characters)
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const shortTimestamp = timestamp.toString().slice(-10);
    const username = `test${shortTimestamp}${random}`;

    // Create user in Cognito
    const createCommand = new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: testUser.email,
      UserAttributes: [
        { Name: 'email', Value: testUser.email },
        { Name: 'email_verified', Value: 'true' },
      ],
      MessageAction: MessageActionType.SUPPRESS,
    });

    const createResponse = await cognitoClient.send(createCommand);
    const userId = createResponse.User?.Username || testUser.email;

    // Set permanent password
    const setPasswordCommand = new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: testUser.email,
      Password: testUser.password,
      Permanent: true,
    });

    await cognitoClient.send(setPasswordCommand);

    // Create user record in DynamoDB
    const dynamoClient = new DynamoDBClient({ region });
    const docClient = DynamoDBDocumentClient.from(dynamoClient);

    const now = new Date().toISOString();
    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          PK: `USER#${userId}`,
          SK: `USER#${userId}`,
          userId,
          email: testUser.email,
          username,
          createdAt: now,
          updatedAt: now,
        },
      })
    );

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
