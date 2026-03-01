/**
 * Playwright global setup
 * Runs once before all tests to check service availability
 */

import { isCognitoAvailable, formatCognitoUnavailableWarning } from './helpers';

const TIMEOUT_MS = 30000; // 30 seconds

/**
 * Check if frontend is accessible
 */
async function checkFrontendAvailability(baseURL: string): Promise<void> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(baseURL, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Frontend returned status ${response.status}: ${response.statusText}`);
    }

    console.log('✅ Frontend is accessible\n');
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(
          `Frontend availability check timed out after ${TIMEOUT_MS / 1000} seconds at ${baseURL}`,
          { cause: error }
        );
      }
      throw new Error(`Frontend not accessible at ${baseURL}: ${error.message}`, { cause: error });
    }
    throw new Error(`Frontend not accessible at ${baseURL}`, { cause: error });
  }
}

/**
 * Check if API is accessible
 */
async function checkAPIAvailability(apiURL: string): Promise<void> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    // Try to access API health endpoint or root
    const _response = await fetch(apiURL, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Accept any response (even 404) as long as the API is reachable
    console.log('✅ API is accessible\n');
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(
          `API availability check timed out after ${TIMEOUT_MS / 1000} seconds at ${apiURL}`,
          { cause: error }
        );
      }
      throw new Error(`API not accessible at ${apiURL}: ${error.message}`, { cause: error });
    }
    throw new Error(`API not accessible at ${apiURL}`, { cause: error });
  }
}

/**
 * Global setup function
 * Checks if required services are available before running tests
 *
 * Requirements:
 * - 6.1: Test suite shall run against isolated test environment
 * - 6.2: Test runner shall run in headless mode when executed in CI/CD pipeline
 * - 7.2: If Cognito service is unavailable, test runner should skip test with warning
 */
export default async function globalSetup() {
  console.log('\n🔍 Checking service availability...\n');

  // Check BASE_URL environment variable
  const baseURL = process.env.BASE_URL;
  if (!baseURL) {
    throw new Error(
      '❌ BASE_URL environment variable is required for E2E tests.\n' +
        '   Please set BASE_URL to your test environment URL (e.g., http://localhost:3000)'
    );
  }

  console.log(`📍 Base URL: ${baseURL}\n`);

  try {
    // Check frontend availability (fail-fast)
    await checkFrontendAvailability(baseURL);

    // Check API availability if NEXT_PUBLIC_API_URL is set
    const apiURL = process.env.NEXT_PUBLIC_API_URL;
    if (apiURL) {
      console.log(`📍 API URL: ${apiURL}\n`);
      await checkAPIAvailability(apiURL);
    } else {
      console.log('⚠️  NEXT_PUBLIC_API_URL not set, skipping API check\n');
    }

    // Check Cognito availability (non-blocking)
    const cognitoAvailable = await isCognitoAvailable();

    if (!cognitoAvailable) {
      console.warn(formatCognitoUnavailableWarning());
      console.warn('\n⚠️  Some tests may be skipped due to Cognito unavailability\n');
    } else {
      console.log('✅ Cognito service is available\n');
    }

    console.log('✓ Test environment is ready\n');
  } catch (error) {
    if (error instanceof Error) {
      console.error(`\n❌ Service availability check failed:\n   ${error.message}\n`);
    } else {
      console.error('\n❌ Service availability check failed with unknown error\n');
    }
    throw error;
  }
}
