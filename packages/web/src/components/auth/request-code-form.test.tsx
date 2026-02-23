import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { RequestCodeForm } from './request-code-form';
import * as usePasswordResetModule from '@/lib/hooks/use-password-reset';

// Mock the usePasswordReset hook
vi.mock('@/lib/hooks/use-password-reset');

describe('RequestCodeForm - Validation', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Default mock implementation
    vi.mocked(usePasswordResetModule.usePasswordReset).mockReturnValue({
      requestCode: vi.fn().mockResolvedValue(true),
      confirmReset: vi.fn().mockResolvedValue(true),
      resendCode: vi.fn().mockResolvedValue(true),
      isLoading: false,
      error: null,
      successMessage: null,
    });
  });
  it('should display error when email field is empty and blurred', async () => {
    const onCodeSent = vi.fn();
    render(<RequestCodeForm onCodeSent={onCodeSent} />);

    const emailInput = screen.getByLabelText('メールアドレス');

    // Focus and blur without entering anything
    fireEvent.focus(emailInput);
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText('メールアドレスを入力してください')).toBeInTheDocument();
    });
  });

  it('should display error when email format is invalid', async () => {
    const onCodeSent = vi.fn();
    render(<RequestCodeForm onCodeSent={onCodeSent} />);

    const emailInput = screen.getByLabelText('メールアドレス');

    // Enter invalid email
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText('有効なメールアドレスを入力してください')).toBeInTheDocument();
    });
  });

  it('should not display error when email format is valid', async () => {
    const onCodeSent = vi.fn();
    render(<RequestCodeForm onCodeSent={onCodeSent} />);

    const emailInput = screen.getByLabelText('メールアドレス');

    // Enter valid email
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.queryByText('メールアドレスを入力してください')).not.toBeInTheDocument();
      expect(screen.queryByText('有効なメールアドレスを入力してください')).not.toBeInTheDocument();
    });
  });

  it('should disable submit button when validation error exists', async () => {
    const onCodeSent = vi.fn();
    render(<RequestCodeForm onCodeSent={onCodeSent} />);

    const emailInput = screen.getByLabelText('メールアドレス');
    const submitButton = screen.getByRole('button', { name: /確認コードを送信/ });

    // Enter invalid email
    fireEvent.change(emailInput, { target: { value: 'invalid' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
  });

  it('should enable submit button when email is valid', async () => {
    const onCodeSent = vi.fn();
    render(<RequestCodeForm onCodeSent={onCodeSent} />);

    const emailInput = screen.getByLabelText('メールアドレス');
    const submitButton = screen.getByRole('button', { name: /確認コードを送信/ });

    // Enter valid email
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('should apply red border to email field when validation error exists', async () => {
    const onCodeSent = vi.fn();
    render(<RequestCodeForm onCodeSent={onCodeSent} />);

    const emailInput = screen.getByLabelText('メールアドレス');

    // Enter invalid email
    fireEvent.change(emailInput, { target: { value: 'invalid' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(emailInput).toHaveClass('border-red-500');
    });
  });

  it('should set aria-invalid attribute when validation error exists', async () => {
    const onCodeSent = vi.fn();
    render(<RequestCodeForm onCodeSent={onCodeSent} />);

    const emailInput = screen.getByLabelText('メールアドレス');

    // Enter invalid email
    fireEvent.change(emailInput, { target: { value: 'invalid' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    });
  });

  it('should prevent form submission when validation error exists', async () => {
    const onCodeSent = vi.fn();
    render(<RequestCodeForm onCodeSent={onCodeSent} />);

    const emailInput = screen.getByLabelText('メールアドレス');
    const form = emailInput.closest('form');

    // Enter invalid email
    fireEvent.change(emailInput, { target: { value: 'invalid' } });

    // Try to submit form
    if (form) {
      fireEvent.submit(form);
    }

    // Wait a bit to ensure no callback is triggered
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(onCodeSent).not.toHaveBeenCalled();
  });
});

describe('RequestCodeForm - API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call requestCode and onCodeSent when form is submitted with valid email', async () => {
    const mockRequestCode = vi.fn().mockResolvedValue(true);
    const onCodeSent = vi.fn();

    vi.mocked(usePasswordResetModule.usePasswordReset).mockReturnValue({
      requestCode: mockRequestCode,
      confirmReset: vi.fn(),
      resendCode: vi.fn(),
      isLoading: false,
      error: null,
      successMessage: null,
    });

    render(<RequestCodeForm onCodeSent={onCodeSent} />);

    const emailInput = screen.getByLabelText('メールアドレス');
    const submitButton = screen.getByRole('button', { name: /確認コードを送信/ });

    // Enter valid email
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockRequestCode).toHaveBeenCalledWith('test@example.com');
      expect(onCodeSent).toHaveBeenCalledWith('test@example.com');
    });
  });

  it('should not call onCodeSent when requestCode fails', async () => {
    const mockRequestCode = vi.fn().mockResolvedValue(false);
    const onCodeSent = vi.fn();

    vi.mocked(usePasswordResetModule.usePasswordReset).mockReturnValue({
      requestCode: mockRequestCode,
      confirmReset: vi.fn(),
      resendCode: vi.fn(),
      isLoading: false,
      error: 'サーバーエラーが発生しました。しばらくしてから再度お試しください',
      successMessage: null,
    });

    render(<RequestCodeForm onCodeSent={onCodeSent} />);

    const emailInput = screen.getByLabelText('メールアドレス');
    const submitButton = screen.getByRole('button', { name: /確認コードを送信/ });

    // Enter valid email
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockRequestCode).toHaveBeenCalledWith('test@example.com');
      expect(onCodeSent).not.toHaveBeenCalled();
    });
  });

  it('should display API error message when requestCode fails', async () => {
    const mockRequestCode = vi.fn().mockResolvedValue(false);
    const errorMessage = 'サーバーエラーが発生しました。しばらくしてから再度お試しください';

    vi.mocked(usePasswordResetModule.usePasswordReset).mockReturnValue({
      requestCode: mockRequestCode,
      confirmReset: vi.fn(),
      resendCode: vi.fn(),
      isLoading: false,
      error: errorMessage,
      successMessage: null,
    });

    render(<RequestCodeForm onCodeSent={vi.fn()} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('should disable button and show loading state during API call', async () => {
    vi.mocked(usePasswordResetModule.usePasswordReset).mockReturnValue({
      requestCode: vi.fn(),
      confirmReset: vi.fn(),
      resendCode: vi.fn(),
      isLoading: true,
      error: null,
      successMessage: null,
    });

    render(<RequestCodeForm onCodeSent={vi.fn()} />);

    const emailInput = screen.getByLabelText('メールアドレス');
    const submitButton = screen.getByRole('button', { name: /送信中/ });

    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveAttribute('aria-disabled', 'true');
    expect(emailInput).toBeDisabled();
  });

  it('should disable input field during loading', async () => {
    vi.mocked(usePasswordResetModule.usePasswordReset).mockReturnValue({
      requestCode: vi.fn(),
      confirmReset: vi.fn(),
      resendCode: vi.fn(),
      isLoading: true,
      error: null,
      successMessage: null,
    });

    render(<RequestCodeForm onCodeSent={vi.fn()} />);

    const emailInput = screen.getByLabelText('メールアドレス');
    expect(emailInput).toBeDisabled();
  });
});

describe('RequestCodeForm - Accessibility (Task 4.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(usePasswordResetModule.usePasswordReset).mockReturnValue({
      requestCode: vi.fn().mockResolvedValue(true),
      confirmReset: vi.fn().mockResolvedValue(true),
      resendCode: vi.fn().mockResolvedValue(true),
      isLoading: false,
      error: null,
      successMessage: null,
    });
  });

  it('should have aria-label attribute on email input field (Requirement 14.1)', () => {
    const onCodeSent = vi.fn();
    render(<RequestCodeForm onCodeSent={onCodeSent} />);

    const emailInput = screen.getByLabelText('メールアドレス');
    expect(emailInput).toHaveAttribute('aria-label', 'メールアドレス');
  });

  it('should associate error message with field using aria-describedby (Requirement 14.1)', async () => {
    const onCodeSent = vi.fn();
    render(<RequestCodeForm onCodeSent={onCodeSent} />);

    const emailInput = screen.getByLabelText('メールアドレス');

    // Trigger validation error
    fireEvent.change(emailInput, { target: { value: 'invalid' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
    });
  });

  it('should set role="alert" on validation error messages (Requirement 14.5)', async () => {
    const onCodeSent = vi.fn();
    render(<RequestCodeForm onCodeSent={onCodeSent} />);

    const emailInput = screen.getByLabelText('メールアドレス');

    // Trigger validation error
    fireEvent.change(emailInput, { target: { value: '' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      const errorMessage = screen.getByText('メールアドレスを入力してください');
      expect(errorMessage).toHaveAttribute('role', 'alert');
    });
  });

  it('should set role="alert" on API error messages (Requirement 14.5)', () => {
    const errorMessage = 'サーバーエラーが発生しました。しばらくしてから再度お試しください';

    vi.mocked(usePasswordResetModule.usePasswordReset).mockReturnValue({
      requestCode: vi.fn(),
      confirmReset: vi.fn(),
      resendCode: vi.fn(),
      isLoading: false,
      error: errorMessage,
      successMessage: null,
    });

    render(<RequestCodeForm onCodeSent={vi.fn()} />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(errorMessage);
  });

  it('should dynamically set aria-invalid attribute based on validation state (Requirement 14.1)', async () => {
    const onCodeSent = vi.fn();
    render(<RequestCodeForm onCodeSent={onCodeSent} />);

    const emailInput = screen.getByLabelText('メールアドレス');

    // Initially no error
    expect(emailInput).toHaveAttribute('aria-invalid', 'false');

    // Trigger error
    fireEvent.change(emailInput, { target: { value: 'invalid' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    });

    // Fix error
    fireEvent.change(emailInput, { target: { value: 'valid@example.com' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(emailInput).toHaveAttribute('aria-invalid', 'false');
    });
  });

  it('should ensure keyboard navigation is supported', () => {
    const onCodeSent = vi.fn();
    render(<RequestCodeForm onCodeSent={onCodeSent} />);

    const emailInput = screen.getByLabelText('メールアドレス');
    const submitButton = screen.getByRole('button', { name: /確認コードを送信/ });
    const loginLink = screen.getByRole('link', { name: 'ログイン画面に戻る' });

    // All interactive elements should be focusable
    expect(emailInput).not.toHaveAttribute('tabindex', '-1');
    expect(submitButton).not.toHaveAttribute('tabindex', '-1');
    expect(loginLink).not.toHaveAttribute('tabindex', '-1');
  });
});

describe('RequestCodeForm - Initial Display (Task 4.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(usePasswordResetModule.usePasswordReset).mockReturnValue({
      requestCode: vi.fn().mockResolvedValue(true),
      confirmReset: vi.fn().mockResolvedValue(true),
      resendCode: vi.fn().mockResolvedValue(true),
      isLoading: false,
      error: null,
      successMessage: null,
    });
  });

  it('should display email input field (Requirement 1.1)', () => {
    const onCodeSent = vi.fn();
    render(<RequestCodeForm onCodeSent={onCodeSent} />);

    const emailInput = screen.getByLabelText('メールアドレス');
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute('type', 'email');
  });

  it('should display submit button (Requirement 1.2)', () => {
    const onCodeSent = vi.fn();
    render(<RequestCodeForm onCodeSent={onCodeSent} />);

    const submitButton = screen.getByRole('button', { name: '確認コードを送信' });
    expect(submitButton).toBeInTheDocument();
  });

  it('should display instruction text (Requirement 1.3)', () => {
    const onCodeSent = vi.fn();
    render(<RequestCodeForm onCodeSent={onCodeSent} />);

    const instructionText = screen.getByText(
      '登録されているメールアドレスを入力してください。パスワードリセット用の確認コードを送信します。'
    );
    expect(instructionText).toBeInTheDocument();
  });

  it('should display placeholder text in email field (Requirement 1.4)', () => {
    const onCodeSent = vi.fn();
    render(<RequestCodeForm onCodeSent={onCodeSent} />);

    const emailInput = screen.getByLabelText('メールアドレス');
    expect(emailInput).toHaveAttribute('placeholder', 'メールアドレス');
  });

  it('should display login screen link (Requirement 1.5)', () => {
    const onCodeSent = vi.fn();
    render(<RequestCodeForm onCodeSent={onCodeSent} />);

    const loginLink = screen.getByRole('link', { name: 'ログイン画面に戻る' });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');
  });
});

describe('RequestCodeForm - Validation Error Display (Task 4.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(usePasswordResetModule.usePasswordReset).mockReturnValue({
      requestCode: vi.fn().mockResolvedValue(true),
      confirmReset: vi.fn().mockResolvedValue(true),
      resendCode: vi.fn().mockResolvedValue(true),
      isLoading: false,
      error: null,
      successMessage: null,
    });
  });

  it('should display error when email is empty on blur (Requirement 2.1)', async () => {
    const onCodeSent = vi.fn();
    render(<RequestCodeForm onCodeSent={onCodeSent} />);

    const emailInput = screen.getByLabelText('メールアドレス');
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText('メールアドレスを入力してください')).toBeInTheDocument();
    });
  });

  it('should display error when email format is invalid on blur (Requirement 2.2)', async () => {
    const onCodeSent = vi.fn();
    render(<RequestCodeForm onCodeSent={onCodeSent} />);

    const emailInput = screen.getByLabelText('メールアドレス');
    fireEvent.change(emailInput, { target: { value: 'notanemail' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText('有効なメールアドレスを入力してください')).toBeInTheDocument();
    });
  });

  it('should not call API when validation error exists (Requirement 2.3)', async () => {
    const mockRequestCode = vi.fn().mockResolvedValue(true);
    const onCodeSent = vi.fn();

    vi.mocked(usePasswordResetModule.usePasswordReset).mockReturnValue({
      requestCode: mockRequestCode,
      confirmReset: vi.fn(),
      resendCode: vi.fn(),
      isLoading: false,
      error: null,
      successMessage: null,
    });

    render(<RequestCodeForm onCodeSent={onCodeSent} />);

    const submitButton = screen.getByRole('button', { name: '確認コードを送信' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('メールアドレスを入力してください')).toBeInTheDocument();
    });

    expect(mockRequestCode).not.toHaveBeenCalled();
  });
});

describe('RequestCodeForm - Loading State UI Changes (Task 4.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should disable button during loading (Requirement 3.2)', () => {
    vi.mocked(usePasswordResetModule.usePasswordReset).mockReturnValue({
      requestCode: vi.fn(),
      confirmReset: vi.fn(),
      resendCode: vi.fn(),
      isLoading: true,
      error: null,
      successMessage: null,
    });

    const onCodeSent = vi.fn();
    render(<RequestCodeForm onCodeSent={onCodeSent} />);

    const submitButton = screen.getByRole('button', { name: '送信中...' });
    expect(submitButton).toBeDisabled();
  });

  it('should show loading indicator during API call (Requirement 3.3)', () => {
    vi.mocked(usePasswordResetModule.usePasswordReset).mockReturnValue({
      requestCode: vi.fn(),
      confirmReset: vi.fn(),
      resendCode: vi.fn(),
      isLoading: true,
      error: null,
      successMessage: null,
    });

    const onCodeSent = vi.fn();
    render(<RequestCodeForm onCodeSent={onCodeSent} />);

    const loadingButton = screen.getByRole('button', { name: '送信中...' });
    expect(loadingButton).toBeInTheDocument();
  });

  it('should disable email input during loading (Requirement 3.4)', () => {
    vi.mocked(usePasswordResetModule.usePasswordReset).mockReturnValue({
      requestCode: vi.fn(),
      confirmReset: vi.fn(),
      resendCode: vi.fn(),
      isLoading: true,
      error: null,
      successMessage: null,
    });

    const onCodeSent = vi.fn();
    render(<RequestCodeForm onCodeSent={onCodeSent} />);

    const emailInput = screen.getByLabelText('メールアドレス');
    expect(emailInput).toBeDisabled();
  });
});

describe('RequestCodeForm - Success Flow (Task 4.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call onCodeSent with email when request succeeds (Requirements 4.1, 4.2, 4.3, 4.4)', async () => {
    const mockRequestCode = vi.fn().mockResolvedValue(true);
    const onCodeSent = vi.fn();

    vi.mocked(usePasswordResetModule.usePasswordReset).mockReturnValue({
      requestCode: mockRequestCode,
      confirmReset: vi.fn(),
      resendCode: vi.fn(),
      isLoading: false,
      error: null,
      successMessage: null,
    });

    render(<RequestCodeForm onCodeSent={onCodeSent} />);

    const emailInput = screen.getByLabelText('メールアドレス');
    const submitButton = screen.getByRole('button', { name: '確認コードを送信' });

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockRequestCode).toHaveBeenCalledWith('user@example.com');
      expect(onCodeSent).toHaveBeenCalledWith('user@example.com');
    });
  });
});

describe('RequestCodeForm - Failure Flow (Task 4.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display rate limit error message (Requirement 5.1)', () => {
    const errorMessage = 'リクエスト回数が上限に達しました。しばらくしてから再度お試しください';

    vi.mocked(usePasswordResetModule.usePasswordReset).mockReturnValue({
      requestCode: vi.fn(),
      confirmReset: vi.fn(),
      resendCode: vi.fn(),
      isLoading: false,
      error: errorMessage,
      successMessage: null,
    });

    const onCodeSent = vi.fn();
    render(<RequestCodeForm onCodeSent={onCodeSent} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('should display server error message (Requirement 5.2)', () => {
    const errorMessage = 'サーバーエラーが発生しました。しばらくしてから再度お試しください';

    vi.mocked(usePasswordResetModule.usePasswordReset).mockReturnValue({
      requestCode: vi.fn(),
      confirmReset: vi.fn(),
      resendCode: vi.fn(),
      isLoading: false,
      error: errorMessage,
      successMessage: null,
    });

    const onCodeSent = vi.fn();
    render(<RequestCodeForm onCodeSent={onCodeSent} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('should display network error message (Requirement 5.3)', () => {
    const errorMessage = 'ネットワークエラーが発生しました。インターネット接続を確認してください';

    vi.mocked(usePasswordResetModule.usePasswordReset).mockReturnValue({
      requestCode: vi.fn(),
      confirmReset: vi.fn(),
      resendCode: vi.fn(),
      isLoading: false,
      error: errorMessage,
      successMessage: null,
    });

    const onCodeSent = vi.fn();
    render(<RequestCodeForm onCodeSent={onCodeSent} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });
});

describe('RequestCodeForm - Error Recovery (Task 4.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should re-enable button and field after error (Requirement 5.4)', async () => {
    const mockRequestCode = vi.fn().mockResolvedValue(false);

    // First render with error
    const { rerender } = render(<RequestCodeForm onCodeSent={vi.fn()} />);

    vi.mocked(usePasswordResetModule.usePasswordReset).mockReturnValue({
      requestCode: mockRequestCode,
      confirmReset: vi.fn(),
      resendCode: vi.fn(),
      isLoading: false,
      error: 'サーバーエラーが発生しました。しばらくしてから再度お試しください',
      successMessage: null,
    });

    rerender(<RequestCodeForm onCodeSent={vi.fn()} />);

    const emailInput = screen.getByLabelText('メールアドレス');
    const submitButton = screen.getByRole('button', { name: '確認コードを送信' });

    // After error, fields should be enabled
    expect(emailInput).not.toBeDisabled();
    expect(submitButton).not.toBeDisabled();
  });
});

describe('RequestCodeForm - Login Link Navigation (Task 4.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(usePasswordResetModule.usePasswordReset).mockReturnValue({
      requestCode: vi.fn().mockResolvedValue(true),
      confirmReset: vi.fn().mockResolvedValue(true),
      resendCode: vi.fn().mockResolvedValue(true),
      isLoading: false,
      error: null,
      successMessage: null,
    });
  });

  it('should navigate to login screen when link is clicked (Requirement 13.1)', () => {
    const onCodeSent = vi.fn();
    render(<RequestCodeForm onCodeSent={onCodeSent} />);

    const loginLink = screen.getByRole('link', { name: 'ログイン画面に戻る' });
    expect(loginLink).toHaveAttribute('href', '/login');
  });
});

describe('RequestCodeForm - ARIA Attributes (Task 4.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(usePasswordResetModule.usePasswordReset).mockReturnValue({
      requestCode: vi.fn().mockResolvedValue(true),
      confirmReset: vi.fn().mockResolvedValue(true),
      resendCode: vi.fn().mockResolvedValue(true),
      isLoading: false,
      error: null,
      successMessage: null,
    });
  });

  it('should have correct aria-label on email field (Requirement 14.1)', () => {
    const onCodeSent = vi.fn();
    render(<RequestCodeForm onCodeSent={onCodeSent} />);

    const emailInput = screen.getByLabelText('メールアドレス');
    expect(emailInput).toHaveAttribute('aria-label', 'メールアドレス');
  });

  it('should set role="alert" on validation errors (Requirement 14.5)', async () => {
    const onCodeSent = vi.fn();
    render(<RequestCodeForm onCodeSent={onCodeSent} />);

    const emailInput = screen.getByLabelText('メールアドレス');
    fireEvent.blur(emailInput);

    await waitFor(() => {
      const errorMessage = screen.getByText('メールアドレスを入力してください');
      expect(errorMessage).toHaveAttribute('role', 'alert');
    });
  });

  it('should set aria-disabled when button is disabled (Requirement 14.6)', () => {
    vi.mocked(usePasswordResetModule.usePasswordReset).mockReturnValue({
      requestCode: vi.fn(),
      confirmReset: vi.fn(),
      resendCode: vi.fn(),
      isLoading: true,
      error: null,
      successMessage: null,
    });

    const onCodeSent = vi.fn();
    render(<RequestCodeForm onCodeSent={onCodeSent} />);

    const submitButton = screen.getByRole('button', { name: '送信中...' });
    expect(submitButton).toHaveAttribute('aria-disabled', 'true');
  });
});
