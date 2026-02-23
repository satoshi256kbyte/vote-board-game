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

  /**
   * Feature: 9-auth-state-management, Property 3: 不正 JSON のグレースフルハンドリング
   * **Validates: Requirements 2.4**
   *
   * For any string that is not valid JSON representing a User object,
   * if it is stored under the vbg_user key in localStorage,
   * then getUser() should return null and the vbg_user key should be removed from localStorage.
   */
  it('Property 3: 不正 JSON が localStorage に保存されている場合、getUser() は null を返し vbg_user キーを削除する', () => {
    const invalidJsonArb = fc.oneof(
      // ランダム文字列（JSON ではない）
      fc.string({ minLength: 1 }).filter((s) => {
        try {
          const parsed = JSON.parse(s);
          // パースできても User 構造でなければ不正
          return (
            typeof parsed !== 'object' ||
            parsed === null ||
            typeof parsed.userId !== 'string' ||
            typeof parsed.email !== 'string' ||
            typeof parsed.username !== 'string' ||
            parsed.userId.trim().length === 0 ||
            parsed.email.trim().length === 0 ||
            parsed.username.trim().length === 0
          );
        } catch {
          return true; // パース失敗 = 不正 JSON
        }
      }),
      // 壊れた JSON フラグメント
      fc.constantFrom(
        '{',
        '{"userId":}',
        '{userId: "abc"}',
        'not json at all',
        '{"userId": 123, "email": true}',
        '[]',
        'null',
        'undefined',
        ''
      )
    );

    fc.assert(
      fc.property(invalidJsonArb, (invalidData) => {
        localStorage.clear();
        localStorage.setItem('vbg_user', invalidData);

        const result = storageService.getUser();

        expect(result).toBeNull();
        expect(localStorage.getItem('vbg_user')).toBeNull();
      }),
      { numRuns: 20, endOnFailure: true }
    );
  });

  /**
   * Feature: 9-auth-state-management, Property 4: ログアウトによる全認証データのクリア
   * **Validates: Requirements 2.2, 4.1**
   *
   * For any combination of stored AccessToken, RefreshToken, and User data in localStorage,
   * executing logout (clearAll) should result in all three keys
   * (vbg_access_token, vbg_refresh_token, vbg_user) being removed from localStorage.
   */
  it('Property 4: 任意の認証データが保存されている状態で clearAll を実行すると、全キーが削除される', () => {
    const userArb = fc.record({
      userId: fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
      email: fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
      username: fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
    });

    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        userArb,
        (accessToken, refreshToken, user) => {
          localStorage.clear();

          storageService.setAccessToken(accessToken);
          storageService.setRefreshToken(refreshToken);
          storageService.setUser(user);

          // Verify data was stored
          expect(localStorage.getItem('vbg_access_token')).not.toBeNull();
          expect(localStorage.getItem('vbg_refresh_token')).not.toBeNull();
          expect(localStorage.getItem('vbg_user')).not.toBeNull();

          storageService.clearAll();

          // All three keys should be removed
          expect(localStorage.getItem('vbg_access_token')).toBeNull();
          expect(localStorage.getItem('vbg_refresh_token')).toBeNull();
          expect(localStorage.getItem('vbg_user')).toBeNull();
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });
});
