/**
 * Board Component Tests
 *
 * Tests for the Othello board component including:
 * - Rendering
 * - Accessibility
 * - Interactivity
 * - Responsive behavior
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Board } from './board';
import type { BoardState } from '@/types/game';

describe('Board', () => {
  // 初期盤面（オセロの開始状態）
  const initialBoardState: BoardState = {
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

  describe('Rendering', () => {
    it('should render 8x8 grid', () => {
      render(<Board boardState={initialBoardState} />);

      const cells = screen.getAllByRole('gridcell');
      expect(cells).toHaveLength(64);
    });

    it('should render column labels A-H', () => {
      render(<Board boardState={initialBoardState} />);

      const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      labels.forEach((label) => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });

    it('should render row labels 1-8', () => {
      render(<Board boardState={initialBoardState} />);

      const labels = ['1', '2', '3', '4', '5', '6', '7', '8'];
      labels.forEach((label) => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });

    it('should render black discs for value 1', () => {
      render(<Board boardState={initialBoardState} />);

      // E4とD5に黒石がある
      const e4 = screen.getByLabelText('E4: 黒');
      const d5 = screen.getByLabelText('D5: 黒');

      expect(e4).toBeInTheDocument();
      expect(d5).toBeInTheDocument();
    });

    it('should render white discs for value 2', () => {
      render(<Board boardState={initialBoardState} />);

      // D4とE5に白石がある
      const d4 = screen.getByLabelText('D4: 白');
      const e5 = screen.getByLabelText('E5: 白');

      expect(d4).toBeInTheDocument();
      expect(e5).toBeInTheDocument();
    });

    it('should render empty cells for value 0', () => {
      render(<Board boardState={initialBoardState} />);

      // A1は空
      const a1 = screen.getByLabelText('A1: 空');
      expect(a1).toBeInTheDocument();
    });

    it('should apply custom cell size', () => {
      render(<Board boardState={initialBoardState} cellSize={50} />);

      const grid = screen.getByRole('grid');
      expect(grid).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have grid role', () => {
      render(<Board boardState={initialBoardState} />);

      const grid = screen.getByRole('grid');
      expect(grid).toBeInTheDocument();
    });

    it('should have aria-label for grid', () => {
      render(<Board boardState={initialBoardState} />);

      const grid = screen.getByRole('grid', { name: 'オセロの盤面' });
      expect(grid).toBeInTheDocument();
    });

    it('should have gridcell role for each cell', () => {
      render(<Board boardState={initialBoardState} />);

      const cells = screen.getAllByRole('gridcell');
      expect(cells).toHaveLength(64);
    });

    it('should have aria-label for each cell with position and state', () => {
      render(<Board boardState={initialBoardState} />);

      // A1は空
      expect(screen.getByLabelText('A1: 空')).toBeInTheDocument();

      // E4は黒
      expect(screen.getByLabelText('E4: 黒')).toBeInTheDocument();

      // D4は白
      expect(screen.getByLabelText('D4: 白')).toBeInTheDocument();
    });

    it('should be keyboard accessible in interactive mode', () => {
      const handleClick = vi.fn();
      render(<Board boardState={initialBoardState} onCellClick={handleClick} />);

      const cell = screen.getByLabelText('A1: 空');
      expect(cell).toHaveAttribute('tabIndex', '0');
    });

    it('should not be keyboard accessible in display-only mode', () => {
      render(<Board boardState={initialBoardState} />);

      const cell = screen.getByLabelText('A1: 空');
      expect(cell).not.toHaveAttribute('tabIndex');
    });
  });

  describe('Interactivity', () => {
    it('should call onCellClick when cell is clicked', () => {
      const handleClick = vi.fn();
      render(<Board boardState={initialBoardState} onCellClick={handleClick} />);

      const cell = screen.getByLabelText('A1: 空');
      fireEvent.click(cell);

      expect(handleClick).toHaveBeenCalledWith(0, 0);
    });

    it('should call onCellClick with correct row and column', () => {
      const handleClick = vi.fn();
      render(<Board boardState={initialBoardState} onCellClick={handleClick} />);

      // D4をクリック（row=3, col=3）
      const cell = screen.getByLabelText('D4: 白');
      fireEvent.click(cell);

      expect(handleClick).toHaveBeenCalledWith(3, 3);
    });

    it('should not call onCellClick when not provided', () => {
      render(<Board boardState={initialBoardState} />);

      const cell = screen.getByLabelText('A1: 空');
      // クリックしてもエラーが発生しないことを確認
      expect(() => fireEvent.click(cell)).not.toThrow();
    });

    it('should handle Enter key press in interactive mode', () => {
      const handleClick = vi.fn();
      render(<Board boardState={initialBoardState} onCellClick={handleClick} />);

      const cell = screen.getByLabelText('A1: 空');
      fireEvent.keyDown(cell, { key: 'Enter' });

      expect(handleClick).toHaveBeenCalledWith(0, 0);
    });

    it('should handle Space key press in interactive mode', () => {
      const handleClick = vi.fn();
      render(<Board boardState={initialBoardState} onCellClick={handleClick} />);

      const cell = screen.getByLabelText('A1: 空');
      fireEvent.keyDown(cell, { key: ' ' });

      expect(handleClick).toHaveBeenCalledWith(0, 0);
    });

    it('should not handle other key presses', () => {
      const handleClick = vi.fn();
      render(<Board boardState={initialBoardState} onCellClick={handleClick} />);

      const cell = screen.getByLabelText('A1: 空');
      fireEvent.keyDown(cell, { key: 'a' });

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should show cursor pointer in interactive mode', () => {
      render(<Board boardState={initialBoardState} onCellClick={() => {}} />);

      const cell = screen.getByLabelText('A1: 空');
      expect(cell).toHaveClass('cursor-pointer');
    });

    it('should not show cursor pointer in display-only mode', () => {
      render(<Board boardState={initialBoardState} />);

      const cell = screen.getByLabelText('A1: 空');
      expect(cell).not.toHaveClass('cursor-pointer');
    });
  });

  describe('Highlighting', () => {
    it('should highlight specified cell', () => {
      render(<Board boardState={initialBoardState} highlightedCell={{ row: 0, col: 0 }} />);

      const cell = screen.getByLabelText('A1: 空');
      expect(cell).toHaveClass('bg-yellow-300');
    });

    it('should not highlight other cells', () => {
      render(<Board boardState={initialBoardState} highlightedCell={{ row: 0, col: 0 }} />);

      const cell = screen.getByLabelText('B1: 空');
      expect(cell).not.toHaveClass('bg-yellow-300');
    });

    it('should not highlight any cell when highlightedCell is not provided', () => {
      render(<Board boardState={initialBoardState} />);

      const cells = screen.getAllByRole('gridcell');
      cells.forEach((cell) => {
        expect(cell).not.toHaveClass('bg-yellow-300');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should render empty board', () => {
      const emptyBoard: BoardState = {
        board: Array(8)
          .fill(null)
          .map(() => Array(8).fill(0)),
      };

      render(<Board boardState={emptyBoard} />);

      const cells = screen.getAllByRole('gridcell');
      expect(cells).toHaveLength(64);
    });

    it('should render full board with black discs', () => {
      const fullBoard: BoardState = {
        board: Array(8)
          .fill(null)
          .map(() => Array(8).fill(1)),
      };

      render(<Board boardState={fullBoard} />);

      const blackCells = screen.getAllByLabelText(/黒/);
      expect(blackCells).toHaveLength(64);
    });

    it('should render full board with white discs', () => {
      const fullBoard: BoardState = {
        board: Array(8)
          .fill(null)
          .map(() => Array(8).fill(2)),
      };

      render(<Board boardState={fullBoard} />);

      const whiteCells = screen.getAllByLabelText(/白/);
      expect(whiteCells).toHaveLength(64);
    });

    it('should handle board state changes', () => {
      const { rerender } = render(<Board boardState={initialBoardState} />);

      // 初期状態を確認
      expect(screen.getByLabelText('A1: 空')).toBeInTheDocument();

      // 盤面を更新
      const newBoardState: BoardState = {
        board: [
          [1, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 2, 1, 0, 0, 0],
          [0, 0, 0, 1, 2, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0],
        ],
      };

      rerender(<Board boardState={newBoardState} />);

      // 更新後の状態を確認
      expect(screen.getByLabelText('A1: 黒')).toBeInTheDocument();
    });
  });
});
