import { useState } from 'react';
import { profileService } from '@/lib/services/profile-service';
import type { ProfileUpdateData } from '@/lib/types/profile';

/**
 * プロフィール更新フック
 *
 * プロフィール情報の更新、ローディング状態、エラー状態を管理します。
 *
 * @returns {Object} フックの戻り値
 * @returns {Function} updateProfile - プロフィール更新関数
 * @returns {boolean} isLoading - ローディング状態
 * @returns {string | null} error - エラーメッセージ
 *
 * @example
 * ```tsx
 * const { updateProfile, isLoading, error } = useProfileUpdate();
 *
 * const handleSubmit = async () => {
 *   const success = await updateProfile({ username: 'newname' });
 *   if (success) {
 *     // 成功時の処理
 *   }
 * };
 * ```
 */
export function useProfileUpdate() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * プロフィール情報を更新
   *
   * @param data - 更新するプロフィール情報
   * @returns 更新が成功した場合はtrue、失敗した場合はfalse
   *
   * @remarks
   * - 更新中は isLoading が true になります
   * - エラーが発生した場合は error にメッセージが設定されます
   * - 成功時は error が null にリセットされます
   */
  const updateProfile = async (data: ProfileUpdateData): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      await profileService.updateProfile(data);
      return true;
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('プロフィールの更新に失敗しました');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    updateProfile,
    isLoading,
    error,
  };
}
