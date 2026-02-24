/**
 * Playwright global setup
 * Runs once before all tests to check service availability
 */

import { isCognitoAvailable, formatCognitoUnavailableWarning } from './helpers';

/**
 * Global setup function
 * Checks if required services are available before running tests
 */

/**
 * Requirements:
 * - 7.2: If Cognito service is unavailable, test runner should skip test with warning
 */
export default async function globalSetup() {
  console.log('\n🔍 Checking service availability...\n');

  const cognitoAvailable = await isCognitoAvailable();

  if (!cognitoAvailable) {
    console.warn(formatCognitoUnavailableWarning());
    console.warn('\n⚠️  Some tests may be skipped due to Cognito unavailability\n');
  } else {
    console.log('✅ Cognito service is available\n');
  }
}
