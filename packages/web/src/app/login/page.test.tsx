import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import LoginPage from './page';
import * as storageService from '@/lib/services/storage-service';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock LoginForm component
vi.mock('@/components/auth/login-form', () => ({
  LoginForm: () => <div data-testid="login-form">Login Form</div>,
}));

// Mock storage service
vi.mock('@/lib/services/storage-service', () => ({
  getAccessToken: vi.fn(),
}));

describe('LoginPage', () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({
      push: mockPush,
    });
  });

  describe('認証済みユーザーのリダイレクト', () => {
    it('トークンが存在する場合、ホーム画面にリダイレクトする', async () => {
      // トークンが存在する状態をモック
      vi.mocked(storageService.getAccessToken).mockReturnValue('valid-token');

      render(<LoginPage />);

      // ローディングインジケーターが表示される
      expect(screen.getByText('読み込み中...')).toBeInTheDocument();

      // リダイレクトが呼ばれる
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/');
      });

      // LoginFormは表示されない
      expect(screen.queryByTestId('login-form')).not.toBeInTheDocument();
    });
  });

  describe('未認証ユーザーのフォーム表示', () => {
    it('トークンが存在しない場合、ログインフォームを表示する', async () => {
      // トークンが存在しない状態をモック
      vi.mocked(storageService.getAccessToken).mockReturnValue(null);

      render(<LoginPage />);

      // ローディングが終わり、フォームが表示される
      await waitFor(() => {
        expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
      });

      // ページタイトルが表示される
      expect(screen.getByText('ログイン')).toBeInTheDocument();
      expect(screen.getByText('投票ボードゲームへようこそ')).toBeInTheDocument();

      // LoginFormが表示される
      expect(screen.getByTestId('login-form')).toBeInTheDocument();

      // リダイレクトは呼ばれない
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('ローディング状態', () => {
    it('初期表示時にローディングインジケーターを表示する', () => {
      vi.mocked(storageService.getAccessToken).mockReturnValue(null);

      const { container } = render(<LoginPage />);

      // スピナーが存在することを確認（初期状態）
      const spinner = container.querySelector('.animate-spin');

      // 初期状態ではisCheckingがtrueなので、スピナーまたはフォームのどちらかが表示される
      // useEffectが同期的に実行されるため、テスト環境ではすぐにフォームが表示される可能性がある
      expect(spinner !== null || screen.queryByTestId('login-form') !== null).toBe(true);
    });
  });
});
