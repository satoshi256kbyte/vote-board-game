/**
 * E2E tests for profile management
 * Tests profile display and update functionality
 *
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
 */

import { expect } from '@playwright/test';
import { authenticatedUser } from '../fixtures/authenticated-user';
import { ProfilePage, type ProfileData } from '../page-objects/profile-page';

authenticatedUser.describe('Profile Management', () => {
  authenticatedUser(
    'should display current profile information',
    async ({ authenticatedPage, testUser }) => {
      const profilePage = new ProfilePage(authenticatedPage);

      // Navigate to profile page
      await profilePage.goto();

      // Verify profile data is visible
      const profileData: ProfileData = {
        displayName: testUser.email.split('@')[0],
      };
      await profilePage.expectProfileDataVisible(profileData);
    }
  );

  authenticatedUser('should display voting history', async ({ authenticatedPage }) => {
    const profilePage = new ProfilePage(authenticatedPage);

    // Navigate to profile page
    await profilePage.goto();

    // Verify voting history section is visible
    await profilePage.expectVotingHistoryVisible();
  });

  authenticatedUser('should update profile with valid data', async ({ authenticatedPage }) => {
    const profilePage = new ProfilePage(authenticatedPage);

    // Navigate to profile page
    await profilePage.goto();

    // Update profile with new display name
    const newDisplayName = `TestUser_${Date.now()}`;
    await profilePage.updateProfile({ displayName: newDisplayName });

    // Verify success message is displayed
    await profilePage.expectSuccessMessage();

    // Verify updated profile data is displayed
    await profilePage.expectProfileDataVisible({ displayName: newDisplayName });
  });

  authenticatedUser(
    'should show error message for invalid profile data',
    async ({ authenticatedPage }) => {
      const profilePage = new ProfilePage(authenticatedPage);

      // Navigate to profile page
      await profilePage.goto();

      // Try to update profile with invalid data (empty display name)
      await profilePage.fillDisplayName('');
      await profilePage.submitUpdate();

      // Verify error message is displayed
      await profilePage.expectErrorMessage('Display name is required');
    }
  );

  authenticatedUser(
    'should show error message for display name that is too long',
    async ({ authenticatedPage }) => {
      const profilePage = new ProfilePage(authenticatedPage);

      // Navigate to profile page
      await profilePage.goto();

      // Try to update profile with display name that exceeds max length
      const longDisplayName = 'a'.repeat(101); // Assuming max length is 100
      await profilePage.fillDisplayName(longDisplayName);
      await profilePage.submitUpdate();

      // Verify error message is displayed
      await profilePage.expectErrorMessage('Display name is too long');
    }
  );

  authenticatedUser(
    'should complete profile display test within 30 seconds',
    async ({ authenticatedPage }) => {
      const startTime = Date.now();
      const profilePage = new ProfilePage(authenticatedPage);

      // Navigate to profile page
      await profilePage.goto();

      // Verify profile data is visible
      await profilePage.expectVotingHistoryVisible();

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      // Verify test completed within 30 seconds
      expect(duration).toBeLessThan(30);
    }
  );

  authenticatedUser(
    'should complete profile update test within 30 seconds',
    async ({ authenticatedPage }) => {
      const startTime = Date.now();
      const profilePage = new ProfilePage(authenticatedPage);

      // Navigate to profile page
      await profilePage.goto();

      // Update profile
      const newDisplayName = `TestUser_${Date.now()}`;
      await profilePage.updateProfile({ displayName: newDisplayName });

      // Verify success message
      await profilePage.expectSuccessMessage();

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      // Verify test completed within 30 seconds
      expect(duration).toBeLessThan(30);
    }
  );
});
