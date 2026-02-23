import { storageService } from './storage-service';
import type { RefreshResponse } from '../types/auth';

interface LoginResponse {
  userId: string;
  email: string;
  username: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterResponse {
  userId: string;
  email: string;
  username: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface RegisterRequest {
  email: string;
  password: string;
  username: string;
}

interface PasswordResetRequest {
  email: string;
}

interface PasswordResetConfirmRequest {
  email: string;
  confirmationCode: string;
  newPassword: string;
}

class AuthService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password } as LoginRequest),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        switch (response.status) {
          case 401:
            throw new Error('メールアドレスまたはパスワードが正しくありません');
          case 429:
            throw new Error(
              'ログイン試行回数が上限に達しました。しばらくしてから再度お試しください'
            );
          case 500:
            throw new Error('サーバーエラーが発生しました。しばらくしてから再度お試しください');
          default:
            throw new Error(errorData.message || 'ログインに失敗しました');
        }
      }

      const data: LoginResponse = await response.json();

      // トークンをローカルストレージに保存
      storageService.setAccessToken(data.accessToken);
      storageService.setRefreshToken(data.refreshToken);

      return data;
    } catch (error) {
      // ネットワークエラーの検出
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('ネットワークエラーが発生しました。インターネット接続を確認してください');
      }
      // その他のエラーは再スロー
      throw error;
    }
  }

  logout(): void {
    storageService.clearAll();
  }

  async refreshToken(refreshToken: string): Promise<RefreshResponse> {
    const response = await fetch(`${this.apiUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('リフレッシュトークンが無効または期限切れです');
      }
      throw new Error('トークンリフレッシュに失敗しました');
    }

    const data: RefreshResponse = await response.json();

    // 新しいアクセストークンをローカルストレージに保存
    storageService.setAccessToken(data.accessToken);

    return data;
  }

  async authenticatedFetch(url: string, options?: RequestInit): Promise<Response> {
    const accessToken = storageService.getAccessToken();
    if (!accessToken) {
      throw new Error('No access token available');
    }

    const headers = new Headers(options?.headers);
    headers.set('Authorization', `Bearer ${accessToken}`);

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      const refreshTokenValue = storageService.getRefreshToken();
      if (!refreshTokenValue) {
        this.logout();
        throw new Error('No refresh token available');
      }

      try {
        await this.refreshToken(refreshTokenValue);
      } catch {
        this.logout();
        throw new Error('Token refresh failed');
      }

      const newAccessToken = storageService.getAccessToken();
      if (!newAccessToken) {
        this.logout();
        throw new Error('No access token available after refresh');
      }

      const retryHeaders = new Headers(options?.headers);
      retryHeaders.set('Authorization', `Bearer ${newAccessToken}`);

      const retryResponse = await fetch(url, {
        ...options,
        headers: retryHeaders,
      });

      if (retryResponse.status === 401) {
        this.logout();
        throw new Error('Authentication failed after token refresh');
      }

      return retryResponse;
    }

    return response;
  }

  async register(email: string, password: string): Promise<RegisterResponse> {
    try {
      // ユーザー名をメールアドレスから生成（一時的な実装）
      const username = email.split('@')[0];

      const response = await fetch(`${this.apiUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, username } as RegisterRequest),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        switch (response.status) {
          case 409:
            throw new Error('このメールアドレスは既に登録されています');
          case 429:
            throw new Error('登録試行回数が上限に達しました。しばらくしてから再度お試しください');
          case 500:
            throw new Error('サーバーエラーが発生しました。しばらくしてから再度お試しください');
          default:
            throw new Error(errorData.message || '登録に失敗しました。もう一度お試しください');
        }
      }

      const data: RegisterResponse = await response.json();

      // トークンをローカルストレージに保存
      storageService.setAccessToken(data.accessToken);
      storageService.setRefreshToken(data.refreshToken);

      return data;
    } catch (error) {
      // ネットワークエラーの検出
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('ネットワークエラーが発生しました。インターネット接続を確認してください');
      }
      // その他のエラーは再スロー
      throw error;
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/auth/password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email } as PasswordResetRequest),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        switch (response.status) {
          case 429:
            throw new Error('リクエスト回数が上限に達しました。しばらくしてから再度お試しください');
          case 500:
            throw new Error('サーバーエラーが発生しました。しばらくしてから再度お試しください');
          default:
            throw new Error(errorData.message || '確認コードの送信に失敗しました');
        }
      }

      // 成功時は何も返さない
    } catch (error) {
      // ネットワークエラーの検出
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('ネットワークエラーが発生しました。インターネット接続を確認してください');
      }
      // その他のエラーは再スロー
      throw error;
    }
  }

  async confirmPasswordReset(
    email: string,
    confirmationCode: string,
    newPassword: string
  ): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/auth/password-reset/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          confirmationCode,
          newPassword,
        } as PasswordResetConfirmRequest),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        switch (response.status) {
          case 400:
            if (errorData.error === 'INVALID_CODE') {
              throw new Error('確認コードが無効または期限切れです');
            }
            if (errorData.error === 'VALIDATION_ERROR') {
              throw new Error(errorData.message || 'バリデーションエラーが発生しました');
            }
            throw new Error(errorData.message || 'パスワードのリセットに失敗しました');
          case 429:
            throw new Error('リクエスト回数が上限に達しました。しばらくしてから再度お試しください');
          case 500:
            throw new Error('サーバーエラーが発生しました。しばらくしてから再度お試しください');
          default:
            throw new Error(errorData.message || 'パスワードのリセットに失敗しました');
        }
      }

      // 成功時は何も返さない
    } catch (error) {
      // ネットワークエラーの検出
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('ネットワークエラーが発生しました。インターネット接続を確認してください');
      }
      // その他のエラーは再スロー
      throw error;
    }
  }
}

export const authService = new AuthService();
