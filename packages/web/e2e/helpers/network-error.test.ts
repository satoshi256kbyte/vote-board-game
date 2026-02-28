/**
 * Unit tests for network error handling helpers
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    isNetworkError,
    formatNetworkError,
    navigateWithErrorHandling,
    simulateNetworkError,
    simulateSlowNetwork,
} from './network-error';
import type { Page } from '@playwright/test';

describe('Network Error Helpers', () => {
    describe('isNetworkError', () => {
        it('should detect connection refused errors', () => {
            const error = new Error('net::ERR_CONNECTION_REFUSED');
            expect(isNetworkError(error)).toBe(true);
        });

        it('should detect name not resolved errors', () => {
            const error = new Error('net::ERR_NAME_NOT_RESOLVED');
            expect(isNetworkError(error)).toBe(true);
        });

        it('should detect timeout errors', () => {
            const error = new Error('Navigation timeout of 30000ms exceeded');
            expect(isNetworkError(error)).toBe(true);
        });

        it('should detect ECONNREFUSED errors', () => {
            const error = new Error('connect ECONNREFUSED 127.0.0.1:3000');
            expect(isNetworkError(error)).toBe(true);
        });

        it('should detect ENOTFOUND errors', () => {
            const error = new Error('getaddrinfo ENOTFOUND example.com');
            expect(isNetworkError(error)).toBe(true);
        });

        it('should detect page.goto timeout errors', () => {
            const error = new Error('page.goto: Timeout 30000ms exceeded');
            expect(isNetworkError(error)).toBe(true);
        });

        it('should not detect non-network errors', () => {
            const error = new Error('Element not found');
            expect(isNetworkError(error)).toBe(false);
        });

        it('should handle null/undefined errors', () => {
            expect(isNetworkError(null)).toBe(false);
            expect(isNetworkError(undefined)).toBe(false);
        });

        it('should handle non-error objects', () => {
            expect(isNetworkError('string error')).toBe(false);
            expect(isNetworkError(123)).toBe(false);
        });
    });

    describe('formatNetworkError', () => {
        it('should format network error with URL', () => {
            const error = new Error('net::ERR_CONNECTION_REFUSED');
            const url = 'https://example.com';
            const formatted = formatNetworkError(error, url);

            expect(formatted).toContain('Network Error: Application is unreachable');
            expect(formatted).toContain('URL: https://example.com');
            expect(formatted).toContain('net::ERR_CONNECTION_REFUSED');
        });

        it('should include helpful troubleshooting information', () => {
            const error = new Error('ECONNREFUSED');
            const url = 'http://localhost:3000';
            const formatted = formatNetworkError(error, url);

            expect(formatted).toContain('Possible causes:');
            expect(formatted).toContain('Application is not deployed or not running');
            expect(formatted).toContain('Incorrect BASE_URL environment variable');
            expect(formatted).toContain('Network connectivity issues');
        });

        it('should handle non-Error objects', () => {
            const error = 'Connection failed';
            const url = 'https://example.com';
            const formatted = formatNetworkError(error, url);

            expect(formatted).toContain('Network Error: Application is unreachable');
            expect(formatted).toContain('Connection failed');
        });
    });

    describe('navigateWithErrorHandling', () => {
        let mockPage: Page;

        beforeEach(() => {
            mockPage = {
                goto: vi.fn(),
            } as unknown as Page;
        });

        it('should navigate successfully when no error occurs', async () => {
            vi.mocked(mockPage.goto).mockResolvedValue(null as any);

            await navigateWithErrorHandling(mockPage, '/test-page');

            expect(mockPage.goto).toHaveBeenCalledWith('/test-page');
        });

        it('should throw formatted error for network errors', async () => {
            const networkError = new Error('net::ERR_CONNECTION_REFUSED');
            vi.mocked(mockPage.goto).mockRejectedValue(networkError);

            await expect(navigateWithErrorHandling(mockPage, '/test-page')).rejects.toThrow(
                'Network Error: Application is unreachable'
            );
        });

        it('should re-throw non-network errors as-is', async () => {
            const otherError = new Error('Element not found');
            vi.mocked(mockPage.goto).mockRejectedValue(otherError);

            await expect(navigateWithErrorHandling(mockPage, '/test-page')).rejects.toThrow(
                'Element not found'
            );
        });
    });

    describe('simulateNetworkError', () => {
        let mockPage: Page;

        beforeEach(() => {
            mockPage = {
                route: vi.fn(),
            } as unknown as Page;
        });

        it('should set up route to abort requests', async () => {
            await simulateNetworkError(mockPage, '**/api/votes');

            expect(mockPage.route).toHaveBeenCalledWith('**/api/votes', expect.any(Function));
        });

        it('should abort route when called', async () => {
            let routeHandler: any;
            vi.mocked(mockPage.route).mockImplementation((pattern, handler) => {
                routeHandler = handler;
                return Promise.resolve();
            });

            await simulateNetworkError(mockPage, '**/api/votes');

            const mockRoute = {
                abort: vi.fn(),
            };

            await routeHandler(mockRoute);

            expect(mockRoute.abort).toHaveBeenCalledWith('failed');
        });
    });

    describe('simulateSlowNetwork', () => {
        let mockPage: Page;

        beforeEach(() => {
            mockPage = {
                route: vi.fn(),
            } as unknown as Page;
        });

        it('should set up route to delay requests', async () => {
            await simulateSlowNetwork(mockPage, 1000);

            expect(mockPage.route).toHaveBeenCalledWith('**/*', expect.any(Function));
        });

        it('should delay and continue route when called', async () => {
            vi.useFakeTimers();

            let routeHandler: any;
            vi.mocked(mockPage.route).mockImplementation((pattern, handler) => {
                routeHandler = handler;
                return Promise.resolve();
            });

            await simulateSlowNetwork(mockPage, 1000);

            const mockRoute = {
                continue: vi.fn(),
            };

            const handlerPromise = routeHandler(mockRoute);

            // Fast-forward time
            await vi.advanceTimersByTimeAsync(1000);

            await handlerPromise;

            expect(mockRoute.continue).toHaveBeenCalled();

            vi.useRealTimers();
        });
    });
});
