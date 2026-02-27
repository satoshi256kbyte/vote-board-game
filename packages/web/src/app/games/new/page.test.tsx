/**
 * Tests for Game Create Screen
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import NewGamePage from './page';
import { useAuth } from '@/lib/hooks/use-auth';
import * as apiClient from '@/lib/api/client';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  createGame: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      public statusCode: number
    ) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

describe('NewGamePage', () => {
  const mockPush = vi.fn();
  const mockBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({
      push: mockPush,
      back: mockBack,
    });
  });

  describe('Authentication', () => {
    it('should redirect to login when not authenticated', () => {
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
      });

      render(<NewGamePage />);

      expect(mockPush).toHaveBeenCalledWith('/login?redirect=/games/new');
    });

    it('should show loading state while checking authentication', () => {
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
      });

      render(<NewGamePage />);

      expect(screen.queryByText('新しい対局を作成')).not.toBeInTheDocument();
    });

    it('should render form when authenticated', () => {
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
      });

      render(<NewGamePage />);

      expect(screen.getByText('新しい対局を作成')).toBeInTheDocument();
      expect(screen.getByLabelText('ゲームの種類')).toBeInTheDocument();
    });
  });

  describe('Form Fields', () => {
    beforeEach(() => {
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
      });
    });

    it('should display game type selection with only OTHELLO enabled', () => {
      render(<NewGamePage />);

      const gameTypeSelect = screen.getByLabelText('ゲームの種類') as HTMLSelectElement;
      expect(gameTypeSelect).toBeDisabled();
      expect(gameTypeSelect.value).toBe('OTHELLO');
      expect(screen.getByText('MVPではオセロのみ対応しています')).toBeInTheDocument();
    });

    it('should display game mode selection with only AI_VS_COLLECTIVE enabled', () => {
      render(<NewGamePage />);

      const gameModeSelect = screen.getByLabelText('対局モード') as HTMLSelectElement;
      expect(gameModeSelect).toBeDisabled();
      expect(gameModeSelect.value).toBe('AI_VS_COLLECTIVE');
      expect(screen.getByText('MVPではAI vs 集合知のみ対応しています')).toBeInTheDocument();
    });

    it('should allow selecting AI side (BLACK or WHITE)', () => {
      render(<NewGamePage />);

      const blackRadio = screen.getByLabelText(/黒（先手）/) as HTMLInputElement;
      const whiteRadio = screen.getByLabelText(/白（後手）/) as HTMLInputElement;

      expect(blackRadio).toBeChecked();
      expect(whiteRadio).not.toBeChecked();

      fireEvent.click(whiteRadio);

      expect(blackRadio).not.toBeChecked();
      expect(whiteRadio).toBeChecked();
    });

    it('should have cancel and submit buttons', () => {
      render(<NewGamePage />);

      expect(screen.getByText('キャンセル')).toBeInTheDocument();
      expect(screen.getByText('対局を作成')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    beforeEach(() => {
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
      });
    });

    it('should create game and redirect on success', async () => {
      const mockGame = {
        gameId: 'test-game-id',
        gameType: 'OTHELLO' as const,
        status: 'ACTIVE' as const,
        aiSide: 'BLACK' as const,
        currentTurn: 0,
        boardState: { board: [] },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      vi.spyOn(apiClient, 'createGame').mockResolvedValue(mockGame);

      render(<NewGamePage />);

      const submitButton = screen.getByText('対局を作成');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(apiClient.createGame).toHaveBeenCalledWith({
          gameType: 'OTHELLO',
          aiSide: 'BLACK',
        });
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/games/test-game-id');
      });
    });

    it('should submit with selected AI side', async () => {
      const mockGame = {
        gameId: 'test-game-id',
        gameType: 'OTHELLO' as const,
        status: 'ACTIVE' as const,
        aiSide: 'WHITE' as const,
        currentTurn: 0,
        boardState: { board: [] },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      vi.spyOn(apiClient, 'createGame').mockResolvedValue(mockGame);

      render(<NewGamePage />);

      // Select WHITE
      const whiteRadio = screen.getByLabelText(/白（後手）/);
      fireEvent.click(whiteRadio);

      const submitButton = screen.getByText('対局を作成');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(apiClient.createGame).toHaveBeenCalledWith({
          gameType: 'OTHELLO',
          aiSide: 'WHITE',
        });
      });
    });

    it('should show loading state during submission', async () => {
      vi.spyOn(apiClient, 'createGame').mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<NewGamePage />);

      const submitButton = screen.getByText('対局を作成');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('作成中...')).toBeInTheDocument();
      });
    });

    it('should disable buttons during submission', async () => {
      vi.spyOn(apiClient, 'createGame').mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<NewGamePage />);

      const submitButton = screen.getByText('対局を作成') as HTMLButtonElement;
      const cancelButton = screen.getByText('キャンセル') as HTMLButtonElement;

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
        expect(cancelButton).toBeDisabled();
      });
    });

    it('should display error message on API error', async () => {
      const error = new apiClient.ApiError('バリデーションエラー', 400);
      vi.spyOn(apiClient, 'createGame').mockRejectedValue(error);

      render(<NewGamePage />);

      const submitButton = screen.getByText('対局を作成');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('バリデーションエラー')).toBeInTheDocument();
      });
    });

    it('should display generic error message on unknown error', async () => {
      vi.spyOn(apiClient, 'createGame').mockRejectedValue(new Error('Network error'));

      render(<NewGamePage />);

      const submitButton = screen.getByText('対局を作成');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should re-enable submit button after error', async () => {
      const error = new apiClient.ApiError('エラー', 500);
      vi.spyOn(apiClient, 'createGame').mockRejectedValue(error);

      render(<NewGamePage />);

      const submitButton = screen.getByText('対局を作成') as HTMLButtonElement;
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('エラー')).toBeInTheDocument();
      });

      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Cancel Button', () => {
    beforeEach(() => {
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
      });
    });

    it('should go back when cancel button is clicked', () => {
      render(<NewGamePage />);

      const cancelButton = screen.getByText('キャンセル');
      fireEvent.click(cancelButton);

      expect(mockBack).toHaveBeenCalled();
    });
  });

  describe('Responsive Design', () => {
    beforeEach(() => {
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
      });
    });

    it('should have responsive container classes', () => {
      const { container } = render(<NewGamePage />);

      const innerDiv = container.querySelector('main > div');
      expect(innerDiv?.className).toContain('px-4');
      expect(innerDiv?.className).toContain('sm:px-6');
      expect(innerDiv?.className).toContain('lg:px-8');
    });
  });
});
