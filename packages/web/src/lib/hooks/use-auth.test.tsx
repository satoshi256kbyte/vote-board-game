import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAuth } from './use-auth';
import { AuthProvider } from '@/lib/contexts/auth-context';

// Mock next/navigation (required by AuthProvider)
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe('useAuth', () => {
  it('should return auth context when used within AuthProvider', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    expect(result.current).toBeDefined();
    expect(result.current).toHaveProperty('user');
    expect(result.current).toHaveProperty('setUser');
    expect(result.current).toHaveProperty('isAuthenticated');
  });

  it('should throw error when used outside AuthProvider', () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');
  });

  it('should provide setUser function', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    expect(typeof result.current.setUser).toBe('function');
  });

  it('should have isAuthenticated as false initially', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    expect(result.current.isAuthenticated).toBe(false);
  });
});
