/**
 * E2E test helper functions
 * Exports all helper utilities for E2E tests
 */

export { generateTestUser, createTestUser, loginUser, type TestUser } from './test-user';
export { cleanupTestUser } from './cleanup';
export {
    isNetworkError,
    formatNetworkError,
    navigateWithErrorHandling,
    simulateNetworkError,
    simulateSlowNetwork,
} from './network-error';
export {
    isCognitoAvailable,
    checkCognitoAvailability,
    waitForCognitoAvailability,
    formatCognitoUnavailableWarning,
    skipIfCognitoUnavailable,
} from './cognito-availability';
export { isUserAlreadyExistsError, registerWithRetry } from './existing-user';
export {
    createTestGame,
    createTestCandidate,
    cleanupTestGame,
    type TestGame,
    type TestCandidate,
} from './test-data';
