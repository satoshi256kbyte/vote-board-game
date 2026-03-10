/**
 * Unit tests for candidate form validation schema
 *
 * Tests validation rules for position and description fields.
 */

import { describe, it, expect } from 'vitest';
import { candidateFormSchema } from './candidate-form-schema';

describe('candidateFormSchema', () => {
  describe('position validation', () => {
    it('should accept valid position format', () => {
      const data = { position: '0,0', description: 'Valid description' };
      expect(() => candidateFormSchema.parse(data)).not.toThrow();
    });

    it('should accept all valid row and column values (0-7)', () => {
      const validPositions = ['0,0', '0,7', '7,0', '7,7', '3,4', '5,2'];

      validPositions.forEach((position) => {
        const data = { position, description: 'Valid description' };
        expect(() => candidateFormSchema.parse(data)).not.toThrow();
      });
    });

    it('should reject invalid position format', () => {
      const invalidPositions = ['A,B', '8,8', '-1,0', '0,-1', '0', '0,', ',0', 'invalid', ''];

      invalidPositions.forEach((position) => {
        const data = { position, description: 'Valid description' };
        const result = candidateFormSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('description validation', () => {
    it('should accept valid description (1-200 characters)', () => {
      const data = { position: '0,0', description: 'Valid description' };
      expect(() => candidateFormSchema.parse(data)).not.toThrow();
    });

    it('should accept description with exactly 200 characters', () => {
      const description = 'a'.repeat(200);
      const data = { position: '0,0', description };
      expect(() => candidateFormSchema.parse(data)).not.toThrow();
    });

    it('should reject empty description', () => {
      const data = { position: '0,0', description: '' };
      const result = candidateFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.description).toContain(
          '説明文を入力してください'
        );
      }
    });

    it('should reject description over 200 characters', () => {
      const description = 'a'.repeat(201);
      const data = { position: '0,0', description };
      const result = candidateFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.description).toContain(
          '説明文は200文字以内で入力してください'
        );
      }
    });

    it('should accept description with Japanese characters', () => {
      const data = {
        position: '0,0',
        description: 'この手で中央を制圧できます。相手の石を多く取れる有利な手です。',
      };
      expect(() => candidateFormSchema.parse(data)).not.toThrow();
    });
  });

  describe('complete form validation', () => {
    it('should validate complete valid form data', () => {
      const data = {
        position: '3,4',
        description: 'この手で中央を制圧できます',
      };
      const result = candidateFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should return multiple errors for invalid data', () => {
      const data = {
        position: 'invalid',
        description: '',
      };
      const result = candidateFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.position).toBeDefined();
        expect(errors.description).toBeDefined();
      }
    });
  });
});
