import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authService } from './auth-service';
import { storageService } from './storage-service';

// Mock storage service
vi.mock('./storage-service', () => ({
  storageService: {
    setAccessToken: vi.fn(),
    setRefreshToken: vi.fn(),
    removeAccessToken: vi.fn(),
    removeRefreshToken: vi.fn(),
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
    it('should remove both access and refresh tokens', () => {
      // Act
      authService.logout();

      // Assert
      expect(storageService.removeAccessToken).toHaveBeenCalled();
      expect(storageService.removeRefreshToken).toHaveBeenCalled();
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
});
