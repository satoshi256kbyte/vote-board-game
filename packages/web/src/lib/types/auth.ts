/**
 * ユーザー登録リクエストの型定義
 */
export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
}

/**
 * ユーザー登録レスポンスの型定義
 */
export interface RegisterResponse {
  userId: string;
  email: string;
  username: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * ユーザー情報の型定義
 */
export interface User {
  userId: string;
  email: string;
  username: string;
}

/**
 * フォームエラーの型定義
 */
export interface FormErrors {
  email?: string;
  password?: string;
  passwordConfirmation?: string;
  confirmationCode?: string;
  newPassword?: string;
}

/**
 * パスワードリセット要求リクエストの型定義
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * パスワードリセット要求レスポンスの型定義
 */
export interface PasswordResetResponse {
  message: string;
}

/**
 * パスワードリセット確認リクエストの型定義
 */
export interface PasswordResetConfirmRequest {
  email: string;
  confirmationCode: string;
  newPassword: string;
}

/**
 * パスワードリセット確認レスポンスの型定義
 */
export interface PasswordResetConfirmResponse {
  message: string;
}

/**
 * 認証コンテキストの状態型
 */
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

/**
 * 拡張された認証コンテキスト型
 */
export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  login: (user: User) => void;
  logout: () => void;
}

/**
 * トークンリフレッシュレスポンス型
 */
export interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
}
