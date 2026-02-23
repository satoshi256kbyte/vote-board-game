import { useState } from 'react';
import { authService } from '@/lib/services/auth-service';

export function usePasswordReset() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const requestCode = async (email: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await authService.requestPasswordReset(email);
      setSuccessMessage('確認コードをメールで送信しました。メールをご確認ください。');
      return true;
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('確認コードの送信に失敗しました');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const confirmReset = async (
    email: string,
    confirmationCode: string,
    newPassword: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await authService.confirmPasswordReset(email, confirmationCode, newPassword);
      setSuccessMessage('パスワードがリセットされました。新しいパスワードでログインしてください。');
      return true;
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('パスワードのリセットに失敗しました');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const resendCode = async (email: string): Promise<boolean> => {
    setError(null);
    setSuccessMessage(null);

    try {
      await authService.requestPasswordReset(email);
      setSuccessMessage('確認コードを再送信しました');
      return true;
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('確認コードの再送信に失敗しました');
      }
      return false;
    }
  };

  return { requestCode, confirmReset, resendCode, isLoading, error, successMessage };
}
