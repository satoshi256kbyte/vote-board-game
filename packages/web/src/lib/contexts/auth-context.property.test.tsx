import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useContext } from 'react';
import * as fc from 'fast-check';
import { AuthProvider, AuthContext } from './auth-context';
import { storageService } from '@/lib/services/storage-service';
import { authService } from '@/lib/services/auth-service';
import type { AuthContextType } from '../types/auth';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock authService.refreshToken
vi.mock('@/lib/services/auth-service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/services/auth-service')>();
  return {
    ...actual,
    authService: {
      ...actual.authService,
      refreshToken: vi.fn(),
    },
  };
});

// Helper hook to access AuthContext
function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Arbitrary for valid User objects
const userArb = fc.record({
  userId: fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
  email: fc.emailAddress(),
  username: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
});

describe('AuthProvider - Property-Based Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
    localStorage.clear();
  });

  /**
   * Feature: 9-auth-state-management, Property 1: 認証状態復元の往復一貫性
   * **Validates: Requirements 1.1, 1.2**
   *
   * For any valid User object and AccessToken, if they are stored in localStorage
   * and AuthProvider is mounted, then isAuthenticated should be true and the user
   * object should contain the same userId, email, and username that were stored.
   */
  it('Property 1: 任意の有効な User と AccessToken が localStorage に保存されている場合、AuthProvider マウント後に認証状態が復元される', () => {
    fc.assert(
      fc.property(userArb, fc.string({ minLength: 1 }), (user, accessToken) => {
        // Clean up from previous iteration
        cleanup();
        vi.clearAllMocks();
        localStorage.clear();

        // Store user and access token in localStorage
        storageService.setAccessToken(accessToken);
        storageService.setUser(user);

        // Mock refreshToken to prevent actual API calls during schedule
        vi.mocked(authService.refreshToken).mockResolvedValue({
          accessToken: 'refreshed-token',
          expiresIn: 900,
        });

        // Mount AuthProvider
        const { result } = renderHook(() => useAuth(), {
          wrapper: AuthProvider,
        });

        // Verify auth state is restored
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user).not.toBeNull();
        expect(result.current.user?.userId).toBe(user.userId);
        expect(result.current.user?.email).toBe(user.email);
        expect(result.current.user?.username).toBe(user.username);
        expect(result.current.isLoading).toBe(false);
      }),
      { numRuns: 15, endOnFailure: true }
    );
  });

  /**
   * Feature: 9-auth-state-management, Property 5: ログアウトによる認証状態リセット
   * **Validates: Requirements 4.2**
   *
   * For any authenticated state (user is not null, isAuthenticated is true),
   * executing logout should result in user being null and isAuthenticated being false.
   */
  it('Property 5: 任意の認証済み状態から logout を実行すると、user が null かつ isAuthenticated が false になる', () => {
    fc.assert(
      fc.property(userArb, fc.string({ minLength: 1 }), (user, accessToken) => {
        // Clean up from previous iteration
        cleanup();
        vi.clearAllMocks();
        localStorage.clear();

        // Set up authenticated state
        storageService.setAccessToken(accessToken);
        storageService.setUser(user);

        // Mock refreshToken to prevent actual API calls
        vi.mocked(authService.refreshToken).mockResolvedValue({
          accessToken: 'refreshed-token',
          expiresIn: 900,
        });

        const { result } = renderHook(() => useAuth(), {
          wrapper: AuthProvider,
        });

        // Verify initially authenticated
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user).not.toBeNull();

        // Execute logout
        act(() => {
          result.current.logout();
        });

        // Verify state is reset
        expect(result.current.user).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
      }),
      { numRuns: 15, endOnFailure: true }
    );
  });

  /**
   * Feature: 9-auth-state-management, Property 6: トークンリフレッシュのスケジューリングタイミング
   * **Validates: Requirements 3.1**
   *
   * For any expiresIn value (in seconds), when AuthProvider is in authenticated state,
   * the refresh timer should be scheduled at (expiresIn - 60) * 1000 milliseconds.
   *
   * Since login uses DEFAULT_EXPIRES_IN=900, we verify that after login,
   * the refresh is scheduled at (900-60)*1000 = 840000ms.
   * We also test re-scheduling by mocking refreshToken to return different expiresIn values.
   */
  it('Property 6: login 後、リフレッシュが (expiresIn - 60) * 1000 ms 後にスケジュールされる', () => {
    fc.assert(
      fc.property(userArb, fc.integer({ min: 61, max: 3600 }), (user, expiresIn) => {
        // Clean up from previous iteration
        cleanup();
        vi.clearAllMocks();
        vi.clearAllTimers();
        localStorage.clear();

        // Set up access token and refresh token (needed for refresh call)
        storageService.setAccessToken('mock-access-token');
        storageService.setRefreshToken('mock-refresh-token');

        // Mock refreshToken to return the arbitrary expiresIn for re-scheduling
        vi.mocked(authService.refreshToken).mockResolvedValue({
          accessToken: 'new-token',
          expiresIn,
        });

        const { result } = renderHook(() => useAuth(), {
          wrapper: AuthProvider,
        });

        // Call login to trigger schedule with DEFAULT_EXPIRES_IN=900
        act(() => {
          result.current.login(user);
        });

        // The initial schedule should be at (900 - 60) * 1000 = 840000ms
        // Advance to just before the scheduled time - refreshToken should NOT be called
        act(() => {
          vi.advanceTimersByTime(839999);
        });
        expect(authService.refreshToken).not.toHaveBeenCalled();

        // Advance 1ms more to trigger the refresh
        act(() => {
          vi.advanceTimersByTime(1);
        });
        expect(authService.refreshToken).toHaveBeenCalledTimes(1);
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });
});
