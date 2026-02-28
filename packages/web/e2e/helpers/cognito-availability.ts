/**
 * Cognito service availability checker for E2E tests
 * Provides graceful test skipping when Cognito is unavailable
 */

import {
    CognitoIdentityProviderClient,
    ListUserPoolsCommand,
} from '@aws-sdk/client-cognito-identity-provider';

/**
 * Checks if Cognito service is available
 *
 * Requirements:
 * - 7.2: If Cognito service is unavailable, test runner should skip test with warning
 *
 * @returns Promise that resolves to true if Cognito is available, false otherwise
 */
export async function checkCognitoAvailability(): Promise<boolean> {
    return isCognitoAvailable();
}

/**
 * Checks if Cognito service is available
 *
 * Requirements:
 * - 7.2: If Cognito service is unavailable, test runner should skip test with warning
 *
 * @returns Promise that resolves to true if Cognito is available, false otherwise
 */
export async function isCognitoAvailable(): Promise<boolean> {
    try {
        const userPoolId = process.env.USER_POOL_ID;
        if (!userPoolId) {
            console.warn('[Cognito] USER_POOL_ID environment variable is not set');
            return false;
        }

        const client = new CognitoIdentityProviderClient({
            region: process.env.AWS_REGION || 'ap-northeast-1',
        });

        // Try to list user pools to verify Cognito is accessible
        const command = new ListUserPoolsCommand({ MaxResults: 1 });
        await client.send(command);

        return true;
    } catch (error) {
        console.warn('[Cognito] Service is unavailable:', error);
        return false;
    }
}

/**
 * Waits for Cognito service to become available
 *
 * Requirements:
 * - 6.1: Global setup should verify service availability before running tests
 * - 6.3: Global setup should timeout after 30 seconds if services are unavailable
 *
 * @param timeout - Maximum time to wait in milliseconds (default: 30000)
 * @throws Error if Cognito is not available within timeout
 */
export async function waitForCognitoAvailability(timeout: number = 30000): Promise<void> {
    const startTime = Date.now();
    const checkInterval = 2000; // Check every 2 seconds

    while (Date.now() - startTime < timeout) {
        const available = await isCognitoAvailable();
        if (available) {
            console.log('[Cognito] Service is available');
            return;
        }

        // Wait before next check
        await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }

    throw new Error(
        `Cognito service is not available after ${timeout}ms. Please check your AWS configuration.`
    );
}

/**
 * Formats a warning message for Cognito unavailability
 *
 * Requirements:
 * - 7.2: If Cognito service is unavailable, test runner should skip test with warning
 *
 * @returns Formatted warning message
 */
export function formatCognitoUnavailableWarning(): string {
    return [
        '⚠️  Warning: Cognito service is unavailable',
        '',
        'Possible causes:',
        '  • USER_POOL_ID environment variable is not set',
        '  • AWS credentials are not configured',
        '  • Cognito service is experiencing issues',
        '  • Network connectivity problems',
        '',
        'Tests requiring Cognito will be skipped.',
    ].join('\n');
}

/**
 * Skips the current test if Cognito is unavailable
 * Should be called at the beginning of tests that require Cognito
 *
 * Requirements:
 * - 7.2: If Cognito service is unavailable, test runner should skip test with warning
 *
 * @param testInfo - Playwright TestInfo object
 */
export async function skipIfCognitoUnavailable(testInfo: {
    skip: (condition: boolean, description?: string) => void;
}): Promise<void> {
    const available = await isCognitoAvailable();
    if (!available) {
        testInfo.skip(true, 'Cognito service is unavailable');
    }
}
