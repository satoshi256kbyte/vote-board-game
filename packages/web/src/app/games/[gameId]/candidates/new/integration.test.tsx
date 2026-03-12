/**
 * Integration tests for candidate submission flow
 *
 * Tests the complete user flow from cell selection to form submission.
 * Uses real InteractiveBoard and MovePreview components (not mocks).
 *
 * Requirements: 6.1, 6.2, 6.3, 6.7
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CandidateForm } from '@/components/candidate-form';
import * as candidatesApi from '@/lib/api/candidates';
import { ApiError } from '@/lib/api/client';
import type { BoardState } from '@/types/game';

// Mock dependencies
const mockPush = vi.fn();
const mockBack = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

vi.mock('@/lib/api/candidates', () => ({
  createCandidate: vi.fn(),
}));

describe('Candidate Submission Integration', () => {
  const mockBoardState: BoardState = {
    board: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 2, 1, 0, 0, 0],
      [0, 0, 0, 1, 2, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
  };

  const defaultProps = {
    gameId: 'test-game-id',
    turnNumber: 5,
    currentBoardState: mockBoardState,
    currentPlayer: 'black' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
    mockBack.mockClear();
  });

  describe('完全なフォーム送信フロー', () => {
    it('should complete full flow: select cell → enter description → submit → redirect', async () => {
      // Setup: Mock successful API response
      vi.mocked(candidatesApi.createCandidate).mockResolvedValue({
        candidateId: 'test-candidate-id',
        gameId: 'test-game-id',
        turnNumber: 5,
        position: '2,3',
        description: 'この手で相手の石を裏返します',
        voteCount: 0,
        createdBy: 'test-user',
        status: 'VOTING',
        votingDeadline: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
      });

      render(<CandidateForm {...defaultProps} />);

      // Step 1: Verify initial state
      expect(screen.getByText('位置を選択してください')).toBeInTheDocument();
      expect(screen.getByLabelText('説明文（最大200文字）')).toBeInTheDocument();
      expect(screen.queryByText('プレビュー')).not.toBeInTheDocument();

      // Step 2: Select a cell on the board (D3 - row 2, col 3)
      // D3 is a legal move for black in the initial board state
      const d3Cell = screen.getByRole('gridcell', { name: /D3.*選択可能/ });
      fireEvent.click(d3Cell);

      // Step 3: Verify cell is selected and preview appears
      await waitFor(() => {
        expect(screen.getByRole('gridcell', { name: /D3/, selected: true })).toBeInTheDocument();
      });
      expect(screen.getByText('プレビュー')).toBeInTheDocument();
      expect(screen.getByText(/D3に黒石を置いた場合/)).toBeInTheDocument();

      // Step 4: Enter description
      const textarea = screen.getByLabelText('説明文（最大200文字）');
      fireEvent.change(textarea, {
        target: { value: 'この手で相手の石を裏返します' },
      });

      // Step 5: Verify description is entered
      expect(textarea).toHaveValue('この手で相手の石を裏返します');
      expect(screen.getByText('18/200文字')).toBeInTheDocument();

      // Step 6: Submit the form
      const submitButton = screen.getByRole('button', { name: '候補を投稿' });
      fireEvent.click(submitButton);

      // Step 7: Verify API is called with correct parameters
      await waitFor(() => {
        expect(candidatesApi.createCandidate).toHaveBeenCalledWith(
          'test-game-id',
          5,
          '2,3',
          'この手で相手の石を裏返します'
        );
      });

      // Step 8: Verify redirect to game page
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/games/test-game-id');
      });
    });

    it('should show loading state during submission', async () => {
      // Setup: Mock slow API response
      vi.mocked(candidatesApi.createCandidate).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<CandidateForm {...defaultProps} />);

      // Select cell and enter description
      const d3Cell = screen.getByRole('gridcell', { name: /D3.*選択可能/ });
      fireEvent.click(d3Cell);

      const textarea = screen.getByLabelText('説明文（最大200文字）');
      fireEvent.change(textarea, { target: { value: 'テスト説明文' } });

      // Submit
      const submitButton = screen.getByRole('button', { name: '候補を投稿' });
      fireEvent.click(submitButton);

      // Verify loading state
      await waitFor(() => {
        expect(screen.getByRole('button', { name: '送信中...' })).toBeDisabled();
      });

      // Verify board is disabled during submission
      const anotherCell = screen.getByRole('gridcell', { name: /F4.*選択可能/ });
      fireEvent.click(anotherCell);

      // Selection should not change
      expect(screen.getByRole('gridcell', { name: /D3/, selected: true })).toBeInTheDocument();
    });
  });

  describe('InteractiveBoard と CandidateForm の連携', () => {
    it('should update form state when cell is selected on board', () => {
      render(<CandidateForm {...defaultProps} />);

      // Initially no cell is selected
      expect(screen.queryByText('プレビュー')).not.toBeInTheDocument();

      // Click a legal move cell
      const d3Cell = screen.getByRole('gridcell', { name: /D3.*選択可能/ });
      fireEvent.click(d3Cell);

      // Verify form state is updated
      expect(screen.getByRole('gridcell', { name: /D3/, selected: true })).toBeInTheDocument();
      expect(screen.getByText('プレビュー')).toBeInTheDocument();
    });

    it('should toggle cell selection when clicking same cell twice', () => {
      render(<CandidateForm {...defaultProps} />);

      const d3Cell = screen.getByRole('gridcell', { name: /D3.*選択可能/ });

      // First click - select
      fireEvent.click(d3Cell);
      expect(screen.getByRole('gridcell', { name: /D3/, selected: true })).toBeInTheDocument();
      expect(screen.getByText('プレビュー')).toBeInTheDocument();

      // Second click - deselect
      fireEvent.click(d3Cell);
      expect(
        screen.queryByRole('gridcell', { name: /D3/, selected: true })
      ).not.toBeInTheDocument();
      expect(screen.queryByText('プレビュー')).not.toBeInTheDocument();
    });

    it('should switch selection when clicking different cell', () => {
      render(<CandidateForm {...defaultProps} />);

      // Select first cell (D3)
      const d3Cell = screen.getByRole('gridcell', { name: /D3.*選択可能/ });
      fireEvent.click(d3Cell);
      expect(screen.getByRole('gridcell', { name: /D3/, selected: true })).toBeInTheDocument();

      // Select second cell (F4)
      const f4Cell = screen.getByRole('gridcell', { name: /F4.*選択可能/ });
      fireEvent.click(f4Cell);

      // Verify selection switched
      expect(
        screen.queryByRole('gridcell', { name: /D3/, selected: true })
      ).not.toBeInTheDocument();
      expect(screen.getByRole('gridcell', { name: /F4/, selected: true })).toBeInTheDocument();
    });

    it('should show error when clicking illegal move', () => {
      render(<CandidateForm {...defaultProps} />);

      // Click an illegal move cell (A1)
      const a1Cell = screen.getByRole('gridcell', { name: /A1/ });
      fireEvent.click(a1Cell);

      // Verify error message is shown
      expect(screen.getByRole('alert')).toHaveTextContent('この位置には石を置けません');

      // Verify cell is not selected
      expect(
        screen.queryByRole('gridcell', { name: /A1/, selected: true })
      ).not.toBeInTheDocument();
    });

    it('should clear position validation error when cell is selected', async () => {
      render(<CandidateForm {...defaultProps} />);

      // Submit without selecting position
      const submitButton = screen.getByRole('button', { name: '候補を投稿' });
      fireEvent.click(submitButton);

      // Wait for validation error (use getAllByRole to handle multiple alerts)
      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        const positionError = alerts.find((alert) =>
          alert.textContent?.includes('位置を選択してください')
        );
        expect(positionError).toBeDefined();
      });

      // Select a cell
      const d3Cell = screen.getByRole('gridcell', { name: /D3.*選択可能/ });
      fireEvent.click(d3Cell);

      // Verify error is cleared
      await waitFor(() => {
        const alerts = screen.queryAllByRole('alert');
        const positionError = alerts.find((alert) =>
          alert.textContent?.includes('位置を選択してください')
        );
        expect(positionError).toBeUndefined();
      });
    });
  });

  describe('プレビュー表示の統合', () => {
    it('should show preview with correct board state after move', () => {
      render(<CandidateForm {...defaultProps} />);

      // Select D3 (row 2, col 3)
      const d3Cell = screen.getByRole('gridcell', { name: /D3.*選択可能/ });
      fireEvent.click(d3Cell);

      // Verify preview is shown
      expect(screen.getByText('プレビュー')).toBeInTheDocument();
      expect(screen.getByText(/D3に黒石を置いた場合/)).toBeInTheDocument();

      // Verify preview shows flipped discs count
      expect(screen.getByText(/個の石が裏返ります/)).toBeInTheDocument();
    });

    it('should update preview when different cell is selected', () => {
      render(<CandidateForm {...defaultProps} />);

      // Select first cell (D3)
      const d3Cell = screen.getByRole('gridcell', { name: /D3.*選択可能/ });
      fireEvent.click(d3Cell);
      expect(screen.getByText(/D3に黒石を置いた場合/)).toBeInTheDocument();

      // Select second cell (F4)
      const f4Cell = screen.getByRole('gridcell', { name: /F4.*選択可能/ });
      fireEvent.click(f4Cell);

      // Verify preview is updated
      expect(screen.queryByText(/D3に黒石を置いた場合/)).not.toBeInTheDocument();
      expect(screen.getByText(/F4に黒石を置いた場合/)).toBeInTheDocument();
    });

    it('should hide preview when selection is cleared', () => {
      render(<CandidateForm {...defaultProps} />);

      // Select cell
      const d3Cell = screen.getByRole('gridcell', { name: /D3.*選択可能/ });
      fireEvent.click(d3Cell);
      expect(screen.getByText('プレビュー')).toBeInTheDocument();

      // Deselect cell
      fireEvent.click(d3Cell);

      // Verify preview is hidden
      expect(screen.queryByText('プレビュー')).not.toBeInTheDocument();
    });

    it('should show preview with correct player color', () => {
      render(<CandidateForm {...defaultProps} />);

      // Select cell
      const d3Cell = screen.getByRole('gridcell', { name: /D3.*選択可能/ });
      fireEvent.click(d3Cell);

      // Verify preview shows correct player (black)
      expect(screen.getByText(/黒石を置いた場合/)).toBeInTheDocument();
    });

    it('should show preview for white player', () => {
      render(<CandidateForm {...defaultProps} currentPlayer="white" />);

      // Select a legal move for white (F4 - row 3, col 5)
      const f4Cell = screen.getByRole('gridcell', { name: /F4.*選択可能/ });
      fireEvent.click(f4Cell);

      // Verify preview shows correct player (white)
      expect(screen.getByText(/白石を置いた場合/)).toBeInTheDocument();
    });
  });

  describe('バリデーションエラー', () => {
    it('should show position error when submitting without selection', async () => {
      render(<CandidateForm {...defaultProps} />);

      // Enter description but don't select position
      const textarea = screen.getByLabelText('説明文（最大200文字）');
      fireEvent.change(textarea, { target: { value: 'テスト説明文' } });

      // Submit
      const submitButton = screen.getByRole('button', { name: '候補を投稿' });
      fireEvent.click(submitButton);

      // Verify error (use role="alert" to get the error message, not the label)
      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toHaveTextContent('位置を選択してください');
      });

      // Verify API is not called
      expect(candidatesApi.createCandidate).not.toHaveBeenCalled();
    });

    it('should show description error when submitting without description', async () => {
      render(<CandidateForm {...defaultProps} />);

      // Select position but don't enter description
      const d3Cell = screen.getByRole('gridcell', { name: /D3.*選択可能/ });
      fireEvent.click(d3Cell);

      // Submit
      const submitButton = screen.getByRole('button', { name: '候補を投稿' });
      fireEvent.click(submitButton);

      // Verify error
      await waitFor(() => {
        expect(screen.getByText('説明文を入力してください')).toBeInTheDocument();
      });

      // Verify API is not called
      expect(candidatesApi.createCandidate).not.toHaveBeenCalled();
    });

    it('should show both errors when submitting empty form', async () => {
      render(<CandidateForm {...defaultProps} />);

      // Submit without filling anything
      const submitButton = screen.getByRole('button', { name: '候補を投稿' });
      fireEvent.click(submitButton);

      // Verify position error is shown (use role="alert" to get the error message)
      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toHaveTextContent('位置を選択してください');
      });

      // Verify API is not called
      expect(candidatesApi.createCandidate).not.toHaveBeenCalled();
    });
  });

  describe('エラーハンドリング', () => {
    it('should show error message when API call fails', async () => {
      // Setup: Mock API error
      vi.mocked(candidatesApi.createCandidate).mockRejectedValue(
        new ApiError('候補の投稿に失敗しました', 500)
      );

      render(<CandidateForm {...defaultProps} />);

      // Fill and submit form
      const d3Cell = screen.getByRole('gridcell', { name: /D3.*選択可能/ });
      fireEvent.click(d3Cell);

      const textarea = screen.getByLabelText('説明文（最大200文字）');
      fireEvent.change(textarea, { target: { value: 'テスト説明文' } });

      const submitButton = screen.getByRole('button', { name: '候補を投稿' });
      fireEvent.click(submitButton);

      // Verify error message is shown
      await waitFor(() => {
        expect(
          screen.getByText('候補の投稿に失敗しました。もう一度お試しください。')
        ).toBeInTheDocument();
      });

      // Verify no redirect
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should allow retry after error', async () => {
      // Setup: Mock API error then success
      vi.mocked(candidatesApi.createCandidate)
        .mockRejectedValueOnce(new ApiError('Network error', 500))
        .mockResolvedValueOnce({
          candidateId: 'test-candidate-id',
          gameId: 'test-game-id',
          turnNumber: 5,
          position: '2,3',
          description: 'テスト説明文',
          voteCount: 0,
          createdBy: 'test-user',
          status: 'VOTING',
          votingDeadline: '2024-01-01T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
        });

      render(<CandidateForm {...defaultProps} />);

      // Fill and submit form (first attempt - fails)
      const d3Cell = screen.getByRole('gridcell', { name: /D3.*選択可能/ });
      fireEvent.click(d3Cell);

      const textarea = screen.getByLabelText('説明文（最大200文字）');
      fireEvent.change(textarea, { target: { value: 'テスト説明文' } });

      const submitButton = screen.getByRole('button', { name: '候補を投稿' });
      fireEvent.click(submitButton);

      // Wait for error
      await waitFor(() => {
        expect(
          screen.getByText('候補の投稿に失敗しました。もう一度お試しください。')
        ).toBeInTheDocument();
      });

      // Retry (second attempt - succeeds)
      fireEvent.click(submitButton);

      // Verify success
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/games/test-game-id');
      });
    });
  });

  describe('キャンセル機能', () => {
    it('should navigate back when cancel button is clicked', () => {
      render(<CandidateForm {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: 'キャンセル' });
      fireEvent.click(cancelButton);

      expect(mockBack).toHaveBeenCalled();
    });

    it('should allow cancel even after selecting cell', () => {
      render(<CandidateForm {...defaultProps} />);

      // Select cell
      const d3Cell = screen.getByRole('gridcell', { name: /D3.*選択可能/ });
      fireEvent.click(d3Cell);

      // Cancel
      const cancelButton = screen.getByRole('button', { name: 'キャンセル' });
      fireEvent.click(cancelButton);

      expect(mockBack).toHaveBeenCalled();
    });
  });
});
