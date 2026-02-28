/**
 * E2E Test: User Registration Flow
 *
 * Tests the complete user registration flow including:
 * - Successful registration with valid data
 * - Registration failure with invalid data
 * - Redirect to login page after registration
 *
 * Requirements: Requirement 1 (Authentication Flow Testing)
 * - 1.1: Registration with valid data redirects to login page
 */

import { test, expect } from '@playwright/test';
import { RegistrationPage } from '../page-objects';
import { generateTestUser, cleanupTestUser } from '../helpers';

test.describe('User Registration Flow', () => {
    test('should successfully register with valid data and redirect to login page', async ({ page }) => {
        const registrationPage = new RegistrationPage(page);
        const testUser = generateTestUser();

        try {
            // Navigate to registration page
            await registrationPage.goto();

            // Fill registration form with valid data
            await registrationPage.register(testUser.email, testUser.password);

            // Verify redirect to login page
            await registrationPage.expectRedirectToLogin();

            // Verify we're on the login page
            expect(page.url()).toContain('/login');
        } finally {
            // Clean up test user
            await cleanupTestUser(testUser.email);
        }
    });

    test('should show error message with invalid email', async ({ page }) => {
        const registrationPage = new RegistrationPage(page);

        // Navigate to registration page
        await registrationPage.goto();

        // Fill form with invalid email
        await registrationPage.fillEmail('invalid-email');
        await registrationPage.fillPassword('ValidPass123');
        await registrationPage.fillConfirmPassword('ValidPass123');
        await registrationPage.clickSubmit();

        // Verify error message is displayed
        await registrationPage.expectErrorMessage('');
    });

    test('should show error message with weak password', async ({ page }) => {
        const registrationPage = new RegistrationPage(page);
        const testUser = generateTestUser();

        try {
            // Navigate to registration page
            await registrationPage.goto();

            // Fill form with weak password
            await registrationPage.fillEmail(testUser.email);
            await registrationPage.fillPassword('weak');
            await registrationPage.fillConfirmPassword('weak');
            await registrationPage.clickSubmit();

            // Verify error message is displayed
            await registrationPage.expectErrorMessage('');
        } finally {
            await cleanupTestUser(testUser.email);
        }
    });

    test('should show error message when passwords do not match', async ({ page }) => {
        const registrationPage = new RegistrationPage(page);
        const testUser = generateTestUser();

        try {
            // Navigate to registration page
            await registrationPage.goto();

            // Fill form with mismatched passwords
            await registrationPage.fillEmail(testUser.email);
            await registrationPage.fillPassword('ValidPass123');
            await registrationPage.fillConfirmPassword('DifferentPass456');
            await registrationPage.clickSubmit();

            // Verify error message is displayed
            await registrationPage.expectErrorMessage('');
        } finally {
            await cleanupTestUser(testUser.email);
        }
    });

    test('should complete within 30 seconds', async ({ page }) => {
        const startTime = Date.now();
        const registrationPage = new RegistrationPage(page);
        const testUser = generateTestUser();

        try {
            await registrationPage.goto();
            await registrationPage.register(testUser.email, testUser.password);
            await registrationPage.expectRedirectToLogin();

            const duration = Date.now() - startTime;
            expect(duration).toBeLessThan(30000);
        } finally {
            await cleanupTestUser(testUser.email);
        }
    });
});
