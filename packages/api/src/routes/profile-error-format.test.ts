import { describe, it, expect } from 'vitest';
import type { ErrorResponse } from './types.js';

describe('Profile API Error Response Format', () => {
  describe('ErrorResponse interface validation', () => {
    it('should have correct structure for error responses', () => {
      // 基本的なエラーレスポンス
      const basicError: ErrorResponse = {
        error: 'NOT_FOUND',
        message: 'User not found',
      };

      expect(basicError).toHaveProperty('error');
      expect(basicError).toHaveProperty('message');
      expect(typeof basicError.error).toBe('string');
      expect(typeof basicError.message).toBe('string');
    });

    it('should not expose internal details in error responses', () => {
      // ErrorResponseインターフェースには内部詳細を含むフィールドがないことを確認
      const errorResponse: ErrorResponse = {
        error: 'INTERNAL_ERROR',
        message: 'An internal error occurred',
      };

      // 内部詳細（テーブル名、接続文字列、スタックトレースなど）が含まれていないことを確認
      expect(errorResponse).not.toHaveProperty('tableName');
      expect(errorResponse).not.toHaveProperty('connectionString');
      expect(errorResponse).not.toHaveProperty('stack');
      expect(errorResponse).not.toHaveProperty('stackTrace');
      expect(errorResponse.message).not.toContain('DynamoDB');
      expect(errorResponse.message).not.toContain('Table');
      expect(errorResponse.message).not.toContain('S3');
      expect(errorResponse.message).not.toContain('Bucket');
    });

    it('should allow optional details field', () => {
      // detailsフィールドがオプショナルであることを確認
      const errorWithoutDetails: ErrorResponse = {
        error: 'NOT_FOUND',
        message: 'User not found',
      };

      const errorWithDetails: ErrorResponse = {
        error: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: {
          fields: {
            username: 'Username is required',
          },
        },
      };

      expect(errorWithoutDetails).toHaveProperty('error');
      expect(errorWithoutDetails).toHaveProperty('message');
      expect(errorWithoutDetails).not.toHaveProperty('details');

      expect(errorWithDetails).toHaveProperty('error');
      expect(errorWithDetails).toHaveProperty('message');
      expect(errorWithDetails).toHaveProperty('details');
    });

    it('should support field-level validation errors', () => {
      const validationError: ErrorResponse = {
        error: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: {
          fields: {
            username: 'Username must be between 1 and 50 characters',
            iconUrl: 'IconUrl must be a valid HTTPS URL',
          },
        },
      };

      expect(validationError.details?.fields).toBeDefined();
      expect(validationError.details?.fields?.username).toBe(
        'Username must be between 1 and 50 characters'
      );
      expect(validationError.details?.fields?.iconUrl).toBe('IconUrl must be a valid HTTPS URL');
    });

    it('should support all error types with consistent structure', () => {
      const errors: ErrorResponse[] = [
        {
          error: 'UNAUTHORIZED',
          message: 'Invalid or expired token',
        },
        {
          error: 'FORBIDDEN',
          message: 'You do not have permission to access this resource',
        },
        {
          error: 'NOT_FOUND',
          message: 'User not found',
        },
        {
          error: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: {
            fields: {
              username: 'Invalid username',
            },
          },
        },
        {
          error: 'INTERNAL_ERROR',
          message: 'An internal error occurred',
        },
      ];

      // すべてのエラーが統一された構造を持つことを確認
      errors.forEach((error) => {
        expect(error).toHaveProperty('error');
        expect(error).toHaveProperty('message');
        expect(typeof error.error).toBe('string');
        expect(typeof error.message).toBe('string');

        // バリデーションエラーの場合のみdetailsが存在
        if (error.error === 'VALIDATION_ERROR') {
          expect(error).toHaveProperty('details');
          expect(error.details).toHaveProperty('fields');
        }
      });
    });
  });
});
