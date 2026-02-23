import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import { AuthRedirect } from './auth-redirect';

// Mock next/navigation
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('AuthRedirect - Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.clearAllMocks();
  });

  /**
   * Feature: 9-auth-state-management, Property 10: AuthRedirect の認証済みユーザーリダイレクト
   * **Validates: Requirements 6.1, 6.2**
   */
  it('Property 10: 任意の認証済みユーザーが認証画面にアクセスした場合、/ にリダイレクトされる', () => {
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

          mockUseAuth.mockReturnValue({
            isAuthenticated: true,
            isLoading: false,
            user,
            setUser: vi.fn(),
            login: vi.fn(),
            logout: vi.fn(),
          });

          render(
            <AuthRedirect>
              <div>Auth Page Content</div>
            </AuthRedirect>
          );

          // Should redirect to /
          expect(mockPush).toHaveBeenCalledWith('/');

          // Children should NOT be rendered
          expect(screen.queryByText('Auth Page Content')).not.toBeInTheDocument();
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });
});
