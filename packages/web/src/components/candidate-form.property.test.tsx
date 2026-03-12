/**
 * Property-based tests for CandidateForm component
 *
 * Tests universal properties using fast-check.
 * Requirements: 21.1, 21.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import { CandidateForm } from './candidate-form';
import type { BoardState } from '@/types/game';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
}));

vi.mock('@/lib/api/candidates', () => ({
  createCandidate: vi.fn(),
}));

vi.mock('@/components/board', () => ({
  Board: ({
    onCellClick,
    highlightedCell,
  }: {
    onCellClick?: (row: number, col: number) => void;
    highlightedCell?: { row: number; col: number };
  }) => (
    <div data-testid="board">
      <button data-testid="cell-0-0" onClick={() => onCellClick?.(0, 0)}>
        Cell
      </button>
      {highlightedCell && <div data-testid="highlighted">Highlighted</div>}
    </div>
  ),
}));

vi.mock('@/app/games/[gameId]/_components/board-preview', () => ({
  BoardPreview: () => <div data-testid="board-preview">Preview</div>,
}));

describe('CandidateForm Property-Based Tests', () => {
  const mockBoardState: BoardState = {
    board: Array(8)
      .fill(null)
      .map(() => Array(8).fill(0)),
  };

  const defaultProps = {
    gameId: 'test-game-id',
    turnNumber: 5,
    currentBoardState: mockBoardState,
    currentPlayer: 'black' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.clearAllMocks();
  });

  describe('Property 3: 説明文の長さ制約', () => {
    /**
     * **Validates: Requirements 5.2, 5.5, 16.3**
     *
     * For any description with length > 200, validation error is displayed.
     * For any description with length 1-200, no validation error is displayed.
     */
    it('should enforce 1-200 character constraint on description', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 250 }), (description) => {
          render(<CandidateForm {...defaultProps} />);

          const textarea = screen.getByLabelText('説明文（最大200文字）');
          fireEvent.change(textarea, { target: { value: description } });

          const hasError = screen.queryByText('説明文は200文字以内で入力してください');

          if (description.length > 200) {
            expect(hasError).toBeInTheDocument();
          } else {
            expect(hasError).not.toBeInTheDocument();
          }

          cleanup();
        }),
        { numRuns: 15, endOnFailure: true }
      );
    });
  });

  describe('Property 4: リアルタイムバリデーション', () => {
    /**
     * **Validates: Requirements 5.6**
     *
     * For any description input, character count is updated in real-time.
     * For any description > 200 characters, error is displayed immediately.
     */
    it('should update character count in real-time', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 150 }), (description) => {
          render(<CandidateForm {...defaultProps} />);

          const textarea = screen.getByLabelText('説明文（最大200文字）');
          fireEvent.change(textarea, { target: { value: description } });

          const charCount = screen.getByText(`${description.length}/200文字`);
          expect(charCount).toBeInTheDocument();

          cleanup();
        }),
        { numRuns: 15, endOnFailure: true }
      );
    });

    it('should show error immediately when exceeding 200 characters', () => {
      fc.assert(
        fc.property(fc.integer({ min: 201, max: 250 }), (length) => {
          render(<CandidateForm {...defaultProps} />);

          const textarea = screen.getByLabelText('説明文（最大200文字）');
          const longText = 'a'.repeat(length);
          fireEvent.change(textarea, { target: { value: longText } });

          const error = screen.getByText('説明文は200文字以内で入力してください');
          expect(error).toBeInTheDocument();

          cleanup();
        }),
        { numRuns: 15, endOnFailure: true }
      );
    });
  });

  // Note: Property 8 (ハイライト表示) and Property 9 (プレビュー表示) are tested
  // in interactive-board.property.test.tsx and move-preview.property.test.tsx respectively.
  // These properties are specific to those components and are already covered by their
  // dedicated property-based tests.
});
