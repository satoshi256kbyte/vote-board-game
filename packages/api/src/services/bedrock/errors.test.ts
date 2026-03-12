import { describe, it, expect } from 'vitest';
import {
  BedrockError,
  BedrockValidationError,
  BedrockModelNotFoundError,
  BedrockRetryFailedError,
} from './errors';

/**
 * エラークラスのユニットテスト
 *
 * **Validates: Requirements 9.4**
 */
describe('Bedrock Error Classes', () => {
  describe('BedrockError', () => {
    it('should create an instance with correct message', () => {
      const message = 'Test error message';
      const error = new BedrockError(message);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(BedrockError);
      expect(error.message).toBe(message);
    });

    it('should have correct name property', () => {
      const error = new BedrockError('Test');

      expect(error.name).toBe('BedrockError');
    });

    it('should be throwable', () => {
      expect(() => {
        throw new BedrockError('Test error');
      }).toThrow(BedrockError);
    });
  });

  describe('BedrockValidationError', () => {
    it('should create an instance with correct message', () => {
      const message = 'Validation failed';
      const error = new BedrockValidationError(message);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(BedrockError);
      expect(error).toBeInstanceOf(BedrockValidationError);
      expect(error.message).toBe(message);
    });

    it('should have correct name property', () => {
      const error = new BedrockValidationError('Test');

      expect(error.name).toBe('BedrockValidationError');
    });

    it('should inherit from BedrockError', () => {
      const error = new BedrockValidationError('Test');

      expect(error).toBeInstanceOf(BedrockError);
    });
  });

  describe('BedrockModelNotFoundError', () => {
    it('should create an instance with correct message', () => {
      const message = 'Model not found';
      const error = new BedrockModelNotFoundError(message);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(BedrockError);
      expect(error).toBeInstanceOf(BedrockModelNotFoundError);
      expect(error.message).toBe(message);
    });

    it('should have correct name property', () => {
      const error = new BedrockModelNotFoundError('Test');

      expect(error.name).toBe('BedrockModelNotFoundError');
    });

    it('should inherit from BedrockError', () => {
      const error = new BedrockModelNotFoundError('Test');

      expect(error).toBeInstanceOf(BedrockError);
    });
  });

  describe('BedrockRetryFailedError', () => {
    it('should create an instance with correct message and cause', () => {
      const message = 'Retry failed';
      const cause = new Error('Original error');
      const error = new BedrockRetryFailedError(message, cause);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(BedrockError);
      expect(error).toBeInstanceOf(BedrockRetryFailedError);
      expect(error.message).toBe(message);
      expect(error.cause).toBe(cause);
    });

    it('should have correct name property', () => {
      const cause = new Error('Test');
      const error = new BedrockRetryFailedError('Test', cause);

      expect(error.name).toBe('BedrockRetryFailedError');
    });

    it('should inherit from BedrockError', () => {
      const cause = new Error('Test');
      const error = new BedrockRetryFailedError('Test', cause);

      expect(error).toBeInstanceOf(BedrockError);
    });

    it('should preserve cause error properties', () => {
      const causeMessage = 'Original error message';
      const cause = new Error(causeMessage);
      const error = new BedrockRetryFailedError('Retry failed', cause);

      expect(error.cause.message).toBe(causeMessage);
      expect(error.cause).toBeInstanceOf(Error);
    });
  });
});
