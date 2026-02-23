import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ProtectedRoute } from './protected-route';

// Mock next/navigation
const mockPush = vi.fn();
let currentPathname = '/profile';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => currentPathname,
}));

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentPathname = '/profile';
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.clearAllMocks();
  });

  /**
   * 要件 5.4: isLoading 中のローディング表示テスト
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
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  /**
   * 要件 5.1, 5.2: 未認証時のリダイレクトテスト（redirect パラメータ付き）
   */
  it('未認証時に /login?redirect={currentPath} にリダイレクトする', () => {
    currentPathname = '/games/new';
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

    expect(mockPush).toHaveBeenCalledWith('/login?redirect=%2Fgames%2Fnew');
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  /**
   * 要件 5.3: 認証済み時の children 表示テスト
   */
  it('認証済み時に children を表示する', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
      setUser: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  /**
   * 要件 5.2: redirect パラメータにエンコードされたパスが含まれることを確認
   */
  it('特殊文字を含むパスが正しくエンコードされてリダイレクトされる', () => {
    currentPathname = '/games/abc-123/candidates/new';
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

    expect(mockPush).toHaveBeenCalledWith(
      `/login?redirect=${encodeURIComponent('/games/abc-123/candidates/new')}`
    );
  });
});
