import { useState } from 'react';
import { useAuth } from './use-auth';
import { authService } from '@/lib/services/auth-service';

export function useRegister() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();

  const register = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.register(email, password);

      // AuthProvider の login メソッドでユーザー情報を設定・永続化・リフレッシュスケジュール
      login({
        userId: response.userId,
        email: response.email,
        username: response.username,
      });

      return true;
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('登録に失敗しました');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { register, isLoading, error };
}
