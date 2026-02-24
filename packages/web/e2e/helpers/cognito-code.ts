/**
 * Cognito confirmation code helper for E2E tests
 *
 * NOTE: Getting confirmation codes from Cognito in E2E tests is challenging.
 * This helper provides a mock implementation for now.
 *
 * For production E2E tests, consider:
 * 1. Using AWS SDK AdminGetUser API (requires admin IAM permissions)
 * 2. Using a test email service (e.g., Mailhog, MailSlurp)
 * 3. Mocking the confirmation code flow in the backend
 */

/**
 * Gets a confirmation code for password reset
 *
 * MOCK IMPLEMENTATION: Returns a hardcoded code for testing purposes.
 * In a real implementation, this would:
 * - Query Cognito using AdminGetUser API
 * - Or fetch from a test email service
 * - Or use a test-specific backend endpoint
 *
 * @param email - Email address of the user
 * @returns Promise resolving to the confirmation code
 */
export async function getPasswordResetCode(email: string): Promise<string> {
  // TODO: Implement actual code retrieval
  // For now, return a mock code that won't work with real Cognito
  console.warn(`[Mock] getPasswordResetCode called for ${email}. Returning mock code.`);
  return '123456';
}
