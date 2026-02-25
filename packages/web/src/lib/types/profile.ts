/**
 * プロフィール情報の型定義
 */
export interface Profile {
  userId: string;
  email: string;
  username: string;
  iconUrl?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * プロフィール更新リクエストの型定義
 */
export interface ProfileUpdateData {
  username?: string;
  iconUrl?: string;
}

/**
 * アイコン画像アップロードURL取得レスポンスの型定義
 */
export interface UploadUrlResponse {
  uploadUrl: string;
  iconUrl: string;
  expiresIn: number;
}
