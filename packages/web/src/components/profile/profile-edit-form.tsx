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
  const { updateProfile, isLoading: updateLoading, error: updateError } = useProfileUpdate();
  const { uploadImage, isLoading: uploadLoading, error: uploadError } = useImageUpload();

  // フォーム状態管理
  const [username, setUsername] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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

  /**
   * フォームバリデーション
   * ユーザー名の必須チェックと文字数制限を実施
   * @returns バリデーションが通過した場合はtrue
   */
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // ユーザー名の必須チェック
    if (!username.trim()) {
      newErrors.username = 'ユーザー名を入力してください';
    }
    // ユーザー名の文字数制限（50文字）
    else if (username.length > 50) {
      newErrors.username = 'ユーザー名は50文字以内で入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * ファイル選択ハンドラー
   * 画像ファイルのサイズと形式をバリデーション
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newErrors: FormErrors = { ...errors };

    // ファイルサイズチェック（5MB）
    if (file.size > 5 * 1024 * 1024) {
      newErrors.image = '画像サイズは5MB以下にしてください';
      setErrors(newErrors);
      return;
    }

    // ファイル形式チェック（PNG、JPEG、GIF）
    const validTypes = ['image/png', 'image/jpeg', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      newErrors.image = 'PNG、JPEG、GIF形式の画像を選択してください';
      setErrors(newErrors);
      return;
    }

    // バリデーション通過
    delete newErrors.image;
    setErrors(newErrors);
    setSelectedFile(file);

    // プレビュー生成
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  /**
   * フォーム送信ハンドラー
   * バリデーション後、画像アップロードとプロフィール更新を実行
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // バリデーション実行
    if (!validateForm()) {
      return;
    }

    try {
      let iconUrl = profile?.iconUrl;

      // 画像がある場合はアップロード
      if (selectedFile) {
        const uploadResult = await uploadImage(selectedFile);
        if (!uploadResult) {
          return; // エラーはuseImageUploadで処理済み
        }
        iconUrl = uploadResult.iconUrl;
      }

      // プロフィール更新
      const success = await updateProfile({
        username: username.trim(),
        iconUrl,
      });

      if (success) {
        router.push('/profile');
      }
    } catch {
      // エラーはフックで処理済み
    }
  };

  // ローディング中の表示
  if (profileLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6" noValidate>
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
          <div className="flex-1">
            <input
              type="file"
              id="icon-upload"
              accept="image/png,image/jpeg,image/gif"
              onChange={handleFileSelect}
              disabled={isLoading}
              className="hidden"
              aria-label="アイコン画像を選択"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('icon-upload')?.click()}
              disabled={isLoading}
              className="w-full"
            >
              画像を選択
            </Button>
            <p className="mt-2 text-sm text-gray-500">PNG、JPEG、GIF形式（最大5MB）</p>
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
