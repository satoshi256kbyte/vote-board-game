import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RegisterForm } from './register-form';

describe('RegisterForm - Client-side Validation', () => {
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
});
