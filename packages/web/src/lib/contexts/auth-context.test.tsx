import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, AuthContext } from './auth-context';
import * as storageService from '@/lib/services/storage-service';
import React, { useContext } from 'react';

describe('AuthContext', () => {
  // localStorageのモック
  const localStorageMock = (() => {
    let store: Record<string, string> = {};

    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
  })();

  beforeEach(() => {
    // 各テスト前にlocalStorageをクリア
    localStorageMock.clear();
    // グローバルなlocalStorageをモックに置き換え
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  });

  afterEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('AuthProvider', () => {
    it('子コンポーネントをレンダリングする', () => {
      render(
        <AuthProvider>
          <div>Test Child</div>
        </AuthProvider>
      );

      expect(screen.getByText('Test Child')).toBeInTheDocument();
    });

    it('初期状態でユーザーはnullである', () => {
      const TestComponent = () => {
        const context = useContext(AuthContext);
        return <div>{context?.user ? 'User exists' : 'No user'}</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByText('No user')).toBeInTheDocument();
    });

    it('初期状態でisAuthenticatedはfalseである', () => {
      const TestComponent = () => {
        const context = useContext(AuthContext);
        return <div>{context?.isAuthenticated ? 'Authenticated' : 'Not authenticated'}</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByText('Not authenticated')).toBeInTheDocument();
    });
  });

  describe('ユーザー情報の設定と取得', () => {
    it('setUserでユーザー情報を設定できる', async () => {
      const user = userEvent.setup();
      const TestComponent = () => {
        const context = useContext(AuthContext);

        return (
          <div>
            <button
              onClick={() =>
                context?.setUser({
                  userId: 'user-123',
                  email: 'test@example.com',
                  username: 'testuser',
                })
              }
            >
              Set User
            </button>
            <div>{context?.user?.email || 'No email'}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const button = screen.getByText('Set User');
      await user.click(button);

      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('setUserでユーザー情報をnullに設定できる', async () => {
      const user = userEvent.setup();
      const TestComponent = () => {
        const context = useContext(AuthContext);

        return (
          <div>
            <button
              onClick={() =>
                context?.setUser({
                  userId: 'user-123',
                  email: 'test@example.com',
                  username: 'testuser',
                })
              }
            >
              Set User
            </button>
            <button onClick={() => context?.setUser(null)}>Clear User</button>
            <div>{context?.user?.email || 'No email'}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const setButton = screen.getByText('Set User');
      await user.click(setButton);
      expect(screen.getByText('test@example.com')).toBeInTheDocument();

      const clearButton = screen.getByText('Clear User');
      await user.click(clearButton);
      expect(screen.getByText('No email')).toBeInTheDocument();
    });

    it('設定したユーザー情報を取得できる', async () => {
      const user = userEvent.setup();
      const TestComponent = () => {
        const context = useContext(AuthContext);

        return (
          <div>
            <button
              onClick={() =>
                context?.setUser({
                  userId: 'user-456',
                  email: 'user@test.com',
                  username: 'username456',
                })
              }
            >
              Set User
            </button>
            <div data-testid="user-id">{context?.user?.userId || 'No userId'}</div>
            <div data-testid="email">{context?.user?.email || 'No email'}</div>
            <div data-testid="username">{context?.user?.username || 'No username'}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const button = screen.getByText('Set User');
      await user.click(button);

      expect(screen.getByTestId('user-id')).toHaveTextContent('user-456');
      expect(screen.getByTestId('email')).toHaveTextContent('user@test.com');
      expect(screen.getByTestId('username')).toHaveTextContent('username456');
    });
  });

  describe('認証状態の判定', () => {
    it('ユーザーがnullでトークンがない場合、isAuthenticatedはfalseである', () => {
      const TestComponent = () => {
        const context = useContext(AuthContext);
        return <div>{context?.isAuthenticated ? 'Authenticated' : 'Not authenticated'}</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByText('Not authenticated')).toBeInTheDocument();
    });

    it('ユーザーが設定されているがトークンがない場合、isAuthenticatedはfalseである', async () => {
      const user = userEvent.setup();
      const TestComponent = () => {
        const context = useContext(AuthContext);

        return (
          <div>
            <button
              onClick={() =>
                context?.setUser({
                  userId: 'user-123',
                  email: 'test@example.com',
                  username: 'testuser',
                })
              }
            >
              Set User
            </button>
            <div>{context?.isAuthenticated ? 'Authenticated' : 'Not authenticated'}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const button = screen.getByText('Set User');
      await user.click(button);

      expect(screen.getByText('Not authenticated')).toBeInTheDocument();
    });

    it('ユーザーが設定されトークンが存在する場合、isAuthenticatedはtrueである', async () => {
      const user = userEvent.setup();
      // トークンを設定
      localStorage.setItem('vbg_access_token', 'test-token');

      const TestComponent = () => {
        const context = useContext(AuthContext);

        return (
          <div>
            <button
              onClick={() =>
                context?.setUser({
                  userId: 'user-123',
                  email: 'test@example.com',
                  username: 'testuser',
                })
              }
            >
              Set User
            </button>
            <div>{context?.isAuthenticated ? 'Authenticated' : 'Not authenticated'}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const button = screen.getByText('Set User');
      await user.click(button);

      expect(screen.getByText('Authenticated')).toBeInTheDocument();
    });

    it('ユーザーがnullでトークンが存在する場合、isAuthenticatedはfalseである', () => {
      // トークンを設定
      localStorage.setItem('vbg_access_token', 'test-token');

      const TestComponent = () => {
        const context = useContext(AuthContext);
        return <div>{context?.isAuthenticated ? 'Authenticated' : 'Not authenticated'}</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByText('Not authenticated')).toBeInTheDocument();
    });

    it('ユーザーをnullに設定すると、isAuthenticatedはfalseになる', async () => {
      const user = userEvent.setup();
      // トークンを設定
      localStorage.setItem('vbg_access_token', 'test-token');

      const TestComponent = () => {
        const context = useContext(AuthContext);

        return (
          <div>
            <button
              onClick={() =>
                context?.setUser({
                  userId: 'user-123',
                  email: 'test@example.com',
                  username: 'testuser',
                })
              }
            >
              Set User
            </button>
            <button onClick={() => context?.setUser(null)}>Clear User</button>
            <div>{context?.isAuthenticated ? 'Authenticated' : 'Not authenticated'}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const setButton = screen.getByText('Set User');
      await user.click(setButton);
      expect(screen.getByText('Authenticated')).toBeInTheDocument();

      const clearButton = screen.getByText('Clear User');
      await user.click(clearButton);
      expect(screen.getByText('Not authenticated')).toBeInTheDocument();
    });
  });

  describe('初期化時のトークンチェック', () => {
    it('初期化時にgetAccessTokenが呼び出される', () => {
      const getAccessTokenSpy = vi.spyOn(storageService, 'getAccessToken');

      render(
        <AuthProvider>
          <div>Test</div>
        </AuthProvider>
      );

      expect(getAccessTokenSpy).toHaveBeenCalled();

      getAccessTokenSpy.mockRestore();
    });

    it('トークンが存在しない場合、ユーザー情報は復元されない', () => {
      const TestComponent = () => {
        const context = useContext(AuthContext);
        return <div>{context?.user ? 'User exists' : 'No user'}</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByText('No user')).toBeInTheDocument();
    });
  });

  describe('コンテキストの値の提供', () => {
    it('user、setUser、isAuthenticatedを提供する', () => {
      const TestComponent = () => {
        const context = useContext(AuthContext);

        return (
          <div>
            <div data-testid="has-user">{context?.user !== undefined ? 'yes' : 'no'}</div>
            <div data-testid="has-setUser">{context?.setUser !== undefined ? 'yes' : 'no'}</div>
            <div data-testid="has-isAuthenticated">
              {context?.isAuthenticated !== undefined ? 'yes' : 'no'}
            </div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('has-user')).toHaveTextContent('yes');
      expect(screen.getByTestId('has-setUser')).toHaveTextContent('yes');
      expect(screen.getByTestId('has-isAuthenticated')).toHaveTextContent('yes');
    });
  });

  describe('複数の子コンポーネント間での状態共有', () => {
    it('複数のコンポーネントが同じユーザー情報にアクセスできる', async () => {
      const user = userEvent.setup();
      const Component1 = () => {
        const context = useContext(AuthContext);
        return <div data-testid="component1">{context?.user?.email || 'No email'}</div>;
      };

      const Component2 = () => {
        const context = useContext(AuthContext);
        return <div data-testid="component2">{context?.user?.username || 'No username'}</div>;
      };

      const SetUserComponent = () => {
        const context = useContext(AuthContext);
        return (
          <button
            onClick={() =>
              context?.setUser({
                userId: 'user-789',
                email: 'shared@example.com',
                username: 'shareduser',
              })
            }
          >
            Set User
          </button>
        );
      };

      render(
        <AuthProvider>
          <SetUserComponent />
          <Component1 />
          <Component2 />
        </AuthProvider>
      );

      const button = screen.getByText('Set User');
      await user.click(button);

      expect(screen.getByTestId('component1')).toHaveTextContent('shared@example.com');
      expect(screen.getByTestId('component2')).toHaveTextContent('shareduser');
    });
  });
});
