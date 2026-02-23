import { useState } from 'react';
import { useAuth } from './use-auth';
import { authService } from '@/lib/services/auth-service';

export function useLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login: authLogin } = useAuth();

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.login(email, password);

      // AuthProvider の login メソッドでユーザー情報を設定・永続化・リフレッシュスケジュール
      authLogin({
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
