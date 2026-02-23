import { useState } from 'react';
import { useAuth } from './use-auth';
import { authService } from '@/lib/services/auth-service';

export function useLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setUser } = useAuth();

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.login(email, password);

      // ユーザー情報を認証コンテキストに保存
      setUser({
        userId: response.userId,
        email: response.email,
        username: response.username,
      });

      return true;
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('ログインに失敗しました');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { login, isLoading, error };
}
