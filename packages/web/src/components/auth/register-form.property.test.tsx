import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
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

describe('RegisterForm - Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
    mockRegisterFn = vi.fn();
    mockIsLoading = false;
    mockError = null;
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Feature: user-registration-screen, Property 1: メールアドレス形式検証
   *
   * 任意のメールアドレス入力に対して、フォーカスを失ったとき、有効なメール形式
   * （@とドメインを含む）でない場合、エラーメッセージ「有効なメールアドレスを
   * 入力してください」を表示するべきです。
   *
   * **Validates: Requirements 2.1, 2.2**
   */
  it('Property 1: should display error for invalid email format on blur', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0 && !s.includes('@')),
          fc
            .string({ minLength: 1 })
            .filter((s) => s.trim().length > 0 && s.includes('@') && !s.includes('.')),
          fc
            .string({ minLength: 1 })
            .filter((s) => s.trim().length > 0 && s.includes('@') && s.split('@')[1]?.length === 0)
        ),
        (invalidEmail) => {
          const { unmount } = render(<RegisterForm />);
          const emailInput = screen.getByRole('textbox', { name: 'メールアドレス' });

          fireEvent.change(emailInput, { target: { value: invalidEmail } });
          fireEvent.blur(emailInput);

          const errorMessage = screen.queryByText('有効なメールアドレスを入力してください');
          expect(errorMessage).toBeInTheDocument();

          unmount();
          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: user-registration-screen, Property 2: パスワード要件検証
   *
   * 任意のパスワード入力に対して、フォーカスを失ったとき、8文字未満の場合、
   * エラーメッセージ「パスワードは8文字以上である必要があります」を表示するべきです。
   *
   * **Validates: Requirements 2.3, 2.4**
   */
  it('Property 2: should display error for password shorter than 8 characters', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 7 }), (shortPassword) => {
        const { unmount } = render(<RegisterForm />);
        const passwordInput = screen.getByLabelText('パスワード');

        fireEvent.change(passwordInput, { target: { value: shortPassword } });
        fireEvent.blur(passwordInput);

        const errorMessage = screen.queryByText('パスワードは8文字以上である必要があります');
        expect(errorMessage).toBeInTheDocument();

        unmount();
        cleanup();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: user-registration-screen, Property 3: パスワード確認検証
   *
   * 任意のパスワードとパスワード確認の組み合わせに対して、パスワード確認フィールドが
   * フォーカスを失ったとき、両者が一致しない場合、エラーメッセージ「パスワードが一致しません」
   * を表示するべきです。
   *
   * **Validates: Requirements 2.5, 2.6**
   */
  it('Property 3: should display error when passwords do not match', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 8 }),
        fc.string({ minLength: 8 }),
        (password, passwordConfirmation) => {
          fc.pre(password !== passwordConfirmation);

          const { unmount } = render(<RegisterForm />);
          const passwordInput = screen.getByLabelText('パスワード');
          const confirmInput = screen.getByLabelText('パスワード確認');

          fireEvent.change(passwordInput, { target: { value: password } });
          fireEvent.change(confirmInput, { target: { value: passwordConfirmation } });
          fireEvent.blur(confirmInput);

          const errorMessage = screen.queryByText('パスワードが一致しません');
          expect(errorMessage).toBeInTheDocument();

          unmount();
          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: user-registration-screen, Property 4: バリデーションエラー時のボタン無効化
   *
   * 任意のフォーム状態に対して、メールアドレス、パスワード、またはパスワード確認の
   * いずれかにバリデーションエラーが存在する場合、登録ボタンは無効化されるべきです。
   *
   * **Validates: Requirement 2.7**
   */
  it('Property 4: should disable submit button when validation errors exist', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Invalid email
          fc.record({
            email: fc.string().filter((s) => !s.includes('@')),
            password: fc.string({ minLength: 8 }),
            passwordConfirmation: fc.string({ minLength: 8 }),
          }),
          // Invalid password (too short)
          fc.record({
            email: fc.emailAddress(),
            password: fc.string({ minLength: 0, maxLength: 7 }),
            passwordConfirmation: fc.string({ minLength: 8 }),
          }),
          // Mismatched password confirmation
          fc
            .record({
              email: fc.emailAddress(),
              password: fc.string({ minLength: 8 }),
              passwordConfirmation: fc.string({ minLength: 8 }),
            })
            .filter((r) => r.password !== r.passwordConfirmation)
        ),
        (formData) => {
          const { unmount } = render(<RegisterForm />);
          const emailInput = screen.getByLabelText('メールアドレス');
          const passwordInput = screen.getByLabelText('パスワード');
          const confirmInput = screen.getByLabelText('パスワード確認');
          const submitButton = screen.getByRole('button', { name: 'アカウント作成' });

          fireEvent.change(emailInput, { target: { value: formData.email } });
          fireEvent.blur(emailInput);
          fireEvent.change(passwordInput, { target: { value: formData.password } });
          fireEvent.blur(passwordInput);
          fireEvent.change(confirmInput, { target: { value: formData.passwordConfirmation } });
          fireEvent.blur(confirmInput);

          expect(submitButton).toBeDisabled();

          unmount();
          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: user-registration-screen, Property 5: 有効な入力でのAPI呼び出し
   *
   * 任意の有効なメールアドレスとパスワードの組み合わせに対して、登録ボタンをクリックしたとき、
   * 入力されたメールアドレス、パスワード、およびメールアドレスから生成されたユーザー名を含む
   * POSTリクエストを登録APIに送信するべきです。
   *
   * **Validates: Requirement 3.1**
   */
  it('Property 5: should call API with valid inputs on submit', async () => {
    await fc.assert(
      fc.asyncProperty(fc.emailAddress(), fc.string({ minLength: 8 }), async (email, password) => {
        mockRegisterFn.mockResolvedValue(true);

        const { unmount } = render(<RegisterForm />);
        const emailInput = screen.getByLabelText('メールアドレス');
        const passwordInput = screen.getByLabelText('パスワード');
        const confirmInput = screen.getByLabelText('パスワード確認');
        const submitButton = screen.getByRole('button', { name: 'アカウント作成' });

        fireEvent.change(emailInput, { target: { value: email } });
        fireEvent.change(passwordInput, { target: { value: password } });
        fireEvent.change(confirmInput, { target: { value: password } });
        fireEvent.click(submitButton);

        // Wait a tick for async operations
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockRegisterFn).toHaveBeenCalledWith(email, password);

        unmount();
        cleanup();
        mockRegisterFn.mockClear();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: user-registration-screen, Property 6: 登録成功時のナビゲーション
   *
   * 任意の有効な登録リクエストに対して、登録APIが成功レスポンス（201ステータスコード）を
   * 返した場合、ユーザーをメール確認案内ページ（`/email-verification`）に遷移させるべきです。
   *
   * **Validates: Requirement 3.4**
   */
  it('Property 6: should navigate to email verification on successful registration', async () => {
    await fc.assert(
      fc.asyncProperty(fc.emailAddress(), fc.string({ minLength: 8 }), async (email, password) => {
        mockRegisterFn.mockResolvedValue(true);
        mockPush.mockClear();

        const { unmount } = render(<RegisterForm />);
        const emailInput = screen.getByLabelText('メールアドレス');
        const passwordInput = screen.getByLabelText('パスワード');
        const confirmInput = screen.getByLabelText('パスワード確認');
        const submitButton = screen.getByRole('button', { name: 'アカウント作成' });

        fireEvent.change(emailInput, { target: { value: email } });
        fireEvent.change(passwordInput, { target: { value: password } });
        fireEvent.change(confirmInput, { target: { value: password } });
        fireEvent.click(submitButton);

        // Wait a tick for async operations
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockPush).toHaveBeenCalledWith('/email-verification');

        unmount();
        cleanup();
        mockRegisterFn.mockClear();
        mockPush.mockClear();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: user-registration-screen, Property 7: APIエラーメッセージの表示
   *
   * 任意のAPIエラーレスポンス（409、429、500、ネットワークエラー）に対して、
   * 対応するユーザーフレンドリーなエラーメッセージを表示するべきです。
   *
   * **Validates: Requirements 3.5, 3.6**
   */
  it('Property 7: should display appropriate error messages for API errors', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'このメールアドレスは既に登録されています',
          '登録試行回数が上限に達しました。しばらくしてから再度お試しください',
          'サーバーエラーが発生しました。しばらくしてから再度お試しください',
          'ネットワークエラーが発生しました。インターネット接続を確認してください'
        ),
        (errorMessage) => {
          mockError = errorMessage;

          const { unmount } = render(<RegisterForm />);

          const errorAlert = screen.getByRole('alert');
          expect(errorAlert).toHaveTextContent(errorMessage);

          unmount();
          cleanup();
          mockError = null;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: user-registration-screen, Property 8: パスワード表示切り替えのラウンドトリップ
   *
   * 任意のパスワード入力状態に対して、パスワード表示切り替えボタンを2回クリックすると、
   * 元の表示状態（マスク表示）に戻るべきです。これはパスワードフィールドとパスワード確認
   * フィールドの両方に適用されます。
   *
   * **Validates: Requirement 4.3**
   */
  it('Property 8: should return to masked state after toggling password visibility twice', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 8 }), (password) => {
        const { unmount } = render(<RegisterForm />);
        const passwordInput = screen.getByLabelText('パスワード');
        const confirmInput = screen.getByLabelText('パスワード確認');

        fireEvent.change(passwordInput, { target: { value: password } });
        fireEvent.change(confirmInput, { target: { value: password } });

        // Test password field
        const passwordToggle = screen.getByLabelText('パスワードを表示');
        expect(passwordInput).toHaveAttribute('type', 'password');

        fireEvent.click(passwordToggle);
        expect(passwordInput).toHaveAttribute('type', 'text');

        const passwordHideToggle = screen.getByLabelText('パスワードを非表示');
        fireEvent.click(passwordHideToggle);
        expect(passwordInput).toHaveAttribute('type', 'password');

        // Test password confirmation field
        const confirmToggle = screen.getByLabelText('パスワード確認を表示');
        expect(confirmInput).toHaveAttribute('type', 'password');

        fireEvent.click(confirmToggle);
        expect(confirmInput).toHaveAttribute('type', 'text');

        const confirmHideToggle = screen.getByLabelText('パスワード確認を非表示');
        fireEvent.click(confirmHideToggle);
        expect(confirmInput).toHaveAttribute('type', 'password');

        unmount();
        cleanup();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: user-registration-screen, Property 9: aria-describedbyによるエラーメッセージの関連付け
   *
   * 任意のバリデーションエラーメッセージに対して、対応する入力フィールドのaria-describedby属性が
   * エラーメッセージのIDを参照し、支援技術がエラーメッセージを適切に関連付けられるべきです。
   *
   * **Validates: Requirement 5.2**
   */
  it('Property 9: should associate error messages with fields using aria-describedby', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.string({ minLength: 1 }).filter((s) => !s.includes('@')),
          password: fc.string({ minLength: 1, maxLength: 7 }),
          passwordConfirmation: fc.string({ minLength: 8 }),
        }),
        (formData) => {
          const { unmount } = render(<RegisterForm />);
          const emailInput = screen.getByRole('textbox', { name: 'メールアドレス' });
          const passwordInput = screen.getByLabelText('パスワード');
          const confirmInput = screen.getByLabelText('パスワード確認');

          // Trigger email error
          fireEvent.change(emailInput, { target: { value: formData.email } });
          fireEvent.blur(emailInput);
          expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');

          // Trigger password error
          fireEvent.change(passwordInput, { target: { value: formData.password } });
          fireEvent.blur(passwordInput);
          expect(passwordInput).toHaveAttribute('aria-describedby', 'password-error');

          // Trigger password confirmation error
          fireEvent.change(confirmInput, { target: { value: formData.passwordConfirmation } });
          fireEvent.blur(confirmInput);
          expect(confirmInput).toHaveAttribute('aria-describedby', 'password-confirmation-error');

          unmount();
          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: user-registration-screen, Property 10: バリデーションエラーのスクリーンリーダー通知
   *
   * 任意のバリデーションエラーメッセージに対して、role="alert"属性が設定され、
   * スクリーンリーダーユーザーに適切に通知されるべきです。
   *
   * **Validates: Requirement 5.5**
   */
  it('Property 10: should set role="alert" on validation error messages', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0 && !s.includes('@')),
          password: fc.string({ minLength: 1, maxLength: 7 }).filter((s) => s.trim().length > 0),
        }),
        (formData) => {
          const { unmount } = render(<RegisterForm />);
          const emailInput = screen.getByRole('textbox', { name: 'メールアドレス' });
          const passwordInput = screen.getByLabelText('パスワード');

          // Trigger email error
          fireEvent.change(emailInput, { target: { value: formData.email } });
          fireEvent.blur(emailInput);
          const emailError = screen.getByText('有効なメールアドレスを入力してください');
          expect(emailError).toHaveAttribute('role', 'alert');

          // Trigger password error
          fireEvent.change(passwordInput, { target: { value: formData.password } });
          fireEvent.blur(passwordInput);
          const passwordError = screen.getByText('パスワードは8文字以上である必要があります');
          expect(passwordError).toHaveAttribute('role', 'alert');

          unmount();
          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: user-registration-screen, Property 11: タッチ可能要素の最小サイズ
   *
   * 任意のインタラクティブ要素（登録ボタン、パスワード表示切り替えボタン、ログインリンク）に対して、
   * 最小タップ領域44x44pxを確保し、モバイルデバイスでのタッチ操作を容易にするべきです。
   *
   * **Validates: Requirement 6.2**
   */
  it('Property 11: should ensure minimum touch target size for interactive elements', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const { unmount } = render(<RegisterForm />);

        // Submit button should have min-h-[44px]
        const submitButton = screen.getByRole('button', { name: 'アカウント作成' });
        expect(submitButton).toHaveClass('min-h-[44px]');

        // Password toggle buttons should have min-h-[44px]
        const passwordToggle = screen.getByLabelText('パスワードを表示');
        const confirmToggle = screen.getByLabelText('パスワード確認を表示');
        expect(passwordToggle).toHaveClass('min-h-[44px]');
        expect(confirmToggle).toHaveClass('min-h-[44px]');

        // Login link should have min-h-[44px]
        const loginLink = screen.getByRole('link', { name: 'ログイン' });
        expect(loginLink).toHaveClass('min-h-[44px]');

        unmount();
        cleanup();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: user-registration-screen, Property 12: パスワードのローカルストレージ非保存
   *
   * 任意の登録フロー実行に対して、パスワードおよびパスワード確認の値がブラウザの
   * ローカルストレージに保存されてはならないべきです。ローカルストレージに保存されるのは
   * アクセストークンとリフレッシュトークンのみです。
   *
   * **Validates: Requirement 7.2**
   */
  it('Property 12: should not store passwords in local storage', async () => {
    await fc.assert(
      fc.asyncProperty(fc.emailAddress(), fc.string({ minLength: 8 }), async (email, password) => {
        mockRegisterFn.mockResolvedValue(true);

        // Clear local storage before test
        localStorage.clear();

        const { unmount } = render(<RegisterForm />);
        const emailInput = screen.getByLabelText('メールアドレス');
        const passwordInput = screen.getByLabelText('パスワード');
        const confirmInput = screen.getByLabelText('パスワード確認');
        const submitButton = screen.getByRole('button', { name: 'アカウント作成' });

        fireEvent.change(emailInput, { target: { value: email } });
        fireEvent.change(passwordInput, { target: { value: password } });
        fireEvent.change(confirmInput, { target: { value: password } });
        fireEvent.click(submitButton);

        // Wait a tick for async operations
        await new Promise((resolve) => setTimeout(resolve, 0));

        // Check that password is not in local storage
        const localStorageKeys = Object.keys(localStorage);
        const localStorageValues = localStorageKeys.map((key) => localStorage.getItem(key));

        // Password should not be stored
        expect(localStorageValues.every((value) => value !== password)).toBe(true);

        // Email should not be stored (only tokens should be stored)
        expect(localStorageValues.every((value) => value !== email)).toBe(true);

        unmount();
        cleanup();
        mockRegisterFn.mockClear();
        localStorage.clear();
      }),
      { numRuns: 100 }
    );
  });
});
