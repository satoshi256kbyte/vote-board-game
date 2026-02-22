/** 認証コンテキストの型定義 */
export interface AuthVariables {
  userId: string;
  email: string | undefined;
  username: string | undefined;
}

/** JWTペイロードの型定義（Cognitoアクセストークン） */
export interface CognitoAccessTokenPayload {
  sub: string;
  iss: string;
  token_use: string;
  exp: number;
  iat: number;
  email?: string;
  preferred_username?: string;
  [key: string]: unknown;
}

/** ミドルウェア設定 */
export interface AuthMiddlewareConfig {
  userPoolId: string;
  region: string;
}

/** JWK（JSON Web Key）の型定義 */
export interface Jwk {
  kty: string;
  kid?: string;
  use?: string;
  alg?: string;
  n?: string;
  e?: string;
  [key: string]: unknown;
}

/** JWKSキャッシュエントリ */
export interface JwksCacheEntry {
  keys: Jwk[];
  fetchedAt: number;
}
