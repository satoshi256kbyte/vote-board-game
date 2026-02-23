import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRegister } from './use-register';
import { useAuth } from './use-auth';
import { authService } from '@/lib/services/auth-service';

// Mock dependencies
vi.mock('./use-auth');
vi.mock('@/lib/services/auth-service');

describe('useRegister', () => {
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: null,
      setUser: vi.fn(),
      login: mockLogin,
      isAuthenticated: false,
    });
  });

  describe('登録成功フロー', () => {
    it('should call authService.register with correct parameters', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'password123';
      const mockResponse = {
        userId: 'user-123',
        email: 'test@example.com',
        username: 'test',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
      };

      (authService.register as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useRegister());

      // Act
      let registerResult: boolean = false;
      await act(async () => {
        registerResult = await result.current.register(email, password);
      });

      // Assert
      expect(authService.register).toHaveBeenCalledWith(email, password);
      expect(authService.register).toHaveBeenCalledTimes(1);
      expect(registerResult).toBe(true);
    });

    it('should call login with correct user data on success', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'password123';
      const mockResponse = {
        userId: 'user-123',
        email: 'test@example.com',
        username: 'test',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
      };

      (authService.register as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useRegister());

      // Act
      await act(async () => {
        await result.current.register(email, password);
      });

      // Assert
      expect(mockLogin).toHaveBeenCalledWith({
        userId: 'user-123',
        email: 'test@example.com',
        username: 'test',
      });
      expect(mockLogin).toHaveBeenCalledTimes(1);
    });

    it('should return true on successful registration', async () => {
      // Arrange
      const mockResponse = {
        userId: 'user-123',
        email: 'test@example.com',
        username: 'test',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
      };

      (authService.register as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useRegister());

      // Act
      let registerResult: boolean = false;
      await act(async () => {
        registerResult = await result.current.register('test@example.com', 'password123');
      });

      // Assert
      expect(registerResult).toBe(true);
    });

    it('should clear error state on successful registration', async () => {
      // Arrange
      const mockResponse = {
        userId: 'user-123',
        email: 'test@example.com',
        username: 'test',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
      };

      (authService.register as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useRegister());

      // Act - First call fails
      await act(async () => {
        await result.current.register('test@example.com', 'password123');
      });

      expect(result.current.error).toBe('First error');

      // Act - Second call succeeds
      await act(async () => {
        await result.current.register('test@example.com', 'password123');
      });

      // Assert
      expect(result.current.error).toBeNull();
    });
  });

  describe('登録失敗フロー', () => {
    it('should set error message when authService.register throws Error', async () => {
      // Arrange
      const errorMessage = 'このメールアドレスは既に登録されています';
      (authService.register as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error(errorMessage)
      );

      const { result } = renderHook(() => useRegister());

      // Act
      await act(async () => {
        await result.current.register('test@example.com', 'password123');
      });

      // Assert
      expect(result.current.error).toBe(errorMessage);
    });

    it('should return false on registration failure', async () => {
      // Arrange
      (authService.register as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Registration failed')
      );

      const { result } = renderHook(() => useRegister());

      // Act
      let registerResult: boolean = true;
      await act(async () => {
        registerResult = await result.current.register('test@example.com', 'password123');
      });

      // Assert
      expect(registerResult).toBe(false);
    });

    it('should not call login when registration fails', async () => {
      // Arrange
      (authService.register as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Registration failed')
      );

      const { result } = renderHook(() => useRegister());

      // Act
      await act(async () => {
        await result.current.register('test@example.com', 'password123');
      });

      // Assert
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should set default error message when error is not an Error instance', async () => {
      // Arrange
      (authService.register as ReturnType<typeof vi.fn>).mockRejectedValueOnce('String error');

      const { result } = renderHook(() => useRegister());

      // Act
      await act(async () => {
        await result.current.register('test@example.com', 'password123');
      });

      // Assert
      expect(result.current.error).toBe('登録に失敗しました');
    });

    it('should handle email already exists error (409)', async () => {
      // Arrange
      const errorMessage = 'このメールアドレスは既に登録されています';
      (authService.register as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error(errorMessage)
      );

      const { result } = renderHook(() => useRegister());

      // Act
      await act(async () => {
        await result.current.register('existing@example.com', 'password123');
      });

      // Assert
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle rate limit error (429)', async () => {
      // Arrange
      const errorMessage = '登録試行回数が上限に達しました。しばらくしてから再度お試しください';
      (authService.register as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error(errorMessage)
      );

      const { result } = renderHook(() => useRegister());

      // Act
      await act(async () => {
        await result.current.register('test@example.com', 'password123');
      });

      // Assert
      expect(result.current.error).toBe(errorMessage);
    });

    it('should handle server error (500)', async () => {
      // Arrange
      const errorMessage = 'サーバーエラーが発生しました。しばらくしてから再度お試しください';
      (authService.register as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error(errorMessage)
      );

      const { result } = renderHook(() => useRegister());

      // Act
      await act(async () => {
        await result.current.register('test@example.com', 'password123');
      });

      // Assert
      expect(result.current.error).toBe(errorMessage);
    });

    it('should handle network error', async () => {
      // Arrange
      const errorMessage = 'ネットワークエラーが発生しました。インターネット接続を確認してください';
      (authService.register as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error(errorMessage)
      );

      const { result } = renderHook(() => useRegister());

      // Act
      await act(async () => {
        await result.current.register('test@example.com', 'password123');
      });

      // Assert
      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('ローディング状態の検証', () => {
    it('should set isLoading to true during registration', async () => {
      // Arrange
      let resolveRegister:
        | ((value: {
            userId: string;
            email: string;
            username: string;
            accessToken: string;
            refreshToken: string;
            expiresIn: number;
          }) => void)
        | undefined;
      const registerPromise = new Promise((resolve) => {
        resolveRegister = resolve;
      });

      (authService.register as ReturnType<typeof vi.fn>).mockReturnValueOnce(registerPromise);

      const { result } = renderHook(() => useRegister());

      // Act - Start the registration without awaiting
      act(() => {
        result.current.register('test@example.com', 'password123');
      });

      // Assert - isLoading should be true during the request
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Cleanup - resolve the promise
      await act(async () => {
        resolveRegister!({
          userId: 'user-123',
          email: 'test@example.com',
          username: 'test',
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          expiresIn: 900,
        });
      });
    });

    it('should set isLoading to false after successful registration', async () => {
      // Arrange
      const mockResponse = {
        userId: 'user-123',
        email: 'test@example.com',
        username: 'test',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
      };

      (authService.register as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useRegister());

      // Act
      await act(async () => {
        await result.current.register('test@example.com', 'password123');
      });

      // Assert
      expect(result.current.isLoading).toBe(false);
    });

    it('should set isLoading to false after failed registration', async () => {
      // Arrange
      (authService.register as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Registration failed')
      );

      const { result } = renderHook(() => useRegister());

      // Act
      await act(async () => {
        await result.current.register('test@example.com', 'password123');
      });

      // Assert
      expect(result.current.isLoading).toBe(false);
    });

    it('should have isLoading false initially', () => {
      // Arrange & Act
      const { result } = renderHook(() => useRegister());

      // Assert
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('エラー状態の検証', () => {
    it('should have error null initially', () => {
      // Arrange & Act
      const { result } = renderHook(() => useRegister());

      // Assert
      expect(result.current.error).toBeNull();
    });

    it('should persist error state after registration failure', async () => {
      // Arrange
      const errorMessage = 'このメールアドレスは既に登録されています';
      (authService.register as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error(errorMessage)
      );

      const { result } = renderHook(() => useRegister());

      // Act
      await act(async () => {
        await result.current.register('test@example.com', 'password123');
      });

      // Assert
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.error).not.toBeNull();
    });

    it('should clear error on subsequent successful registration', async () => {
      // Arrange
      const mockResponse = {
        userId: 'user-123',
        email: 'test@example.com',
        username: 'test',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
      };

      (authService.register as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useRegister());

      // Act - First call fails
      await act(async () => {
        await result.current.register('test@example.com', 'password123');
      });

      expect(result.current.error).toBe('First error');

      // Act - Second call succeeds
      await act(async () => {
        await result.current.register('test@example.com', 'password123');
      });

      // Assert
      expect(result.current.error).toBeNull();
    });

    it('should clear error at the start of new registration attempt', async () => {
      // Arrange
      (authService.register as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error('First error'))
        .mockRejectedValueOnce(new Error('Second error'));

      const { result } = renderHook(() => useRegister());

      // Act - First call fails
      await act(async () => {
        await result.current.register('test@example.com', 'password123');
      });

      expect(result.current.error).toBe('First error');

      // Act - Second call also fails but with different error
      await act(async () => {
        await result.current.register('test@example.com', 'password123');
      });

      // Assert - Error should be updated to the new error
      expect(result.current.error).toBe('Second error');
    });
  });

  describe('useAuthフックとの統合の検証', () => {
    it('should call login from useAuth hook', async () => {
      // Arrange
      const mockResponse = {
        userId: 'user-123',
        email: 'test@example.com',
        username: 'test',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
      };

      (authService.register as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useRegister());

      // Act
      await act(async () => {
        await result.current.register('test@example.com', 'password123');
      });

      // Assert
      expect(mockLogin).toHaveBeenCalled();
    });

    it('should pass correct user data structure to login', async () => {
      // Arrange
      const mockResponse = {
        userId: 'user-456',
        email: 'newuser@example.com',
        username: 'newuser',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
      };

      (authService.register as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useRegister());

      // Act
      await act(async () => {
        await result.current.register('newuser@example.com', 'password123');
      });

      // Assert
      expect(mockLogin).toHaveBeenCalledWith({
        userId: 'user-456',
        email: 'newuser@example.com',
        username: 'newuser',
      });
    });

    it('should only include userId, email, and username in login call', async () => {
      // Arrange
      const mockResponse = {
        userId: 'user-123',
        email: 'test@example.com',
        username: 'test',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
      };

      (authService.register as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useRegister());

      // Act
      await act(async () => {
        await result.current.register('test@example.com', 'password123');
      });

      // Assert
      const loginCall = mockLogin.mock.calls[0][0];
      expect(loginCall).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
        username: 'test',
      });
      expect(loginCall).not.toHaveProperty('accessToken');
      expect(loginCall).not.toHaveProperty('refreshToken');
      expect(loginCall).not.toHaveProperty('expiresIn');
    });

    it('should call login after authService.register completes', async () => {
      // Arrange
      const mockResponse = {
        userId: 'user-123',
        email: 'test@example.com',
        username: 'test',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
      };

      const registerSpy = vi.fn().mockResolvedValueOnce(mockResponse);
      (authService.register as ReturnType<typeof vi.fn>) = registerSpy;

      const { result } = renderHook(() => useRegister());

      // Act
      await act(async () => {
        await result.current.register('test@example.com', 'password123');
      });

      // Assert - Verify order of calls
      expect(registerSpy).toHaveBeenCalled();
      expect(mockLogin).toHaveBeenCalled();
      // login should be called after register completes
      const registerCallOrder = registerSpy.mock.invocationCallOrder[0];
      const loginCallOrder = mockLogin.mock.invocationCallOrder[0];
      expect(loginCallOrder).toBeGreaterThan(registerCallOrder);
    });
  });
});
