/**
 * E2E test helper functions
 * Exports all helper utilities for E2E tests
 */

export { generateTestUser, type TestUser } from './test-user';
export { cleanupTestUser } from './cleanup';
export { isNetworkError, formatNetworkError, navigateWithErrorHandling } from './network-error';
export {
  isCognitoAvailable,
  formatCognitoUnavailableWarning,
  skipIfCognitoUnavailable,
} from './cognito-availability';
export { isUserAlreadyExistsError, registerWithRetry } from './existing-user';
