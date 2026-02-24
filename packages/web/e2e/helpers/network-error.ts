/**
 * Network error handling helper for E2E tests
 * Provides clear error messages when application is unreachable
 */

import type { Page } from '@playwright/test';

/**
 * Checks if an error is a network-related error
 *
 * @param error - Error object to check
 * @returns true if error is network-related
 */
export function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const errorMessage = 'message' in error ? String(error.message) : '';

  // Common network error patterns
  const networkErrorPatterns = [
    'net::ERR_CONNECTION_REFUSED',
    'net::ERR_NAME_NOT_RESOLVED',
    'net::ERR_INTERNET_DISCONNECTED',
    'net::ERR_CONNECTION_TIMED_OUT',
    'net::ERR_CONNECTION_RESET',
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
    'Navigation timeout',
    'page.goto: Timeout',
    'Target closed',
  ];

  return networkErrorPatterns.some((pattern) => errorMessage.includes(pattern));
}

/**
 * Creates a user-friendly error message for network errors
 *
 * Requirements:
 * - 7.1: If deployed app is unreachable, test should fail with network error message
 *
 * @param error - Original error object
 * @param url - URL that was being accessed
 * @returns Formatted error message
 */
export function formatNetworkError(error: unknown, url: string): string {
  const originalMessage = error instanceof Error ? error.message : String(error);

  return [
    '❌ Network Error: Application is unreachable',
    '',
    `URL: ${url}`,
    '',
    'Possible causes:',
    '  • Application is not deployed or not running',
    '  • Incorrect BASE_URL environment variable',
    '  • Network connectivity issues',
    '  • CloudFront distribution is not accessible',
    '',
    `Original error: ${originalMessage}`,
  ].join('\n');
}

/**
 * Attempts to navigate to a page with network error handling
 *
 * Requirements:
 * - 7.1: If deployed app is unreachable, test should fail with network error message
 * - 7.4: If page load times out, test runner should save screenshot and fail test
 *
 * @param page - Playwright page instance
 * @param url - URL to navigate to (relative or absolute)
 * @throws Error with formatted network error message if navigation fails
 */
export async function navigateWithErrorHandling(page: Page, url: string): Promise<void> {
  try {
    await page.goto(url);
  } catch (error) {
    if (isNetworkError(error)) {
      // Use the URL as-is for error message (Playwright resolves relative URLs automatically)
      throw new Error(formatNetworkError(error, url));
    }
    // Re-throw non-network errors as-is
    throw error;
  }
}
