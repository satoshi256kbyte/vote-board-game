import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import { storageService } from './storage-service';

describe('StorageService - Property-Based Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.clearAllMocks();
    localStorage.clear();
  });

  /**
   * Feature: 9-auth-state-management, Property 2: ユーザー情報シリアライズの往復一貫性
   * **Validates: Requirements 2.1, 2.3**
   *
   * For any valid User object (with non-empty userId, email, username),
   * calling setUser(user) followed by getUser() should return an object
   * deeply equal to the original User.
   */
  it('Property 2: 任意の有効な User オブジェクトに対して、setUser → getUser の往復でデータが一致する', () => {
    fc.assert(
      fc.property(
        fc.record({
          userId: fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
          email: fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
          username: fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        }),
        (user) => {
          localStorage.clear();

          storageService.setUser(user);
          const retrieved = storageService.getUser();

          expect(retrieved).toEqual(user);
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });
});
