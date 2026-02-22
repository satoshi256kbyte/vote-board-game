import { z } from 'zod';

// メールアドレスの正規表現（RFC 5322簡易版）
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// パスワード検証関数
const validatePassword = (password: string): boolean => {
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  return hasMinLength && hasUpperCase && hasLowerCase && hasNumber;
};

// ユーザー名検証（英数字、ハイフン、アンダースコアのみ）
const usernameRegex = /^[a-zA-Z0-9_-]+$/;

export const registerSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .min(1, 'Email is required')
    .regex(emailRegex, 'Invalid email format'),

  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required')
    .refine(validatePassword, {
      message:
        'Password must be at least 8 characters and contain uppercase, lowercase, and number',
    }),

  username: z
    .string({ required_error: 'Username is required' })
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(
      usernameRegex,
      'Username can only contain alphanumeric characters, hyphens, and underscores'
    ),
});

export type RegisterInput = z.infer<typeof registerSchema>;
