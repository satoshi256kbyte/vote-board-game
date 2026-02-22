import { storageService } from './storage-service';

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

class AuthService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  }

  async login(email: string, password: string): Promise<LoginResponse> {
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
          throw new Error('ログイン試行回数が上限に達しました。しばらくしてから再度お試しください');
        case 500:
          throw new Error('サーバーエラーが発生しました。しばらくしてから再度お試しください');
        default:
          if (!navigator.onLine) {
            throw new Error(
              'ネットワークエラーが発生しました。インターネット接続を確認してください'
            );
          }
          throw new Error(errorData.message || 'ログインに失敗しました');
      }
    }

    const data: LoginResponse = await response.json();

    // トークンをローカルストレージに保存
    storageService.setAccessToken(data.accessToken);
    storageService.setRefreshToken(data.refreshToken);

    return data;
  }

  logout(): void {
    storageService.removeAccessToken();
    storageService.removeRefreshToken();
  }
}

export const authService = new AuthService();
