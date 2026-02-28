import { describe, it, expect } from 'vitest';
import { createPlaywrightConfig } from './playwright.config';

describe('Playwright Config', () => {
  describe('BASE_URL environment variable validation', () => {
    it('should throw error when BASE_URL is not set', () => {
      expect(() => {
        createPlaywrightConfig(undefined, false);
      }).toThrow('BASE_URL environment variable is required for E2E tests');
    });

    it('should use BASE_URL from environment variable', () => {
      const config = createPlaywrightConfig('https://example.com', false);
      expect(config.use?.baseURL).toBe('https://example.com');
    });

    it('should accept different URL formats', () => {
      const urls = [
        'http://localhost:3000',
        'https://d1234567890.cloudfront.net',
        'https://example.com:8080',
      ];

      for (const url of urls) {
        const config = createPlaywrightConfig(url, false);
        expect(config.use?.baseURL).toBe(url);
      }
    });
  });

  describe('CI environment detection', () => {
    it('should set retries to 2 in CI environment', () => {
      const config = createPlaywrightConfig('https://example.com', true);
      expect(config.retries).toBe(2);
    });

    it('should set retries to 0 locally', () => {
      const config = createPlaywrightConfig('https://example.com', false);
      expect(config.retries).toBe(0);
    });

    it('should set workers to 1 in CI environment', () => {
      const config = createPlaywrightConfig('https://example.com', true);
      expect(config.workers).toBe(1);
    });

    it('should set workers to undefined locally', () => {
      const config = createPlaywrightConfig('https://example.com', false);
      expect(config.workers).toBeUndefined();
    });

    it('should forbid test.only() in CI environment', () => {
      const config = createPlaywrightConfig('https://example.com', true);
      expect(config.forbidOnly).toBe(true);
    });

    it('should allow test.only() locally', () => {
      const config = createPlaywrightConfig('https://example.com', false);
      expect(config.forbidOnly).toBe(false);
    });

    it('should use headless mode in CI environment', () => {
      const config = createPlaywrightConfig('https://example.com', true);
      expect(config.use?.headless).toBe(true);
    });

    it('should allow headed mode locally', () => {
      const config = createPlaywrightConfig('https://example.com', false);
      expect(config.use?.headless).toBeUndefined();
    });
  });

  describe('Configuration settings', () => {
    it('should set timeout to 15 seconds', () => {
      const config = createPlaywrightConfig('https://example.com', false);
      expect(config.timeout).toBe(15000);
    });

    it('should enable fullyParallel', () => {
      const config = createPlaywrightConfig('https://example.com', false);
      expect(config.fullyParallel).toBe(true);
    });

    it('should set testDir to ./e2e', () => {
      const config = createPlaywrightConfig('https://example.com', false);
      expect(config.testDir).toBe('./e2e');
    });

    it('should configure trace on first retry', () => {
      const config = createPlaywrightConfig('https://example.com', false);
      expect(config.use?.trace).toBe('on-first-retry');
    });

    it('should configure screenshot only on failure', () => {
      const config = createPlaywrightConfig('https://example.com', false);
      expect(config.use?.screenshot).toBe('only-on-failure');
    });

    it('should set navigation timeout to 30 seconds', () => {
      const config = createPlaywrightConfig('https://example.com', false);
      expect(config.use?.navigationTimeout).toBe(30000);
    });

    it('should configure three browsers (Chromium, Firefox, WebKit)', () => {
      const config = createPlaywrightConfig('https://example.com', false);
      expect(config.projects).toHaveLength(3);
      expect(config.projects?.[0].name).toBe('chromium');
      expect(config.projects?.[1].name).toBe('firefox');
      expect(config.projects?.[2].name).toBe('webkit');
    });

    it('should configure HTML and list reporters', () => {
      const config = createPlaywrightConfig('https://example.com', false);
      expect(config.reporter).toHaveLength(2);

      const reporters = config.reporter as Array<[string, Record<string, unknown>] | [string]>;
      expect(reporters[0][0]).toBe('html');
      expect(reporters[0][1]).toEqual({ outputFolder: 'playwright-report' });
      expect(reporters[1][0]).toBe('list');
    });
  });
});
