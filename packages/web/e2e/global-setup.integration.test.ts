/**
 * Integration tests for global setup
 * These tests verify the global setup works with real services
 *
 * Note: These tests require services to be running:
 * - Frontend at BASE_URL
 * - API at NEXT_PUBLIC_API_URL (optional)
 * - Cognito (optional)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import globalSetup from './global-setup';

describe('globalSetup integration', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
    });

    it('should fail when BASE_URL is not set', async () => {
        delete process.env.BASE_URL;

        await expect(globalSetup()).rejects.toThrow(
            'BASE_URL environment variable is required'
        );
    });

    it('should fail when frontend is not accessible', async () => {
        process.env.BASE_URL = 'http://localhost:9999'; // Non-existent port

        await expect(globalSetup()).rejects.toThrow('Frontend not accessible');
    });

    // This test will only pass if services are running
    it.skip('should succeed when all services are available', async () => {
        process.env.BASE_URL = 'http://localhost:3000';
        process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';

        await expect(globalSetup()).resolves.toBeUndefined();
    });
});
