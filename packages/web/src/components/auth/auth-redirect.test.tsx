import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
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

describe('AuthRedirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.clearAllMocks();
  });

  /**
   * 要件 6.3: isLoading 中のローディング表示テスト
   */
  it('isLoading が true の場合、ローディング表示を行う', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      user: null,
      setUser: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <AuthRedirect>
        <div>Login Form</div>
      </AuthRedirect>
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
    expect(screen.queryByText('Login Form')).not.toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  /**
   * 要件 6.1, 6.2: 認証済み時の / リダイレクトテスト
   */
  it('認証済み時に / にリダイレクトする', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
      setUser: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <AuthRedirect>
        <div>Login Form</div>
      </AuthRedirect>
    );

    expect(mockPush).toHaveBeenCalledWith('/');
    expect(screen.queryByText('Login Form')).not.toBeInTheDocument();
  });

  /**
   * 要件 6.1, 6.2: 未認証時の children 表示テスト
   */
  it('未認証時に children を表示する', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      setUser: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <AuthRedirect>
        <div>Login Form</div>
      </AuthRedirect>
    );

    expect(screen.getByText('Login Form')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
