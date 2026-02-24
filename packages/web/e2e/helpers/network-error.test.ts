/**
 * Unit tests for network error handling helpers
 */

import { describe, it, expect } from 'vitest';
import { isNetworkError, formatNetworkError } from './network-error';

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
});
