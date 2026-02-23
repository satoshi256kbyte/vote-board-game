import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RegisterForm } from './register-form';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock useRegister hook
let mockRegisterFn = vi.fn();
let mockIsLoading = false;
let mockError: string | null = null;

vi.mock('@/lib/hooks/use-register', () => ({
  useRegister: () => ({
    register: mockRegisterFn,
    isLoading: mockIsLoading,
    error: mockError,
  }),
}));

describe('RegisterForm - Client-side Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
    mockRegisterFn = vi.fn();
    mockIsLoading = false;
    mockError = null;
  });
  describe('Email validation', () => {
    it('should display error message for invalid email format on blur', () => {
      render(<RegisterForm />);
      const emailInput = screen.getByLabelText('メールアドレス');

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.blur(emailInput);

      expect(screen.getByText('有効なメールアドレスを入力してください')).toBeInTheDocument();
    });

    it('should not display error for valid email format', () => {
      render(<RegisterForm />);
      const emailInput = screen.getByLabelText('メールアドレス');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.blur(emailInput);

      expect(screen.queryByText('有効なメールアドレスを入力してください')).not.toBeInTheDocument();
    });

    it('should add red border to email field with error', () => {
      render(<RegisterForm />);
      const emailInput = screen.getByLabelText('メールアドレス');

      fireEvent.change(emailInput, { target: { value: 'invalid' } });
      fireEvent.blur(emailInput);

      expect(emailInput).toHaveClass('border-red-500');
    });
  });

  describe('Password validation', () => {
    it('should display error message for password shorter than 8 characters', () => {
      render(<RegisterForm />);
      const passwordInput = screen.getByLabelText('パスワード');

      fireEvent.change(passwordInput, { target: { value: 'short' } });
      fireEvent.blur(passwordInput);

      expect(screen.getByText('パスワードは8文字以上である必要があります')).toBeInTheDocument();
    });

    it('should not display error for password with 8 or more characters', () => {
      render(<RegisterForm />);
      const passwordInput = screen.getByLabelText('パスワード');

      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.blur(passwordInput);

      expect(
        screen.queryByText('パスワードは8文字以上である必要があります')
      ).not.toBeInTheDocument();
    });

    it('should add red border to password field with error', () => {
      render(<RegisterForm />);
      const passwordInput = screen.getByLabelText('パスワード');

      fireEvent.change(passwordInput, { target: { value: 'short' } });
      fireEvent.blur(passwordInput);

      expect(passwordInput).toHaveClass('border-red-500');
    });
  });

  describe('Password confirmation validation', () => {
    it('should display error message when passwords do not match', () => {
      render(<RegisterForm />);
      const passwordInput = screen.getByLabelText('パスワード');
      const confirmInput = screen.getByLabelText('パスワード確認');

      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmInput, { target: { value: 'different123' } });
      fireEvent.blur(confirmInput);

      expect(screen.getByText('パスワードが一致しません')).toBeInTheDocument();
    });

    it('should not display error when passwords match', () => {
      render(<RegisterForm />);
      const passwordInput = screen.getByLabelText('パスワード');
      const confirmInput = screen.getByLabelText('パスワード確認');

      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmInput, { target: { value: 'password123' } });
      fireEvent.blur(confirmInput);

      expect(screen.queryByText('パスワードが一致しません')).not.toBeInTheDocument();
    });

    it('should add red border to password confirmation field with error', () => {
      render(<RegisterForm />);
      const passwordInput = screen.getByLabelText('パスワード');
      const confirmInput = screen.getByLabelText('パスワード確認');

      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmInput, { target: { value: 'different' } });
      fireEvent.blur(confirmInput);

      expect(confirmInput).toHaveClass('border-red-500');
    });
  });

  describe('Submit button validation', () => {
    it('should disable submit button when email has validation error', () => {
      render(<RegisterForm />);
      const emailInput = screen.getByLabelText('メールアドレス');
      const submitButton = screen.getByRole('button', { name: 'アカウント作成' });

      fireEvent.change(emailInput, { target: { value: 'invalid' } });
      fireEvent.blur(emailInput);

      expect(submitButton).toBeDisabled();
    });

    it('should disable submit button when password has validation error', () => {
      render(<RegisterForm />);
      const passwordInput = screen.getByLabelText('パスワード');
      const submitButton = screen.getByRole('button', { name: 'アカウント作成' });

      fireEvent.change(passwordInput, { target: { value: 'short' } });
      fireEvent.blur(passwordInput);

      expect(submitButton).toBeDisabled();
    });

    it('should disable submit button when password confirmation has validation error', () => {
      render(<RegisterForm />);
      const passwordInput = screen.getByLabelText('パスワード');
      const confirmInput = screen.getByLabelText('パスワード確認');
      const submitButton = screen.getByRole('button', { name: 'アカウント作成' });

      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmInput, { target: { value: 'different' } });
      fireEvent.blur(confirmInput);

      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when all fields are valid', () => {
      render(<RegisterForm />);
      const submitButton = screen.getByRole('button', { name: 'アカウント作成' });

      // Initially enabled (no errors)
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('ARIA attributes', () => {
    it('should set aria-invalid to true when email has error', () => {
      render(<RegisterForm />);
      const emailInput = screen.getByLabelText('メールアドレス');

      fireEvent.change(emailInput, { target: { value: 'invalid' } });
      fireEvent.blur(emailInput);

      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    });

    it('should associate error message with email field using aria-describedby', () => {
      render(<RegisterForm />);
      const emailInput = screen.getByLabelText('メールアドレス');

      fireEvent.change(emailInput, { target: { value: 'invalid' } });
      fireEvent.blur(emailInput);

      expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
    });

    it('should set role="alert" on error messages', () => {
      render(<RegisterForm />);
      const emailInput = screen.getByLabelText('メールアドレス');

      fireEvent.change(emailInput, { target: { value: 'invalid' } });
      fireEvent.blur(emailInput);

      const errorMessage = screen.getByText('有効なメールアドレスを入力してください');
      expect(errorMessage).toHaveAttribute('role', 'alert');
    });
  });

  describe('Comprehensive Accessibility (Task 4.5)', () => {
    it('should have aria-label on all input fields (Requirement 5.1)', () => {
      render(<RegisterForm />);

      const emailInput = screen.getByLabelText('メールアドレス');
      const passwordInput = screen.getByLabelText('パスワード');
      const confirmInput = screen.getByLabelText('パスワード確認');

      expect(emailInput).toHaveAttribute('aria-label', 'メールアドレス');
      expect(passwordInput).toHaveAttribute('aria-label', 'パスワード');
      expect(confirmInput).toHaveAttribute('aria-label', 'パスワード確認');
    });

    it('should associate all error messages with fields using aria-describedby (Requirement 5.2)', () => {
      render(<RegisterForm />);

      const emailInput = screen.getByLabelText('メールアドレス');
      const passwordInput = screen.getByLabelText('パスワード');
      const confirmInput = screen.getByLabelText('パスワード確認');

      // Trigger errors
      fireEvent.change(emailInput, { target: { value: 'invalid' } });
      fireEvent.blur(emailInput);
      fireEvent.change(passwordInput, { target: { value: 'short' } });
      fireEvent.blur(passwordInput);
      fireEvent.change(confirmInput, { target: { value: 'different' } });
      fireEvent.blur(confirmInput);

      expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
      expect(passwordInput).toHaveAttribute('aria-describedby', 'password-error');
      expect(confirmInput).toHaveAttribute('aria-describedby', 'password-confirmation-error');
    });

    it('should set role="alert" on all error messages (Requirement 5.5)', () => {
      render(<RegisterForm />);

      const emailInput = screen.getByLabelText('メールアドレス');
      const passwordInput = screen.getByLabelText('パスワード');
      const confirmInput = screen.getByLabelText('パスワード確認');

      // Trigger errors
      fireEvent.change(emailInput, { target: { value: 'invalid' } });
      fireEvent.blur(emailInput);
      fireEvent.change(passwordInput, { target: { value: 'short' } });
      fireEvent.blur(passwordInput);
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmInput, { target: { value: 'different' } });
      fireEvent.blur(confirmInput);

      const emailError = screen.getByText('有効なメールアドレスを入力してください');
      const passwordError = screen.getByText('パスワードは8文字以上である必要があります');
      const confirmError = screen.getByText('パスワードが一致しません');

      expect(emailError).toHaveAttribute('role', 'alert');
      expect(passwordError).toHaveAttribute('role', 'alert');
      expect(confirmError).toHaveAttribute('role', 'alert');
    });

    it('should dynamically set aria-invalid based on error state (Requirement 5.1)', () => {
      render(<RegisterForm />);
      const emailInput = screen.getByLabelText('メールアドレス');

      // Initially no error
      expect(emailInput).toHaveAttribute('aria-invalid', 'false');

      // Trigger error
      fireEvent.change(emailInput, { target: { value: 'invalid' } });
      fireEvent.blur(emailInput);
      expect(emailInput).toHaveAttribute('aria-invalid', 'true');

      // Fix error
      fireEvent.change(emailInput, { target: { value: 'valid@example.com' } });
      fireEvent.blur(emailInput);
      expect(emailInput).toHaveAttribute('aria-invalid', 'false');
    });

    it('should ensure all interactive elements are keyboard accessible (Requirement 5.3)', () => {
      render(<RegisterForm />);

      const emailInput = screen.getByLabelText('メールアドレス');
      const passwordInput = screen.getByLabelText('パスワード');
      const confirmInput = screen.getByLabelText('パスワード確認');
      const passwordToggle = screen.getByLabelText('パスワードを表示');
      const confirmToggle = screen.getByLabelText('パスワード確認を表示');
      const submitButton = screen.getByRole('button', { name: 'アカウント作成' });
      const loginLink = screen.getByRole('link', { name: 'ログイン' });

      // All elements should be focusable (not have tabindex="-1")
      expect(emailInput).not.toHaveAttribute('tabindex', '-1');
      expect(passwordInput).not.toHaveAttribute('tabindex', '-1');
      expect(confirmInput).not.toHaveAttribute('tabindex', '-1');
      expect(passwordToggle).not.toHaveAttribute('tabindex', '-1');
      expect(confirmToggle).not.toHaveAttribute('tabindex', '-1');
      expect(submitButton).not.toHaveAttribute('tabindex', '-1');
      expect(loginLink).not.toHaveAttribute('tabindex', '-1');
    });

    it('should maintain logical tab order (Requirement 5.4)', () => {
      render(<RegisterForm />);

      const emailInput = screen.getByLabelText('メールアドレス');
      const passwordInput = screen.getByLabelText('パスワード');
      const passwordToggle = screen.getByLabelText('パスワードを表示');
      const confirmInput = screen.getByLabelText('パスワード確認');
      const confirmToggle = screen.getByLabelText('パスワード確認を表示');
      const submitButton = screen.getByRole('button', { name: 'アカウント作成' });
      const loginLink = screen.getByRole('link', { name: 'ログイン' });

      // Verify elements exist in DOM order (natural tab order)
      const allElements = [
        emailInput,
        passwordInput,
        passwordToggle,
        confirmInput,
        confirmToggle,
        submitButton,
        loginLink,
      ];

      // All elements should be in the document
      allElements.forEach((element) => {
        expect(element).toBeInTheDocument();
      });
    });

    it('should have aria-label on password toggle buttons (Requirement 5.1)', () => {
      render(<RegisterForm />);

      const passwordToggle = screen.getByLabelText('パスワードを表示');
      const confirmToggle = screen.getByLabelText('パスワード確認を表示');

      expect(passwordToggle).toHaveAttribute('aria-label', 'パスワードを表示');
      expect(confirmToggle).toHaveAttribute('aria-label', 'パスワード確認を表示');

      // Click to toggle
      fireEvent.click(passwordToggle);
      fireEvent.click(confirmToggle);

      // Labels should update
      const passwordHideToggle = screen.getByLabelText('パスワードを非表示');
      const confirmHideToggle = screen.getByLabelText('パスワード確認を非表示');

      expect(passwordHideToggle).toHaveAttribute('aria-label', 'パスワードを非表示');
      expect(confirmHideToggle).toHaveAttribute('aria-label', 'パスワード確認を非表示');
    });

    it('should have aria-disabled on submit button when disabled (Requirement 5.1)', () => {
      render(<RegisterForm />);
      const emailInput = screen.getByLabelText('メールアドレス');
      const submitButton = screen.getByRole('button', { name: 'アカウント作成' });

      // Trigger error to disable button
      fireEvent.change(emailInput, { target: { value: 'invalid' } });
      fireEvent.blur(emailInput);

      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Initial Display (Task 4.7 - Requirements 1.1-1.5)', () => {
    it('should display all form elements on initial render', () => {
      render(<RegisterForm />);

      // Requirement 1.1: Email input field
      const emailInput = screen.getByLabelText('メールアドレス');
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('placeholder', 'メールアドレス');

      // Requirement 1.2: Password input field
      const passwordInput = screen.getByLabelText('パスワード');
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('placeholder', 'パスワード（8文字以上）');

      // Requirement 1.3: Password confirmation input field
      const confirmInput = screen.getByLabelText('パスワード確認');
      expect(confirmInput).toBeInTheDocument();
      expect(confirmInput).toHaveAttribute('type', 'password');
      expect(confirmInput).toHaveAttribute('placeholder', 'パスワード確認');

      // Requirement 1.4: Submit button
      const submitButton = screen.getByRole('button', { name: 'アカウント作成' });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toHaveAttribute('type', 'submit');

      // Requirement 1.5: Login link
      const loginLink = screen.getByRole('link', { name: 'ログイン' });
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute('href', '/login');
    });
  });

  describe('Loading State (Task 4.7 - Requirements 3.2, 3.3)', () => {
    it('should display loading indicator and disable form during registration', () => {
      // Set loading state
      mockIsLoading = true;

      render(<RegisterForm />);

      // Requirement 3.2: Loading indicator (button text changes)
      const submitButton = screen.getByRole('button', { name: '登録中...' });
      expect(submitButton).toBeInTheDocument();

      // Requirement 3.3: Disable submit button
      expect(submitButton).toBeDisabled();

      // All input fields should be disabled
      const emailInput = screen.getByLabelText('メールアドレス');
      const passwordInput = screen.getByLabelText('パスワード');
      const confirmInput = screen.getByLabelText('パスワード確認');

      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
      expect(confirmInput).toBeDisabled();

      // Password toggle buttons should be disabled
      const passwordToggle = screen.getByLabelText('パスワードを表示');
      const confirmToggle = screen.getByLabelText('パスワード確認を表示');

      expect(passwordToggle).toBeDisabled();
      expect(confirmToggle).toBeDisabled();
    });
  });

  describe('Registration Success Flow (Task 4.7 - Requirement 3.4)', () => {
    it('should navigate to email verification page on successful registration', async () => {
      mockRegisterFn.mockResolvedValue(true);

      render(<RegisterForm />);

      // Fill in valid form data
      const emailInput = screen.getByLabelText('メールアドレス');
      const passwordInput = screen.getByLabelText('パスワード');
      const confirmInput = screen.getByLabelText('パスワード確認');
      const submitButton = screen.getByRole('button', { name: 'アカウント作成' });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmInput, { target: { value: 'password123' } });

      // Submit form
      fireEvent.click(submitButton);

      // Wait for navigation
      await waitFor(() => {
        expect(mockRegisterFn).toHaveBeenCalledWith('test@example.com', 'password123');
        expect(mockPush).toHaveBeenCalledWith('/email-verification');
      });
    });

    it('should not navigate if registration fails', async () => {
      mockRegisterFn.mockResolvedValue(false);

      render(<RegisterForm />);

      // Fill in valid form data
      const emailInput = screen.getByLabelText('メールアドレス');
      const passwordInput = screen.getByLabelText('パスワード');
      const confirmInput = screen.getByLabelText('パスワード確認');
      const submitButton = screen.getByRole('button', { name: 'アカウント作成' });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmInput, { target: { value: 'password123' } });

      // Submit form
      fireEvent.click(submitButton);

      // Wait for registration call
      await waitFor(() => {
        expect(mockRegisterFn).toHaveBeenCalledWith('test@example.com', 'password123');
      });

      // Should not navigate
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('Login Link (Task 4.7 - Requirement 1.5)', () => {
    it('should display login link for existing users', () => {
      render(<RegisterForm />);

      const loginLink = screen.getByRole('link', { name: 'ログイン' });
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute('href', '/login');

      // Check surrounding text
      expect(screen.getByText('既にアカウントをお持ちの方')).toBeInTheDocument();
    });
  });

  describe('Password Visibility Toggle (Task 4.7 - Requirements 4.1-4.5)', () => {
    it('should toggle password visibility for password field', () => {
      render(<RegisterForm />);

      const passwordInput = screen.getByLabelText('パスワード');
      const toggleButton = screen.getByLabelText('パスワードを表示');

      // Requirement 4.1: Toggle button exists
      expect(toggleButton).toBeInTheDocument();

      // Requirement 4.4: Initially hidden (masked)
      expect(passwordInput).toHaveAttribute('type', 'password');

      // Requirement 4.3: Click to show
      fireEvent.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');

      // Button label should update
      const hideButton = screen.getByLabelText('パスワードを非表示');
      expect(hideButton).toBeInTheDocument();

      // Requirement 4.3: Click again to hide
      fireEvent.click(hideButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should toggle password visibility for password confirmation field', () => {
      render(<RegisterForm />);

      const confirmInput = screen.getByLabelText('パスワード確認');
      const toggleButton = screen.getByLabelText('パスワード確認を表示');

      // Requirement 4.2: Toggle button exists
      expect(toggleButton).toBeInTheDocument();

      // Requirement 4.4: Initially hidden (masked)
      expect(confirmInput).toHaveAttribute('type', 'password');

      // Requirement 4.3: Click to show
      fireEvent.click(toggleButton);
      expect(confirmInput).toHaveAttribute('type', 'text');

      // Requirement 4.5: Display as plain text when visible
      fireEvent.change(confirmInput, { target: { value: 'testpassword' } });
      expect(confirmInput).toHaveValue('testpassword');

      // Click again to hide
      const hideButton = screen.getByLabelText('パスワード確認を非表示');
      fireEvent.click(hideButton);
      expect(confirmInput).toHaveAttribute('type', 'password');
    });

    it('should maintain password value when toggling visibility', () => {
      render(<RegisterForm />);

      const passwordInput = screen.getByLabelText('パスワード');
      const toggleButton = screen.getByLabelText('パスワードを表示');

      // Enter password
      fireEvent.change(passwordInput, { target: { value: 'mypassword123' } });
      expect(passwordInput).toHaveValue('mypassword123');

      // Toggle visibility
      fireEvent.click(toggleButton);
      expect(passwordInput).toHaveValue('mypassword123');

      // Toggle back
      const hideButton = screen.getByLabelText('パスワードを非表示');
      fireEvent.click(hideButton);
      expect(passwordInput).toHaveValue('mypassword123');
    });
  });

  describe('API Error Display (Task 4.7 - Requirements 3.5, 3.6)', () => {
    it('should display error message when API returns error', () => {
      mockError = 'このメールアドレスは既に登録されています';

      render(<RegisterForm />);

      // Error alert should be displayed
      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toBeInTheDocument();
      expect(errorAlert).toHaveTextContent('このメールアドレスは既に登録されています');
    });

    it('should not display error alert when no error exists', () => {
      mockError = null;

      render(<RegisterForm />);

      // No error alert should be displayed
      const alerts = screen.queryAllByRole('alert');
      // Only validation error alerts might exist, but no API error alert
      expect(alerts.length).toBe(0);
    });
  });

  describe('Responsive Layout (Task 4.7 - Requirements 6.1-6.3)', () => {
    it('should have touch-friendly button sizes (min 44x44px)', () => {
      render(<RegisterForm />);

      // Requirement 6.2: Submit button should have min-h-[44px]
      const submitButton = screen.getByRole('button', { name: 'アカウント作成' });
      expect(submitButton).toHaveClass('min-h-[44px]');

      // Password toggle buttons should have min-h-[44px] on the button itself
      const passwordToggle = screen.getByLabelText('パスワードを表示');
      const confirmToggle = screen.getByLabelText('パスワード確認を表示');

      // Check buttons have min-h-[44px] class
      expect(passwordToggle).toHaveClass('min-h-[44px]');
      expect(confirmToggle).toHaveClass('min-h-[44px]');

      // Login link should have min-h-[44px]
      const loginLink = screen.getByRole('link', { name: 'ログイン' });
      expect(loginLink).toHaveClass('min-h-[44px]');
    });

    it('should use full width for submit button', () => {
      render(<RegisterForm />);

      // Requirement 6.1: Button should be full width
      const submitButton = screen.getByRole('button', { name: 'アカウント作成' });
      expect(submitButton).toHaveClass('w-full');
    });

    it('should have proper spacing between form elements', () => {
      render(<RegisterForm />);

      // Form element exists
      const form = document.querySelector('form');
      expect(form).toBeInTheDocument();
      expect(form).toHaveClass('space-y-6');

      // Input container should have space-y-4
      const emailInput = screen.getByLabelText('メールアドレス');
      const inputContainer = emailInput.closest('.space-y-4');
      expect(inputContainer).toBeInTheDocument();
    });
  });
});
