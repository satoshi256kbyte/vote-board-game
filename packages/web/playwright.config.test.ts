import { describe, it, expect, beforeAll } from 'vitest';

// Set BASE_URL before any tests run to prevent import errors
beforeAll(() => {
  if (!process.env.BASE_URL) {
    process.env.BASE_URL = 'https://example.com';
  }
});

describe('Playwright Config', () => {
  describe('BASE_URL environment variable validation', () => {
    it('should throw error when BASE_URL is not set', async () => {
      const originalBaseUrl = process.env.BASE_URL;
      delete process.env.BASE_URL;

      try {
        await expect(async () => {
          await import('./playwright.config?t=' + Date.now());
        }).rejects.toThrow('BASE_URL environment variable is required for E2E tests');
      } finally {
        if (originalBaseUrl) {
          process.env.BASE_URL = originalBaseUrl;
        }
      }
    });

    it('should use BASE_URL from environment variable', async () => {
      const originalBaseUrl = process.env.BASE_URL;
      process.env.BASE_URL = 'https://example.com';

      try {
        const { default: config } = await import('./playwright.config?t=' + Date.now());
        expect(config.use.baseURL).toBe('https://example.com');
      } finally {
        if (originalBaseUrl) {
          process.env.BASE_URL = originalBaseUrl;
        } else {
          delete process.env.BASE_URL;
        }
      }
    });

    it('should accept different URL formats', async () => {
      const originalBaseUrl = process.env.BASE_URL;
      const urls = [
        'http://localhost:3000',
        'https://d1234567890.cloudfront.net',
        'https://example.com:8080',
      ];

      try {
        for (const url of urls) {
          process.env.BASE_URL = url;
          const { default: config } = await import('./playwright.config?t=' + Date.now());
          expect(config.use.baseURL).toBe(url);
        }
      } finally {
        if (originalBaseUrl) {
          process.env.BASE_URL = originalBaseUrl;
        } else {
          delete process.env.BASE_URL;
        }
      }
    });
  });

  describe('CI environment detection', () => {
    it('should set retries to 2 in CI environment', async () => {
      const originalBaseUrl = process.env.BASE_URL;
      const originalCI = process.env.CI;

      process.env.BASE_URL = 'https://example.com';
      process.env.CI = 'true';

      try {
        const { default: config } = await import('./playwright.config?t=' + Date.now());
        expect(config.retries).toBe(2);
      } finally {
        if (originalBaseUrl) {
          process.env.BASE_URL = originalBaseUrl;
        } else {
          delete process.env.BASE_URL;
        }
        if (originalCI) {
          process.env.CI = originalCI;
        } else {
          delete process.env.CI;
        }
      }
    });

    it('should set retries to 0 locally', async () => {
      const originalBaseUrl = process.env.BASE_URL;
      const originalCI = process.env.CI;

      process.env.BASE_URL = 'https://example.com';
      delete process.env.CI;

      try {
        const { default: config } = await import('./playwright.config?t=' + Date.now());
        expect(config.retries).toBe(0);
      } finally {
        if (originalBaseUrl) {
          process.env.BASE_URL = originalBaseUrl;
        } else {
          delete process.env.BASE_URL;
        }
        if (originalCI) {
          process.env.CI = originalCI;
        }
      }
    });

    it('should set workers to 1 in CI environment', async () => {
      const originalBaseUrl = process.env.BASE_URL;
      const originalCI = process.env.CI;

      process.env.BASE_URL = 'https://example.com';
      process.env.CI = 'true';

      try {
        const { default: config } = await import('./playwright.config?t=' + Date.now());
        expect(config.workers).toBe(1);
      } finally {
        if (originalBaseUrl) {
          process.env.BASE_URL = originalBaseUrl;
        } else {
          delete process.env.BASE_URL;
        }
        if (originalCI) {
          process.env.CI = originalCI;
        } else {
          delete process.env.CI;
        }
      }
    });

    it('should set workers to undefined locally', async () => {
      const originalBaseUrl = process.env.BASE_URL;
      const originalCI = process.env.CI;

      process.env.BASE_URL = 'https://example.com';
      delete process.env.CI;

      try {
        const { default: config } = await import('./playwright.config?t=' + Date.now());
        expect(config.workers).toBeUndefined();
      } finally {
        if (originalBaseUrl) {
          process.env.BASE_URL = originalBaseUrl;
        } else {
          delete process.env.BASE_URL;
        }
        if (originalCI) {
          process.env.CI = originalCI;
        }
      }
    });

    it('should forbid test.only() in CI environment', async () => {
      const originalBaseUrl = process.env.BASE_URL;
      const originalCI = process.env.CI;

      process.env.BASE_URL = 'https://example.com';
      process.env.CI = 'true';

      try {
        const { default: config } = await import('./playwright.config?t=' + Date.now());
        expect(config.forbidOnly).toBe(true);
      } finally {
        if (originalBaseUrl) {
          process.env.BASE_URL = originalBaseUrl;
        } else {
          delete process.env.BASE_URL;
        }
        if (originalCI) {
          process.env.CI = originalCI;
        } else {
          delete process.env.CI;
        }
      }
    });

    it('should allow test.only() locally', async () => {
      const originalBaseUrl = process.env.BASE_URL;
      const originalCI = process.env.CI;

      process.env.BASE_URL = 'https://example.com';
      delete process.env.CI;

      try {
        const { default: config } = await import('./playwright.config?t=' + Date.now());
        expect(config.forbidOnly).toBe(false);
      } finally {
        if (originalBaseUrl) {
          process.env.BASE_URL = originalBaseUrl;
        } else {
          delete process.env.BASE_URL;
        }
        if (originalCI) {
          process.env.CI = originalCI;
        }
      }
    });
  });

  describe('Configuration settings', () => {
    it('should set timeout to 30 seconds', async () => {
      const originalBaseUrl = process.env.BASE_URL;
      process.env.BASE_URL = 'https://example.com';

      try {
        const { default: config } = await import('./playwright.config?t=' + Date.now());
        expect(config.timeout).toBe(30000);
      } finally {
        if (originalBaseUrl) {
          process.env.BASE_URL = originalBaseUrl;
        } else {
          delete process.env.BASE_URL;
        }
      }
    });

    it('should enable fullyParallel', async () => {
      const originalBaseUrl = process.env.BASE_URL;
      process.env.BASE_URL = 'https://example.com';

      try {
        const { default: config } = await import('./playwright.config?t=' + Date.now());
        expect(config.fullyParallel).toBe(true);
      } finally {
        if (originalBaseUrl) {
          process.env.BASE_URL = originalBaseUrl;
        } else {
          delete process.env.BASE_URL;
        }
      }
    });

    it('should set testDir to ./e2e', async () => {
      const originalBaseUrl = process.env.BASE_URL;
      process.env.BASE_URL = 'https://example.com';

      try {
        const { default: config } = await import('./playwright.config?t=' + Date.now());
        expect(config.testDir).toBe('./e2e');
      } finally {
        if (originalBaseUrl) {
          process.env.BASE_URL = originalBaseUrl;
        } else {
          delete process.env.BASE_URL;
        }
      }
    });

    it('should configure trace on first retry', async () => {
      const originalBaseUrl = process.env.BASE_URL;
      process.env.BASE_URL = 'https://example.com';

      try {
        const { default: config } = await import('./playwright.config?t=' + Date.now());
        expect(config.use.trace).toBe('on-first-retry');
      } finally {
        if (originalBaseUrl) {
          process.env.BASE_URL = originalBaseUrl;
        } else {
          delete process.env.BASE_URL;
        }
      }
    });

    it('should configure screenshot only on failure', async () => {
      const originalBaseUrl = process.env.BASE_URL;
      process.env.BASE_URL = 'https://example.com';

      try {
        const { default: config } = await import('./playwright.config?t=' + Date.now());
        expect(config.use.screenshot).toBe('only-on-failure');
      } finally {
        if (originalBaseUrl) {
          process.env.BASE_URL = originalBaseUrl;
        } else {
          delete process.env.BASE_URL;
        }
      }
    });

    it('should set navigation timeout to 30 seconds', async () => {
      const originalBaseUrl = process.env.BASE_URL;
      process.env.BASE_URL = 'https://example.com';

      try {
        const { default: config } = await import('./playwright.config?t=' + Date.now());
        expect(config.use.navigationTimeout).toBe(30000);
      } finally {
        if (originalBaseUrl) {
          process.env.BASE_URL = originalBaseUrl;
        } else {
          delete process.env.BASE_URL;
        }
      }
    });

    it('should configure Chromium browser', async () => {
      const originalBaseUrl = process.env.BASE_URL;
      process.env.BASE_URL = 'https://example.com';

      try {
        const { default: config } = await import('./playwright.config?t=' + Date.now());
        expect(config.projects).toHaveLength(1);
        expect(config.projects[0].name).toBe('chromium');
      } finally {
        if (originalBaseUrl) {
          process.env.BASE_URL = originalBaseUrl;
        } else {
          delete process.env.BASE_URL;
        }
      }
    });

    it('should configure HTML and list reporters', async () => {
      const originalBaseUrl = process.env.BASE_URL;
      process.env.BASE_URL = 'https://example.com';

      try {
        const { default: config } = await import('./playwright.config?t=' + Date.now());
        expect(config.reporter).toHaveLength(2);
        expect(config.reporter[0][0]).toBe('html');
        expect(config.reporter[0][1]).toEqual({ outputFolder: 'playwright-report' });
        expect(config.reporter[1][0]).toBe('list');
      } finally {
        if (originalBaseUrl) {
          process.env.BASE_URL = originalBaseUrl;
        } else {
          delete process.env.BASE_URL;
        }
      }
    });
  });
});
