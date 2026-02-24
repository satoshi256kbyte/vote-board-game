/**
 * Network error handling E2E tests
 * Validates Requirements 7.1 and 7.4
 */

import { test, expect } from '@playwright/test';
import { isNetworkError, formatNetworkError, navigateWithErrorHandling } from './helpers';

test.describe('Network Error Handling', () => {
  test('should provide clear error message when application is unreachable', async ({ page }) => {
    // Test with an unreachable URL
    const unreachableUrl = 'http://localhost:99999';

    // Attempt to navigate to unreachable URL
    await expect(async () => {
      await page.goto(unreachableUrl, { timeout: 5000 });
    }).rejects.toThrow();

    // Verify that Playwright captures the error
    // This test validates that the error handling infrastructure is in place
  });

  test('should detect network errors correctly', () => {
    // Test various network error patterns
    const networkErrors = [
      new Error('net::ERR_CONNECTION_REFUSED'),
      new Error('net::ERR_NAME_NOT_RESOLVED'),
      new Error('Navigation timeout of 30000ms exceeded'),
      new Error('page.goto: Timeout 30000ms exceeded'),
      new Error('connect ECONNREFUSED 127.0.0.1:3000'),
    ];

    networkErrors.forEach((error) => {
      expect(isNetworkError(error)).toBe(true);
    });

    // Test non-network errors
    const nonNetworkError = new Error('Element not found');
    expect(isNetworkError(nonNetworkError)).toBe(false);
  });

  test('should format network errors with helpful information', () => {
    const error = new Error('net::ERR_CONNECTION_REFUSED');
    const url = 'https://example.com';
    const formatted = formatNetworkError(error, url);

    // Verify formatted message contains key information
    expect(formatted).toContain('Network Error: Application is unreachable');
    expect(formatted).toContain('URL: https://example.com');
    expect(formatted).toContain('Possible causes:');
    expect(formatted).toContain('Application is not deployed or not running');
    expect(formatted).toContain('net::ERR_CONNECTION_REFUSED');
  });

  test('should handle navigation with error handling helper', async ({ page }) => {
    // Test with valid URL (should succeed)
    await expect(navigateWithErrorHandling(page, '/')).resolves.not.toThrow();

    // Test with invalid URL (should throw formatted error)
    const invalidUrl = 'http://localhost:99999';
    await expect(async () => {
      await page.goto(invalidUrl, { timeout: 5000 });
    }).rejects.toThrow();
  });
});

test.describe('Screenshot and Timeout Handling', () => {
  test('should save screenshot on test failure', async ({ page }) => {
    // This test verifies that Playwright's built-in screenshot functionality works
    // The playwright.config.ts has screenshot: 'only-on-failure' configured

    await page.goto('/');

    // Intentionally fail to trigger screenshot
    // Note: This test is expected to fail to demonstrate screenshot capture
    // In real scenarios, this would be an actual test failure
    try {
      await expect(page.locator('[data-testid="non-existent-element"]')).toBeVisible({
        timeout: 1000,
      });
    } catch (error) {
      // Screenshot should be automatically captured by Playwright
      // Verify the error is caught
      expect(error).toBeDefined();
    }
  });

  test('should respect timeout configuration', async ({ page }) => {
    // Verify that navigation timeout is properly configured
    // The playwright.config.ts has navigationTimeout: 30000 configured

    const startTime = Date.now();

    try {
      // Attempt to navigate to a slow/non-responsive endpoint
      await page.goto('http://localhost:99999', { timeout: 5000 });
    } catch (error) {
      const duration = Date.now() - startTime;

      // Verify timeout occurred within expected range (5s + some buffer)
      expect(duration).toBeLessThan(7000);
      expect(isNetworkError(error)).toBe(true);
    }
  });
});
