import type { Context, Next } from 'hono';

/**
 * CORS ミドルウェア
 * Vercel のプレビューデプロイメント用のワイルドカードオリジンをサポート
 *
 * @param allowedOrigins - カンマ区切りの許可されたオリジンリスト（例: "https://example.com,https://*.vercel.app"）
 * @returns Hono ミドルウェア関数
 */
export const corsMiddleware = (allowedOrigins: string) => {
  const origins = allowedOrigins.split(',').map((origin) => origin.trim());

  return async (c: Context, next: Next) => {
    const origin = c.req.header('Origin');

    // オリジンが許可されている場合、CORS ヘッダーを設定
    if (origin && isOriginAllowed(origin, origins)) {
      c.header('Access-Control-Allow-Origin', origin);
      c.header('Access-Control-Allow-Credentials', 'true');
    }

    // プリフライトリクエスト（OPTIONS）の処理
    if (c.req.method === 'OPTIONS') {
      c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      c.header('Access-Control-Max-Age', '3600');
      return c.body(null, 204);
    }

    await next();
  };
};

/**
 * オリジンが許可されているかチェック
 * ワイルドカードパターン（*.vercel.app）をサポート
 *
 * @param origin - チェックするオリジン
 * @param allowedOrigins - 許可されたオリジンのリスト
 * @returns オリジンが許可されている場合は true
 */
export function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  return allowedOrigins.some((allowed) => {
    // ワイルドカードパターンの場合
    if (allowed.includes('*')) {
      // ワイルドカードを正規表現パターンに変換
      // 例: "https://*.vercel.app" -> "^https://.*\.vercel\.app$"
      // まず * を一時的なプレースホルダーに置換
      const withPlaceholder = allowed.replace(/\*/g, '___WILDCARD___');
      // 正規表現の特殊文字をエスケープ
      const escaped = withPlaceholder.replace(/[.+?^${}()|[\]\\]/g, (match) => `\\${match}`);
      // プレースホルダーを .* に置換
      const pattern = escaped.replace(/___WILDCARD___/g, '.*');
      return new RegExp(`^${pattern}$`).test(origin);
    }
    // 完全一致の場合
    return allowed === origin;
  });
}
