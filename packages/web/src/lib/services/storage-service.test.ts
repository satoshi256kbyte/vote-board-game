import { describe, it, expect, beforeEach } from 'vitest';
import {
  storageService,
  getAccessToken,
  setAccessToken,
  removeAccessToken,
} from './storage-service';

describe('StorageService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Access Token', () => {
    it('should store and retrieve access token', () => {
      const token = 'test-access-token';
      storageService.setAccessToken(token);
      expect(storageService.getAccessToken()).toBe(token);
    });

    it('should return null when access token does not exist', () => {
      expect(storageService.getAccessToken()).toBeNull();
    });

    it('should remove access token', () => {
      const token = 'test-access-token';
      storageService.setAccessToken(token);
      storageService.removeAccessToken();
      expect(storageService.getAccessToken()).toBeNull();
    });
  });

  describe('Refresh Token', () => {
    it('should store and retrieve refresh token', () => {
      const token = 'test-refresh-token';
      storageService.setRefreshToken(token);
      expect(storageService.getRefreshToken()).toBe(token);
    });

    it('should return null when refresh token does not exist', () => {
      expect(storageService.getRefreshToken()).toBeNull();
    });

    it('should remove refresh token', () => {
      const token = 'test-refresh-token';
      storageService.setRefreshToken(token);
      storageService.removeRefreshToken();
      expect(storageService.getRefreshToken()).toBeNull();
    });
  });

  describe('SSR Support', () => {
    it('should return null when window is undefined (SSR)', () => {
      const originalWindow = global.window;
      // @ts-expect-error - Testing SSR scenario
      delete global.window;

      expect(storageService.getAccessToken()).toBeNull();
      expect(storageService.getRefreshToken()).toBeNull();

      global.window = originalWindow;
    });

    it('should not throw error when setting tokens in SSR', () => {
      const originalWindow = global.window;
      // @ts-expect-error - Testing SSR scenario
      delete global.window;

      expect(() => storageService.setAccessToken('token')).not.toThrow();
      expect(() => storageService.setRefreshToken('token')).not.toThrow();

      global.window = originalWindow;
    });

    it('should not throw error when removing tokens in SSR', () => {
      const originalWindow = global.window;
      // @ts-expect-error - Testing SSR scenario
      delete global.window;

      expect(() => storageService.removeAccessToken()).not.toThrow();
      expect(() => storageService.removeRefreshToken()).not.toThrow();

      global.window = originalWindow;
    });
  });

  describe('Backward Compatibility Functions', () => {
    it('should work with getAccessToken function', () => {
      const token = 'test-access-token';
      setAccessToken(token);
      expect(getAccessToken()).toBe(token);
    });

    it('should work with removeAccessToken function', () => {
      const token = 'test-access-token';
      setAccessToken(token);
      removeAccessToken();
      expect(getAccessToken()).toBeNull();
    });
  });

  describe('LocalStorage Keys', () => {
    it('should use correct key for access token', () => {
      const token = 'test-access-token';
      storageService.setAccessToken(token);
      expect(localStorage.getItem('vbg_access_token')).toBe(token);
    });

    it('should use correct key for refresh token', () => {
      const token = 'test-refresh-token';
      storageService.setRefreshToken(token);
      expect(localStorage.getItem('vbg_refresh_token')).toBe(token);
    });
  });
});
