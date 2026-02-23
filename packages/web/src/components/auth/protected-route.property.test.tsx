import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import { ProtectedRoute } from './protected-route';

// Mock next/navigation
const mockPush = vi.fn();
const mockPathname = vi.fn<() => string>();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname(),
}));

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Path arbitrary: generates valid URL paths like /profile, /games/123
const pathArb = fc
  .array(
    fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /^[a-z0-9_-]+$/.test(s)),
    { minLength: 1, maxLength: 4 }
  )
  .map((segments) => '/' + segments.join('/'));

describe('ProtectedRoute - Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.clearAllMocks();
  });

  /**
   * Feature: 9-auth-state-management, Property 8: ProtectedRoute の未認証ユーザーリダイレクト
   * **Validates: Requirements 5.1, 5.2**
   */
  it('Property 8: 任意のページパスに対して、未認証ユーザーは /login?redirect={encodedPath} にリダイレクトされる', () => {
    fc.assert(
      fc.property(pathArb, (path) => {
        mockPush.mockClear();
        cleanup();

        mockPathname.mockReturnValue(path);
        mockUseAuth.mockReturnValue({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          setUser: vi.fn(),
          login: vi.fn(),
          logout: vi.fn(),
        });

        render(
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        );

        expect(mockPush).toHaveBeenCalledWith(`/login?redirect=${encodeURIComponent(path)}`);

        // Children should NOT be rendered
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      }),
      { numRuns: 15, endOnFailure: true }
    );
  });

  /**
   * Feature: 9-auth-state-management, Property 9: ProtectedRoute の認証済みユーザー表示
   * **Validates: Requirements 5.3**
   */
  it('Property 9: 任意の認証済み状態に対して、ProtectedRoute は children をリダイレクトなしで表示する', () => {
    fc.assert(
      fc.property(
        fc.record({
          userId: fc.uuid(),
          email: fc.emailAddress(),
          username: fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /^[a-z0-9]+$/.test(s)),
        }),
        (user) => {
          mockPush.mockClear();
          cleanup();

          mockPathname.mockReturnValue('/profile');
          mockUseAuth.mockReturnValue({
            isAuthenticated: true,
            isLoading: false,
            user,
            setUser: vi.fn(),
            login: vi.fn(),
            logout: vi.fn(),
          });

          render(
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          );

          // Children should be rendered
          expect(screen.getByText('Protected Content')).toBeInTheDocument();

          // No redirect should occur
          expect(mockPush).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });
});
