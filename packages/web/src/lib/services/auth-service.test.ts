import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authService } from './auth-service';
import { storageService } from './storage-service';

// Mock storage service
vi.mock('./storage-service', () => ({
  storageService: {
    setAccessToken: vi.fn(),
    getAccessToken: vi.fn(),
    setRefreshToken: vi.fn(),
    getRefreshToken: vi.fn(),
    removeAccessToken: vi.fn(),
    removeRefreshToken: vi.fn(),
    clearAll: vi.fn(),
  },
}));

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('login', () => {
    const mockLoginResponse = {
      userId: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-123',
      expiresIn: 900,
    };

    it('should successfully login and save tokens', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'password123';

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLoginResponse,
      });

      // Act
      const result = await authService.login(email, password);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      expect(storageService.setAccessToken).toHaveBeenCalledWith('access-token-123');
      expect(storageService.setRefreshToken).toHaveBeenCalledWith('refresh-token-123');
      expect(result).toEqual(mockLoginResponse);
    });

    it('should throw error with correct message for 401 status', async () => {
      // Arrange
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({}),
      });

      // Act & Assert
      await expect(authService.login('test@example.com', 'wrong-password')).rejects.toThrow(
        'メールアドレスまたはパスワードが正しくありません'
      );
    });

    it('should throw error with correct message for 429 status', async () => {
      // Arrange
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({}),
      });

      // Act & Assert
      await expect(authService.login('test@example.com', 'password123')).rejects.toThrow(
        'ログイン試行回数が上限に達しました。しばらくしてから再度お試しください'
      );
    });

    it('should throw error with correct message for 500 status', async () => {
      // Arrange
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

      // Act & Assert
      await expect(authService.login('test@example.com', 'password123')).rejects.toThrow(
        'サーバーエラーが発生しました。しばらくしてから再度お試しください'
      );
    });

    it('should throw error with custom message for other status codes', async () => {
      // Arrange
      const customMessage = 'Custom error message';
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: customMessage }),
      });

      // Act & Assert
      await expect(authService.login('test@example.com', 'password123')).rejects.toThrow(
        customMessage
      );
    });

    it('should throw default error message when error response has no message', async () => {
      // Arrange
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({}),
      });

      // Act & Assert
      await expect(authService.login('test@example.com', 'password123')).rejects.toThrow(
        'ログインに失敗しました'
      );
    });

    it('should handle network errors', async () => {
      // Arrange
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new TypeError('Failed to fetch')
      );

      // Act & Assert
      await expect(authService.login('test@example.com', 'password123')).rejects.toThrow(
        'ネットワークエラーが発生しました。インターネット接続を確認してください'
      );
    });

    it('should handle JSON parse errors in error response', async () => {
      // Arrange
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      // Act & Assert
      await expect(authService.login('test@example.com', 'password123')).rejects.toThrow(
        'サーバーエラーが発生しました。しばらくしてから再度お試しください'
      );
    });

    it('should not save tokens when login fails', async () => {
      // Arrange
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({}),
      });

      // Act
      try {
        await authService.login('test@example.com', 'wrong-password');
      } catch {
        // Expected error
      }

      // Assert
      expect(storageService.setAccessToken).not.toHaveBeenCalled();
      expect(storageService.setRefreshToken).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should clear all auth data using clearAll', () => {
      // Act
      authService.logout();

      // Assert
      expect(storageService.clearAll).toHaveBeenCalled();
    });
  });

  describe('requestPasswordReset', () => {
    it('should successfully request password reset', async () => {
      // Arrange
      const email = 'test@example.com';

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Password reset code has been sent' }),
      });

      // Act
      await authService.requestPasswordReset(email);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/auth/password-reset'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
    });

    it('should throw error with correct message for 429 status (rate limit)', async () => {
      // Arrange
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({}),
      });

      // Act & Assert
      await expect(authService.requestPasswordReset('test@example.com')).rejects.toThrow(
        'リクエスト回数が上限に達しました。しばらくしてから再度お試しください'
      );
    });

    it('should throw error with correct message for 500 status (server error)', async () => {
      // Arrange
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

      // Act & Assert
      await expect(authService.requestPasswordReset('test@example.com')).rejects.toThrow(
        'サーバーエラーが発生しました。しばらくしてから再度お試しください'
      );
    });

    it('should throw error with custom message for other status codes', async () => {
      // Arrange
      const customMessage = 'Custom error message';
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: customMessage }),
      });

      // Act & Assert
      await expect(authService.requestPasswordReset('test@example.com')).rejects.toThrow(
        customMessage
      );
    });

    it('should throw default error message when error response has no message', async () => {
      // Arrange
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({}),
      });

      // Act & Assert
      await expect(authService.requestPasswordReset('test@example.com')).rejects.toThrow(
        '確認コードの送信に失敗しました'
      );
    });

    it('should handle network errors', async () => {
      // Arrange
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new TypeError('Failed to fetch')
      );

      // Act & Assert
      await expect(authService.requestPasswordReset('test@example.com')).rejects.toThrow(
        'ネットワークエラーが発生しました。インターネット接続を確認してください'
      );
    });

    it('should handle JSON parse errors in error response', async () => {
      // Arrange
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      // Act & Assert
      await expect(authService.requestPasswordReset('test@example.com')).rejects.toThrow(
        'サーバーエラーが発生しました。しばらくしてから再度お試しください'
      );
    });
  });

  describe('confirmPasswordReset', () => {
    it('should successfully confirm password reset', async () => {
      // Arrange
      const email = 'test@example.com';
      const confirmationCode = '123456';
      const newPassword = 'NewPassword123';

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Password has been reset successfully' }),
      });

      // Act
      await authService.confirmPasswordReset(email, confirmationCode, newPassword);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/password-reset/confirm'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, confirmationCode, newPassword }),
        }
      );
    });

    it('should throw error with correct message for 400 status with INVALID_CODE error', async () => {
      // Arrange
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'INVALID_CODE' }),
      });

      // Act & Assert
      await expect(
        authService.confirmPasswordReset('test@example.com', '123456', 'NewPassword123')
      ).rejects.toThrow('確認コードが無効または期限切れです');
    });

    it('should throw error with correct message for 400 status with VALIDATION_ERROR error', async () => {
      // Arrange
      const validationMessage = 'Password does not meet requirements';
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'VALIDATION_ERROR', message: validationMessage }),
      });

      // Act & Assert
      await expect(
        authService.confirmPasswordReset('test@example.com', '123456', 'weak')
      ).rejects.toThrow(validationMessage);
    });

    it('should throw default validation error message when VALIDATION_ERROR has no message', async () => {
      // Arrange
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'VALIDATION_ERROR' }),
      });

      // Act & Assert
      await expect(
        authService.confirmPasswordReset('test@example.com', '123456', 'weak')
      ).rejects.toThrow('バリデーションエラーが発生しました');
    });

    it('should throw error with custom message for 400 status with other errors', async () => {
      // Arrange
      const customMessage = 'Custom 400 error';
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: customMessage }),
      });

      // Act & Assert
      await expect(
        authService.confirmPasswordReset('test@example.com', '123456', 'NewPassword123')
      ).rejects.toThrow(customMessage);
    });

    it('should throw default error message for 400 status with no error details', async () => {
      // Arrange
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({}),
      });

      // Act & Assert
      await expect(
        authService.confirmPasswordReset('test@example.com', '123456', 'NewPassword123')
      ).rejects.toThrow('パスワードのリセットに失敗しました');
    });

    it('should throw error with correct message for 429 status (rate limit)', async () => {
      // Arrange
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({}),
      });

      // Act & Assert
      await expect(
        authService.confirmPasswordReset('test@example.com', '123456', 'NewPassword123')
      ).rejects.toThrow('リクエスト回数が上限に達しました。しばらくしてから再度お試しください');
    });

    it('should throw error with correct message for 500 status (server error)', async () => {
      // Arrange
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

      // Act & Assert
      await expect(
        authService.confirmPasswordReset('test@example.com', '123456', 'NewPassword123')
      ).rejects.toThrow('サーバーエラーが発生しました。しばらくしてから再度お試しください');
    });

    it('should throw error with custom message for other status codes', async () => {
      // Arrange
      const customMessage = 'Custom error message';
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ message: customMessage }),
      });

      // Act & Assert
      await expect(
        authService.confirmPasswordReset('test@example.com', '123456', 'NewPassword123')
      ).rejects.toThrow(customMessage);
    });

    it('should throw default error message when error response has no message', async () => {
      // Arrange
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({}),
      });

      // Act & Assert
      await expect(
        authService.confirmPasswordReset('test@example.com', '123456', 'NewPassword123')
      ).rejects.toThrow('パスワードのリセットに失敗しました');
    });

    it('should handle network errors', async () => {
      // Arrange
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new TypeError('Failed to fetch')
      );

      // Act & Assert
      await expect(
        authService.confirmPasswordReset('test@example.com', '123456', 'NewPassword123')
      ).rejects.toThrow('ネットワークエラーが発生しました。インターネット接続を確認してください');
    });

    it('should handle JSON parse errors in error response', async () => {
      // Arrange
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      // Act & Assert
      await expect(
        authService.confirmPasswordReset('test@example.com', '123456', 'NewPassword123')
      ).rejects.toThrow('サーバーエラーが発生しました。しばらくしてから再度お試しください');
    });
  });

  describe('register', () => {
    const mockRegisterResponse = {
      userId: 'user-456',
      email: 'newuser@example.com',
      username: 'newuser',
      accessToken: 'access-token-456',
      refreshToken: 'refresh-token-456',
      expiresIn: 900,
    };

    it('should successfully register and save tokens', async () => {
      // Arrange
      const email = 'newuser@example.com';
      const password = 'password123';

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockRegisterResponse,
      });

      // Act
      const result = await authService.register(email, password);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/auth/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, username: 'newuser' }),
      });
      expect(storageService.setAccessToken).toHaveBeenCalledWith('access-token-456');
      expect(storageService.setRefreshToken).toHaveBeenCalledWith('refresh-token-456');
      expect(result).toEqual(mockRegisterResponse);
    });

    it('should generate username from email address', async () => {
      // Arrange
      const email = 'testuser@example.com';
      const password = 'password123';

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockRegisterResponse,
      });

      // Act
      await authService.register(email, password);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/register'),
        expect.objectContaining({
          body: JSON.stringify({ email, password, username: 'testuser' }),
        })
      );
    });

    it('should throw error with correct message for 409 status (email already exists)', async () => {
      // Arrange
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({}),
      });

      // Act & Assert
      await expect(authService.register('existing@example.com', 'password123')).rejects.toThrow(
        'このメールアドレスは既に登録されています'
      );
    });

    it('should throw error with correct message for 429 status (rate limit)', async () => {
      // Arrange
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({}),
      });

      // Act & Assert
      await expect(authService.register('test@example.com', 'password123')).rejects.toThrow(
        '登録試行回数が上限に達しました。しばらくしてから再度お試しください'
      );
    });

    it('should throw error with correct message for 500 status (server error)', async () => {
      // Arrange
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

      // Act & Assert
      await expect(authService.register('test@example.com', 'password123')).rejects.toThrow(
        'サーバーエラーが発生しました。しばらくしてから再度お試しください'
      );
    });

    it('should throw error with custom message for other status codes', async () => {
      // Arrange
      const customMessage = 'Custom registration error';
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: customMessage }),
      });

      // Act & Assert
      await expect(authService.register('test@example.com', 'password123')).rejects.toThrow(
        customMessage
      );
    });

    it('should throw default error message when error response has no message', async () => {
      // Arrange
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({}),
      });

      // Act & Assert
      await expect(authService.register('test@example.com', 'password123')).rejects.toThrow(
        '登録に失敗しました。もう一度お試しください'
      );
    });

    it('should handle network errors', async () => {
      // Arrange
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new TypeError('Failed to fetch')
      );

      // Act & Assert
      await expect(authService.register('test@example.com', 'password123')).rejects.toThrow(
        'ネットワークエラーが発生しました。インターネット接続を確認してください'
      );
    });

    it('should handle JSON parse errors in error response', async () => {
      // Arrange
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      // Act & Assert
      await expect(authService.register('test@example.com', 'password123')).rejects.toThrow(
        'サーバーエラーが発生しました。しばらくしてから再度お試しください'
      );
    });

    it('should not save tokens when registration fails', async () => {
      // Arrange
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({}),
      });

      // Act
      try {
        await authService.register('existing@example.com', 'password123');
      } catch {
        // Expected error
      }

      // Assert
      expect(storageService.setAccessToken).not.toHaveBeenCalled();
      expect(storageService.setRefreshToken).not.toHaveBeenCalled();
    });

    it('should verify token storage is called with correct values', async () => {
      // Arrange
      const email = 'newuser@example.com';
      const password = 'password123';
      const expectedAccessToken = 'test-access-token';
      const expectedRefreshToken = 'test-refresh-token';

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          ...mockRegisterResponse,
          accessToken: expectedAccessToken,
          refreshToken: expectedRefreshToken,
        }),
      });

      // Act
      await authService.register(email, password);

      // Assert
      expect(storageService.setAccessToken).toHaveBeenCalledTimes(1);
      expect(storageService.setAccessToken).toHaveBeenCalledWith(expectedAccessToken);
      expect(storageService.setRefreshToken).toHaveBeenCalledTimes(1);
      expect(storageService.setRefreshToken).toHaveBeenCalledWith(expectedRefreshToken);
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh token and save new access token', async () => {
      // Arrange
      const refreshTokenValue = 'refresh-token-123';
      const mockRefreshResponse = {
        accessToken: 'new-access-token-456',
        expiresIn: 900,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRefreshResponse,
      });

      // Act
      const result = await authService.refreshToken(refreshTokenValue);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/auth/refresh'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: refreshTokenValue }),
      });
      expect(storageService.setAccessToken).toHaveBeenCalledWith('new-access-token-456');
      expect(result).toEqual(mockRefreshResponse);
    });

    it('should throw error for 401 response (invalid/expired refresh token)', async () => {
      // Arrange
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      // Act & Assert
      await expect(authService.refreshToken('expired-token')).rejects.toThrow(
        'リフレッシュトークンが無効または期限切れです'
      );
    });

    it('should throw error for non-401 error response', async () => {
      // Arrange
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      // Act & Assert
      await expect(authService.refreshToken('some-token')).rejects.toThrow(
        'トークンリフレッシュに失敗しました'
      );
    });
  });

  describe('authenticatedFetch', () => {
    it('should add Bearer token to Authorization header', async () => {
      // Arrange
      const mockAccessToken = 'access-token-789';
      vi.mocked(storageService.getAccessToken).mockReturnValue(mockAccessToken);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 200,
        ok: true,
      });

      // Act
      await authService.authenticatedFetch('https://api.example.com/data');

      // Assert
      const callArgs = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const headers = callArgs[1].headers as Headers;
      expect(headers.get('Authorization')).toBe(`Bearer ${mockAccessToken}`);
    });

    it('should throw error when no access token available', async () => {
      // Arrange
      vi.mocked(storageService.getAccessToken).mockReturnValue(null);

      // Act & Assert
      await expect(authService.authenticatedFetch('https://api.example.com/data')).rejects.toThrow(
        'No access token available'
      );
    });

    it('should retry request after successful token refresh on 401', async () => {
      // Arrange
      const originalToken = 'original-token';
      const newToken = 'refreshed-token';
      const refreshTokenValue = 'refresh-token-abc';

      vi.mocked(storageService.getAccessToken)
        .mockReturnValueOnce(originalToken) // Initial call
        .mockReturnValueOnce(newToken); // After refresh
      vi.mocked(storageService.getRefreshToken).mockReturnValue(refreshTokenValue);

      // First call returns 401
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 401,
        ok: false,
      });
      // Refresh call succeeds
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accessToken: newToken, expiresIn: 900 }),
      });
      // Retry call succeeds
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 200,
        ok: true,
      });

      // Act
      const result = await authService.authenticatedFetch('https://api.example.com/data');

      // Assert
      expect(result.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledTimes(3); // original + refresh + retry
    });

    it('should call logout when retry also returns 401', async () => {
      // Arrange
      const originalToken = 'original-token';
      const newToken = 'refreshed-token';
      const refreshTokenValue = 'refresh-token-abc';

      vi.mocked(storageService.getAccessToken)
        .mockReturnValueOnce(originalToken)
        .mockReturnValueOnce(newToken);
      vi.mocked(storageService.getRefreshToken).mockReturnValue(refreshTokenValue);

      // First call returns 401
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 401,
        ok: false,
      });
      // Refresh call succeeds
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accessToken: newToken, expiresIn: 900 }),
      });
      // Retry also returns 401
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 401,
        ok: false,
      });

      // Act & Assert
      await expect(authService.authenticatedFetch('https://api.example.com/data')).rejects.toThrow(
        'Authentication failed after token refresh'
      );
      expect(storageService.clearAll).toHaveBeenCalled();
    });

    it('should call logout when token refresh fails', async () => {
      // Arrange
      const originalToken = 'original-token';
      const refreshTokenValue = 'refresh-token-abc';

      vi.mocked(storageService.getAccessToken).mockReturnValue(originalToken);
      vi.mocked(storageService.getRefreshToken).mockReturnValue(refreshTokenValue);

      // First call returns 401
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 401,
        ok: false,
      });
      // Refresh call fails
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      // Act & Assert
      await expect(authService.authenticatedFetch('https://api.example.com/data')).rejects.toThrow(
        'Token refresh failed'
      );
      expect(storageService.clearAll).toHaveBeenCalled();
    });

    it('should pass through non-401 responses', async () => {
      // Arrange
      vi.mocked(storageService.getAccessToken).mockReturnValue('valid-token');

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 200,
        ok: true,
      });

      // Act
      const result = await authService.authenticatedFetch('https://api.example.com/data');

      // Assert
      expect(result.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledTimes(1); // No retry
    });
  });
});
