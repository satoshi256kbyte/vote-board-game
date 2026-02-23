import type { User } from '../types/auth';

const ACCESS_TOKEN_KEY = 'vbg_access_token';
const REFRESH_TOKEN_KEY = 'vbg_refresh_token';
const USER_KEY = 'vbg_user';

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

  setUser(user: User): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  }

  getUser(): User | null {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem(USER_KEY);
      if (data === null) {
        return null;
      }
      try {
        const parsed: unknown = JSON.parse(data);
        if (
          typeof parsed === 'object' &&
          parsed !== null &&
          !Array.isArray(parsed) &&
          'userId' in parsed &&
          'email' in parsed &&
          'username' in parsed &&
          typeof (parsed as Record<string, unknown>).userId === 'string' &&
          typeof (parsed as Record<string, unknown>).email === 'string' &&
          typeof (parsed as Record<string, unknown>).username === 'string'
        ) {
          return parsed as User;
        }
        localStorage.removeItem(USER_KEY);
        return null;
      } catch {
        localStorage.removeItem(USER_KEY);
        return null;
      }
    }
    return null;
  }

  removeUser(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(USER_KEY);
    }
  }

  clearAll(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }
}

export const storageService = new StorageService();

// 個別のエクスポート（後方互換性のため）
export const getAccessToken = () => storageService.getAccessToken();
export const setAccessToken = (token: string) => storageService.setAccessToken(token);
export const removeAccessToken = () => storageService.removeAccessToken();
