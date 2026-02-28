import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/login-page';
import { RegistrationPage } from '../page-objects/registration-page';
import { VotingPage } from '../page-objects/voting-page';
import { ProfilePage } from '../page-objects/profile-page';
import { GameDetailPage } from '../page-objects/game-detail-page';

/**
 * Validation Error E2E Tests
 *
 * Requirements:
 * - 12.5: Verify validation error messages displayed when submitting form with missing required fields
 * - 12.4: Verify 404 error page displayed when accessing non-existent game
 * - 8.2: Single test should complete within 30 seconds
 */

test.describe('Validation Error Handling', () => {
  test('should display validation error for empty email on login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Submit form with empty email
    await loginPage.fillPassword('password123');
    await loginPage.clickSubmit();

    // Verify validation error is displayed
    const emailInput = page.getByTestId('login-email-input');
    await expect(emailInput).toHaveAttribute('aria-invalid', 'true');
  });

  test('should display validation error for empty password on login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Submit form with empty password
    await loginPage.fillEmail('test@example.com');
    await loginPage.clickSubmit();

    // Verify validation error is displayed
    const passwordInput = page.getByTestId('login-password-input');
    await expect(passwordInput).toHaveAttribute('aria-invalid', 'true');
  });

  test('should display validation error for invalid email format on registration', async ({
    page,
  }) => {
    const registrationPage = new RegistrationPage(page);
    await registrationPage.goto();

    // Submit form with invalid email
    await registrationPage.fillEmail('invalid-email');
    await registrationPage.fillPassword('Password123!');
    await registrationPage.fillConfirmPassword('Password123!');
    await registrationPage.clickSubmit();

    // Verify validation error is displayed
    await registrationPage.expectErrorMessage('メールアドレスの形式が正しくありません');
  });

  test('should display validation error for password mismatch on registration', async ({
    page,
  }) => {
    const registrationPage = new RegistrationPage(page);
    await registrationPage.goto();

    // Submit form with mismatched passwords
    await registrationPage.fillEmail('test@example.com');
    await registrationPage.fillPassword('Password123!');
    await registrationPage.fillConfirmPassword('DifferentPassword123!');
    await registrationPage.clickSubmit();

    // Verify validation error is displayed
    await registrationPage.expectErrorMessage('パスワードが一致しません');
  });

  test('should display validation error for weak password on registration', async ({ page }) => {
    const registrationPage = new RegistrationPage(page);
    await registrationPage.goto();

    // Submit form with weak password
    await registrationPage.fillEmail('test@example.com');
    await registrationPage.fillPassword('weak');
    await registrationPage.fillConfirmPassword('weak');
    await registrationPage.clickSubmit();

    // Verify validation error is displayed
    await registrationPage.expectErrorMessage('パスワードは8文字以上');
  });

  test('should display validation error for empty candidate description', async ({ page }) => {
    const testUser = await createTestUser();
    const testGame = await createTestGame();

    try {
      // Login
      await loginUser(page, testUser);

      // Navigate to voting page
      const votingPage = new VotingPage(page);
      await votingPage.goto(testGame.gameId);

      // Submit empty candidate description
      await votingPage.fillCandidateDescription('');
      await page.getByTestId('vote-submit-candidate-button').click();

      // Verify validation error is displayed
      const descriptionInput = page.getByTestId('vote-candidate-description-input');
      await expect(descriptionInput).toHaveAttribute('aria-invalid', 'true');
    } finally {
      await cleanupTestUser(testUser.email);
      await cleanupTestGame(testGame);
    }
  });

  test('should display validation error for candidate description exceeding 200 characters', async ({
    page,
  }) => {
    const testUser = await createTestUser();
    const testGame = await createTestGame();

    try {
      // Login
      await loginUser(page, testUser);

      // Navigate to voting page
      const votingPage = new VotingPage(page);
      await votingPage.goto(testGame.gameId);

      // Submit candidate description exceeding 200 characters
      const longDescription = 'あ'.repeat(201);
      await votingPage.submitNewCandidate(longDescription);

      // Verify validation error is displayed
      await votingPage.expectErrorMessage('説明文は200文字以内');
    } finally {
      await cleanupTestUser(testUser.email);
      await cleanupTestGame(testGame);
    }
  });

  test('should display validation error for empty profile display name', async ({ page }) => {
    const testUser = await createTestUser();

    try {
      // Login
      await loginUser(page, testUser);

      // Navigate to profile page
      const profilePage = new ProfilePage(page);
      await profilePage.goto();

      // Submit empty display name
      await profilePage.fillDisplayName('');
      await profilePage.submitUpdate();

      // Verify validation error is displayed
      const displayNameInput = page.getByTestId('profile-display-name-input');
      await expect(displayNameInput).toHaveAttribute('aria-invalid', 'true');
    } finally {
      await cleanupTestUser(testUser.email);
    }
  });
});

test.describe('404 Error Handling', () => {
  test('should display 404 error page when accessing non-existent game', async ({ page }) => {
    const testUser = await createTestUser();

    try {
      // Login
      await loginUser(page, testUser);

      // Navigate to non-existent game
      const nonExistentGameId = 'non-existent-game-id-12345';
      const gameDetailPage = new GameDetailPage(page);
      await gameDetailPage.goto(nonExistentGameId);

      // Verify 404 error page is displayed
      const errorElement = page.getByTestId('error-404-page');
      await expect(errorElement).toBeVisible({ timeout: 10000 });
      await expect(errorElement).toContainText('404');
    } finally {
      await cleanupTestUser(testUser.email);
    }
  });

  test('should display 404 error message when accessing non-existent game', async ({ page }) => {
    const testUser = await createTestUser();

    try {
      // Login
      await loginUser(page, testUser);

      // Navigate to non-existent game
      const nonExistentGameId = 'non-existent-game-id-12345';
      await page.goto(`/games/${nonExistentGameId}`);

      // Verify 404 error message is displayed
      const errorMessage = page.getByTestId('error-message');
      await expect(errorMessage).toBeVisible({ timeout: 10000 });
      await expect(errorMessage).toContainText('ゲームが見つかりません');
    } finally {
      await cleanupTestUser(testUser.email);
    }
  });

  test('should allow navigation back to game list from 404 page', async ({ page }) => {
    const testUser = await createTestUser();

    try {
      // Login
      await loginUser(page, testUser);

      // Navigate to non-existent game
      const nonExistentGameId = 'non-existent-game-id-12345';
      await page.goto(`/games/${nonExistentGameId}`);

      // Wait for 404 page
      const errorElement = page.getByTestId('error-404-page');
      await expect(errorElement).toBeVisible({ timeout: 10000 });

      // Click back to game list button
      const backButton = page.getByTestId('error-back-to-games-button');
      await backButton.click();

      // Verify redirect to game list page
      await page.waitForURL('**/games**', { timeout: 10000 });
      expect(page.url()).toContain('/games');
    } finally {
      await cleanupTestUser(testUser.email);
    }
  });
});
