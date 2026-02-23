import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { RequestCodeForm } from './request-code-form';

describe('RequestCodeForm - Validation', () => {
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
