import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { LoginForm } from './login-form';
import { useLogin } from '@/lib/hooks/use-login';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('@/lib/hooks/use-login', () => ({
  useLogin: vi.fn(),
}));

describe('LoginForm', () => {
  const mockPush = vi.fn();
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({
      push: mockPush,
    });
    (useLogin as ReturnType<typeof vi.fn>).mockReturnValue({
      login: mockLogin,
      isLoading: false,
      error: null,
    });
  });

  describe('初期表示', () => {
    it('メールアドレス入力フィールドを表示する', () => {
      render(<LoginForm />);
      const emailInput = screen.getByLabelText('メールアドレス');
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('placeholder', 'メールアドレス');
    });

    it('パスワード入力フィールドを表示する', () => {
      render(<LoginForm />);
      const passwordInput = screen.getByLabelText('パスワード');
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('placeholder', 'パスワード');
    });

    it('ログインボタンを表示する', () => {
      render(<LoginForm />);
      const loginButton = screen.getByRole('button', { name: 'ログイン' });
      expect(loginButton).toBeInTheDocument();
    });

    it('パスワードリセットリンクを表示する', () => {
      render(<LoginForm />);
      const resetLink = screen.getByRole('link', { name: 'パスワードをお忘れですか？' });
      expect(resetLink).toBeInTheDocument();
      expect(resetLink).toHaveAttribute('href', '/password-reset');
    });

    it('新規登録リンクを表示する', () => {
      render(<LoginForm />);
      const registerLink = screen.getByRole('link', { name: '新規登録' });
      expect(registerLink).toBeInTheDocument();
      expect(registerLink).toHaveAttribute('href', '/register');
    });

    it('パスワード表示切り替えボタンを表示する', () => {
      render(<LoginForm />);
      const toggleButton = screen.getByLabelText('パスワードを表示');
      expect(toggleButton).toBeInTheDocument();
    });
  });

  describe('空フィールドのバリデーション', () => {
    it('メールアドレスが空の場合、エラーメッセージを表示する', async () => {
      render(<LoginForm />);
      const loginButton = screen.getByRole('button', { name: 'ログイン' });

      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('メールアドレスを入力してください')).toBeInTheDocument();
      });
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('パスワードが空の場合、エラーメッセージを表示する', async () => {
      render(<LoginForm />);
      const emailInput = screen.getByLabelText('メールアドレス');
      const loginButton = screen.getByRole('button', { name: 'ログイン' });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('パスワードを入力してください')).toBeInTheDocument();
      });
      expect(mockLogin).not.toHaveBeenCalled();
    });
  });

  describe('ローディング状態', () => {
    it('ローディング中はボタンが無効化され、テキストが変わる', () => {
      (useLogin as ReturnType<typeof vi.fn>).mockReturnValue({
        login: mockLogin,
        isLoading: true,
        error: null,
      });

      render(<LoginForm />);
      const loginButton = screen.getByRole('button', { name: 'ログイン中...' });
      expect(loginButton).toBeDisabled();
      expect(loginButton).toHaveAttribute('aria-disabled', 'true');
    });

    it('ローディング中は入力フィールドが無効化される', () => {
      (useLogin as ReturnType<typeof vi.fn>).mockReturnValue({
        login: mockLogin,
        isLoading: true,
        error: null,
      });

      render(<LoginForm />);
      const emailInput = screen.getByLabelText('メールアドレス');
      const passwordInput = screen.getByLabelText('パスワード');

      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
    });

    it('ローディング中はパスワード表示切り替えボタンが無効化される', () => {
      (useLogin as ReturnType<typeof vi.fn>).mockReturnValue({
        login: mockLogin,
        isLoading: true,
        error: null,
      });

      render(<LoginForm />);
      const toggleButton = screen.getByLabelText('パスワードを表示');
      expect(toggleButton).toBeDisabled();
    });
  });

  describe('ログイン成功フロー', () => {
    it('有効な入力でログインに成功した場合、ホーム画面にリダイレクトする', async () => {
      mockLogin.mockResolvedValue(true);

      render(<LoginForm />);
      const emailInput = screen.getByLabelText('メールアドレス');
      const passwordInput = screen.getByLabelText('パスワード');
      const loginButton = screen.getByRole('button', { name: 'ログイン' });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
        expect(mockPush).toHaveBeenCalledWith('/');
      });
    });
  });

  describe('APIエラー表示', () => {
    it('APIエラーがある場合、エラーメッセージを表示する', () => {
      (useLogin as ReturnType<typeof vi.fn>).mockReturnValue({
        login: mockLogin,
        isLoading: false,
        error: 'メールアドレスまたはパスワードが正しくありません',
      });

      render(<LoginForm />);
      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toHaveTextContent('メールアドレスまたはパスワードが正しくありません');
    });
  });

  describe('パスワード表示切り替え', () => {
    it('パスワード表示切り替えボタンをクリックすると、パスワードが表示される', () => {
      render(<LoginForm />);
      const passwordInput = screen.getByLabelText('パスワード');
      const toggleButton = screen.getByLabelText('パスワードを表示');

      expect(passwordInput).toHaveAttribute('type', 'password');

      fireEvent.click(toggleButton);

      expect(passwordInput).toHaveAttribute('type', 'text');
      expect(screen.getByLabelText('パスワードを非表示')).toBeInTheDocument();
    });

    it('パスワード表示中に切り替えボタンをクリックすると、パスワードが非表示になる', () => {
      render(<LoginForm />);
      const passwordInput = screen.getByLabelText('パスワード');
      const toggleButton = screen.getByLabelText('パスワードを表示');

      fireEvent.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');

      const hideButton = screen.getByLabelText('パスワードを非表示');
      fireEvent.click(hideButton);

      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(screen.getByLabelText('パスワードを表示')).toBeInTheDocument();
    });
  });

  describe('ARIA属性', () => {
    it('メールアドレス入力フィールドにaria-label属性が設定されている', () => {
      render(<LoginForm />);
      const emailInput = screen.getByLabelText('メールアドレス');
      expect(emailInput).toHaveAttribute('aria-label', 'メールアドレス');
    });

    it('パスワード入力フィールドにaria-label属性が設定されている', () => {
      render(<LoginForm />);
      const passwordInput = screen.getByLabelText('パスワード');
      expect(passwordInput).toHaveAttribute('aria-label', 'パスワード');
    });

    it('バリデーションエラー時にaria-invalid属性が設定される', async () => {
      render(<LoginForm />);
      const loginButton = screen.getByRole('button', { name: 'ログイン' });

      fireEvent.click(loginButton);

      await waitFor(() => {
        const emailInput = screen.getByLabelText('メールアドレス');
        expect(emailInput).toHaveAttribute('aria-invalid', 'true');
        expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
      });
    });

    it('エラーメッセージにrole="alert"属性が設定される', async () => {
      render(<LoginForm />);
      const loginButton = screen.getByRole('button', { name: 'ログイン' });

      fireEvent.click(loginButton);

      await waitFor(() => {
        const errorMessages = screen.getAllByRole('alert');
        expect(errorMessages.length).toBeGreaterThan(0);
      });
    });

    it('パスワード表示切り替えボタンにaria-label属性が設定されている', () => {
      render(<LoginForm />);
      const toggleButton = screen.getByLabelText('パスワードを表示');
      expect(toggleButton).toHaveAttribute('aria-label', 'パスワードを表示');
    });
  });
});
