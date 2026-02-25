import { useState } from 'react';
import { profileService } from '@/lib/services/profile-service';

/**
 * 画像アップロード結果の型定義
 */
interface UploadResult {
  iconUrl: string;
}

/**
 * 画像アップロードフック
 *
 * S3へのPresigned URLを使用した画像アップロード機能を提供します。
 * リトライ機能も含まれています。
 *
 * @returns {Object} フックの戻り値
 * @returns {Function} uploadImage - 画像アップロード関数
 * @returns {Function} retry - リトライ関数
 * @returns {boolean} isLoading - ローディング状態
 * @returns {string | null} error - エラーメッセージ
 *
 * @example
 * ```tsx
 * const { uploadImage, retry, isLoading, error } = useImageUpload();
 *
 * const handleFileSelect = async (file: File) => {
 *   const result = await uploadImage(file);
 *   if (result) {
 *     console.log('Uploaded to:', result.iconUrl);
 *   }
 * };
 *
 * const handleRetry = async () => {
 *   if (lastFile) {
 *     await retry(lastFile);
 *   }
 * };
 * ```
 */
export function useImageUpload() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 画像をS3にアップロード
   *
   * @param file - アップロードする画像ファイル
   * @returns アップロード成功時はiconUrlを含むオブジェクト、失敗時はnull
   *
   * @remarks
   * - ファイル拡張子を自動的に取得してPresigned URLをリクエスト
   * - HTTPS経由でS3に直接アップロード
   * - エラー発生時は error にメッセージが設定されます
   */
  const uploadImage = async (file: File): Promise<UploadResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // ファイル拡張子を取得
      const extension = file.name.split('.').pop()?.toLowerCase() || 'png';

      // Presigned URL取得
      const { uploadUrl, iconUrl } = await profileService.getUploadUrl(extension);

      // S3にアップロード
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('画像のアップロードに失敗しました。再度お試しください');
      }

      return { iconUrl };
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('画像のアップロードに失敗しました');
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 画像アップロードをリトライ
   *
   * @param file - リトライするファイル
   * @returns アップロード成功時はiconUrlを含むオブジェクト、失敗時はnull
   *
   * @remarks
   * uploadImage関数と同じ処理を実行します
   */
  const retry = async (file: File): Promise<UploadResult | null> => {
    return uploadImage(file);
  };

  return {
    uploadImage,
    retry,
    isLoading,
    error,
  };
}
