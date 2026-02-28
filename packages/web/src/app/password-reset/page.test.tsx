import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';
import PasswordResetPage from './page';
import * as usePasswordResetModule from '@/lib/hooks/use-password-reset';

// Mock the usePasswordReset hook
vi.mock('@/lib/hooks/use-password-reset');

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('PasswordResetPage - Step Transition (Task 8.2)', () => {
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

  it('should initially display RequestCodeForm (Requirement 4.1)', () => {
    render(<PasswordResetPage />);

    // Check for RequestCodeForm elements
    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '確認コードを送信' })).toBeInTheDocument();
    expect(
      screen.getByText(
        '登録されているメールアドレスを入力してください。パスワードリセット用の確認コードを送信します。'
      )
    ).toBeInTheDocument();
  });

  it('should transition to ConfirmResetForm after successful code request (Requirement 4.2)', async () => {
    const mockRequestCode = vi.fn().mockResolvedValue(true);

    vi.mocked(usePasswordResetModule.usePasswordReset).mockReturnValue({
      requestCode: mockRequestCode,
      confirmReset: vi.fn().mockResolvedValue(true),
      resendCode: vi.fn().mockResolvedValue(true),
      isLoading: false,
      error: null,
      successMessage: null,
    });

    render(<PasswordResetPage />);

    // Fill in email and submit
    const emailInput = screen.getByLabelText('メールアドレス');
    const submitButton = screen.getByRole('button', { name: '確認コードを送信' });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockRequestCode).toHaveBeenCalledWith('test@example.com');
    });

    // Check for ConfirmResetForm elements - wait for the 2 second delay
    await waitFor(
      () => {
        expect(screen.getByLabelText('確認コード')).toBeInTheDocument();
        expect(screen.getByLabelText('新しいパスワード')).toBeInTheDocument();
        expect(screen.getByLabelText('新しいパスワード確認')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'パスワードをリセット' })).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // RequestCodeForm should no longer be visible
    expect(
      screen.queryByText(
        '登録されているメールアドレスを入力してください。パスワードリセット用の確認コードを送信します。'
      )
    ).not.toBeInTheDocument();
  });

  it('should display page title', () => {
    render(<PasswordResetPage />);

    expect(screen.getByRole('heading', { name: 'パスワードリセット' })).toBeInTheDocument();
  });
});

describe('PasswordResetPage - Email Preservation (Task 8.2)', () => {
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

  it('should preserve email address when transitioning to confirm step (Requirement 4.3)', async () => {
    const mockRequestCode = vi.fn().mockResolvedValue(true);
    const mockConfirmReset = vi.fn().mockResolvedValue(true);

    vi.mocked(usePasswordResetModule.usePasswordReset).mockReturnValue({
      requestCode: mockRequestCode,
      confirmReset: mockConfirmReset,
      resendCode: vi.fn().mockResolvedValue(true),
      isLoading: false,
      error: null,
      successMessage: null,
    });

    render(<PasswordResetPage />);

    // Submit email in RequestCodeForm
    const emailInput = screen.getByLabelText('メールアドレス');
    const submitButton = screen.getByRole('button', { name: '確認コードを送信' });

    const testEmail = 'test@example.com';
    fireEvent.change(emailInput, { target: { value: testEmail } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockRequestCode).toHaveBeenCalledWith(testEmail);
    });

    // Wait for transition to ConfirmResetForm (includes 2 second delay)
    await waitFor(
      () => {
        expect(screen.getByLabelText('確認コード')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Fill in confirmation form and submit
    const confirmationCodeInput = screen.getByLabelText('確認コード');
    const newPasswordInput = screen.getByLabelText('新しいパスワード');
    const passwordConfirmationInput = screen.getByLabelText('新しいパスワード確認');
    const resetButton = screen.getByRole('button', { name: 'パスワードをリセット' });

    fireEvent.change(confirmationCodeInput, { target: { value: '123456' } });
    fireEvent.change(newPasswordInput, { target: { value: 'NewPass123' } });
    fireEvent.change(passwordConfirmationInput, { target: { value: 'NewPass123' } });
    fireEvent.click(resetButton);

    // Verify that confirmReset was called with the preserved email
    await waitFor(() => {
      expect(mockConfirmReset).toHaveBeenCalledWith(testEmail, '123456', 'NewPass123');
    });
  });

  it('should use preserved email for resend code (Requirement 4.4)', async () => {
    const mockRequestCode = vi.fn().mockResolvedValue(true);
    const mockResendCode = vi.fn().mockResolvedValue(true);

    vi.mocked(usePasswordResetModule.usePasswordReset).mockReturnValue({
      requestCode: mockRequestCode,
      confirmReset: vi.fn().mockResolvedValue(true),
      resendCode: mockResendCode,
      isLoading: false,
      error: null,
      successMessage: null,
    });

    render(<PasswordResetPage />);

    // Submit email in RequestCodeForm
    const emailInput = screen.getByLabelText('メールアドレス');
    const submitButton = screen.getByRole('button', { name: '確認コードを送信' });

    const testEmail = 'user@example.com';
    fireEvent.change(emailInput, { target: { value: testEmail } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockRequestCode).toHaveBeenCalledWith(testEmail);
    });

    // Wait for transition to ConfirmResetForm (includes 2 second delay)
    await waitFor(
      () => {
        expect(screen.getByLabelText('確認コード')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Click resend code link
    const resendLink = screen.getByRole('button', { name: '確認コードを再送信' });
    fireEvent.click(resendLink);

    // Verify that resendCode was called with the preserved email
    await waitFor(() => {
      expect(mockResendCode).toHaveBeenCalledWith(testEmail);
    });
  });
});

describe('PasswordResetPage - Data Cleanup on Unmount (Task 8.2)', () => {
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

  it('should clear form data when component unmounts (Requirement 16.5)', async () => {
    const mockRequestCode = vi.fn().mockResolvedValue(true);

    vi.mocked(usePasswordResetModule.usePasswordReset).mockReturnValue({
      requestCode: mockRequestCode,
      confirmReset: vi.fn().mockResolvedValue(true),
      resendCode: vi.fn().mockResolvedValue(true),
      isLoading: false,
      error: null,
      successMessage: null,
    });

    render(<PasswordResetPage />);

    // Submit email to transition to confirm step
    const emailInput = screen.getByLabelText('メールアドレス');
    const submitButton = screen.getByRole('button', { name: '確認コードを送信' });

    const testEmail = 'test@example.com';
    fireEvent.change(emailInput, { target: { value: testEmail } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockRequestCode).toHaveBeenCalledWith(testEmail);
    });

    // Wait for transition to ConfirmResetForm (includes 2 second delay)
    await waitFor(
      () => {
        expect(screen.getByLabelText('確認コード')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Unmount the component (this triggers the cleanup function)
    cleanup();

    // Render a new instance of the component
    render(<PasswordResetPage />);

    // Should be back to the initial state (RequestCodeForm)
    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '確認コードを送信' })).toBeInTheDocument();

    // ConfirmResetForm should not be visible
    expect(screen.queryByLabelText('確認コード')).not.toBeInTheDocument();
  });

  it('should start from request step after remount', () => {
    render(<PasswordResetPage />);

    // Cleanup
    cleanup();

    // Remount
    render(<PasswordResetPage />);

    // Should display RequestCodeForm
    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '確認コードを送信' })).toBeInTheDocument();
  });
});
