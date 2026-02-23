import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePasswordReset } from './use-password-reset';
import { authService } from '@/lib/services/auth-service';

// Mock dependencies
vi.mock('@/lib/services/auth-service');

describe('usePasswordReset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('初期状態', () => {
    it('should have isLoading false initially', () => {
      // Arrange & Act
      const { result } = renderHook(() => usePasswordReset());

      // Assert
      expect(result.current.isLoading).toBe(false);
    });

    it('should have error null initially', () => {
      // Arrange & Act
      const { result } = renderHook(() => usePasswordReset());

      // Assert
      expect(result.current.error).toBeNull();
    });

    it('should have successMessage null initially', () => {
      // Arrange & Act
      const { result } = renderHook(() => usePasswordReset());

      // Assert
      expect(result.current.successMessage).toBeNull();
    });
  });

  describe('requestCode - 確認コード送信成功フロー', () => {
    it('should call authService.requestPasswordReset with correct email', async () => {
      // Arrange
      const email = 'test@example.com';
      vi.mocked(authService.requestPasswordReset).mockResolvedValueOnce();

      const { result } = renderHook(() => usePasswordReset());

      // Act
      let requestResult: boolean = false;
      await act(async () => {
        requestResult = await result.current.requestCode(email);
      });

      // Assert
      expect(authService.requestPasswordReset).toHaveBeenCalledWith(email);
      expect(authService.requestPasswordReset).toHaveBeenCalledTimes(1);
      expect(requestResult).toBe(true);
    });

    it('should set isLoading to true during request', async () => {
      // Arrange
      const email = 'test@example.com';
      let resolveRequest: () => void;
      const requestPromise = new Promise<void>((resolve) => {
        resolveRequest = resolve;
      });
      vi.mocked(authService.requestPasswordReset).mockReturnValueOnce(requestPromise);

      const { result } = renderHook(() => usePasswordReset());

      // Act - Start the request without awaiting
      act(() => {
        result.current.requestCode(email);
      });

      // Assert - isLoading should be true during request
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Cleanup - resolve the promise
      await act(async () => {
        resolveRequest!();
        await requestPromise;
      });
    });

    it('should set isLoading to false after successful request', async () => {
      // Arrange
      const email = 'test@example.com';
      vi.mocked(authService.requestPasswordReset).mockResolvedValueOnce();

      const { result } = renderHook(() => usePasswordReset());

      // Act
      await act(async () => {
        await result.current.requestCode(email);
      });

      // Assert
      expect(result.current.isLoading).toBe(false);
    });

    it('should set successMessage on successful request', async () => {
      // Arrange
      const email = 'test@example.com';
      vi.mocked(authService.requestPasswordReset).mockResolvedValueOnce();

      const { result } = renderHook(() => usePasswordReset());

      // Act
      await act(async () => {
        await result.current.requestCode(email);
      });

      // Assert
      expect(result.current.successMessage).toBe(
        '確認コードをメールで送信しました。メールをご確認ください。'
      );
    });

    it('should clear error on successful request', async () => {
      // Arrange
      const email = 'test@example.com';
      vi.mocked(authService.requestPasswordReset)
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce();

      const { result } = renderHook(() => usePasswordReset());

      // Act - First call fails
      await act(async () => {
        await result.current.requestCode(email);
      });

      expect(result.current.error).toBe('First error');

      // Act - Second call succeeds
      await act(async () => {
        await result.current.requestCode(email);
      });

      // Assert
      expect(result.current.error).toBeNull();
    });

    it('should return true on successful request', async () => {
      // Arrange
      const email = 'test@example.com';
      vi.mocked(authService.requestPasswordReset).mockResolvedValueOnce();

      const { result } = renderHook(() => usePasswordReset());

      // Act
      let requestResult: boolean = false;
      await act(async () => {
        requestResult = await result.current.requestCode(email);
      });

      // Assert
      expect(requestResult).toBe(true);
    });
  });

  describe('requestCode - 確認コード送信失敗フロー', () => {
    it('should set error message when authService throws Error', async () => {
      // Arrange
      const email = 'test@example.com';
      const errorMessage = 'リクエスト回数が上限に達しました。しばらくしてから再度お試しください';
      vi.mocked(authService.requestPasswordReset).mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => usePasswordReset());

      // Act
      await act(async () => {
        await result.current.requestCode(email);
      });

      // Assert
      expect(result.current.error).toBe(errorMessage);
    });

    it('should set default error message when authService throws non-Error', async () => {
      // Arrange
      const email = 'test@example.com';
      vi.mocked(authService.requestPasswordReset).mockRejectedValueOnce('String error');

      const { result } = renderHook(() => usePasswordReset());

      // Act
      await act(async () => {
        await result.current.requestCode(email);
      });

      // Assert
      expect(result.current.error).toBe('確認コードの送信に失敗しました');
    });

    it('should set isLoading to false after failed request', async () => {
      // Arrange
      const email = 'test@example.com';
      vi.mocked(authService.requestPasswordReset).mockRejectedValueOnce(
        new Error('Request failed')
      );

      const { result } = renderHook(() => usePasswordReset());

      // Act
      await act(async () => {
        await result.current.requestCode(email);
      });

      // Assert
      expect(result.current.isLoading).toBe(false);
    });

    it('should clear successMessage on failed request', async () => {
      // Arrange
      const email = 'test@example.com';
      vi.mocked(authService.requestPasswordReset)
        .mockResolvedValueOnce()
        .mockRejectedValueOnce(new Error('Request failed'));

      const { result } = renderHook(() => usePasswordReset());

      // Act - First call succeeds
      await act(async () => {
        await result.current.requestCode(email);
      });

      expect(result.current.successMessage).toBe(
        '確認コードをメールで送信しました。メールをご確認ください。'
      );

      // Act - Second call fails
      await act(async () => {
        await result.current.requestCode(email);
      });

      // Assert
      expect(result.current.successMessage).toBeNull();
    });

    it('should return false on failed request', async () => {
      // Arrange
      const email = 'test@example.com';
      vi.mocked(authService.requestPasswordReset).mockRejectedValueOnce(
        new Error('Request failed')
      );

      const { result } = renderHook(() => usePasswordReset());

      // Act
      let requestResult: boolean = true;
      await act(async () => {
        requestResult = await result.current.requestCode(email);
      });

      // Assert
      expect(requestResult).toBe(false);
    });
  });

  describe('confirmReset - パスワードリセット確認成功フロー', () => {
    it('should call authService.confirmPasswordReset with correct parameters', async () => {
      // Arrange
      const email = 'test@example.com';
      const confirmationCode = '123456';
      const newPassword = 'NewPassword123';
      vi.mocked(authService.confirmPasswordReset).mockResolvedValueOnce();

      const { result } = renderHook(() => usePasswordReset());

      // Act
      let confirmResult: boolean = false;
      await act(async () => {
        confirmResult = await result.current.confirmReset(email, confirmationCode, newPassword);
      });

      // Assert
      expect(authService.confirmPasswordReset).toHaveBeenCalledWith(
        email,
        confirmationCode,
        newPassword
      );
      expect(authService.confirmPasswordReset).toHaveBeenCalledTimes(1);
      expect(confirmResult).toBe(true);
    });

    it('should set isLoading to true during confirm', async () => {
      // Arrange
      const email = 'test@example.com';
      const confirmationCode = '123456';
      const newPassword = 'NewPassword123';
      let resolveConfirm: () => void;
      const confirmPromise = new Promise<void>((resolve) => {
        resolveConfirm = resolve;
      });
      vi.mocked(authService.confirmPasswordReset).mockReturnValueOnce(confirmPromise);

      const { result } = renderHook(() => usePasswordReset());

      // Act - Start the confirm without awaiting
      act(() => {
        result.current.confirmReset(email, confirmationCode, newPassword);
      });

      // Assert - isLoading should be true during confirm
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Cleanup - resolve the promise
      await act(async () => {
        resolveConfirm!();
        await confirmPromise;
      });
    });

    it('should set isLoading to false after successful confirm', async () => {
      // Arrange
      const email = 'test@example.com';
      const confirmationCode = '123456';
      const newPassword = 'NewPassword123';
      vi.mocked(authService.confirmPasswordReset).mockResolvedValueOnce();

      const { result } = renderHook(() => usePasswordReset());

      // Act
      await act(async () => {
        await result.current.confirmReset(email, confirmationCode, newPassword);
      });

      // Assert
      expect(result.current.isLoading).toBe(false);
    });

    it('should set successMessage on successful confirm', async () => {
      // Arrange
      const email = 'test@example.com';
      const confirmationCode = '123456';
      const newPassword = 'NewPassword123';
      vi.mocked(authService.confirmPasswordReset).mockResolvedValueOnce();

      const { result } = renderHook(() => usePasswordReset());

      // Act
      await act(async () => {
        await result.current.confirmReset(email, confirmationCode, newPassword);
      });

      // Assert
      expect(result.current.successMessage).toBe(
        'パスワードがリセットされました。新しいパスワードでログインしてください。'
      );
    });

    it('should clear error on successful confirm', async () => {
      // Arrange
      const email = 'test@example.com';
      const confirmationCode = '123456';
      const newPassword = 'NewPassword123';
      vi.mocked(authService.confirmPasswordReset)
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce();

      const { result } = renderHook(() => usePasswordReset());

      // Act - First call fails
      await act(async () => {
        await result.current.confirmReset(email, confirmationCode, newPassword);
      });

      expect(result.current.error).toBe('First error');

      // Act - Second call succeeds
      await act(async () => {
        await result.current.confirmReset(email, confirmationCode, newPassword);
      });

      // Assert
      expect(result.current.error).toBeNull();
    });

    it('should return true on successful confirm', async () => {
      // Arrange
      const email = 'test@example.com';
      const confirmationCode = '123456';
      const newPassword = 'NewPassword123';
      vi.mocked(authService.confirmPasswordReset).mockResolvedValueOnce();

      const { result } = renderHook(() => usePasswordReset());

      // Act
      let confirmResult: boolean = false;
      await act(async () => {
        confirmResult = await result.current.confirmReset(email, confirmationCode, newPassword);
      });

      // Assert
      expect(confirmResult).toBe(true);
    });
  });

  describe('confirmReset - パスワードリセット確認失敗フロー', () => {
    it('should set error message when authService throws Error', async () => {
      // Arrange
      const email = 'test@example.com';
      const confirmationCode = '123456';
      const newPassword = 'NewPassword123';
      const errorMessage = '確認コードが無効または期限切れです';
      vi.mocked(authService.confirmPasswordReset).mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => usePasswordReset());

      // Act
      await act(async () => {
        await result.current.confirmReset(email, confirmationCode, newPassword);
      });

      // Assert
      expect(result.current.error).toBe(errorMessage);
    });

    it('should set default error message when authService throws non-Error', async () => {
      // Arrange
      const email = 'test@example.com';
      const confirmationCode = '123456';
      const newPassword = 'NewPassword123';
      vi.mocked(authService.confirmPasswordReset).mockRejectedValueOnce('String error');

      const { result } = renderHook(() => usePasswordReset());

      // Act
      await act(async () => {
        await result.current.confirmReset(email, confirmationCode, newPassword);
      });

      // Assert
      expect(result.current.error).toBe('パスワードのリセットに失敗しました');
    });

    it('should set isLoading to false after failed confirm', async () => {
      // Arrange
      const email = 'test@example.com';
      const confirmationCode = '123456';
      const newPassword = 'NewPassword123';
      vi.mocked(authService.confirmPasswordReset).mockRejectedValueOnce(
        new Error('Confirm failed')
      );

      const { result } = renderHook(() => usePasswordReset());

      // Act
      await act(async () => {
        await result.current.confirmReset(email, confirmationCode, newPassword);
      });

      // Assert
      expect(result.current.isLoading).toBe(false);
    });

    it('should clear successMessage on failed confirm', async () => {
      // Arrange
      const email = 'test@example.com';
      const confirmationCode = '123456';
      const newPassword = 'NewPassword123';
      vi.mocked(authService.confirmPasswordReset)
        .mockResolvedValueOnce()
        .mockRejectedValueOnce(new Error('Confirm failed'));

      const { result } = renderHook(() => usePasswordReset());

      // Act - First call succeeds
      await act(async () => {
        await result.current.confirmReset(email, confirmationCode, newPassword);
      });

      expect(result.current.successMessage).toBe(
        'パスワードがリセットされました。新しいパスワードでログインしてください。'
      );

      // Act - Second call fails
      await act(async () => {
        await result.current.confirmReset(email, confirmationCode, newPassword);
      });

      // Assert
      expect(result.current.successMessage).toBeNull();
    });

    it('should return false on failed confirm', async () => {
      // Arrange
      const email = 'test@example.com';
      const confirmationCode = '123456';
      const newPassword = 'NewPassword123';
      vi.mocked(authService.confirmPasswordReset).mockRejectedValueOnce(
        new Error('Confirm failed')
      );

      const { result } = renderHook(() => usePasswordReset());

      // Act
      let confirmResult: boolean = true;
      await act(async () => {
        confirmResult = await result.current.confirmReset(email, confirmationCode, newPassword);
      });

      // Assert
      expect(confirmResult).toBe(false);
    });
  });

  describe('resendCode - 確認コード再送信フロー', () => {
    it('should call authService.requestPasswordReset with correct email', async () => {
      // Arrange
      const email = 'test@example.com';
      vi.mocked(authService.requestPasswordReset).mockResolvedValueOnce();

      const { result } = renderHook(() => usePasswordReset());

      // Act
      let resendResult: boolean = false;
      await act(async () => {
        resendResult = await result.current.resendCode(email);
      });

      // Assert
      expect(authService.requestPasswordReset).toHaveBeenCalledWith(email);
      expect(authService.requestPasswordReset).toHaveBeenCalledTimes(1);
      expect(resendResult).toBe(true);
    });

    it('should set successMessage on successful resend', async () => {
      // Arrange
      const email = 'test@example.com';
      vi.mocked(authService.requestPasswordReset).mockResolvedValueOnce();

      const { result } = renderHook(() => usePasswordReset());

      // Act
      await act(async () => {
        await result.current.resendCode(email);
      });

      // Assert
      expect(result.current.successMessage).toBe('確認コードを再送信しました');
    });

    it('should clear error on successful resend', async () => {
      // Arrange
      const email = 'test@example.com';
      vi.mocked(authService.requestPasswordReset)
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce();

      const { result } = renderHook(() => usePasswordReset());

      // Act - First call fails
      await act(async () => {
        await result.current.resendCode(email);
      });

      expect(result.current.error).toBe('First error');

      // Act - Second call succeeds
      await act(async () => {
        await result.current.resendCode(email);
      });

      // Assert
      expect(result.current.error).toBeNull();
    });

    it('should return true on successful resend', async () => {
      // Arrange
      const email = 'test@example.com';
      vi.mocked(authService.requestPasswordReset).mockResolvedValueOnce();

      const { result } = renderHook(() => usePasswordReset());

      // Act
      let resendResult: boolean = false;
      await act(async () => {
        resendResult = await result.current.resendCode(email);
      });

      // Assert
      expect(resendResult).toBe(true);
    });

    it('should set error message when authService throws Error', async () => {
      // Arrange
      const email = 'test@example.com';
      const errorMessage = 'リクエスト回数が上限に達しました。しばらくしてから再度お試しください';
      vi.mocked(authService.requestPasswordReset).mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => usePasswordReset());

      // Act
      await act(async () => {
        await result.current.resendCode(email);
      });

      // Assert
      expect(result.current.error).toBe(errorMessage);
    });

    it('should set default error message when authService throws non-Error', async () => {
      // Arrange
      const email = 'test@example.com';
      vi.mocked(authService.requestPasswordReset).mockRejectedValueOnce('String error');

      const { result } = renderHook(() => usePasswordReset());

      // Act
      await act(async () => {
        await result.current.resendCode(email);
      });

      // Assert
      expect(result.current.error).toBe('確認コードの再送信に失敗しました');
    });

    it('should clear successMessage on failed resend', async () => {
      // Arrange
      const email = 'test@example.com';
      vi.mocked(authService.requestPasswordReset)
        .mockResolvedValueOnce()
        .mockRejectedValueOnce(new Error('Resend failed'));

      const { result } = renderHook(() => usePasswordReset());

      // Act - First call succeeds
      await act(async () => {
        await result.current.resendCode(email);
      });

      expect(result.current.successMessage).toBe('確認コードを再送信しました');

      // Act - Second call fails
      await act(async () => {
        await result.current.resendCode(email);
      });

      // Assert
      expect(result.current.successMessage).toBeNull();
    });

    it('should return false on failed resend', async () => {
      // Arrange
      const email = 'test@example.com';
      vi.mocked(authService.requestPasswordReset).mockRejectedValueOnce(new Error('Resend failed'));

      const { result } = renderHook(() => usePasswordReset());

      // Act
      let resendResult: boolean = true;
      await act(async () => {
        resendResult = await result.current.resendCode(email);
      });

      // Assert
      expect(resendResult).toBe(false);
    });

    it('should not set isLoading during resend', async () => {
      // Arrange
      const email = 'test@example.com';
      vi.mocked(authService.requestPasswordReset).mockResolvedValueOnce();

      const { result } = renderHook(() => usePasswordReset());

      // Act
      await act(async () => {
        await result.current.resendCode(email);
      });

      // Assert - resendCode does not set isLoading
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('状態管理', () => {
    it('should clear previous error when starting new requestCode', async () => {
      // Arrange
      const email = 'test@example.com';
      vi.mocked(authService.requestPasswordReset)
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce();

      const { result } = renderHook(() => usePasswordReset());

      // Act - First call fails
      await act(async () => {
        await result.current.requestCode(email);
      });

      expect(result.current.error).toBe('First error');

      // Act - Second call starts (should clear error immediately)
      let resolveRequest: () => void;
      const requestPromise = new Promise<void>((resolve) => {
        resolveRequest = resolve;
      });
      vi.mocked(authService.requestPasswordReset).mockReturnValueOnce(requestPromise);

      act(() => {
        result.current.requestCode(email);
      });

      // Assert - error should be cleared when new request starts
      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });

      // Cleanup
      await act(async () => {
        resolveRequest!();
        await requestPromise;
      });
    });

    it('should clear previous successMessage when starting new requestCode', async () => {
      // Arrange
      const email = 'test@example.com';
      vi.mocked(authService.requestPasswordReset).mockResolvedValueOnce();

      const { result } = renderHook(() => usePasswordReset());

      // Act - First call succeeds
      await act(async () => {
        await result.current.requestCode(email);
      });

      expect(result.current.successMessage).toBe(
        '確認コードをメールで送信しました。メールをご確認ください。'
      );

      // Act - Second call starts (should clear successMessage immediately)
      let resolveRequest: () => void;
      const requestPromise = new Promise<void>((resolve) => {
        resolveRequest = resolve;
      });
      vi.mocked(authService.requestPasswordReset).mockReturnValueOnce(requestPromise);

      act(() => {
        result.current.requestCode(email);
      });

      // Assert - successMessage should be cleared when new request starts
      await waitFor(() => {
        expect(result.current.successMessage).toBeNull();
      });

      // Cleanup
      await act(async () => {
        resolveRequest!();
        await requestPromise;
      });
    });

    it('should clear previous error when starting new confirmReset', async () => {
      // Arrange
      const email = 'test@example.com';
      const confirmationCode = '123456';
      const newPassword = 'NewPassword123';
      vi.mocked(authService.confirmPasswordReset)
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce();

      const { result } = renderHook(() => usePasswordReset());

      // Act - First call fails
      await act(async () => {
        await result.current.confirmReset(email, confirmationCode, newPassword);
      });

      expect(result.current.error).toBe('First error');

      // Act - Second call starts (should clear error immediately)
      let resolveConfirm: () => void;
      const confirmPromise = new Promise<void>((resolve) => {
        resolveConfirm = resolve;
      });
      vi.mocked(authService.confirmPasswordReset).mockReturnValueOnce(confirmPromise);

      act(() => {
        result.current.confirmReset(email, confirmationCode, newPassword);
      });

      // Assert - error should be cleared when new confirm starts
      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });

      // Cleanup
      await act(async () => {
        resolveConfirm!();
        await confirmPromise;
      });
    });

    it('should clear previous successMessage when starting new confirmReset', async () => {
      // Arrange
      const email = 'test@example.com';
      const confirmationCode = '123456';
      const newPassword = 'NewPassword123';
      vi.mocked(authService.confirmPasswordReset).mockResolvedValueOnce();

      const { result } = renderHook(() => usePasswordReset());

      // Act - First call succeeds
      await act(async () => {
        await result.current.confirmReset(email, confirmationCode, newPassword);
      });

      expect(result.current.successMessage).toBe(
        'パスワードがリセットされました。新しいパスワードでログインしてください。'
      );

      // Act - Second call starts (should clear successMessage immediately)
      let resolveConfirm: () => void;
      const confirmPromise = new Promise<void>((resolve) => {
        resolveConfirm = resolve;
      });
      vi.mocked(authService.confirmPasswordReset).mockReturnValueOnce(confirmPromise);

      act(() => {
        result.current.confirmReset(email, confirmationCode, newPassword);
      });

      // Assert - successMessage should be cleared when new confirm starts
      await waitFor(() => {
        expect(result.current.successMessage).toBeNull();
      });

      // Cleanup
      await act(async () => {
        resolveConfirm!();
        await confirmPromise;
      });
    });
  });
});
