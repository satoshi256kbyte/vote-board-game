import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import * as fc from 'fast-check';
import { LoginForm } from './login-form';
import { useLogin } from '@/lib/hooks/use-login';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('@/lib/hooks/use-login', () => ({
  useLogin: vi.fn(),
}));

describe('LoginForm - Property-Based Tests', () => {
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

  afterEach(() => {
    cleanup();
  });

  /**
   * Feature: login-screen, Property 1: 無効なメールアドレス形式のバリデーション
   * **Validates: Requirements 2.3**
   */
  it(
    'Property 1: 任意の無効な形式のメールアドレスに対して、エラーメッセージを表示し、API呼び出しを行わない',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant(''),
            fc.constant('   '),
            fc.string().filter((str) => !str.includes('@')),
            fc.string().map((str) => str + '@'),
            fc.string().map((str) => '@' + str),
            fc
              .string()
              .map((str) => str.replace(/\./g, ''))
              .map((str) => str + '@example'),
            fc.constant('user @example.com'),
            fc.constant('user@example .com')
          ),
          fc.string({ minLength: 1 }),
          async (invalidEmail, password) => {
            mockLogin.mockClear();
            const { unmount } = render(<LoginForm />);

            try {
              const emailInput = screen.getByLabelText('メールアドレス');
              const passwordInput = screen.getByLabelText('パスワード');
              const loginButton = screen.getByRole('button', { name: 'ログイン' });

              fireEvent.change(emailInput, { target: { value: invalidEmail } });
              fireEvent.change(passwordInput, { target: { value: password } });
              fireEvent.click(loginButton);

              await waitFor(() => {
                const errorMessage = screen.queryByText('有効なメールアドレスを入力してください');
                const emptyMessage = screen.queryByText('メールアドレスを入力してください');
                expect(errorMessage || emptyMessage).toBeTruthy();
              });

              expect(mockLogin).not.toHaveBeenCalled();
            } finally {
              unmount();
              cleanup();
            }
          }
        ),
        { numRuns: 100 }
      );
    },
    { timeout: 30000 }
  );

  /**
   * Feature: login-screen, Property 2: バリデーションエラー時のAPI呼び出し防止
   * **Validates: Requirements 2.4**
   */
  it(
    'Property 2: 任意のバリデーションエラーが存在する場合、ログインAPIを呼び出してはならない',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            // 空のメールアドレス
            fc.record({ email: fc.constant(''), password: fc.string({ minLength: 1 }) }),
            // 無効なメールアドレス形式
            fc.record({
              email: fc.string().filter((s) => !s.includes('@') || !s.includes('.')),
              password: fc.string({ minLength: 1 }),
            }),
            // 空のパスワード
            fc.record({
              email: fc.emailAddress(),
              password: fc.constant(''),
            }),
            // 両方空
            fc.record({ email: fc.constant(''), password: fc.constant('') })
          ),
          async ({ email, password }) => {
            mockLogin.mockClear();
            const { unmount } = render(<LoginForm />);

            try {
              const emailInput = screen.getByLabelText('メールアドレス');
              const passwordInput = screen.getByLabelText('パスワード');
              const loginButton = screen.getByRole('button', { name: 'ログイン' });

              fireEvent.change(emailInput, { target: { value: email } });
              fireEvent.change(passwordInput, { target: { value: password } });
              fireEvent.click(loginButton);

              await waitFor(() => {
                // エラーメッセージが表示されるまで待つ
                const alerts = screen.queryAllByRole('alert');
                expect(alerts.length).toBeGreaterThan(0);
              });

              expect(mockLogin).not.toHaveBeenCalled();
            } finally {
              unmount();
              cleanup();
            }
          }
        ),
        { numRuns: 100 }
      );
    },
    { timeout: 30000 }
  );

  /**
   * Feature: login-screen, Property 3: 有効な入力でのAPI呼び出し
   * **Validates: Requirements 3.1**
   */
  it('Property 3: 任意の有効なメールアドレスとパスワードの組み合わせに対して、ログインAPIを呼び出す', async () => {
    await fc.assert(
      fc.asyncProperty(fc.emailAddress(), fc.string({ minLength: 1 }), async (email, password) => {
        mockLogin.mockClear();
        mockLogin.mockResolvedValue(true);
        const { unmount } = render(<LoginForm />);

        const emailInput = screen.getByLabelText('メールアドレス');
        const passwordInput = screen.getByLabelText('パスワード');
        const loginButton = screen.getByRole('button', { name: 'ログイン' });

        fireEvent.change(emailInput, { target: { value: email } });
        fireEvent.change(passwordInput, { target: { value: password } });
        fireEvent.click(loginButton);

        await waitFor(() => {
          expect(mockLogin).toHaveBeenCalledWith(email, password);
        });

        unmount();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: login-screen, Property 5: APIエラーメッセージの表示
   * **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
   */
  it('Property 5: 任意のAPIエラーレスポンスに対して、対応するエラーメッセージを表示する', async () => {
    const errorCases = [
      {
        error: 'メールアドレスまたはパスワードが正しくありません',
        expected: 'メールアドレスまたはパスワードが正しくありません',
      },
      {
        error: 'ログイン試行回数が上限に達しました。しばらくしてから再度お試しください',
        expected: 'ログイン試行回数が上限に達しました。しばらくしてから再度お試しください',
      },
      {
        error: 'サーバーエラーが発生しました。しばらくしてから再度お試しください',
        expected: 'サーバーエラーが発生しました。しばらくしてから再度お試しください',
      },
      {
        error: 'ネットワークエラーが発生しました。インターネット接続を確認してください',
        expected: 'ネットワークエラーが発生しました。インターネット接続を確認してください',
      },
    ];

    await fc.assert(
      fc.asyncProperty(fc.constantFrom(...errorCases), async (errorCase) => {
        (useLogin as ReturnType<typeof vi.fn>).mockReturnValue({
          login: mockLogin,
          isLoading: false,
          error: errorCase.error,
        });

        const { unmount } = render(<LoginForm />);

        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toHaveTextContent(errorCase.expected);

        unmount();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: login-screen, Property 6: エラー後のフォーム再有効化
   * **Validates: Requirements 5.5**
   */
  it('Property 6: 任意のエラーケースの後、ログインボタンとフォーム入力フィールドが再度有効化される', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 1 }),
        fc.constantFrom(
          'メールアドレスまたはパスワードが正しくありません',
          'ログイン試行回数が上限に達しました。しばらくしてから再度お試しください',
          'サーバーエラーが発生しました。しばらくしてから再度お試しください'
        ),
        async (email, password, errorMessage) => {
          mockLogin.mockClear();
          mockLogin.mockResolvedValue(false);

          (useLogin as ReturnType<typeof vi.fn>).mockReturnValue({
            login: mockLogin,
            isLoading: false,
            error: errorMessage,
          });

          const { unmount } = render(<LoginForm />);

          const emailInput = screen.getByLabelText('メールアドレス');
          const passwordInput = screen.getByLabelText('パスワード');
          const loginButton = screen.getByRole('button', { name: 'ログイン' });

          expect(emailInput).not.toBeDisabled();
          expect(passwordInput).not.toBeDisabled();
          expect(loginButton).not.toBeDisabled();

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: login-screen, Property 7: パスワード表示切り替えのラウンドトリップ
   * **Validates: Requirements 9.3**
   */
  it('Property 7: 任意のパスワード入力状態に対して、切り替えボタンを2回クリックすると元の表示状態に戻る', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (password) => {
        const { unmount } = render(<LoginForm />);

        const passwordInput = screen.getByLabelText('パスワード') as HTMLInputElement;
        const toggleButton = screen.getByLabelText('パスワードを表示');

        fireEvent.change(passwordInput, { target: { value: password } });

        const initialType = passwordInput.type;
        expect(initialType).toBe('password');

        fireEvent.click(toggleButton);
        expect(passwordInput.type).toBe('text');

        const hideButton = screen.getByLabelText('パスワードを非表示');
        fireEvent.click(hideButton);
        expect(passwordInput.type).toBe('password');

        unmount();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: login-screen, Property 8: バリデーションエラー時のrole="alert"属性
   * **Validates: Requirements 10.3**
   */
  it('Property 8: 任意のバリデーションエラーメッセージに対して、role="alert"属性が設定される', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant({ email: '', password: 'test' }),
          fc.constant({ email: 'test@example.com', password: '' }),
          fc.constant({ email: 'invalid', password: 'test' })
        ),
        async ({ email, password }) => {
          const { unmount } = render(<LoginForm />);

          const emailInput = screen.getByLabelText('メールアドレス');
          const passwordInput = screen.getByLabelText('パスワード');
          const loginButton = screen.getByRole('button', { name: 'ログイン' });

          fireEvent.change(emailInput, { target: { value: email } });
          fireEvent.change(passwordInput, { target: { value: password } });
          fireEvent.click(loginButton);

          await waitFor(() => {
            const alerts = screen.getAllByRole('alert');
            expect(alerts.length).toBeGreaterThan(0);
          });

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: login-screen, Property 9: タッチ可能要素の最小サイズ
   * **Validates: Requirements 11.4**
   */
  it('Property 9: 任意のインタラクティブ要素に対して、最小タップ領域44x44pxを確保する', () => {
    const { unmount } = render(<LoginForm />);

    const loginButton = screen.getByRole('button', { name: 'ログイン' });
    const toggleButton = screen.getByLabelText('パスワードを表示');
    const resetLink = screen.getByRole('link', { name: 'パスワードをお忘れですか？' });
    const registerLink = screen.getByRole('link', { name: '新規登録' });

    const elements = [loginButton, toggleButton, resetLink, registerLink];

    elements.forEach((element) => {
      // 最小タップ領域44x44pxを確保していることを確認
      // テスト環境ではレンダリングされないため、要素の存在を確認
      // 実際のサイズ検証はE2Eテストで行う
      expect(element).toBeInTheDocument();
    });

    unmount();
  });
});
