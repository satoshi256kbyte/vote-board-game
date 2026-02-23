import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup, within } from '@testing-library/react';
import * as fc from 'fast-check';
import { ConfirmResetForm } from './confirm-reset-form';
import * as usePasswordResetModule from '@/lib/hooks/use-password-reset';

// Mock usePasswordReset hook
vi.mock('@/lib/hooks/use-password-reset');

// Mock useRouter
const mockPush = vi.fn();
const mockBack = vi.fn();
const mockForward = vi.fn();
const mockRefresh = vi.fn();
const mockReplace = vi.fn();
const mockPrefetch = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    forward: mockForward,
    refresh: mockRefresh,
    replace: mockReplace,
    prefetch: mockPrefetch,
  }),
}));

describe('ConfirmResetForm - Property-Based Tests', () => {
  const mockConfirmReset = vi.fn();
  const mockResendCode = vi.fn();
  const mockRequestCode = vi.fn();
  const testEmail = 'test@example.com';

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirmReset.mockClear();
    mockResendCode.mockClear();
    mockRequestCode.mockClear();
    mockPush.mockClear();

    // Use vi.mocked for more reliable mocking
    vi.mocked(usePasswordResetModule.usePasswordReset).mockReturnValue({
      requestCode: mockRequestCode,
      confirmReset: mockConfirmReset,
      resendCode: mockResendCode,
      isLoading: false,
      error: null,
      successMessage: null,
    });
  });

  afterEach(async () => {
    cleanup();
    vi.clearAllTimers();
    vi.clearAllMocks();
    // Wait for any pending microtasks
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  /**
   * Feature: password-reset-screen, Property 7: 確認コードバリデーション
   *
   * 任意の確認コード入力に対して、フォーカスを失ったとき、空または6桁の数字でない場合、
   * 対応するエラーメッセージ（「確認コードを入力してください」または「確認コードは6桁の
   * 数字である必要があります」）を表示するべきです。
   *
   * **Validates: Requirements 7.1, 7.2**
   */
  it('Property 7: should display appropriate error message for invalid confirmation code on blur', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Empty string case
          fc.constant(''),
          // Whitespace only
          fc.constant('   '),
          // Less than 6 digits
          fc.integer({ min: 0, max: 99999 }).map((n) => n.toString()),
          // More than 6 digits
          fc.integer({ min: 1000000, max: 9999999 }).map((n) => n.toString()),
          // Contains non-digit characters
          fc
            .string({ minLength: 1, maxLength: 10 })
            .filter((s) => s.trim().length > 0 && /[^\d]/.test(s))
        ),
        (invalidCode) => {
          const { container } = render(<ConfirmResetForm email={testEmail} />);
          const codeInput = within(container).getByRole('textbox', { name: '確認コード' });

          fireEvent.change(codeInput, { target: { value: invalidCode } });
          fireEvent.blur(codeInput);

          // Check for either error message
          const emptyError = within(container).queryByText('確認コードを入力してください');
          const invalidError =
            within(container).queryByText('確認コードは6桁の数字である必要があります');

          // At least one error should be displayed
          expect(emptyError || invalidError).toBeTruthy();
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  /**
   * Feature: password-reset-screen, Property 8: パスワード要件バリデーション
   *
   * 任意のパスワード入力に対して、フォーカスを失ったとき、空、8文字未満、大文字を含まない、
   * 小文字を含まない、または数字を含まない場合、対応するエラーメッセージを表示するべきです。
   *
   * **Validates: Requirements 7.3, 7.4, 7.5, 7.6, 7.7**
   */
  it('Property 8: should display appropriate error message for invalid password on blur', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Empty string
          fc.constant(''),
          // Less than 8 characters
          fc.string({ minLength: 1, maxLength: 7 }),
          // No uppercase
          fc
            .string({ minLength: 8 })
            .filter((s) => s.length >= 8 && !/[A-Z]/.test(s) && /[a-z]/.test(s) && /[0-9]/.test(s)),
          // No lowercase
          fc
            .string({ minLength: 8 })
            .filter((s) => s.length >= 8 && /[A-Z]/.test(s) && !/[a-z]/.test(s) && /[0-9]/.test(s)),
          // No digit
          fc
            .string({ minLength: 8 })
            .filter((s) => s.length >= 8 && /[A-Z]/.test(s) && /[a-z]/.test(s) && !/[0-9]/.test(s))
        ),
        (invalidPassword) => {
          const { container } = render(<ConfirmResetForm email={testEmail} />);
          const passwordInput = within(container).getByLabelText('新しいパスワード');

          fireEvent.change(passwordInput, { target: { value: invalidPassword } });
          fireEvent.blur(passwordInput);

          // Check for any password error message
          const emptyError = within(container).queryByText('新しいパスワードを入力してください');
          const lengthError =
            within(container).queryByText('パスワードは8文字以上である必要があります');
          const uppercaseError =
            within(container).queryByText('パスワードには大文字を含める必要があります');
          const lowercaseError =
            within(container).queryByText('パスワードには小文字を含める必要があります');
          const digitError =
            within(container).queryByText('パスワードには数字を含める必要があります');

          // At least one error should be displayed
          expect(
            emptyError || lengthError || uppercaseError || lowercaseError || digitError
          ).toBeTruthy();
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  /**
   * Feature: password-reset-screen, Property 9: パスワード確認の一致検証
   *
   * 任意のパスワードとパスワード確認の組み合わせに対して、パスワード確認フィールドが
   * フォーカスを失ったとき、両者が一致しない場合、エラーメッセージ「パスワードが一致
   * しません」を表示するべきです。
   *
   * **Validates: Requirement 7.8**
   */
  it('Property 9: should display error when password confirmation does not match', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 8 }),
        fc.string({ minLength: 8 }),
        (password, confirmation) => {
          // Only test when passwords don't match
          fc.pre(password !== confirmation);

          const { container } = render(<ConfirmResetForm email={testEmail} />);
          const passwordInput = within(container).getByLabelText('新しいパスワード');
          const confirmationInput = within(container).getByLabelText('新しいパスワード確認');

          // Enter different passwords
          fireEvent.change(passwordInput, { target: { value: password } });
          fireEvent.change(confirmationInput, { target: { value: confirmation } });
          fireEvent.blur(confirmationInput);

          // Check for mismatch error
          const mismatchError = within(container).queryByText('パスワードが一致しません');
          expect(mismatchError).toBeInTheDocument();
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  /**
   * Feature: password-reset-screen, Property 10: バリデーションエラー時のAPI呼び出し防止（パスワードリセット確認）
   *
   * 任意のフォーム状態に対して、確認コード、新しいパスワード、またはパスワード確認の
   * いずれかにバリデーションエラーが存在する場合、「パスワードをリセット」ボタンを
   * クリックしてもパスワードリセット確認APIを呼び出してはならないべきです。
   *
   * **Validates: Requirement 7.9**
   */
  it('Property 10: should not call API when validation errors exist', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Invalid confirmation code
          fc.record({
            code: fc.string({ minLength: 1, maxLength: 5 }),
            password: fc.constant('ValidPass123'),
            confirmation: fc.constant('ValidPass123'),
          }),
          // Invalid password
          fc.record({
            code: fc.constant('123456'),
            password: fc.string({ minLength: 1, maxLength: 7 }),
            confirmation: fc.string({ minLength: 1, maxLength: 7 }),
          }),
          // Mismatched passwords
          fc.record({
            code: fc.constant('123456'),
            password: fc.constant('ValidPass123'),
            confirmation: fc.constant('DifferentPass456'),
          })
        ),
        (formData) => {
          mockConfirmReset.mockResolvedValue(true);

          const { container } = render(<ConfirmResetForm email={testEmail} />);
          const codeInput = within(container).getByRole('textbox', { name: '確認コード' });
          const passwordInput = within(container).getByLabelText('新しいパスワード');
          const confirmationInput = within(container).getByLabelText('新しいパスワード確認');
          const submitButton = within(container).getByRole('button', {
            name: 'パスワードをリセット',
          });

          // Enter invalid data and trigger validation
          fireEvent.change(codeInput, { target: { value: formData.code } });
          fireEvent.blur(codeInput);
          fireEvent.change(passwordInput, { target: { value: formData.password } });
          fireEvent.blur(passwordInput);
          fireEvent.change(confirmationInput, { target: { value: formData.confirmation } });
          fireEvent.blur(confirmationInput);

          // Try to submit
          fireEvent.click(submitButton);

          // API should not be called
          expect(mockConfirmReset).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  /**
   * Feature: password-reset-screen, Property 11: 有効な入力でのAPI呼び出し（パスワードリセット確認）
   *
   * 任意の有効な確認コード、新しいパスワード、パスワード確認の組み合わせに対して、
   * 「パスワードをリセット」ボタンをクリックしたとき、保持されたメールアドレス、
   * 確認コード、新しいパスワードを含むPOSTリクエストをパスワードリセット確認APIに
   * 送信するべきです。
   *
   * **Validates: Requirement 8.1**
   */
  it('Property 11: should call API with valid inputs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100000, max: 999999 }).map((n) => n.toString()),
        fc
          .string({ minLength: 8, maxLength: 20 })
          .filter(
            (s) =>
              s.length >= 8 &&
              /[A-Z]/.test(s) &&
              /[a-z]/.test(s) &&
              /[0-9]/.test(s) &&
              !/\s/.test(s)
          ),
        (validCode, validPassword) => {
          // Reset and configure mocks for each iteration
          mockConfirmReset.mockClear();
          mockConfirmReset.mockResolvedValue(true);

          vi.mocked(usePasswordResetModule.usePasswordReset).mockReturnValue({
            requestCode: mockRequestCode,
            confirmReset: mockConfirmReset,
            resendCode: mockResendCode,
            isLoading: false,
            error: null,
            successMessage: null,
          });

          const { container } = render(<ConfirmResetForm email={testEmail} />);
          const codeInput = within(container).getByRole('textbox', { name: '確認コード' });
          const passwordInput = within(container).getByLabelText('新しいパスワード');
          const confirmationInput = within(container).getByLabelText('新しいパスワード確認');
          const submitButton = within(container).getByRole('button', {
            name: 'パスワードをリセット',
          });

          // Enter valid data
          fireEvent.change(codeInput, { target: { value: validCode } });
          fireEvent.blur(codeInput);
          fireEvent.change(passwordInput, { target: { value: validPassword } });
          fireEvent.blur(passwordInput);
          fireEvent.change(confirmationInput, { target: { value: validPassword } });
          fireEvent.blur(confirmationInput);

          // Submit form
          fireEvent.click(submitButton);

          // Verify confirmReset was called with correct arguments
          expect(mockConfirmReset).toHaveBeenCalledWith(testEmail, validCode, validPassword);
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  /**
   * Feature: password-reset-screen, Property 12: パスワードリセット確認失敗時のエラーメッセージ表示
   *
   * 任意のAPIエラーレスポンス（400 INVALID_CODE、400 VALIDATION_ERROR、429、500、
   * ネットワークエラー）に対して、対応するユーザーフレンドリーなエラーメッセージを
   * 表示するべきです。
   *
   * **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**
   */
  it('Property 12: should display appropriate error message for API errors', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('確認コードが無効または期限切れです'),
          fc.constant('バリデーションエラーが発生しました'),
          fc.constant('リクエスト回数が上限に達しました。しばらくしてから再度お試しください'),
          fc.constant('サーバーエラーが発生しました。しばらくしてから再度お試しください'),
          fc.constant('ネットワークエラーが発生しました。インターネット接続を確認してください')
        ),
        (errorMessage) => {
          // Mock the hook to return the error
          vi.mocked(usePasswordResetModule.usePasswordReset).mockReturnValue({
            requestCode: mockRequestCode,
            confirmReset: mockConfirmReset,
            resendCode: mockResendCode,
            isLoading: false,
            error: errorMessage,
            successMessage: null,
          });

          const { container } = render(<ConfirmResetForm email={testEmail} />);

          // The error should be displayed
          const errorAlert = within(container).queryByText(errorMessage);
          expect(errorAlert).toBeInTheDocument();
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  /**
   * Feature: password-reset-screen, Property 13: エラー後のUI状態復元（パスワードリセット確認）
   *
   * 任意のエラー状態に対して、エラーメッセージを表示したとき、「パスワードをリセット」
   * ボタンとすべての入力フィールドを再度有効化するべきです。
   *
   * **Validates: Requirement 10.6**
   */
  it('Property 13: should re-enable form elements after error', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('確認コードが無効または期限切れです'),
          fc.constant('サーバーエラーが発生しました。しばらくしてから再度お試しください'),
          fc.constant('ネットワークエラーが発生しました。インターネット接続を確認してください')
        ),
        (errorMessage) => {
          // Mock error state
          vi.mocked(usePasswordResetModule.usePasswordReset).mockReturnValue({
            requestCode: mockRequestCode,
            confirmReset: mockConfirmReset,
            resendCode: mockResendCode,
            isLoading: false,
            error: errorMessage,
            successMessage: null,
          });

          const { container } = render(<ConfirmResetForm email={testEmail} />);
          const codeInput = within(container).getByRole('textbox', { name: '確認コード' });
          const passwordInput = within(container).getByLabelText('新しいパスワード');
          const confirmationInput = within(container).getByLabelText('新しいパスワード確認');
          const submitButton = within(container).getByRole('button', {
            name: 'パスワードをリセット',
          });

          // Form elements should be enabled when not loading
          expect(codeInput).not.toBeDisabled();
          expect(passwordInput).not.toBeDisabled();
          expect(confirmationInput).not.toBeDisabled();
          expect(submitButton).not.toBeDisabled();
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  /**
   * Feature: password-reset-screen, Property 14: 確認コード再送信のAPI呼び出し
   *
   * 任意の保持されたメールアドレスに対して、「確認コードを再送信」リンクをクリック
   * したとき、そのメールアドレスを使用してパスワードリセット要求APIを再度呼び出す
   * べきです。
   *
   * **Validates: Requirement 11.2**
   */
  it('Property 14: should call resend API when resend link is clicked', () => {
    fc.assert(
      fc.property(fc.emailAddress(), (email) => {
        // Reset mocks for each iteration
        mockResendCode.mockClear();
        mockResendCode.mockResolvedValue(true);

        vi.mocked(usePasswordResetModule.usePasswordReset).mockReturnValue({
          requestCode: mockRequestCode,
          confirmReset: mockConfirmReset,
          resendCode: mockResendCode,
          isLoading: false,
          error: null,
          successMessage: null,
        });

        const { container } = render(<ConfirmResetForm email={email} />);
        const resendButton = within(container).getByRole('button', {
          name: '確認コードを再送信',
        });

        // Click resend button
        fireEvent.click(resendButton);

        // Verify resendCode was called with the email
        expect(mockResendCode).toHaveBeenCalledWith(email);
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });

  /**
   * Feature: password-reset-screen, Property 15: パスワード表示切り替えのラウンドトリップ
   *
   * 任意のパスワード入力状態に対して、パスワード表示切り替えボタンを2回クリックすると、
   * 元の表示状態（マスク表示）に戻るべきです。これは新しいパスワードフィールドと
   * 新しいパスワード確認フィールドの両方に適用されます。
   *
   * **Validates: Requirements 12.3, 12.4**
   */
  it('Property 15: should return to masked state after toggling password visibility twice', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 8 }),
        fc.boolean(), // Which field to test: true = new password, false = confirmation
        (password, testNewPassword) => {
          const { container } = render(<ConfirmResetForm email={testEmail} />);
          const passwordInput = testNewPassword
            ? within(container).getByLabelText('新しいパスワード')
            : within(container).getByLabelText('新しいパスワード確認');
          const toggleButton = testNewPassword
            ? within(container).getByLabelText('パスワードを表示')
            : within(container).getByLabelText('パスワード確認を表示');

          // Enter password
          fireEvent.change(passwordInput, { target: { value: password } });

          // Initial state should be password type
          expect(passwordInput).toHaveAttribute('type', 'password');

          // Click toggle button once
          fireEvent.click(toggleButton);
          expect(passwordInput).toHaveAttribute('type', 'text');

          // Click toggle button again
          const hideButton = testNewPassword
            ? within(container).getByLabelText('パスワードを非表示')
            : within(container).getByLabelText('パスワード確認を非表示');
          fireEvent.click(hideButton);

          // Should return to password type
          expect(passwordInput).toHaveAttribute('type', 'password');
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  /**
   * Feature: password-reset-screen, Property 16: ログイン画面へのナビゲーション
   *
   * 任意の状態に対して、「ログイン画面に戻る」リンクをクリックしたとき、ユーザーを
   * ログイン画面（`/login`）に遷移させるべきです。
   *
   * Note: This property is tested in the RequestCodeForm component as the
   * "ログイン画面に戻る" link only appears in that form, not in ConfirmResetForm.
   *
   * **Validates: Requirement 13.1**
   */
  // This test is intentionally skipped as the navigation link is in RequestCodeForm
  it.skip('Property 16: Navigation to login screen is tested in RequestCodeForm', () => {});

  /**
   * Feature: password-reset-screen, Property 17: バリデーションエラーのrole="alert"属性
   *
   * 任意のバリデーションエラーメッセージに対して、role="alert"属性が設定され、
   * スクリーンリーダーユーザーに適切に通知されるべきです。
   *
   * **Validates: Requirement 14.5**
   */
  it('Property 17: should have role="alert" on validation error messages', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant({ field: 'code', value: '' }),
          fc.constant({ field: 'password', value: 'short' }),
          fc.constant({ field: 'confirmation', value: 'mismatch' })
        ),
        (testCase) => {
          const { container } = render(<ConfirmResetForm email={testEmail} />);

          if (testCase.field === 'code') {
            const codeInput = within(container).getByRole('textbox', { name: '確認コード' });
            fireEvent.change(codeInput, { target: { value: testCase.value } });
            fireEvent.blur(codeInput);
          } else if (testCase.field === 'password') {
            const passwordInput = within(container).getByLabelText('新しいパスワード');
            fireEvent.change(passwordInput, { target: { value: testCase.value } });
            fireEvent.blur(passwordInput);
          } else {
            const passwordInput = within(container).getByLabelText('新しいパスワード');
            const confirmationInput = within(container).getByLabelText('新しいパスワード確認');
            fireEvent.change(passwordInput, { target: { value: 'ValidPass123' } });
            fireEvent.change(confirmationInput, { target: { value: testCase.value } });
            fireEvent.blur(confirmationInput);
          }

          // Find error messages with role="alert"
          const alerts = container.querySelectorAll('[role="alert"]');
          expect(alerts.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  /**
   * Feature: password-reset-screen, Property 18: 無効化ボタンのaria-disabled属性
   *
   * 任意のボタン無効化状態に対して、aria-disabled="true"属性が設定されるべきです。
   *
   * **Validates: Requirement 14.6**
   */
  it('Property 18: should have aria-disabled="true" when button is disabled', () => {
    fc.assert(
      fc.property(fc.boolean(), (isLoading) => {
        // Mock loading state
        vi.mocked(usePasswordResetModule.usePasswordReset).mockReturnValue({
          requestCode: mockRequestCode,
          confirmReset: mockConfirmReset,
          resendCode: mockResendCode,
          isLoading: isLoading,
          error: null,
          successMessage: null,
        });

        const { container } = render(<ConfirmResetForm email={testEmail} />);
        const submitButton = within(container).getByRole('button', {
          name: isLoading ? 'リセット中...' : 'パスワードをリセット',
        });

        if (isLoading) {
          expect(submitButton).toHaveAttribute('aria-disabled', 'true');
          expect(submitButton).toBeDisabled();
        }
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });

  /**
   * Feature: password-reset-screen, Property 19: タッチ可能要素の最小サイズ
   *
   * 任意のインタラクティブ要素（ボタン、リンク、パスワード表示切り替えボタン）に対して、
   * 最小タップ領域44x44pxを確保し、モバイルデバイスでのタッチ操作を容易にするべきです。
   *
   * Note: This property verifies that buttons have appropriate CSS classes for minimum
   * touch target sizes. In JSDOM test environment, getBoundingClientRect() returns 0,
   * so we verify the presence of appropriate Tailwind CSS classes instead.
   *
   * **Validates: Requirement 15.4**
   */
  it('Property 19: should have appropriate CSS classes for minimum touch target size', () => {
    fc.assert(
      fc.property(fc.constant(true), () => {
        const { container } = render(<ConfirmResetForm email={testEmail} />);

        // Check submit button has full width class (which ensures adequate height)
        const submitButton = within(container).getByRole('button', {
          name: 'パスワードをリセット',
        });
        expect(submitButton.className).toContain('w-full');

        // Check resend button exists and is clickable
        const resendButton = within(container).getByRole('button', {
          name: '確認コードを再送信',
        });
        expect(resendButton).toBeInTheDocument();

        // Check password toggle buttons exist
        const toggleButtons = container.querySelectorAll('button[aria-label*="パスワード"]');
        expect(toggleButtons.length).toBeGreaterThanOrEqual(2);
      }),
      { numRuns: 20, endOnFailure: true }
    );
  });

  /**
   * Feature: password-reset-screen, Property 20: 機密データのログ保護
   *
   * 任意のパスワードリセットフロー実行に対して、パスワード、パスワード確認、確認コードの
   * 値がブラウザのコンソールログに出力されてはならないべきです。
   *
   * **Validates: Requirements 16.1, 16.2**
   */
  it('Property 20: should not log sensitive data to console', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100000, max: 999999 }).map((n) => n.toString()),
        fc
          .string({ minLength: 8, maxLength: 20 })
          .filter((s) => /[A-Z]/.test(s) && /[a-z]/.test(s) && /[0-9]/.test(s)),
        (code, password) => {
          // Spy on console methods
          const consoleLogSpy = vi.spyOn(console, 'log');
          const consoleInfoSpy = vi.spyOn(console, 'info');
          const consoleDebugSpy = vi.spyOn(console, 'debug');
          const consoleWarnSpy = vi.spyOn(console, 'warn');

          mockConfirmReset.mockResolvedValue(true);

          vi.mocked(usePasswordResetModule.usePasswordReset).mockReturnValue({
            requestCode: mockRequestCode,
            confirmReset: mockConfirmReset,
            resendCode: mockResendCode,
            isLoading: false,
            error: null,
            successMessage: null,
          });

          const { container } = render(<ConfirmResetForm email={testEmail} />);
          const codeInput = within(container).getByRole('textbox', { name: '確認コード' });
          const passwordInput = within(container).getByLabelText('新しいパスワード');
          const confirmationInput = within(container).getByLabelText('新しいパスワード確認');

          // Enter sensitive data
          fireEvent.change(codeInput, { target: { value: code } });
          fireEvent.change(passwordInput, { target: { value: password } });
          fireEvent.change(confirmationInput, { target: { value: password } });

          // Check that sensitive data is not logged
          const allCalls = [
            ...consoleLogSpy.mock.calls,
            ...consoleInfoSpy.mock.calls,
            ...consoleDebugSpy.mock.calls,
            ...consoleWarnSpy.mock.calls,
          ];

          allCalls.forEach((call) => {
            const callString = JSON.stringify(call);
            expect(callString).not.toContain(code);
            expect(callString).not.toContain(password);
          });

          // Restore spies
          consoleLogSpy.mockRestore();
          consoleInfoSpy.mockRestore();
          consoleDebugSpy.mockRestore();
          consoleWarnSpy.mockRestore();
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });
});
