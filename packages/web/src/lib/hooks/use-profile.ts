import { useState, useEffect } from 'react';
import { profileService } from '@/lib/services/profile-service';
import type { Profile } from '@/lib/types/profile';

/**
 * プロフィール情報を取得・管理するカスタムフック
 *
 * @returns プロフィール情報、ローディング状態、エラー状態、再取得関数
 *
 * @example
 * ```tsx
 * function ProfileView() {
 *   const { profile, isLoading, error, refetch } = useProfile();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>{error}</div>;
 *   if (!profile) return null;
 *
 *   return <div>{profile.username}</div>;
 * }
 * ```
 */
export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await profileService.getProfile();
      setProfile(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('プロフィールの取得に失敗しました');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return {
    profile,
    isLoading,
    error,
    refetch: fetchProfile,
  };
}
