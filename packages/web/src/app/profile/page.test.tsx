import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import ProfilePage from './page';
import { useAuth } from '@/lib/hooks/use-auth';
import { useProfile } from '@/lib/hooks/use-profile';
import { useRouter, usePathname } from 'next/navigation';
import type { Profile } from '@/lib/types/profile';

// useAuthフックをモック
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

// useProfileフックをモック
vi.mock('@/lib/hooks/use-profile', () => ({
  useProfile: vi.fn(),
}));

// Next.js routerをモック
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

// Next.js Imageコンポーネントをモック
vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    width,
    height,
    className,
  }: {
    src: string;
    alt: string;
    width: number;
    height: number;
    className?: string;
  }) => <img src={src} alt={alt} width={width} height={height} className={className} />,
}));

describe('ProfilePage Integration Tests', () => {
  const mockPush = vi.fn();
  const mockRefetch = vi.fn();

  const mockProfile: Profile = {
    userId: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    iconUrl: 'https://example.com/icon.png',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    } as ReturnType<typeof useRouter>);
    vi.mocked(usePathname).mockReturnValue('/profile');
  });

  describe('認証チェック', () => {
    it('should redirect to login when user is not authenticated', () => {
      // 未認証状態
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        setUser: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
      });

      vi.mocked(useProfile).mockReturnValue({
        profile: null,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ProfilePage />);

      // ログイン画面にリダイレクトされることを確認
      expect(mockPush).toHaveBeenCalledWith('/login?redirect=%2Fprofile');
    });

    it('should display loading state while checking authentication', () => {
      // 認証チェック中
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        setUser: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
      });

      vi.mocked(useProfile).mockReturnValue({
        profile: null,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ProfilePage />);

      // ローディング表示を確認
      expect(screen.getByRole('status', { name: '読み込み中' })).toBeInTheDocument();
      expect(screen.getByText('読み込み中...')).toBeInTheDocument();
    });

    it('should not redirect when user is authenticated', () => {
      // 認証済み状態
      vi.mocked(useAuth).mockReturnValue({
        user: {
          userId: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
        },
        isAuthenticated: true,
        isLoading: false,
        setUser: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
      });

      vi.mocked(useProfile).mockReturnValue({
        profile: mockProfile,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ProfilePage />);

      // リダイレクトされないことを確認
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('プロフィール表示', () => {
    beforeEach(() => {
      // 認証済み状態をデフォルトに設定
      vi.mocked(useAuth).mockReturnValue({
        user: {
          userId: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
        },
        isAuthenticated: true,
        isLoading: false,
        setUser: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
      });
    });

    it('should display page title', () => {
      vi.mocked(useProfile).mockReturnValue({
        profile: mockProfile,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ProfilePage />);

      expect(screen.getByRole('heading', { name: 'プロフィール', level: 1 })).toBeInTheDocument();
    });

    it('should display username when profile is loaded', () => {
      vi.mocked(useProfile).mockReturnValue({
        profile: mockProfile,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ProfilePage />);

      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'testuser', level: 2 })).toBeInTheDocument();
    });

    it('should display email address when profile is loaded', () => {
      vi.mocked(useProfile).mockReturnValue({
        profile: mockProfile,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ProfilePage />);

      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('should display profile icon when iconUrl is provided', () => {
      vi.mocked(useProfile).mockReturnValue({
        profile: mockProfile,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ProfilePage />);

      const icon = screen.getByAltText('プロフィールアイコン');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('src', 'https://example.com/icon.png');
    });

    it('should display default avatar when iconUrl is not provided', () => {
      const profileWithoutIcon: Profile = {
        ...mockProfile,
        iconUrl: undefined,
      };

      vi.mocked(useProfile).mockReturnValue({
        profile: profileWithoutIcon,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      const { container } = render(<ProfilePage />);

      // デフォルトのUserアイコンが表示されることを確認
      const userIcon = container.querySelector('.lucide-user');
      expect(userIcon).toBeInTheDocument();
    });

    it('should display edit button', () => {
      vi.mocked(useProfile).mockReturnValue({
        profile: mockProfile,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ProfilePage />);

      const editButton = screen.getByRole('button', { name: '編集' });
      expect(editButton).toBeInTheDocument();
    });

    it('should display loading spinner while fetching profile', () => {
      vi.mocked(useProfile).mockReturnValue({
        profile: null,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      });

      const { container } = render(<ProfilePage />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('編集ボタンナビゲーション', () => {
    beforeEach(() => {
      // 認証済み状態をデフォルトに設定
      vi.mocked(useAuth).mockReturnValue({
        user: {
          userId: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
        },
        isAuthenticated: true,
        isLoading: false,
        setUser: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
      });

      vi.mocked(useProfile).mockReturnValue({
        profile: mockProfile,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });
    });

    it('should navigate to edit page when edit button is clicked', async () => {
      const user = userEvent.setup();

      render(<ProfilePage />);

      const editButton = screen.getByRole('button', { name: '編集' });
      await user.click(editButton);

      expect(mockPush).toHaveBeenCalledWith('/profile/edit');
      expect(mockPush).toHaveBeenCalledTimes(1);
    });

    it('should not navigate when edit button is not clicked', () => {
      render(<ProfilePage />);

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('エラーハンドリング', () => {
    beforeEach(() => {
      // 認証済み状態をデフォルトに設定
      vi.mocked(useAuth).mockReturnValue({
        user: {
          userId: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
        },
        isAuthenticated: true,
        isLoading: false,
        setUser: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
      });
    });

    it('should display error message when profile fetch fails', () => {
      const errorMessage = '認証エラーが発生しました。再度ログインしてください';

      vi.mocked(useProfile).mockReturnValue({
        profile: null,
        isLoading: false,
        error: errorMessage,
        refetch: mockRefetch,
      });

      render(<ProfilePage />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should display reload button when error occurs', () => {
      vi.mocked(useProfile).mockReturnValue({
        profile: null,
        isLoading: false,
        error: 'エラーが発生しました',
        refetch: mockRefetch,
      });

      render(<ProfilePage />);

      const reloadButton = screen.getByRole('button', { name: '再読み込み' });
      expect(reloadButton).toBeInTheDocument();
    });

    it('should call refetch when reload button is clicked', async () => {
      const user = userEvent.setup();

      vi.mocked(useProfile).mockReturnValue({
        profile: null,
        isLoading: false,
        error: 'エラーが発生しました',
        refetch: mockRefetch,
      });

      render(<ProfilePage />);

      const reloadButton = screen.getByRole('button', { name: '再読み込み' });
      await user.click(reloadButton);

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('ページレイアウト', () => {
    beforeEach(() => {
      // 認証済み状態をデフォルトに設定
      vi.mocked(useAuth).mockReturnValue({
        user: {
          userId: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
        },
        isAuthenticated: true,
        isLoading: false,
        setUser: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
      });

      vi.mocked(useProfile).mockReturnValue({
        profile: mockProfile,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });
    });

    it('should have proper container classes', () => {
      const { container } = render(<ProfilePage />);

      const mainContainer = container.querySelector('.container.mx-auto.px-4.py-8.max-w-2xl');
      expect(mainContainer).toBeInTheDocument();
    });

    it('should have proper heading classes', () => {
      render(<ProfilePage />);

      const heading = screen.getByRole('heading', { name: 'プロフィール', level: 1 });
      expect(heading).toHaveClass('text-3xl', 'font-bold', 'mb-8');
    });
  });

  describe('統合シナリオ', () => {
    it('should complete full authentication and profile display flow', async () => {
      // 初期状態: 認証チェック中
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        setUser: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
      });

      vi.mocked(useProfile).mockReturnValue({
        profile: null,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      });

      const { rerender } = render(<ProfilePage />);

      // ローディング表示を確認
      expect(screen.getByRole('status', { name: '読み込み中' })).toBeInTheDocument();

      // 認証完了
      vi.mocked(useAuth).mockReturnValue({
        user: {
          userId: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
        },
        isAuthenticated: true,
        isLoading: false,
        setUser: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
      });

      // プロフィール読み込み中
      vi.mocked(useProfile).mockReturnValue({
        profile: null,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      });

      rerender(<ProfilePage />);

      // プロフィール読み込み完了
      vi.mocked(useProfile).mockReturnValue({
        profile: mockProfile,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      rerender(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('testuser')).toBeInTheDocument();
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '編集' })).toBeInTheDocument();
      });
    });

    it('should handle authentication failure and redirect', () => {
      // 認証失敗
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        setUser: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
      });

      vi.mocked(useProfile).mockReturnValue({
        profile: null,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ProfilePage />);

      // ログイン画面にリダイレクトされることを確認
      expect(mockPush).toHaveBeenCalledWith('/login?redirect=%2Fprofile');
    });

    it('should handle profile fetch error after successful authentication', () => {
      // 認証成功
      vi.mocked(useAuth).mockReturnValue({
        user: {
          userId: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
        },
        isAuthenticated: true,
        isLoading: false,
        setUser: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
      });

      // プロフィール取得エラー
      vi.mocked(useProfile).mockReturnValue({
        profile: null,
        isLoading: false,
        error: 'サーバーエラーが発生しました。しばらくしてから再度お試しください',
        refetch: mockRefetch,
      });

      render(<ProfilePage />);

      // エラーメッセージと再読み込みボタンが表示されることを確認
      expect(
        screen.getByText('サーバーエラーが発生しました。しばらくしてから再度お試しください')
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '再読み込み' })).toBeInTheDocument();
    });

    it('should navigate to edit page from fully loaded profile', async () => {
      const user = userEvent.setup();

      // 認証済み、プロフィール読み込み完了
      vi.mocked(useAuth).mockReturnValue({
        user: {
          userId: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
        },
        isAuthenticated: true,
        isLoading: false,
        setUser: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
      });

      vi.mocked(useProfile).mockReturnValue({
        profile: mockProfile,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ProfilePage />);

      // プロフィールが表示されていることを確認
      expect(screen.getByText('testuser')).toBeInTheDocument();

      // 編集ボタンをクリック
      const editButton = screen.getByRole('button', { name: '編集' });
      await user.click(editButton);

      // 編集画面に遷移することを確認
      expect(mockPush).toHaveBeenCalledWith('/profile/edit');
    });
  });
});
