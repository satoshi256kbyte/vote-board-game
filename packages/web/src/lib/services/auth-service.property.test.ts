import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { authService } from './auth-service';
import { storageService } from './storage-service';

/**
 * Feature: login-screen, Property 4: トークンのローカルストレージ保存
 *
 * **Validates: Requirements 4.2**
 *
 * 任意のログイン成功レスポンス（accessTokenとrefreshTokenを含む）に対して、
 * 両方のトークンがブラウザのローカルストレージに正しく保存されるべきです。
 */

// Mock storage service
vi.mock('./storage-service', () => ({
  storageService: {
    setAccessToken: vi.fn(),
    getAccessToken: vi.fn(),
    removeAccessToken: vi.fn(),
    setRefreshToken: vi.fn(),
    getRefreshToken: vi.fn(),
    removeRefreshToken: vi.fn(),
    setUser: vi.fn(),
    getUser: vi.fn(),
    removeUser: vi.fn(),
    clearAll: vi.fn(),
  },
}));

describe('AuthService - Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('Property 4: Token localStorage storage verification', () => {
    it('should save both tokens to localStorage for any successful login response', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary login response data
          fc.record({
            userId: fc.string({ minLength: 1, maxLength: 50 }),
            email: fc.emailAddress(),
            username: fc.string({ minLength: 1, maxLength: 30 }),
            accessToken: fc.string({ minLength: 10, maxLength: 500 }),
            refreshToken: fc.string({ minLength: 10, maxLength: 500 }),
            expiresIn: fc.integer({ min: 1, max: 3600 }),
          }),
          async (loginResponse) => {
            // Arrange
            vi.clearAllMocks();
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
              ok: true,
              json: async () => loginResponse,
            });

            // Act
            await authService.login('test@example.com', 'password123');

            // Assert - Both tokens should be saved to localStorage
            expect(storageService.setAccessToken).toHaveBeenCalledWith(loginResponse.accessToken);
            expect(storageService.setRefreshToken).toHaveBeenCalledWith(loginResponse.refreshToken);
            expect(storageService.setAccessToken).toHaveBeenCalledTimes(1);
            expect(storageService.setRefreshToken).toHaveBeenCalledTimes(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should save tokens with JWT-like format (base64 parts)', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate tokens with JWT-like format
          fc.record({
            userId: fc.uuid(),
            email: fc.emailAddress(),
            username: fc.string({ minLength: 1, maxLength: 30 }),
            accessToken: fc
              .tuple(
                fc.base64String({ minLength: 10, maxLength: 50 }),
                fc.base64String({ minLength: 10, maxLength: 50 }),
                fc.base64String({ minLength: 10, maxLength: 50 })
              )
              .map(([header, payload, signature]) => `${header}.${payload}.${signature}`),
            refreshToken: fc
              .tuple(
                fc.base64String({ minLength: 10, maxLength: 50 }),
                fc.base64String({ minLength: 10, maxLength: 50 }),
                fc.base64String({ minLength: 10, maxLength: 50 })
              )
              .map(([header, payload, signature]) => `${header}.${payload}.${signature}`),
            expiresIn: fc.integer({ min: 1, max: 3600 }),
          }),
          async (loginResponse) => {
            // Arrange
            vi.clearAllMocks();
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
              ok: true,
              json: async () => loginResponse,
            });

            // Act
            await authService.login('test@example.com', 'password123');

            // Assert - Tokens should be saved exactly as received
            expect(storageService.setAccessToken).toHaveBeenCalledWith(loginResponse.accessToken);
            expect(storageService.setRefreshToken).toHaveBeenCalledWith(loginResponse.refreshToken);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should save tokens with special characters and unicode', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.string({ minLength: 1, maxLength: 50 }),
            email: fc.emailAddress(),
            username: fc.string({ minLength: 1, maxLength: 30 }),
            // Tokens with various special characters
            accessToken: fc.string({ minLength: 10, maxLength: 200 }),
            refreshToken: fc.string({ minLength: 10, maxLength: 200 }),
            expiresIn: fc.integer({ min: 1, max: 3600 }),
          }),
          async (loginResponse) => {
            // Arrange
            vi.clearAllMocks();
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
              ok: true,
              json: async () => loginResponse,
            });

            // Act
            await authService.login('test@example.com', 'password123');

            // Assert - Tokens should be saved exactly as received, including special chars
            expect(storageService.setAccessToken).toHaveBeenCalledWith(loginResponse.accessToken);
            expect(storageService.setRefreshToken).toHaveBeenCalledWith(loginResponse.refreshToken);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: 9-auth-state-management, Property 7: リフレッシュ後のトークン永続化
   *
   * **Validates: Requirements 3.3**
   *
   * 任意の新しい AccessToken がリフレッシュ API から返された場合、
   * そのトークンは localStorage の vbg_access_token キーに保存され、
   * getAccessToken() で取得可能であるべきです。
   */
  describe('Property 7: リフレッシュ後のトークン永続化', () => {
    it('should persist new access token to localStorage after successful refresh', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            accessToken: fc.string({ minLength: 10, maxLength: 500 }),
            expiresIn: fc.integer({ min: 60, max: 3600 }),
          }),
          fc.string({ minLength: 10, maxLength: 500 }),
          async (
            refreshResponse: { accessToken: string; expiresIn: number },
            inputRefreshToken: string
          ) => {
            // Arrange
            vi.clearAllMocks();
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
              ok: true,
              json: async () => refreshResponse,
            });

            // Act
            const result = await authService.refreshToken(inputRefreshToken);

            // Assert - New access token should be saved to localStorage
            expect(storageService.setAccessToken).toHaveBeenCalledWith(refreshResponse.accessToken);
            expect(storageService.setAccessToken).toHaveBeenCalledTimes(1);

            // Assert - Return value should match the response
            expect(result.accessToken).toBe(refreshResponse.accessToken);
            expect(result.expiresIn).toBe(refreshResponse.expiresIn);
          }
        ),
        { numRuns: 20, endOnFailure: true }
      );
    });
  });

  /**
   * Feature: 9-auth-state-management, Property 12: 認証付きリクエストの Bearer トークン付与
   *
   * **Validates: Requirements 8.1**
   *
   * 任意の URL と AccessToken に対して、authenticatedFetch は
   * Authorization ヘッダーに Bearer {accessToken} の値を含むリクエストを送信するべきです。
   */
  describe('Property 12: 認証付きリクエストの Bearer トークン付与', () => {
    it('should include Authorization: Bearer {accessToken} header for any URL and token', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.webUrl(),
          fc.string({ minLength: 10, maxLength: 500 }),
          async (url: string, accessToken: string) => {
            // Arrange
            vi.clearAllMocks();
            vi.mocked(storageService.getAccessToken).mockReturnValue(accessToken);
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
              ok: true,
              status: 200,
            });

            // Act
            await authService.authenticatedFetch(url);

            // Assert - fetch should be called with the correct Authorization header
            expect(global.fetch).toHaveBeenCalledTimes(1);
            const [calledUrl, calledOptions] = (global.fetch as ReturnType<typeof vi.fn>).mock
              .calls[0] as [string, RequestInit];
            expect(calledUrl).toBe(url);

            const headers = new Headers(calledOptions.headers);
            expect(headers.get('Authorization')).toBe(`Bearer ${accessToken}`);
          }
        ),
        { numRuns: 20, endOnFailure: true }
      );
    });
  });
});
