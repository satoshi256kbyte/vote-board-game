const ACCESS_TOKEN_KEY = 'vbg_access_token';
const REFRESH_TOKEN_KEY = 'vbg_refresh_token';

class StorageService {
  setAccessToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
    }
  }

  getAccessToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(ACCESS_TOKEN_KEY);
    }
    return null;
  }

  removeAccessToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  }

  setRefreshToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    }
  }

  getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    }
    return null;
  }

  removeRefreshToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  }
}

export const storageService = new StorageService();

// 個別のエクスポート（後方互換性のため）
export const getAccessToken = () => storageService.getAccessToken();
export const setAccessToken = (token: string) => storageService.setAccessToken(token);
export const removeAccessToken = () => storageService.removeAccessToken();
