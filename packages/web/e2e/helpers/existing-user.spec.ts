/**
 * Unit tests for existing user error detection
 * Tests the isUserAlreadyExistsError helper function
 */

import { test, expect } from '@playwright/test';
import { isUserAlreadyExistsError } from './existing-user';

test.describe('isUserAlreadyExistsError', () => {
  test('should detect UsernameExistsException', () => {
    const error = new Error('UsernameExistsException: User already exists');
    expect(isUserAlreadyExistsError(error)).toBe(true);
  });

  test('should detect "User already exists" message', () => {
    const error = new Error('User already exists in the system');
    expect(isUserAlreadyExistsError(error)).toBe(true);
  });

  test('should detect Japanese error message', () => {
    const error = new Error('ユーザーは既に存在します');
    expect(isUserAlreadyExistsError(error)).toBe(true);
  });

  test('should detect generic "already exists" message', () => {
    const error = new Error('The email already exists');
    expect(isUserAlreadyExistsError(error)).toBe(true);
  });

  test('should return false for unrelated errors', () => {
    const error = new Error('Network timeout');
    expect(isUserAlreadyExistsError(error)).toBe(false);
  });

  test('should return false for null/undefined', () => {
    expect(isUserAlreadyExistsError(null)).toBe(false);
    expect(isUserAlreadyExistsError(undefined)).toBe(false);
  });

  test('should handle string errors', () => {
    expect(isUserAlreadyExistsError('UsernameExistsException')).toBe(true);
    expect(isUserAlreadyExistsError('Some other error')).toBe(false);
  });
});
