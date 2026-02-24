import { describe, it, expect } from 'vitest';
import { updateProfileSchema, uploadUrlRequestSchema } from './profile-schemas.js';

describe('updateProfileSchema', () => {
  describe('有効なデータの受け入れテスト', () => {
    it('usernameのみの更新を受け入れる', () => {
      const validData = {
        username: 'player1',
      };

      const result = updateProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('iconUrlのみの更新を受け入れる', () => {
      const validData = {
        iconUrl: 'https://example.com/icon.png',
      };

      const result = updateProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('usernameとiconUrlの両方の更新を受け入れる', () => {
      const validData = {
        username: 'player1',
        iconUrl: 'https://example.com/icon.png',
      };

      const result = updateProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('最小長（1文字）のusernameを受け入れる', () => {
      const validData = {
        username: 'a',
      };

      const result = updateProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('最大長（50文字）のusernameを受け入れる', () => {
      const validData = {
        username: '12345678901234567890123456789012345678901234567890', // 50文字
      };

      const result = updateProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('HTTPS URLのiconUrlを受け入れる', () => {
      const validData = {
        iconUrl: 'https://cdn.example.com/icons/user123.png',
      };

      const result = updateProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('クエリパラメータを含むHTTPS URLのiconUrlを受け入れる', () => {
      const validData = {
        iconUrl: 'https://cdn.example.com/icons/user123.png?v=1',
      };

      const result = updateProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('username長さ違反の拒否テスト', () => {
    it('空のusernameを拒否する', () => {
      const invalidData = {
        username: '',
      };

      const result = updateProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Username must be at least 1 character');
      }
    });

    it('51文字のusernameを拒否する', () => {
      const invalidData = {
        username: '123456789012345678901234567890123456789012345678901', // 51文字
      };

      const result = updateProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Username must be at most 50 characters');
      }
    });

    it('100文字のusernameを拒否する', () => {
      const invalidData = {
        username: 'a'.repeat(100),
      };

      const result = updateProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Username must be at most 50 characters');
      }
    });
  });

  describe('iconUrl形式違反の拒否テスト', () => {
    it('HTTP URLのiconUrlを拒否する', () => {
      const invalidData = {
        iconUrl: 'http://example.com/icon.png',
      };

      const result = updateProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('IconUrl must start with https://');
      }
    });

    it('プロトコルなしのiconUrlを拒否する', () => {
      const invalidData = {
        iconUrl: 'example.com/icon.png',
      };

      const result = updateProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('IconUrl must be a valid URL');
      }
    });

    it('空のiconUrlを拒否する', () => {
      const invalidData = {
        iconUrl: '',
      };

      const result = updateProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('IconUrl must be a valid URL');
      }
    });

    it('無効な形式のiconUrlを拒否する', () => {
      const invalidData = {
        iconUrl: 'not-a-url',
      };

      const result = updateProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('IconUrl must be a valid URL');
      }
    });

    it('ftp:// URLのiconUrlを拒否する', () => {
      const invalidData = {
        iconUrl: 'ftp://example.com/icon.png',
      };

      const result = updateProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('IconUrl must start with https://');
      }
    });
  });

  describe('必須フィールドの検証', () => {
    it('フィールドが1つも提供されない場合にエラーを返す', () => {
      const invalidData = {};

      const result = updateProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('At least one field must be provided');
      }
    });

    it('両方のフィールドがundefinedの場合にエラーを返す', () => {
      const invalidData = {
        username: undefined,
        iconUrl: undefined,
      };

      const result = updateProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('At least one field must be provided');
      }
    });
  });

  describe('複数フィールドのバリデーション', () => {
    it('usernameとiconUrlの両方が無効な場合、複数のエラーを返す', () => {
      const invalidData = {
        username: '', // 空
        iconUrl: 'http://example.com/icon.png', // HTTP
      };

      const result = updateProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(1);
      }
    });
  });
});

describe('uploadUrlRequestSchema', () => {
  describe('有効なデータの受け入れテスト', () => {
    it('png拡張子を受け入れる', () => {
      const validData = {
        fileExtension: 'png',
      };

      const result = uploadUrlRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('jpg拡張子を受け入れる', () => {
      const validData = {
        fileExtension: 'jpg',
      };

      const result = uploadUrlRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('jpeg拡張子を受け入れる', () => {
      const validData = {
        fileExtension: 'jpeg',
      };

      const result = uploadUrlRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('gif拡張子を受け入れる', () => {
      const validData = {
        fileExtension: 'gif',
      };

      const result = uploadUrlRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('無効な拡張子の拒否テスト', () => {
    it('fileExtensionが欠落している場合にエラーを返す', () => {
      const invalidData = {};

      const result = uploadUrlRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'File extension must be one of: png, jpg, jpeg, gif'
        );
      }
    });

    it('空のfileExtensionを拒否する', () => {
      const invalidData = {
        fileExtension: '',
      };

      const result = uploadUrlRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'File extension must be one of: png, jpg, jpeg, gif'
        );
      }
    });

    it('bmp拡張子を拒否する', () => {
      const invalidData = {
        fileExtension: 'bmp',
      };

      const result = uploadUrlRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'File extension must be one of: png, jpg, jpeg, gif'
        );
      }
    });

    it('svg拡張子を拒否する', () => {
      const invalidData = {
        fileExtension: 'svg',
      };

      const result = uploadUrlRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'File extension must be one of: png, jpg, jpeg, gif'
        );
      }
    });

    it('webp拡張子を拒否する', () => {
      const invalidData = {
        fileExtension: 'webp',
      };

      const result = uploadUrlRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'File extension must be one of: png, jpg, jpeg, gif'
        );
      }
    });

    it('pdf拡張子を拒否する', () => {
      const invalidData = {
        fileExtension: 'pdf',
      };

      const result = uploadUrlRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'File extension must be one of: png, jpg, jpeg, gif'
        );
      }
    });

    it('大文字のPNG拡張子を拒否する', () => {
      const invalidData = {
        fileExtension: 'PNG',
      };

      const result = uploadUrlRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'File extension must be one of: png, jpg, jpeg, gif'
        );
      }
    });

    it('ドット付きの.png拡張子を拒否する', () => {
      const invalidData = {
        fileExtension: '.png',
      };

      const result = uploadUrlRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'File extension must be one of: png, jpg, jpeg, gif'
        );
      }
    });

    it('任意の文字列を拒否する', () => {
      const invalidData = {
        fileExtension: 'random-string',
      };

      const result = uploadUrlRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'File extension must be one of: png, jpg, jpeg, gif'
        );
      }
    });
  });
});
