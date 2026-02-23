import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup, within } from '@testing-library/react';
import * as fc from 'fast-check';
import { RequestCodeForm } from './request-code-form';
import { usePasswordReset } from '@/lib/hooks/use-password-reset';

// Mock usePasswordReset hook
vi.mock('@/lib/hooks/use-password-reset', () => ({
  usePasswordReset: vi.fn(),
}));

describe('RequestCodeForm - Property-Based Tests', () => {
  const mockOnCodeSent = vi.fn();
  const mockRequestCode = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequestCode.mockClear();
    (usePasswordReset as ReturnType<typeof vi.fn>).mockReturnValue({
      requestCode: mockRequestCode,
      isLoading: false,
      error: null,
    });
    mockOnCodeSent.mockClear();
  });

  afterEach(async () => {
    vi.clearAllTimers();
    vi.clearAllMocks();
    // Wait for any pending microtasks
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  /**
   * Feature: password-reset-screen, Property 1: メールアドレスバリデーション
   *
   * 任意のメールアドレス入力に対して、フォーカスを失ったとき、空または有効なメール形式
   * （@とドメインを含む）でない場合、対応するエラーメッセージ（「メールアドレスを入力
   * してください」または「有効なメールアドレスを入力してください」）を表示するべきです。
   *
   * **Validates: Requirements 2.1, 2.2**
   */
  it('Property 1: should display appropriate error message for invalid email on blur', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Empty string case
          fc.constant(''),
          // Whitespace only
          fc.constant('   '),
          // No @ symbol
          fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0 && !s.includes('@')),
          // Has @ but no domain
          fc
            .string({ minLength: 1 })
            .filter((s) => s.trim().length > 0 && s.includes('@') && !s.includes('.')),
          // Has @ but domain part is empty
          fc
            .string({ minLength: 1 })
            .filter((s) => s.trim().length > 0 && s.includes('@') && s.split('@')[1]?.length === 0)
        ),
        (invalidEmail) => {
          const { container } = render(<RequestCodeForm onCodeSent={mockOnCodeSent} />);
          const emailInput = within(container).getByRole('textbox', { name: 'メールアドレス' });

          fireEvent.change(emailInput, { target: { value: invalidEmail } });
          fireEvent.blur(emailInput);

          // Check for either error message
          const emptyError = within(container).queryByText('メールアドレスを入力してください');
          const invalidError =
            within(container).queryByText('有効なメールアドレスを入力してください');

          // At least one error should be displayed
          expect(emptyError || invalidError).toBeTruthy();
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  /**
   * Feature: password-reset-screen, Property 2: バリデーションエラー時のAPI呼び出し防止（確認コード送信）
   *
   * 任意のフォーム状態に対して、メールアドレスにバリデーションエラーが存在する場合、
   * 「確認コードを送信」ボタンをクリックしてもパスワードリセット要求APIを呼び出して
   * はならないべきです。
   *
   * **Validates: Requirement 2.3**
   */
  it('Property 2: should not call API when validation errors exist', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(''),
          fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0 && !s.includes('@')),
          fc
            .string({ minLength: 1 })
            .filter((s) => s.trim().length > 0 && s.includes('@') && !s.includes('.'))
        ),
        (invalidEmail) => {
          mockRequestCode.mockResolvedValue(true);

          const { container } = render(<RequestCodeForm onCodeSent={mockOnCodeSent} />);
          const emailInput = within(container).getByRole('textbox', { name: 'メールアドレス' });
          const submitButton = within(container).getByRole('button', { name: '確認コードを送信' });

          // Enter invalid email and trigger validation
          fireEvent.change(emailInput, { target: { value: invalidEmail } });
          fireEvent.blur(emailInput);

          // Try to submit
          fireEvent.click(submitButton);

          // API should not be called
          expect(mockRequestCode).not.toHaveBeenCalled();
          expect(mockOnCodeSent).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  /**
   * Feature: password-reset-screen, Property 3: 有効なメールアドレスでのAPI呼び出し
   *
   * 任意の有効なメールアドレスに対して、「確認コードを送信」ボタンをクリックしたとき、
   * 入力されたメールアドレスを含むPOSTリクエストをパスワードリセット要求APIに送信
   * するべきです。
   *
   * **Validates: Requirement 3.1**
   */
  it('Property 3: should call API with valid email address', () => {
    fc.assert(
      fc.property(
        fc
          .emailAddress()
          .filter((email) => email.includes('@') && email.includes('.') && email.trim().length > 0),
        (validEmail) => {
          mockRequestCode.mockClear();
          mockRequestCode.mockResolvedValue(true);

          const { container } = render(<RequestCodeForm onCodeSent={mockOnCodeSent} />);
          const emailInput = within(container).getByRole('textbox', { name: 'メールアドレス' });
          const submitButton = within(container).getByRole('button', { name: '確認コードを送信' });

          // Enter valid email
          fireEvent.change(emailInput, { target: { value: validEmail } });
          fireEvent.blur(emailInput);

          // Submit form
          fireEvent.click(submitButton);

          // Verify requestCode was called with the email
          expect(mockRequestCode).toHaveBeenCalledWith(validEmail);
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  /**
   * Feature: password-reset-screen, Property 4: メールアドレスの保持
   *
   * 任意のメールアドレスに対して、確認コード送信が成功した場合、そのメールアドレスを
   * 保持し、パスワードリセット確認API呼び出し時および確認コード再送信時に使用する
   * べきです。
   *
   * **Validates: Requirement 4.4**
   */
  it('Property 4: should preserve email address on successful code send', () => {
    fc.assert(
      fc.property(fc.emailAddress(), (validEmail) => {
        mockRequestCode.mockClear();
        mockOnCodeSent.mockClear();
        mockRequestCode.mockResolvedValue(true);

        const { container } = render(<RequestCodeForm onCodeSent={mockOnCodeSent} />);
        const emailInput = within(container).getByRole('textbox', { name: 'メールアドレス' });
        const submitButton = within(container).getByRole('button', { name: '確認コードを送信' });

        // Enter valid email
        fireEvent.change(emailInput, { target: { value: validEmail } });
        fireEvent.blur(emailInput);

        // Submit form
        fireEvent.click(submitButton);

        // Verify requestCode was called with the email
        expect(mockRequestCode).toHaveBeenCalledWith(validEmail);
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });

  /**
   * Feature: password-reset-screen, Property 5: 確認コード送信失敗時のエラーメッセージ表示
   *
   * 任意のAPIエラーレスポンス（429、500、ネットワークエラー）に対して、対応する
   * ユーザーフレンドリーなエラーメッセージを表示するべきです。
   *
   * **Validates: Requirements 5.1, 5.2, 5.3**
   */
  it('Property 5: should display appropriate error message for API errors', () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        fc.oneof(
          fc.constant('リクエスト回数が上限に達しました。しばらくしてから再度お試しください'),
          fc.constant('サーバーエラーが発生しました。しばらくしてから再度お試しください'),
          fc.constant('ネットワークエラーが発生しました。インターネット接続を確認してください')
        ),
        (validEmail, errorMessage) => {
          // Mock the hook to return the error
          (usePasswordReset as ReturnType<typeof vi.fn>).mockReturnValue({
            requestCode: mockRequestCode,
            isLoading: false,
            error: errorMessage,
          });

          const { container } = render(<RequestCodeForm onCodeSent={mockOnCodeSent} />);

          // The error should be displayed
          const errorAlert = within(container).queryByText(errorMessage);
          expect(errorAlert).toBeInTheDocument();
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  /**
   * Feature: password-reset-screen, Property 6: エラー後のUI状態復元（確認コード送信）
   *
   * 任意のエラー状態に対して、エラーメッセージを表示したとき、「確認コードを送信」
   * ボタンとメールアドレス入力フィールドを再度有効化するべきです。
   *
   * **Validates: Requirement 5.4**
   */
  it('Property 6: should re-enable form elements after error', () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        fc.oneof(
          fc.constant('リクエスト回数が上限に達しました。しばらくしてから再度お試しください'),
          fc.constant('サーバーエラーが発生しました。しばらくしてから再度お試しください'),
          fc.constant('ネットワークエラーが発生しました。インターネット接続を確認してください')
        ),
        (validEmail, errorMessage) => {
          // Mock error state
          (usePasswordReset as ReturnType<typeof vi.fn>).mockReturnValue({
            requestCode: mockRequestCode,
            isLoading: false,
            error: errorMessage,
          });

          const { container } = render(<RequestCodeForm onCodeSent={mockOnCodeSent} />);
          const emailInput = within(container).getByRole('textbox', { name: 'メールアドレス' });
          const submitButton = within(container).getByRole('button', { name: '確認コードを送信' });

          // Form elements should be enabled when not loading
          expect(emailInput).not.toBeDisabled();
          expect(submitButton).not.toBeDisabled();
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });
});
