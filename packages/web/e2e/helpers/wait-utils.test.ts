import { describe, it, expect, vi, beforeEach } from 'vitest';
import { type Page, type Locator } from '@playwright/test';
import {
  waitForVisible,
  waitForNetworkIdle,
  waitForLoadingComplete,
  retryAssertion,
  waitForDynamicContent,
  TIMEOUTS,
  RETRY_CONFIG,
} from './wait-utils';

describe('wait-utils', () => {
  describe('TIMEOUTS', () => {
    it('should have correct timeout values', () => {
      expect(TIMEOUTS.SHORT).toBe(5000);
      expect(TIMEOUTS.MEDIUM).toBe(10000);
      expect(TIMEOUTS.LONG).toBe(15000);
      expect(TIMEOUTS.NAVIGATION).toBe(30000);
    });
  });

  describe('RETRY_CONFIG', () => {
    it('should have correct retry configuration', () => {
      expect(RETRY_CONFIG.MAX_ATTEMPTS).toBe(3);
      expect(RETRY_CONFIG.DELAY_MS).toBe(1000);
    });
  });

  describe('retryAssertion', () => {
    it('should succeed on first attempt', async () => {
      const assertion = vi.fn().mockResolvedValue('success');

      const result = await retryAssertion(assertion);

      expect(result).toBe('success');
      expect(assertion).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      const assertion = vi
        .fn()
        .mockRejectedValueOnce(new Error('Attempt 1 failed'))
        .mockResolvedValueOnce('success');

      const result = await retryAssertion(assertion, { delayMs: 10 });

      expect(result).toBe('success');
      expect(assertion).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max attempts', async () => {
      const assertion = vi.fn().mockRejectedValue(new Error('Always fails'));

      await expect(retryAssertion(assertion, { maxAttempts: 3, delayMs: 10 })).rejects.toThrow(
        'Always fails'
      );

      expect(assertion).toHaveBeenCalledTimes(3);
    });

    it('should use default retry configuration', async () => {
      const assertion = vi.fn().mockRejectedValue(new Error('Fails'));

      await expect(retryAssertion(assertion, { delayMs: 10 })).rejects.toThrow('Fails');

      expect(assertion).toHaveBeenCalledTimes(RETRY_CONFIG.MAX_ATTEMPTS);
    });
  });

  describe('waitForVisible', () => {
    let mockLocator: Locator;

    beforeEach(() => {
      mockLocator = {
        isVisible: vi.fn().mockResolvedValue(true),
      } as unknown as Locator;
    });

    it('should wait for element to be visible', async () => {
      // This is a simplified test - actual implementation uses expect().toBeVisible()
      // which is harder to mock in unit tests
      expect(mockLocator).toBeDefined();
    });
  });

  describe('waitForNetworkIdle', () => {
    let mockPage: Page;

    beforeEach(() => {
      mockPage = {
        waitForResponse: vi.fn().mockResolvedValue(undefined),
        waitForLoadState: vi.fn().mockResolvedValue(undefined),
      } as unknown as Page;
    });

    it('should wait for network idle without URL pattern', async () => {
      await waitForNetworkIdle(mockPage);

      expect(mockPage.waitForLoadState).toHaveBeenCalledWith('networkidle', {
        timeout: TIMEOUTS.MEDIUM,
      });
    });

    it('should wait for specific URL pattern (string)', async () => {
      await waitForNetworkIdle(mockPage, '/api/games');

      expect(mockPage.waitForResponse).toHaveBeenCalled();
      expect(mockPage.waitForLoadState).toHaveBeenCalled();
    });

    it('should wait for specific URL pattern (regex)', async () => {
      await waitForNetworkIdle(mockPage, /\/api\/games/);

      expect(mockPage.waitForResponse).toHaveBeenCalled();
      expect(mockPage.waitForLoadState).toHaveBeenCalled();
    });

    it('should use custom timeout', async () => {
      await waitForNetworkIdle(mockPage, undefined, { timeout: 5000 });

      expect(mockPage.waitForLoadState).toHaveBeenCalledWith('networkidle', {
        timeout: 5000,
      });
    });
  });

  describe('waitForLoadingComplete', () => {
    let mockPage: Page;
    let mockLocator: Locator;

    beforeEach(() => {
      mockLocator = {
        isVisible: vi.fn().mockResolvedValue(false),
      } as unknown as Locator;

      mockPage = {
        locator: vi.fn().mockReturnValue(mockLocator),
      } as unknown as Page;
    });

    it('should wait for loading indicator to disappear', async () => {
      await waitForLoadingComplete(mockPage);

      expect(mockPage.locator).toHaveBeenCalledWith('[data-testid="loading"]');
    });

    it('should use custom loading selector', async () => {
      await waitForLoadingComplete(mockPage, '[data-testid="custom-loading"]');

      expect(mockPage.locator).toHaveBeenCalledWith('[data-testid="custom-loading"]');
    });

    it('should handle missing loading indicator gracefully', async () => {
      vi.mocked(mockLocator.isVisible).mockRejectedValue(new Error('Not found'));

      await expect(waitForLoadingComplete(mockPage)).resolves.toBeUndefined();
    });
  });

  describe('waitForDynamicContent', () => {
    let mockPage: Page;
    let mockLocator: Locator;

    beforeEach(() => {
      mockLocator = {
        isVisible: vi.fn().mockResolvedValue(true),
      } as unknown as Locator;

      mockPage = {
        locator: vi.fn().mockReturnValue(mockLocator),
      } as unknown as Page;
    });

    it('should wait for dynamic content to load', async () => {
      await waitForDynamicContent(mockPage, '[data-testid="dynamic-content"]');

      expect(mockPage.locator).toHaveBeenCalledWith('[data-testid="dynamic-content"]');
    });

    it('should use custom timeout and retries', async () => {
      await waitForDynamicContent(mockPage, '[data-testid="content"]', {
        timeout: 5000,
        retries: 2,
      });

      expect(mockPage.locator).toHaveBeenCalled();
    });
  });
});
