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

  describe('User', () => {
    it('should store and retrieve user', () => {
      const user = { userId: 'u1', email: 'a@b.com', username: 'player1' };
      storageService.setUser(user);
      expect(storageService.getUser()).toEqual(user);
    });

    it('should return null when user does not exist', () => {
      expect(storageService.getUser()).toBeNull();
    });

    it('should remove user', () => {
      const user = { userId: 'u1', email: 'a@b.com', username: 'player1' };
      storageService.setUser(user);
      storageService.removeUser();
      expect(storageService.getUser()).toBeNull();
    });

    it('should return null and remove invalid JSON data', () => {
      localStorage.setItem('vbg_user', 'not-valid-json');
      expect(storageService.getUser()).toBeNull();
      expect(localStorage.getItem('vbg_user')).toBeNull();
    });

    it('should use correct key for user', () => {
      const user = { userId: 'u1', email: 'a@b.com', username: 'player1' };
      storageService.setUser(user);
      expect(localStorage.getItem('vbg_user')).toBe(JSON.stringify(user));
    });
  });

  describe('clearAll', () => {
    it('should remove all auth data', () => {
      storageService.setAccessToken('at');
      storageService.setRefreshToken('rt');
      storageService.setUser({ userId: 'u1', email: 'a@b.com', username: 'p1' });

      storageService.clearAll();

      expect(storageService.getAccessToken()).toBeNull();
      expect(storageService.getRefreshToken()).toBeNull();
      expect(storageService.getUser()).toBeNull();
    });

    it('should not throw when no data exists', () => {
      expect(() => storageService.clearAll()).not.toThrow();
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
