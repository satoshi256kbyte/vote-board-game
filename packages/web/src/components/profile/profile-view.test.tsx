import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ProfileView } from './profile-view';
import { useProfile } from '@/lib/hooks/use-profile';
import { useRouter } from 'next/navigation';
import type { Profile } from '@/lib/types/profile';

// useProfileフックをモック
vi.mock('@/lib/hooks/use-profile', () => ({
  useProfile: vi.fn(),
}));

// Next.js routerをモック
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
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

describe('ProfileView', () => {
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
  });

  describe('ローディング状態', () => {
    it('should display loading spinner when isLoading is true', () => {
      vi.mocked(useProfile).mockReturnValue({
        profile: null,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      });

      const { container } = render(<ProfileView />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('animate-spin', 'rounded-full', 'h-12', 'w-12');
    });

    it('should not display profile information while loading', () => {
      vi.mocked(useProfile).mockReturnValue({
        profile: null,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      });

      render(<ProfileView />);

      expect(screen.queryByText('testuser')).not.toBeInTheDocument();
      expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();
    });

    it('should not display edit button while loading', () => {
      vi.mocked(useProfile).mockReturnValue({
        profile: null,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      });

      render(<ProfileView />);

      expect(screen.queryByRole('button', { name: '編集' })).not.toBeInTheDocument();
    });
  });

  describe('プロフィール表示', () => {
    it('should display username when profile is loaded', () => {
      vi.mocked(useProfile).mockReturnValue({
        profile: mockProfile,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ProfileView />);

      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'testuser' })).toBeInTheDocument();
    });

    it('should display email address when profile is loaded', () => {
      vi.mocked(useProfile).mockReturnValue({
        profile: mockProfile,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ProfileView />);

      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('should display profile icon when iconUrl is provided', () => {
      vi.mocked(useProfile).mockReturnValue({
        profile: mockProfile,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ProfileView />);

      const icon = screen.getByAltText('プロフィールアイコン');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('src', 'https://example.com/icon.png');
      expect(icon).toHaveAttribute('width', '128');
      expect(icon).toHaveAttribute('height', '128');
    });

    it('should display default avatar icon when iconUrl is not provided', () => {
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

      const { container } = render(<ProfileView />);

      // Lucide Reactの<User>アイコンが表示されることを確認
      const userIcon = container.querySelector('.lucide-user');
      expect(userIcon).toBeInTheDocument();
      expect(userIcon).toHaveClass('w-16', 'h-16', 'text-gray-400');
    });

    it('should display edit button when profile is loaded', () => {
      vi.mocked(useProfile).mockReturnValue({
        profile: mockProfile,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ProfileView />);

      const editButton = screen.getByRole('button', { name: '編集' });
      expect(editButton).toBeInTheDocument();
    });

    it('should navigate to edit page when edit button is clicked', async () => {
      const user = userEvent.setup();

      vi.mocked(useProfile).mockReturnValue({
        profile: mockProfile,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ProfileView />);

      const editButton = screen.getByRole('button', { name: '編集' });
      await user.click(editButton);

      expect(mockPush).toHaveBeenCalledWith('/profile/edit');
      expect(mockPush).toHaveBeenCalledTimes(1);
    });
  });

  describe('エラー表示', () => {
    it('should display error message when error occurs', () => {
      const errorMessage = '認証エラーが発生しました。再度ログインしてください';

      vi.mocked(useProfile).mockReturnValue({
        profile: null,
        isLoading: false,
        error: errorMessage,
        refetch: mockRefetch,
      });

      render(<ProfileView />);

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

      render(<ProfileView />);

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

      render(<ProfileView />);

      const reloadButton = screen.getByRole('button', { name: '再読み込み' });
      await user.click(reloadButton);

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('should not display profile information when error occurs', () => {
      vi.mocked(useProfile).mockReturnValue({
        profile: null,
        isLoading: false,
        error: 'エラーが発生しました',
        refetch: mockRefetch,
      });

      render(<ProfileView />);

      expect(screen.queryByText('testuser')).not.toBeInTheDocument();
      expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '編集' })).not.toBeInTheDocument();
    });

    it('should display network error message', () => {
      const networkError = 'ネットワークエラーが発生しました。インターネット接続を確認してください';

      vi.mocked(useProfile).mockReturnValue({
        profile: null,
        isLoading: false,
        error: networkError,
        refetch: mockRefetch,
      });

      render(<ProfileView />);

      expect(screen.getByText(networkError)).toBeInTheDocument();
    });

    it('should display server error message', () => {
      const serverError = 'サーバーエラーが発生しました。しばらくしてから再度お試しください';

      vi.mocked(useProfile).mockReturnValue({
        profile: null,
        isLoading: false,
        error: serverError,
        refetch: mockRefetch,
      });

      render(<ProfileView />);

      expect(screen.getByText(serverError)).toBeInTheDocument();
    });
  });

  describe('エッジケース', () => {
    it('should return null when profile is null and not loading or error', () => {
      vi.mocked(useProfile).mockReturnValue({
        profile: null,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      const { container } = render(<ProfileView />);

      expect(container.firstChild).toBeNull();
    });

    it('should handle profile with empty username', () => {
      const profileWithEmptyUsername: Profile = {
        ...mockProfile,
        username: '',
      };

      vi.mocked(useProfile).mockReturnValue({
        profile: profileWithEmptyUsername,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ProfileView />);

      // 空のユーザー名でも表示される
      expect(screen.getByRole('heading')).toBeInTheDocument();
    });

    it('should handle profile with long username', () => {
      const longUsername = 'a'.repeat(50);
      const profileWithLongUsername: Profile = {
        ...mockProfile,
        username: longUsername,
      };

      vi.mocked(useProfile).mockReturnValue({
        profile: profileWithLongUsername,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ProfileView />);

      expect(screen.getByText(longUsername)).toBeInTheDocument();
    });

    it('should handle profile with long email', () => {
      const longEmail = 'verylongemailaddress@verylongdomainname.com';
      const profileWithLongEmail: Profile = {
        ...mockProfile,
        email: longEmail,
      };

      vi.mocked(useProfile).mockReturnValue({
        profile: profileWithLongEmail,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ProfileView />);

      expect(screen.getByText(longEmail)).toBeInTheDocument();
    });
  });

  describe('状態遷移', () => {
    it('should transition from loading to profile display', async () => {
      const { rerender, container } = render(<ProfileView />);

      // 初期状態: ローディング
      vi.mocked(useProfile).mockReturnValue({
        profile: null,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      });

      rerender(<ProfileView />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();

      // プロフィール読み込み完了
      vi.mocked(useProfile).mockReturnValue({
        profile: mockProfile,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      rerender(<ProfileView />);
      await waitFor(() => {
        expect(screen.getByText('testuser')).toBeInTheDocument();
      });
    });

    it('should transition from loading to error display', async () => {
      const { rerender, container } = render(<ProfileView />);

      // 初期状態: ローディング
      vi.mocked(useProfile).mockReturnValue({
        profile: null,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      });

      rerender(<ProfileView />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();

      // エラー発生
      vi.mocked(useProfile).mockReturnValue({
        profile: null,
        isLoading: false,
        error: 'エラーが発生しました',
        refetch: mockRefetch,
      });

      rerender(<ProfileView />);
      await waitFor(() => {
        expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
      });
    });

    it('should transition from error to profile display after refetch', async () => {
      const { rerender } = render(<ProfileView />);

      // 初期状態: エラー
      vi.mocked(useProfile).mockReturnValue({
        profile: null,
        isLoading: false,
        error: 'エラーが発生しました',
        refetch: mockRefetch,
      });

      rerender(<ProfileView />);
      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();

      // refetch後に成功
      vi.mocked(useProfile).mockReturnValue({
        profile: mockProfile,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      rerender(<ProfileView />);
      await waitFor(() => {
        expect(screen.getByText('testuser')).toBeInTheDocument();
      });
    });
  });

  describe('アクセシビリティ', () => {
    it('should have proper alt text for profile icon', () => {
      vi.mocked(useProfile).mockReturnValue({
        profile: mockProfile,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ProfileView />);

      const icon = screen.getByAltText('プロフィールアイコン');
      expect(icon).toBeInTheDocument();
    });

    it('should have role="alert" on error message', () => {
      vi.mocked(useProfile).mockReturnValue({
        profile: null,
        isLoading: false,
        error: 'エラーが発生しました',
        refetch: mockRefetch,
      });

      render(<ProfileView />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('エラーが発生しました');
    });

    it('should have accessible button labels', () => {
      vi.mocked(useProfile).mockReturnValue({
        profile: mockProfile,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ProfileView />);

      const editButton = screen.getByRole('button', { name: '編集' });
      expect(editButton).toBeInTheDocument();
    });

    it('should have accessible reload button label', () => {
      vi.mocked(useProfile).mockReturnValue({
        profile: null,
        isLoading: false,
        error: 'エラーが発生しました',
        refetch: mockRefetch,
      });

      render(<ProfileView />);

      const reloadButton = screen.getByRole('button', { name: '再読み込み' });
      expect(reloadButton).toBeInTheDocument();
    });
  });

  describe('レスポンシブデザイン', () => {
    it('should have responsive container classes', () => {
      vi.mocked(useProfile).mockReturnValue({
        profile: mockProfile,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      const { container } = render(<ProfileView />);

      const profileContainer = container.querySelector('.bg-white.rounded-lg.shadow');
      expect(profileContainer).toBeInTheDocument();
      expect(profileContainer).toHaveClass('p-6', 'space-y-6');
    });

    it('should have proper spacing classes', () => {
      vi.mocked(useProfile).mockReturnValue({
        profile: mockProfile,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      const { container } = render(<ProfileView />);

      const flexContainer = container.querySelector('.flex.items-center.space-x-6');
      expect(flexContainer).toBeInTheDocument();
    });
  });
});
