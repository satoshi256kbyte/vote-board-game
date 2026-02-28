/**
 * Wait utilities for E2E tests
 * Provides retry logic and explicit waits for improved test stability
 *
 * Requirements: Requirement 10 (Test Reliability and Stability)
 * - 10.1: Use explicit waits with appropriate timeout values
 * - 10.2: Wait for network requests to complete
 * - 10.3: Retry failed assertions up to 3 times
 * - 10.5: Wait for loading states to complete
 */

import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Default timeout values for different wait operations
 */
export const TIMEOUTS = {
  SHORT: 5000, // 5 seconds - for fast operations
  MEDIUM: 10000, // 10 seconds - for standard operations
  LONG: 15000, // 15 seconds - for slow operations
  NAVIGATION: 30000, // 30 seconds - for page navigation
} as const;

/**
 * Retry configuration
 */
export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  DELAY_MS: 1000,
} as const;

/**
 * Wait for an element to be visible with retry logic
 *
 * @param locator - Playwright locator
 * @param options - Wait options
 * @returns Promise that resolves when element is visible
 */
export async function waitForVisible(
  locator: Locator,
  options: { timeout?: number; retries?: number } = {}
): Promise<void> {
  const timeout = options.timeout ?? TIMEOUTS.MEDIUM;
  const retries = options.retries ?? RETRY_CONFIG.MAX_ATTEMPTS;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await expect(locator).toBeVisible({ timeout });
      return;
    } catch {
      if (attempt === retries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_CONFIG.DELAY_MS));
    }
  }
}

/**
 * Wait for network requests to complete
 *
 * @param page - Playwright page
 * @param urlPattern - URL pattern to wait for (optional)
 * @param options - Wait options
 */
export async function waitForNetworkIdle(
  page: Page,
  urlPattern?: string | RegExp,
  options: { timeout?: number } = {}
): Promise<void> {
  const timeout = options.timeout ?? TIMEOUTS.MEDIUM;

  if (urlPattern) {
    await page.waitForResponse(
      (response) => {
        const url = response.url();
        if (typeof urlPattern === 'string') {
          return url.includes(urlPattern);
        }
        return urlPattern.test(url);
      },
      { timeout }
    );
  }

  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Wait for loading state to complete
 *
 * @param page - Playwright page
 * @param loadingSelector - Selector for loading indicator (default: data-testid="loading")
 * @param options - Wait options
 */
export async function waitForLoadingComplete(
  page: Page,
  loadingSelector: string = '[data-testid="loading"]',
  options: { timeout?: number } = {}
): Promise<void> {
  const timeout = options.timeout ?? TIMEOUTS.MEDIUM;

  try {
    // Wait for loading indicator to appear (if it exists)
    const loadingElement = page.locator(loadingSelector);
    const isVisible = await loadingElement.isVisible().catch(() => false);

    if (isVisible) {
      // Wait for it to disappear
      await expect(loadingElement).toBeHidden({ timeout });
    }
  } catch {
    // Loading indicator might not exist, which is fine
    console.log('[WaitForLoadingComplete] No loading indicator found or already hidden');
  }
}

/**
 * Retry an assertion multiple times
 *
 * @param assertion - Async function containing the assertion
 * @param options - Retry options
 */
export async function retryAssertion<T>(
  assertion: () => Promise<T>,
  options: { maxAttempts?: number; delayMs?: number } = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? RETRY_CONFIG.MAX_ATTEMPTS;
  const delayMs = options.delayMs ?? RETRY_CONFIG.DELAY_MS;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await assertion();
    } catch {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        console.log(`[RetryAssertion] Attempt ${attempt} failed, retrying...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

/**
 * Wait for dynamic content to load
 *
 * @param page - Playwright page
 * @param contentSelector - Selector for the dynamic content
 * @param options - Wait options
 */
export async function waitForDynamicContent(
  page: Page,
  contentSelector: string,
  options: { timeout?: number; retries?: number } = {}
): Promise<void> {
  const timeout = options.timeout ?? TIMEOUTS.MEDIUM;
  const retries = options.retries ?? RETRY_CONFIG.MAX_ATTEMPTS;

  const locator = page.locator(contentSelector);
  await waitForVisible(locator, { timeout, retries });
}

/**
 * Wait for element to be stable (not animating)
 * Note: Waits for element to be visible and attached to DOM
 *
 * @param locator - Playwright locator
 * @param options - Wait options
 */
export async function waitForStable(
  locator: Locator,
  options: { timeout?: number } = {}
): Promise<void> {
  const timeout = options.timeout ?? TIMEOUTS.SHORT;

  // Wait for element to be visible first
  await expect(locator).toBeVisible({ timeout });

  // Wait for element to be attached (stable in DOM)
  await expect(locator).toBeAttached({ timeout });
}

/**
 * Wait for API response with retry
 *
 * @param page - Playwright page
 * @param urlPattern - URL pattern to wait for
 * @param options - Wait options
 * @returns Response object
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  options: { timeout?: number; retries?: number } = {}
): Promise<void> {
  const timeout = options.timeout ?? TIMEOUTS.MEDIUM;
  const retries = options.retries ?? RETRY_CONFIG.MAX_ATTEMPTS;

  await retryAssertion(
    async () => {
      await page.waitForResponse(
        (response) => {
          const url = response.url();
          if (typeof urlPattern === 'string') {
            return url.includes(urlPattern);
          }
          return urlPattern.test(url);
        },
        { timeout }
      );
    },
    { maxAttempts: retries }
  );
}

/**
 * Wait for navigation with retry
 *
 * @param page - Playwright page
 * @param url - Expected URL or URL pattern
 * @param options - Wait options
 */
export async function waitForNavigation(
  page: Page,
  url: string | RegExp,
  options: { timeout?: number; retries?: number } = {}
): Promise<void> {
  const timeout = options.timeout ?? TIMEOUTS.NAVIGATION;
  const retries = options.retries ?? RETRY_CONFIG.MAX_ATTEMPTS;

  await retryAssertion(
    async () => {
      await page.waitForURL(url, { timeout });
    },
    { maxAttempts: retries }
  );
}
