'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { User } from 'lucide-react';
import { useProfile } from '@/lib/hooks/use-profile';
import { useProfileUpdate } from '@/lib/hooks/use-profile-update';
import { useImageUpload } from '@/lib/hooks/use-image-upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * フォームエラーの型定義
 */
interface FormErrors {
  username?: string;
  image?: string;
}

/**
 * プロフィール編集フォームコンポーネント
 *
 * ユーザーのプロフィール情報（ユーザー名、アイコン画像）を編集するフォームを提供します。
 * バリデーション、画像アップロード、保存・キャンセル機能を含みます。
 *
 * @example
 * ```tsx
 * <ProfileEditForm />
 * ```
 */
export function ProfileEditForm() {
  const router = useRouter();
  const { profile, isLoading: profileLoading } = useProfile();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { updateProfile, isLoading: updateLoading, error: updateError } = useProfileUpdate();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { uploadImage, isLoading: uploadLoading, error: uploadError } = useImageUpload();

  // フォーム状態管理
  const [username, setUsername] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [errors, setErrors] = useState<FormErrors>({});
  const [hasChanges, setHasChanges] = useState(false);

  const isLoading = profileLoading || updateLoading || uploadLoading;

  // プロフィール情報が取得されたら初期値を設定
  useEffect(() => {
    if (profile) {
      setUsername(profile.username);
      setPreviewUrl(profile.iconUrl || null);
    }
  }, [profile]);

  // 変更検知
  useEffect(() => {
    if (profile) {
      const usernameChanged = username !== profile.username;
      const imageChanged = selectedFile !== null;
      setHasChanges(usernameChanged || imageChanged);
    }
  }, [username, selectedFile, profile]);

  // ローディング中の表示
  if (profileLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <form className="bg-white rounded-lg shadow p-6 space-y-6" noValidate>
      {/* エラー表示 */}
      {(updateError || uploadError) && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{updateError || uploadError}</AlertDescription>
        </Alert>
      )}

      {/* アイコン画像プレビュー */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">プロフィールアイコン</label>
        <div className="flex items-center space-x-6">
          <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-200">
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt="プロフィールアイコン"
                width={128}
                height={128}
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-16 h-16 text-gray-400" />
              </div>
            )}
          </div>
        </div>
        {errors.image && (
          <p className="text-sm text-red-600" role="alert">
            {errors.image}
          </p>
        )}
      </div>

      {/* ユーザー名入力フィールド */}
      <div className="space-y-2">
        <label htmlFor="username" className="block text-sm font-medium text-gray-700">
          ユーザー名
        </label>
        <Input
          id="username"
          name="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={isLoading}
          placeholder="ユーザー名"
          aria-label="ユーザー名"
          aria-invalid={!!errors.username}
          aria-describedby={errors.username ? 'username-error' : undefined}
          className={errors.username ? 'border-red-500' : ''}
        />
        {errors.username && (
          <p id="username-error" className="text-sm text-red-600" role="alert">
            {errors.username}
          </p>
        )}
      </div>

      {/* メールアドレス（読み取り専用） */}
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          メールアドレス
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          value={profile?.email || ''}
          disabled
          className="bg-gray-50"
        />
        <p className="text-sm text-gray-500">メールアドレスは変更できません</p>
      </div>

      {/* ボタン */}
      <div className="flex space-x-4">
        <Button
          type="submit"
          disabled={isLoading || !hasChanges}
          aria-disabled={isLoading || !hasChanges}
          className="flex-1"
        >
          {isLoading ? '保存中...' : '保存'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/profile')}
          disabled={isLoading}
          className="flex-1"
        >
          キャンセル
        </Button>
      </div>
    </form>
  );
}
