import { storageService } from './storage-service';
import { env } from '@/env';
import type { Profile, ProfileUpdateData, UploadUrlResponse } from '@/lib/types/profile';

/**
 * プロフィールAPIとの通信を担当するサービス
 */
class ProfileService {
  /**
   * 認証ヘッダーを取得
   * @throws {Error} トークンが存在しない場合
   */
  private getAuthHeaders(): HeadersInit {
    const token = storageService.getAccessToken();
    if (!token) {
      throw new Error('認証エラーが発生しました。再度ログインしてください');
    }

    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  /**
   * プロフィール情報を取得
   * @returns プロフィール情報
   * @throws {Error} 認証エラー、ネットワークエラー、サーバーエラー
   */
  async getProfile(): Promise<Profile> {
    try {
      const response = await fetch(`${env.apiUrl}/api/profile`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (response.status === 401) {
        throw new Error('認証エラーが発生しました。再度ログインしてください');
      }

      if (response.status === 404) {
        throw new Error('ユーザーが見つかりません');
      }

      if (response.status === 500) {
        throw new Error('サーバーエラーが発生しました。しばらくしてから再度お試しください');
      }

      if (!response.ok) {
        throw new Error('プロフィールの取得に失敗しました');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      if (err instanceof TypeError) {
        throw new Error('ネットワークエラーが発生しました。インターネット接続を確認してください');
      }
      throw err;
    }
  }

  /**
   * プロフィール情報を更新
   * @param data 更新するプロフィール情報
   * @returns 更新されたプロフィール情報
   * @throws {Error} バリデーションエラー、認証エラー、ネットワークエラー、サーバーエラー
   */
  async updateProfile(data: ProfileUpdateData): Promise<Profile> {
    try {
      const response = await fetch(`${env.apiUrl}/api/profile`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (response.status === 400) {
        const errorData = await response.json();
        const fieldErrors = errorData.details?.fields;
        if (fieldErrors) {
          const messages = Object.values(fieldErrors).join(', ');
          throw new Error(messages);
        }
        throw new Error(errorData.message || 'バリデーションエラーが発生しました');
      }

      if (response.status === 401) {
        throw new Error('認証エラーが発生しました。再度ログインしてください');
      }

      if (response.status === 500) {
        throw new Error('サーバーエラーが発生しました。しばらくしてから再度お試しください');
      }

      if (!response.ok) {
        throw new Error('プロフィールの更新に失敗しました');
      }

      const result = await response.json();
      return result;
    } catch (err) {
      if (err instanceof TypeError) {
        throw new Error('ネットワークエラーが発生しました。インターネット接続を確認してください');
      }
      throw err;
    }
  }

  /**
   * アイコン画像アップロード用のPresigned URLを取得
   * @param fileExtension ファイル拡張子（例: 'png', 'jpg', 'gif'）
   * @returns アップロードURL、アイコンURL、有効期限
   * @throws {Error} バリデーションエラー、認証エラー、ネットワークエラー、サーバーエラー
   */
  async getUploadUrl(fileExtension: string): Promise<UploadUrlResponse> {
    try {
      const response = await fetch(`${env.apiUrl}/api/profile/icon/upload-url`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ fileExtension }),
      });

      if (response.status === 400) {
        throw new Error('サポートされていないファイル形式です');
      }

      if (response.status === 401) {
        throw new Error('認証エラーが発生しました。再度ログインしてください');
      }

      if (response.status === 500) {
        throw new Error('サーバーエラーが発生しました。しばらくしてから再度お試しください');
      }

      if (!response.ok) {
        throw new Error('アップロードURLの取得に失敗しました');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      if (err instanceof TypeError) {
        throw new Error('ネットワークエラーが発生しました。インターネット接続を確認してください');
      }
      throw err;
    }
  }
}

export const profileService = new ProfileService();
