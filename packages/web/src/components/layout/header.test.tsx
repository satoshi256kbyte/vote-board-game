import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from './header';
import * as useAuthModule from '@/lib/hooks/use-auth';
import * as nextNavigation from 'next/navigation';

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
    } as any);
  });

  it('should render logo', () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      setUser: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<Header />);
    expect(screen.getByText('投票ボドゲ')).toBeInTheDocument();
  });

  it('should show login and register buttons when not authenticated', () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      setUser: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<Header />);
    expect(screen.getByText('ログイン')).toBeInTheDocument();
    expect(screen.getByText('登録')).toBeInTheDocument();
  });

  it('should show create game and profile buttons when authenticated', () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: { userId: '1', email: 'test@example.com', username: 'testuser' },
      isAuthenticated: true,
      isLoading: false,
      setUser: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<Header />);
    expect(screen.getByText('対局作成')).toBeInTheDocument();
    expect(screen.getByText('testuser')).toBeInTheDocument();
  });

  it('should call logout and redirect when logout is clicked', async () => {
    const mockLogout = vi.fn();
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: { userId: '1', email: 'test@example.com', username: 'testuser' },
      isAuthenticated: true,
      isLoading: false,
      setUser: vi.fn(),
      login: vi.fn(),
      logout: mockLogout,
    });

    render(<Header />);

    // Open dropdown
    const profileButton = screen.getByText('testuser');
    fireEvent.click(profileButton);

    // Click logout
    const logoutButton = screen.getByText('ログアウト');
    fireEvent.click(logoutButton);

    expect(mockLogout).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});
