/**
 * Test user cleanup helper functions for E2E tests
 * Handles deletion of test users from Cognito after test completion
 */

import {
  CognitoIdentityProviderClient,
  AdminDeleteUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';

/**
 * Deletes a test user from Cognito User Pool
 *
 * Requirements:
 * - 4.4: Test users should be removed from Cognito after test completion
 * - 4.5: Cleanup failures should be logged and execution should continue
 * - 8.2: Test data should be cleaned up before the next test
 * - 10.2: Test users should be deleted from Cognito
 *
 * @param email - Email address of the test user to delete
 * @returns Promise that resolves when cleanup is complete (never throws)
 */
export async function cleanupTestUser(email: string): Promise<void> {
  try {
    // Validate required environment variable
    const userPoolId = process.env.USER_POOL_ID;
    if (!userPoolId) {
      console.warn(
        '[Cleanup] USER_POOL_ID environment variable is not set. Skipping test user cleanup.'
      );
      return;
    }

    // Initialize Cognito client
    const client = new CognitoIdentityProviderClient({
      region: process.env.AWS_REGION || 'ap-northeast-1',
    });

    // Delete user from Cognito
    const command = new AdminDeleteUserCommand({
      UserPoolId: userPoolId,
      Username: email,
    });

    await client.send(command);
    console.log(`[Cleanup] Successfully deleted test user: ${email}`);
  } catch (error) {
    // Handle user not found error (user may have already been deleted)
    if (
      error &&
      typeof error === 'object' &&
      'name' in error &&
      error.name === 'UserNotFoundException'
    ) {
      console.log(`[Cleanup] Test user not found (may have been already deleted): ${email}`);
      return;
    }

    // Log error but don't throw - cleanup failures should not fail tests
    console.error(`[Cleanup] Failed to delete test user: ${email}`, error);
    console.error('[Cleanup] Continuing execution despite cleanup failure');
  }
}
