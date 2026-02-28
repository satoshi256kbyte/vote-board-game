import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from './header';
import * as useAuthModule from '@/lib/hooks/use-auth';
import * as nextNavigation from 'next/navigation';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock useAuth hook
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

describe('Header', () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(nextNavigation.useRouter).mockReturnValue({
      push: mockPush,
    } as unknown as AppRouterInstance);
  });

  it('should render logo', () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      logout: vi.fn(),
      login: vi.fn(),
      setUser: vi.fn(),
      isLoading: false,
    });

    render(<Header />);
    expect(screen.getByText('投票対局')).toBeInTheDocument();
  });

  it('should render login and register buttons when not authenticated', () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      logout: vi.fn(),
      login: vi.fn(),
      setUser: vi.fn(),
      isLoading: false,
    });

    render(<Header />);
    expect(screen.getByText('ログイン')).toBeInTheDocument();
    expect(screen.getByText('登録')).toBeInTheDocument();
  });

  it('should render create game and profile buttons when authenticated', () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: { userId: 'user-1', username: 'testuser', email: 'test@example.com' },
      isAuthenticated: true,
      logout: vi.fn(),
      login: vi.fn(),
      setUser: vi.fn(),
      isLoading: false,
    });

    render(<Header />);
    expect(screen.getByText('対局作成')).toBeInTheDocument();
    expect(screen.getByText('testuser')).toBeInTheDocument();
  });

  it('should call logout and redirect when logout is clicked', async () => {
    const user = userEvent.setup();
    const mockLogout = vi.fn();
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: { userId: 'user-1', username: 'testuser', email: 'test@example.com' },
      isAuthenticated: true,
      logout: mockLogout,
      login: vi.fn(),
      setUser: vi.fn(),
      isLoading: false,
    });

    render(<Header />);

    // Open dropdown menu
    const profileButton = screen.getByText('testuser');
    await user.click(profileButton);

    // Click logout
    const logoutButton = await screen.findByText('ログアウト');
    await user.click(logoutButton);

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});
