import { describe, it, expect } from 'vitest';
import { candidateFormSchema } from './candidate-form';

describe('candidateFormSchema', () => {
  describe('position validation', () => {
    it('should accept valid position format', () => {
      const validPositions = [
        { position: '0,0', description: 'テスト' },
        { position: '7,7', description: 'テスト' },
        { position: '3,4', description: 'テスト' },
        { position: '0,7', description: 'テスト' },
        { position: '7,0', description: 'テスト' },
      ];

      validPositions.forEach((data) => {
        const result = candidateFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid position format', () => {
      const invalidPositions = [
        { position: '8,0', description: 'テスト' }, // row out of range
        { position: '0,8', description: 'テスト' }, // col out of range
        { position: '-1,0', description: 'テスト' }, // negative row
        { position: '0,-1', description: 'テスト' }, // negative col
        { position: '0', description: 'テスト' }, // missing col
        { position: '0,', description: 'テスト' }, // missing col value
        { position: ',0', description: 'テスト' }, // missing row value
        { position: 'a,0', description: 'テスト' }, // non-numeric row
        { position: '0,a', description: 'テスト' }, // non-numeric col
        { position: '0 0', description: 'テスト' }, // space instead of comma
        { position: '0-0', description: 'テスト' }, // hyphen instead of comma
        { position: '', description: 'テスト' }, // empty string
      ];

      invalidPositions.forEach((data) => {
        const result = candidateFormSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('有効な位置を選択してください');
        }
      });
    });
  });

  describe('description validation', () => {
    it('should accept valid description length (1-200 characters)', () => {
      const validDescriptions = [
        { position: '0,0', description: 'あ' }, // 1 character
        { position: '0,0', description: 'これは有効な説明文です。' }, // normal length
        { position: '0,0', description: 'あ'.repeat(200) }, // exactly 200 characters
      ];

      validDescriptions.forEach((data) => {
        const result = candidateFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should reject empty description', () => {
      const data = { position: '0,0', description: '' };
      const result = candidateFormSchema.safeParse(data);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('説明文を入力してください');
      }
    });

    it('should reject description over 200 characters', () => {
      const data = { position: '0,0', description: 'あ'.repeat(201) };
      const result = candidateFormSchema.safeParse(data);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('説明文は200文字以内で入力してください');
      }
    });
  });

  describe('combined validation', () => {
    it('should accept valid form data', () => {
      const data = {
        position: '3,4',
        description: 'この手は中央を制圧する重要な一手です。',
      };
      const result = candidateFormSchema.safeParse(data);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(data);
      }
    });

    it('should reject when both fields are invalid', () => {
      const data = {
        position: '8,8',
        description: '',
      };
      const result = candidateFormSchema.safeParse(data);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(2);
      }
    });

    it('should reject when position is missing', () => {
      const data = {
        description: 'テスト',
      };
      const result = candidateFormSchema.safeParse(data);

      expect(result.success).toBe(false);
    });

    it('should reject when description is missing', () => {
      const data = {
        position: '0,0',
      };
      const result = candidateFormSchema.safeParse(data);

      expect(result.success).toBe(false);
    });
  });
});
