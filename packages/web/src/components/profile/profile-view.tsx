'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { User } from 'lucide-react';
import { useProfile } from '@/lib/hooks/use-profile';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * プロフィール表示コンポーネント
 *
 * ユーザーのプロフィール情報（ユーザー名、メールアドレス、アイコン画像）を表示します。
 * ローディング状態、エラー状態、再読み込み機能を提供します。
 *
 * @example
 * ```tsx
 * <ProfileView />
 * ```
 */
export function ProfileView() {
  const router = useRouter();
  const { profile, isLoading, error, refetch } = useProfile();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={refetch} className="w-full">
          再読み込み
        </Button>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <div className="flex items-center space-x-6">
        <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-200">
          {profile.iconUrl ? (
            <Image
              src={profile.iconUrl}
              alt="プロフィールアイコン"
              width={128}
              height={128}
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className="w-16 h-16 text-gray-400" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold mb-2">{profile.username}</h2>
          <p className="text-gray-600">{profile.email}</p>
        </div>
      </div>

      <Button onClick={() => router.push('/profile/edit')} className="w-full">
        編集
      </Button>
    </div>
  );
}
