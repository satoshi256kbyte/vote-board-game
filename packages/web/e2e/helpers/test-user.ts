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

export interface TestUser {
    email: string;
    password: string;
    username: string;
    userId?: string;
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

/**
 * Creates a test user in Cognito User Pool
 *
 * Requirements:
 * - 7.3: Test users should be created with unique identifiers
 * - 7.4: Test users should be automatically confirmed (no email verification needed)
 *
 * @returns Promise that resolves to TestUser object with userId
 */
export async function createTestUser(): Promise<TestUser> {
    const testUser = generateTestUser();

    try {
        const userPoolId = process.env.USER_POOL_ID;
        if (!userPoolId) {
            throw new Error('USER_POOL_ID environment variable is not set');
        }

        const client = new CognitoIdentityProviderClient({
            region: process.env.AWS_REGION || 'ap-northeast-1',
        });

        // Create user in Cognito
        const createCommand = new AdminCreateUserCommand({
            UserPoolId: userPoolId,
            Username: testUser.email,
            UserAttributes: [
                { Name: 'email', Value: testUser.email },
                { Name: 'email_verified', Value: 'true' },
            ],
            MessageAction: MessageActionType.SUPPRESS, // Don't send welcome email
        });

        const createResponse = await client.send(createCommand);
        const userId = createResponse.User?.Username || testUser.email;

        // Set permanent password (skip temporary password flow)
        const setPasswordCommand = new AdminSetUserPasswordCommand({
            UserPoolId: userPoolId,
            Username: testUser.email,
            Password: testUser.password,
            Permanent: true,
        });

        await client.send(setPasswordCommand);

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
