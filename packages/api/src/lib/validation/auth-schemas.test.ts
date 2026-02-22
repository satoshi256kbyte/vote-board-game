import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
} from './auth-schemas.js';

describe('registerSchema', () => {
  describe('有効なデータの受け入れテスト', () => {
    it('有効な登録データを受け入れる', () => {
      const validData = {
        email: 'user@example.com',
        password: 'Password123',
        username: 'player1',
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('最小長のユーザー名を受け入れる', () => {
      const validData = {
        email: 'user@example.com',
        password: 'Password123',
        username: 'abc',
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('最大長のユーザー名を受け入れる', () => {
      const validData = {
        email: 'user@example.com',
        password: 'Password123',
        username: '12345678901234567890', // 20文字
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('ハイフンとアンダースコアを含むユーザー名を受け入れる', () => {
      const validData = {
        email: 'user@example.com',
        password: 'Password123',
        username: 'user_name-123',
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('最小要件を満たすパスワードを受け入れる', () => {
      const validData = {
        email: 'user@example.com',
        password: 'Abcdef12', // 8文字、大文字・小文字・数字
        username: 'player1',
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('無効なメール形式の拒否テスト', () => {
    it('メールアドレスが欠落している場合にエラーを返す', () => {
      const invalidData = {
        password: 'Password123',
        username: 'player1',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Email is required');
      }
    });

    it('空のメールアドレスを拒否する', () => {
      const invalidData = {
        email: '',
        password: 'Password123',
        username: 'player1',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Email is required');
      }
    });

    it('@記号がないメールアドレスを拒否する', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'Password123',
        username: 'player1',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email format');
      }
    });

    it('ドメインがないメールアドレスを拒否する', () => {
      const invalidData = {
        email: 'user@',
        password: 'Password123',
        username: 'player1',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email format');
      }
    });

    it('ローカルパートがないメールアドレスを拒否する', () => {
      const invalidData = {
        email: '@example.com',
        password: 'Password123',
        username: 'player1',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email format');
      }
    });

    it('スペースを含むメールアドレスを拒否する', () => {
      const invalidData = {
        email: 'user @example.com',
        password: 'Password123',
        username: 'player1',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email format');
      }
    });
  });

  describe('パスワード要件違反の拒否テスト', () => {
    it('パスワードが欠落している場合にエラーを返す', () => {
      const invalidData = {
        email: 'user@example.com',
        username: 'player1',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password is required');
      }
    });

    it('空のパスワードを拒否する', () => {
      const invalidData = {
        email: 'user@example.com',
        password: '',
        username: 'player1',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password is required');
      }
    });

    it('8文字未満のパスワードを拒否する', () => {
      const invalidData = {
        email: 'user@example.com',
        password: 'Pass12', // 6文字
        username: 'player1',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 8 characters');
      }
    });

    it('大文字を含まないパスワードを拒否する', () => {
      const invalidData = {
        email: 'user@example.com',
        password: 'password123', // 大文字なし
        username: 'player1',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('uppercase');
      }
    });

    it('小文字を含まないパスワードを拒否する', () => {
      const invalidData = {
        email: 'user@example.com',
        password: 'PASSWORD123', // 小文字なし
        username: 'player1',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('lowercase');
      }
    });

    it('数字を含まないパスワードを拒否する', () => {
      const invalidData = {
        email: 'user@example.com',
        password: 'PasswordABC', // 数字なし
        username: 'player1',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('number');
      }
    });

    it('複数の要件を満たさないパスワードを拒否する', () => {
      const invalidData = {
        email: 'user@example.com',
        password: 'pass', // 短い、大文字なし、数字なし
        username: 'player1',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('ユーザー名要件違反の拒否テスト', () => {
    it('ユーザー名が欠落している場合にエラーを返す', () => {
      const invalidData = {
        email: 'user@example.com',
        password: 'Password123',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Username is required');
      }
    });

    it('空のユーザー名を拒否する', () => {
      const invalidData = {
        email: 'user@example.com',
        password: 'Password123',
        username: '',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        // 空文字列の場合、min(3)のバリデーションが先に実行される
        expect(result.error.issues[0].message).toBe('Username must be at least 3 characters');
      }
    });

    it('3文字未満のユーザー名を拒否する', () => {
      const invalidData = {
        email: 'user@example.com',
        password: 'Password123',
        username: 'ab', // 2文字
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Username must be at least 3 characters');
      }
    });

    it('20文字を超えるユーザー名を拒否する', () => {
      const invalidData = {
        email: 'user@example.com',
        password: 'Password123',
        username: '123456789012345678901', // 21文字
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Username must be at most 20 characters');
      }
    });

    it('特殊文字を含むユーザー名を拒否する', () => {
      const invalidData = {
        email: 'user@example.com',
        password: 'Password123',
        username: 'user@name', // @記号
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('alphanumeric');
      }
    });

    it('スペースを含むユーザー名を拒否する', () => {
      const invalidData = {
        email: 'user@example.com',
        password: 'Password123',
        username: 'user name',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('alphanumeric');
      }
    });

    it('日本語を含むユーザー名を拒否する', () => {
      const invalidData = {
        email: 'user@example.com',
        password: 'Password123',
        username: 'ユーザー名',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('alphanumeric');
      }
    });
  });

  describe('複数フィールドのバリデーション', () => {
    it('複数のフィールドが無効な場合、すべてのエラーを返す', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'weak',
        username: 'a',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(1);
      }
    });
  });
});

describe('loginSchema', () => {
  describe('有効なデータの受け入れテスト', () => {
    it('有効なログインデータを受け入れる', () => {
      const validData = {
        email: 'user@example.com',
        password: 'Password123',
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('email欠落/空のテスト', () => {
    it('emailが欠落している場合にエラーを返す', () => {
      const invalidData = {
        password: 'Password123',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Email is required');
      }
    });

    it('空のemailを拒否する', () => {
      const invalidData = {
        email: '',
        password: 'Password123',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Email is required');
      }
    });
  });

  describe('password欠落/空のテスト', () => {
    it('passwordが欠落している場合にエラーを返す', () => {
      const invalidData = {
        email: 'user@example.com',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password is required');
      }
    });

    it('空のpasswordを拒否する', () => {
      const invalidData = {
        email: 'user@example.com',
        password: '',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password is required');
      }
    });
  });
});

describe('refreshSchema', () => {
  describe('有効なデータの受け入れテスト', () => {
    it('有効なリフレッシュトークンデータを受け入れる', () => {
      const validData = {
        refreshToken: 'some-valid-refresh-token',
      };

      const result = refreshSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('refreshToken欠落/空のテスト', () => {
    it('refreshTokenが欠落している場合にエラーを返す', () => {
      const invalidData = {};

      const result = refreshSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Refresh token is required');
      }
    });

    it('空のrefreshTokenを拒否する', () => {
      const invalidData = {
        refreshToken: '',
      };

      const result = refreshSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Refresh token is required');
      }
    });
  });
});

describe('passwordResetRequestSchema', () => {
  describe('有効なデータの受け入れテスト', () => {
    it('有効なメールアドレスを受け入れる', () => {
      const validData = { email: 'user@example.com' };
      const result = passwordResetRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('email欠落/空/無効形式の拒否テスト', () => {
    it('emailが欠落している場合にエラーを返す', () => {
      const result = passwordResetRequestSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Email is required');
      }
    });

    it('空のemailを拒否する', () => {
      const result = passwordResetRequestSchema.safeParse({ email: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Email is required');
      }
    });

    it('無効なメール形式を拒否する', () => {
      const result = passwordResetRequestSchema.safeParse({ email: 'invalid-email' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email format');
      }
    });

    it('@記号のみのメールアドレスを拒否する', () => {
      const result = passwordResetRequestSchema.safeParse({ email: 'user@' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email format');
      }
    });
  });
});

describe('passwordResetConfirmSchema', () => {
  const validData = {
    email: 'user@example.com',
    confirmationCode: '123456',
    newPassword: 'Password123',
  };

  describe('有効なデータの受け入れテスト', () => {
    it('有効なデータを受け入れる', () => {
      const result = passwordResetConfirmSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('email欠落/空/無効形式の拒否テスト', () => {
    it('emailが欠落している場合にエラーを返す', () => {
      const result = passwordResetConfirmSchema.safeParse({
        confirmationCode: validData.confirmationCode,
        newPassword: validData.newPassword,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Email is required');
      }
    });

    it('空のemailを拒否する', () => {
      const result = passwordResetConfirmSchema.safeParse({ ...validData, email: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Email is required');
      }
    });

    it('無効なメール形式を拒否する', () => {
      const result = passwordResetConfirmSchema.safeParse({ ...validData, email: 'bad-email' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email format');
      }
    });
  });

  describe('confirmationCode欠落/空/無効形式の拒否テスト', () => {
    it('confirmationCodeが欠落している場合にエラーを返す', () => {
      const result = passwordResetConfirmSchema.safeParse({
        email: validData.email,
        newPassword: validData.newPassword,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Confirmation code is required');
      }
    });

    it('空のconfirmationCodeを拒否する', () => {
      const result = passwordResetConfirmSchema.safeParse({ ...validData, confirmationCode: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Confirmation code is required');
      }
    });

    it('6桁数字でないconfirmationCodeを拒否する（文字列）', () => {
      const result = passwordResetConfirmSchema.safeParse({
        ...validData,
        confirmationCode: 'abcdef',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Confirmation code must be 6 digits');
      }
    });

    it('5桁のconfirmationCodeを拒否する', () => {
      const result = passwordResetConfirmSchema.safeParse({
        ...validData,
        confirmationCode: '12345',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Confirmation code must be 6 digits');
      }
    });

    it('7桁のconfirmationCodeを拒否する', () => {
      const result = passwordResetConfirmSchema.safeParse({
        ...validData,
        confirmationCode: '1234567',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Confirmation code must be 6 digits');
      }
    });
  });

  describe('newPassword欠落/空/ポリシー不適合の拒否テスト', () => {
    it('newPasswordが欠落している場合にエラーを返す', () => {
      const result = passwordResetConfirmSchema.safeParse({
        email: validData.email,
        confirmationCode: validData.confirmationCode,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('New password is required');
      }
    });

    it('空のnewPasswordを拒否する', () => {
      const result = passwordResetConfirmSchema.safeParse({ ...validData, newPassword: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('New password is required');
      }
    });

    it('8文字未満のnewPasswordを拒否する', () => {
      const result = passwordResetConfirmSchema.safeParse({ ...validData, newPassword: 'Pass1' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 8 characters');
      }
    });

    it('大文字を含まないnewPasswordを拒否する', () => {
      const result = passwordResetConfirmSchema.safeParse({
        ...validData,
        newPassword: 'password123',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('uppercase');
      }
    });

    it('小文字を含まないnewPasswordを拒否する', () => {
      const result = passwordResetConfirmSchema.safeParse({
        ...validData,
        newPassword: 'PASSWORD123',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('lowercase');
      }
    });

    it('数字を含まないnewPasswordを拒否する', () => {
      const result = passwordResetConfirmSchema.safeParse({
        ...validData,
        newPassword: 'PasswordABC',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('number');
      }
    });
  });
});
