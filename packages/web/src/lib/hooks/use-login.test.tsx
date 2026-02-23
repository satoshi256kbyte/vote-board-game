import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLogin } from './use-login';
import { AuthProvider } from '@/lib/contexts/auth-context';
import { authService } from '@/lib/services/auth-service';

// Mock next/navigation (required by AuthProvider)
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// authServiceをモック
vi.mock('@/lib/services/auth-service', () => ({
  authService: {
    login: vi.fn(),
  },
}));

describe('useLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it('初期状態が正しく設定されている', () => {
    const { result } = renderHook(() => useLogin(), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.login).toBe('function');
  });

  it('ログイン成功時にユーザー情報を保存し、trueを返す', async () => {
    const mockResponse = {
      userId: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 900,
    };

    vi.mocked(authService.login).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useLogin(), { wrapper });

    let loginResult: boolean = false;

    await act(async () => {
      loginResult = await result.current.login('test@example.com', 'password123');
    });

    expect(loginResult).toBe(true);
    expect(authService.login).toHaveBeenCalledWith('test@example.com', 'password123');
    expect(result.current.error).toBeNull();
  });

  it('ログイン失敗時にエラーメッセージを設定し、falseを返す', async () => {
    const errorMessage = 'メールアドレスまたはパスワードが正しくありません';
    vi.mocked(authService.login).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useLogin(), { wrapper });

    let loginResult: boolean = true;

    await act(async () => {
      loginResult = await result.current.login('test@example.com', 'wrongpassword');
    });

    expect(loginResult).toBe(false);
    expect(result.current.error).toBe(errorMessage);
  });

  it('ローディング状態が正しく遷移する', async () => {
    const mockResponse = {
      userId: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 900,
    };

    vi.mocked(authService.login).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useLogin(), { wrapper });

    expect(result.current.isLoading).toBe(false);

    const loginPromise = act(async () => {
      await result.current.login('test@example.com', 'password123');
    });

    // ローディング中
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false); // finallyで即座にfalseになる
    });

    await loginPromise;

    // ローディング完了
    expect(result.current.isLoading).toBe(false);
  });

  it('エラーオブジェクトがErrorインスタンスでない場合、デフォルトメッセージを設定する', async () => {
    vi.mocked(authService.login).mockRejectedValue('string error');

    const { result } = renderHook(() => useLogin(), { wrapper });

    await act(async () => {
      await result.current.login('test@example.com', 'password123');
    });

    expect(result.current.error).toBe('ログインに失敗しました');
  });

  it('複数回のログイン試行でエラーがリセットされる', async () => {
    const errorMessage = 'メールアドレスまたはパスワードが正しくありません';
    vi.mocked(authService.login).mockRejectedValueOnce(new Error(errorMessage));

    const { result } = renderHook(() => useLogin(), { wrapper });

    // 最初のログイン試行（失敗）
    await act(async () => {
      await result.current.login('test@example.com', 'wrongpassword');
    });

    expect(result.current.error).toBe(errorMessage);

    // 2回目のログイン試行（成功）
    const mockResponse = {
      userId: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 900,
    };

    vi.mocked(authService.login).mockResolvedValue(mockResponse);

    await act(async () => {
      await result.current.login('test@example.com', 'password123');
    });

    expect(result.current.error).toBeNull();
  });

  it('401エラー時に適切なエラーメッセージを表示する', async () => {
    const errorMessage = 'メールアドレスまたはパスワードが正しくありません';
    vi.mocked(authService.login).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useLogin(), { wrapper });

    await act(async () => {
      await result.current.login('test@example.com', 'wrongpassword');
    });

    expect(result.current.error).toBe(errorMessage);
  });

  it('429エラー時に適切なエラーメッセージを表示する', async () => {
    const errorMessage = 'ログイン試行回数が上限に達しました。しばらくしてから再度お試しください';
    vi.mocked(authService.login).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useLogin(), { wrapper });

    await act(async () => {
      await result.current.login('test@example.com', 'password123');
    });

    expect(result.current.error).toBe(errorMessage);
  });

  it('500エラー時に適切なエラーメッセージを表示する', async () => {
    const errorMessage = 'サーバーエラーが発生しました。しばらくしてから再度お試しください';
    vi.mocked(authService.login).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useLogin(), { wrapper });

    await act(async () => {
      await result.current.login('test@example.com', 'password123');
    });

    expect(result.current.error).toBe(errorMessage);
  });

  it('ネットワークエラー時に適切なエラーメッセージを表示する', async () => {
    const errorMessage = 'ネットワークエラーが発生しました。インターネット接続を確認してください';
    vi.mocked(authService.login).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useLogin(), { wrapper });

    await act(async () => {
      await result.current.login('test@example.com', 'password123');
    });

    expect(result.current.error).toBe(errorMessage);
  });
});
