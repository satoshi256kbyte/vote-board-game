/**
 * メールアドレスをマスク
 * 例: user@example.com -> u***@example.com
 */
export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!domain) return '***';

  const maskedLocal = localPart.length > 1 ? localPart[0] + '***' : '***';

  return `${maskedLocal}@${domain}`;
}

/**
 * パスワードをマスク（常に固定文字列）
 */
export function maskPassword(): string {
  return '********';
}
