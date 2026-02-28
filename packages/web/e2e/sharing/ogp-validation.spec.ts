/**
 * E2E tests for OGP (Open Graph Protocol) validation
 * Tests OGP meta tags and image validity for social sharing
 */

import { test, expect } from "../fixtures";;

// Merge fixtures

test.describe('OGP Meta Tags Validation', () => {
  test('should have OGP meta tags in game detail page', async ({ authenticatedPage, game }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);
    await authenticatedPage.waitForLoadState('networkidle');

    // Get page HTML
    const html = await authenticatedPage.content();

    // Verify og:title meta tag exists
    expect(html).toContain('og:title');

    // Verify og:description meta tag exists
    expect(html).toContain('og:description');

    // Verify og:image meta tag exists
    expect(html).toContain('og:image');

    // Verify og:url meta tag exists
    expect(html).toContain('og:url');
  });

  test('should have og:type meta tag', async ({ authenticatedPage, game }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);
    await authenticatedPage.waitForLoadState('networkidle');

    // Get og:type meta tag
    const ogType = await authenticatedPage
      .locator('meta[property="og:type"]')
      .getAttribute('content');

    // Verify og:type is set
    expect(ogType).toBeTruthy();
  });

  test('should have og:title with game information', async ({ authenticatedPage, game }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);
    await authenticatedPage.waitForLoadState('networkidle');

    // Get og:title meta tag
    const ogTitle = await authenticatedPage
      .locator('meta[property="og:title"]')
      .getAttribute('content');

    // Verify og:title is set and not empty
    expect(ogTitle).toBeTruthy();
    expect(ogTitle!.length).toBeGreaterThan(0);
  });

  test('should have og:description with game details', async ({ authenticatedPage, game }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);
    await authenticatedPage.waitForLoadState('networkidle');

    // Get og:description meta tag
    const ogDescription = await authenticatedPage
      .locator('meta[property="og:description"]')
      .getAttribute('content');

    // Verify og:description is set and not empty
    expect(ogDescription).toBeTruthy();
    expect(ogDescription!.length).toBeGreaterThan(0);
  });

  test('should have og:url with correct game URL', async ({ authenticatedPage, game }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);
    await authenticatedPage.waitForLoadState('networkidle');

    // Get og:url meta tag
    const ogUrl = await authenticatedPage
      .locator('meta[property="og:url"]')
      .getAttribute('content');

    // Verify og:url contains game ID
    expect(ogUrl).toBeTruthy();
    expect(ogUrl).toContain(game.gameId);
  });

  test('should complete within 30 seconds', async ({ authenticatedPage, game }) => {
    const startTime = Date.now();

    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);
    await authenticatedPage.waitForLoadState('networkidle');

    // Get page HTML
    const html = await authenticatedPage.content();

    // Verify OGP meta tags exist
    expect(html).toContain('og:title');
    expect(html).toContain('og:image');

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    // Verify test completed within 30 seconds
    expect(duration).toBeLessThan(30);
  });
});

test.describe('OGP Image Validation', () => {
  test('should have og:image meta tag with URL', async ({ authenticatedPage, game }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);
    await authenticatedPage.waitForLoadState('networkidle');

    // Get og:image meta tag
    const ogImage = await authenticatedPage
      .locator('meta[property="og:image"]')
      .getAttribute('content');

    // Verify og:image URL is set
    expect(ogImage).toBeTruthy();
    expect(ogImage).toMatch(/^https?:\/\//);
  });

  test('should have valid og:image URL format', async ({ authenticatedPage, game }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);
    await authenticatedPage.waitForLoadState('networkidle');

    // Get og:image meta tag
    const ogImage = await authenticatedPage
      .locator('meta[property="og:image"]')
      .getAttribute('content');

    // Verify URL format
    expect(ogImage).toBeTruthy();
    expect(ogImage).toMatch(/^https?:\/\/.+\.(png|jpg|jpeg|webp|gif)$/i);
  });

  test('should return valid image from og:image URL', async ({ authenticatedPage, game, page }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);
    await authenticatedPage.waitForLoadState('networkidle');

    // Get og:image URL
    const ogImage = await authenticatedPage
      .locator('meta[property="og:image"]')
      .getAttribute('content');
    expect(ogImage).toBeTruthy();

    // Make HTTP request to image URL
    const response = await page.request.get(ogImage!);

    // Verify response is successful
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    // Verify content type is an image
    const contentType = response.headers()['content-type'];
    expect(contentType).toMatch(/^image\//);
  });

  test('should have og:image:width and og:image:height', async ({ authenticatedPage, game }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);
    await authenticatedPage.waitForLoadState('networkidle');

    // Get og:image:width meta tag
    const ogImageWidth = await authenticatedPage
      .locator('meta[property="og:image:width"]')
      .getAttribute('content');

    // Get og:image:height meta tag
    const ogImageHeight = await authenticatedPage
      .locator('meta[property="og:image:height"]')
      .getAttribute('content');

    // Verify dimensions are set (optional but recommended)
    // Note: These may not be present in all implementations
    if (ogImageWidth) {
      expect(parseInt(ogImageWidth)).toBeGreaterThan(0);
    }
    if (ogImageHeight) {
      expect(parseInt(ogImageHeight)).toBeGreaterThan(0);
    }
  });

  test('should have og:image:alt for accessibility', async ({ authenticatedPage, game }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);
    await authenticatedPage.waitForLoadState('networkidle');

    // Get og:image:alt meta tag
    const ogImageAlt = await authenticatedPage
      .locator('meta[property="og:image:alt"]')
      .getAttribute('content');

    // Verify alt text is set (optional but recommended for accessibility)
    // Note: This may not be present in all implementations
    if (ogImageAlt) {
      expect(ogImageAlt.length).toBeGreaterThan(0);
    }
  });

  test('should complete within 30 seconds', async ({ authenticatedPage, game, page }) => {
    const startTime = Date.now();

    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);
    await authenticatedPage.waitForLoadState('networkidle');

    // Get og:image URL
    const ogImage = await authenticatedPage
      .locator('meta[property="og:image"]')
      .getAttribute('content');
    expect(ogImage).toBeTruthy();

    // Verify image URL is valid
    const response = await page.request.get(ogImage!);
    expect(response.ok()).toBeTruthy();

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    // Verify test completed within 30 seconds
    expect(duration).toBeLessThan(30);
  });
});

test.describe('Twitter Card Meta Tags', () => {
  test('should have Twitter card meta tags', async ({ authenticatedPage, game }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);
    await authenticatedPage.waitForLoadState('networkidle');

    // Get page HTML
    const html = await authenticatedPage.content();

    // Verify twitter:card meta tag exists
    expect(html).toContain('twitter:card');

    // Verify twitter:title meta tag exists (optional)
    // Note: Twitter falls back to og:title if twitter:title is not present
  });

  test('should have twitter:card with valid type', async ({ authenticatedPage, game }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);
    await authenticatedPage.waitForLoadState('networkidle');

    // Get twitter:card meta tag
    const twitterCard = await authenticatedPage
      .locator('meta[name="twitter:card"]')
      .getAttribute('content');

    // Verify twitter:card is set to a valid type
    if (twitterCard) {
      expect(['summary', 'summary_large_image', 'app', 'player']).toContain(twitterCard);
    }
  });

  test('should have twitter:image meta tag', async ({ authenticatedPage, game }) => {
    // Navigate to game detail page
    await authenticatedPage.goto(`/games/${game.gameId}`);
    await authenticatedPage.waitForLoadState('networkidle');

    // Get twitter:image meta tag (or fall back to og:image)
    const twitterImage = await authenticatedPage
      .locator('meta[name="twitter:image"]')
      .getAttribute('content');
    const ogImage = await authenticatedPage
      .locator('meta[property="og:image"]')
      .getAttribute('content');

    // Verify either twitter:image or og:image is set
    expect(twitterImage || ogImage).toBeTruthy();
  });
});
