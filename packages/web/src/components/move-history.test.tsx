/**
 * Move History Component Tests
 *
 * Tests for the move history component including:
 * - Rendering
 * - Chronological ordering
 * - Interactivity
 * - Accessibility
 * - Selection highlighting
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MoveHistory } from './move-history';
import type { Move } from '@/types/game';

describe('MoveHistory', () => {
  // サンプルの手履歴
  const sampleMoves: Move[] = [
    {
      turn: 1,
      player: 'BLACK',
      position: 'D3',
      timestamp: '2024-01-01T00:00:00Z',
    },
    {
      turn: 2,
      player: 'WHITE',
      position: 'C3',
      timestamp: '2024-01-01T00:01:00Z',
    },
    {
      turn: 3,
      player: 'BLACK',
      position: 'E3',
      timestamp: '2024-01-01T00:02:00Z',
    },
    {
      turn: 4,
      player: 'WHITE',
      position: 'F3',
      timestamp: '2024-01-01T00:03:00Z',
    },
  ];

  describe('Rendering', () => {
    it('should render all moves', () => {
      render(<MoveHistory moves={sampleMoves} />);

      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(4);
    });

    it('should display turn numbers', () => {
      render(<MoveHistory moves={sampleMoves} />);

      expect(screen.getByText('1手目')).toBeInTheDocument();
      expect(screen.getByText('2手目')).toBeInTheDocument();
      expect(screen.getByText('3手目')).toBeInTheDocument();
      expect(screen.getByText('4手目')).toBeInTheDocument();
    });

    it('should display player colors', () => {
      render(<MoveHistory moves={sampleMoves} />);

      const blackLabels = screen.getAllByText('黒');
      const whiteLabels = screen.getAllByText('白');

      expect(blackLabels).toHaveLength(2);
      expect(whiteLabels).toHaveLength(2);
    });

    it('should display move positions', () => {
      render(<MoveHistory moves={sampleMoves} />);

      expect(screen.getByText('D3')).toBeInTheDocument();
      expect(screen.getByText('C3')).toBeInTheDocument();
      expect(screen.getByText('E3')).toBeInTheDocument();
      expect(screen.getByText('F3')).toBeInTheDocument();
    });

    it('should display empty state when no moves', () => {
      render(<MoveHistory moves={[]} />);

      expect(screen.getByText('まだ手が打たれていません')).toBeInTheDocument();
    });

    it('should render list with proper role', () => {
      render(<MoveHistory moves={sampleMoves} />);

      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();
    });

    it('should render list items with proper role', () => {
      render(<MoveHistory moves={sampleMoves} />);

      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(4);
    });
  });

  describe('Chronological Ordering', () => {
    it('should display moves in reverse chronological order (newest first)', () => {
      render(<MoveHistory moves={sampleMoves} />);

      const items = screen.getAllByRole('listitem');

      // 最初のアイテムは4手目（最新）
      expect(items[0]).toHaveTextContent('4手目');
      expect(items[0]).toHaveTextContent('F3');

      // 最後のアイテムは1手目（最古）
      expect(items[3]).toHaveTextContent('1手目');
      expect(items[3]).toHaveTextContent('D3');
    });

    it('should maintain order when moves are provided in random order', () => {
      const randomOrderMoves: Move[] = [
        {
          turn: 3,
          player: 'BLACK',
          position: 'E3',
          timestamp: '2024-01-01T00:02:00Z',
        },
        {
          turn: 1,
          player: 'BLACK',
          position: 'D3',
          timestamp: '2024-01-01T00:00:00Z',
        },
        {
          turn: 4,
          player: 'WHITE',
          position: 'F3',
          timestamp: '2024-01-01T00:03:00Z',
        },
        {
          turn: 2,
          player: 'WHITE',
          position: 'C3',
          timestamp: '2024-01-01T00:01:00Z',
        },
      ];

      render(<MoveHistory moves={randomOrderMoves} />);

      const items = screen.getAllByRole('listitem');

      // 新しい順にソートされているか確認
      expect(items[0]).toHaveTextContent('4手目');
      expect(items[1]).toHaveTextContent('3手目');
      expect(items[2]).toHaveTextContent('2手目');
      expect(items[3]).toHaveTextContent('1手目');
    });
  });

  describe('Interactivity', () => {
    it('should call onMoveClick when move is clicked', () => {
      const handleClick = vi.fn();
      render(<MoveHistory moves={sampleMoves} onMoveClick={handleClick} />);

      const firstMove = screen.getByLabelText(/ターン4/);
      fireEvent.click(firstMove);

      expect(handleClick).toHaveBeenCalledWith(4);
    });

    it('should call onMoveClick with correct turn number', () => {
      const handleClick = vi.fn();
      render(<MoveHistory moves={sampleMoves} onMoveClick={handleClick} />);

      const secondMove = screen.getByLabelText(/ターン3/);
      fireEvent.click(secondMove);

      expect(handleClick).toHaveBeenCalledWith(3);
    });

    it('should not call onMoveClick when not provided', () => {
      render(<MoveHistory moves={sampleMoves} />);

      const firstMove = screen.getByLabelText(/ターン4/);
      // クリックしてもエラーが発生しないことを確認
      expect(() => fireEvent.click(firstMove)).not.toThrow();
    });

    it('should handle Enter key press when interactive', () => {
      const handleClick = vi.fn();
      render(<MoveHistory moves={sampleMoves} onMoveClick={handleClick} />);

      const firstMove = screen.getByLabelText(/ターン4/);
      fireEvent.keyDown(firstMove, { key: 'Enter' });

      expect(handleClick).toHaveBeenCalledWith(4);
    });

    it('should handle Space key press when interactive', () => {
      const handleClick = vi.fn();
      render(<MoveHistory moves={sampleMoves} onMoveClick={handleClick} />);

      const firstMove = screen.getByLabelText(/ターン4/);
      fireEvent.keyDown(firstMove, { key: ' ' });

      expect(handleClick).toHaveBeenCalledWith(4);
    });

    it('should not handle other key presses', () => {
      const handleClick = vi.fn();
      render(<MoveHistory moves={sampleMoves} onMoveClick={handleClick} />);

      const firstMove = screen.getByLabelText(/ターン4/);
      fireEvent.keyDown(firstMove, { key: 'a' });

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should show cursor pointer when interactive', () => {
      render(<MoveHistory moves={sampleMoves} onMoveClick={() => {}} />);

      const firstMove = screen.getByLabelText(/ターン4/);
      expect(firstMove).toHaveClass('cursor-pointer');
    });

    it('should not show cursor pointer when not interactive', () => {
      render(<MoveHistory moves={sampleMoves} />);

      const firstMove = screen.getByLabelText(/ターン4/);
      expect(firstMove).not.toHaveClass('cursor-pointer');
    });
  });

  describe('Selection Highlighting', () => {
    it('should highlight selected move', () => {
      render(<MoveHistory moves={sampleMoves} selectedTurn={3} />);

      const selectedMove = screen.getByLabelText(/ターン3/);
      expect(selectedMove).toHaveClass('bg-blue-100');
    });

    it('should display "選択中" indicator for selected move', () => {
      render(<MoveHistory moves={sampleMoves} selectedTurn={3} />);

      expect(screen.getByText('選択中')).toBeInTheDocument();
    });

    it('should not highlight other moves', () => {
      render(<MoveHistory moves={sampleMoves} selectedTurn={3} />);

      const otherMove = screen.getByLabelText(/ターン4/);
      expect(otherMove).not.toHaveClass('bg-blue-100');
    });

    it('should not highlight any move when selectedTurn is not provided', () => {
      render(<MoveHistory moves={sampleMoves} />);

      const items = screen.getAllByRole('listitem');
      items.forEach((item) => {
        expect(item).not.toHaveClass('bg-blue-100');
      });
    });

    it('should update highlighting when selectedTurn changes', () => {
      const { rerender } = render(<MoveHistory moves={sampleMoves} selectedTurn={3} />);

      // 初期状態を確認
      let selectedMove = screen.getByLabelText(/ターン3/);
      expect(selectedMove).toHaveClass('bg-blue-100');

      // selectedTurnを変更
      rerender(<MoveHistory moves={sampleMoves} selectedTurn={2} />);

      // 新しい選択状態を確認
      selectedMove = screen.getByLabelText(/ターン2/);
      expect(selectedMove).toHaveClass('bg-blue-100');

      // 以前の選択は解除されている
      const previousMove = screen.getByLabelText(/ターン3/);
      expect(previousMove).not.toHaveClass('bg-blue-100');
    });

    it('should set aria-current for selected move', () => {
      render(<MoveHistory moves={sampleMoves} selectedTurn={3} />);

      const selectedMove = screen.getByLabelText(/ターン3/);
      expect(selectedMove).toHaveAttribute('aria-current', 'true');
    });

    it('should not set aria-current for non-selected moves', () => {
      render(<MoveHistory moves={sampleMoves} selectedTurn={3} />);

      const otherMove = screen.getByLabelText(/ターン4/);
      expect(otherMove).not.toHaveAttribute('aria-current');
    });
  });

  describe('Accessibility', () => {
    it('should have list role', () => {
      render(<MoveHistory moves={sampleMoves} />);

      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();
    });

    it('should have aria-label for list', () => {
      render(<MoveHistory moves={sampleMoves} />);

      const list = screen.getByRole('list', { name: '手の履歴' });
      expect(list).toBeInTheDocument();
    });

    it('should have listitem role for each move', () => {
      render(<MoveHistory moves={sampleMoves} />);

      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(4);
    });

    it('should have descriptive aria-label for each move', () => {
      render(<MoveHistory moves={sampleMoves} />);

      expect(screen.getByLabelText('ターン1: 黒がD3に打った手')).toBeInTheDocument();
      expect(screen.getByLabelText('ターン2: 白がC3に打った手')).toBeInTheDocument();
      expect(screen.getByLabelText('ターン3: 黒がE3に打った手')).toBeInTheDocument();
      expect(screen.getByLabelText('ターン4: 白がF3に打った手')).toBeInTheDocument();
    });

    it('should be keyboard accessible when interactive', () => {
      render(<MoveHistory moves={sampleMoves} onMoveClick={() => {}} />);

      const firstMove = screen.getByLabelText(/ターン4/);
      expect(firstMove).toHaveAttribute('tabIndex', '0');
    });

    it('should not be keyboard accessible when not interactive', () => {
      render(<MoveHistory moves={sampleMoves} />);

      const firstMove = screen.getByLabelText(/ターン4/);
      expect(firstMove).not.toHaveAttribute('tabIndex');
    });
  });

  describe('Scrollability', () => {
    it('should have scrollable container', () => {
      render(<MoveHistory moves={sampleMoves} />);

      const list = screen.getByRole('list');
      expect(list).toHaveClass('overflow-y-auto');
    });

    it('should have max height', () => {
      render(<MoveHistory moves={sampleMoves} />);

      const list = screen.getByRole('list');
      expect(list).toHaveClass('max-h-96');
    });
  });

  describe('Edge Cases', () => {
    it('should handle single move', () => {
      const singleMove: Move[] = [
        {
          turn: 1,
          player: 'BLACK',
          position: 'D3',
          timestamp: '2024-01-01T00:00:00Z',
        },
      ];

      render(<MoveHistory moves={singleMove} />);

      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(1);
      expect(screen.getByText('1手目')).toBeInTheDocument();
    });

    it('should handle many moves', () => {
      const manyMoves: Move[] = Array.from({ length: 60 }, (_, i) => ({
        turn: i + 1,
        player: i % 2 === 0 ? ('BLACK' as const) : ('WHITE' as const),
        position: `A${(i % 8) + 1}`,
        timestamp: `2024-01-01T00:${String(i).padStart(2, '0')}:00Z`,
      }));

      render(<MoveHistory moves={manyMoves} />);

      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(60);
    });

    it('should handle moves with same turn number', () => {
      const duplicateTurnMoves: Move[] = [
        {
          turn: 1,
          player: 'BLACK',
          position: 'D3',
          timestamp: '2024-01-01T00:00:00Z',
        },
        {
          turn: 1,
          player: 'WHITE',
          position: 'C3',
          timestamp: '2024-01-01T00:01:00Z',
        },
      ];

      render(<MoveHistory moves={duplicateTurnMoves} />);

      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(2);
    });

    it('should handle move updates', () => {
      const { rerender } = render(<MoveHistory moves={sampleMoves.slice(0, 2)} />);

      // 初期状態を確認
      let items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(2);

      // 手を追加
      rerender(<MoveHistory moves={sampleMoves} />);

      // 更新後の状態を確認
      items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(4);
    });
  });

  describe('Player Color Display', () => {
    it('should display black disc for BLACK player', () => {
      render(<MoveHistory moves={sampleMoves} />);

      const blackMove = screen.getByLabelText(/ターン1/);
      const blackDisc = blackMove.querySelector('.bg-black');
      expect(blackDisc).toBeInTheDocument();
    });

    it('should display white disc for WHITE player', () => {
      render(<MoveHistory moves={sampleMoves} />);

      const whiteMove = screen.getByLabelText(/ターン2/);
      const whiteDisc = whiteMove.querySelector('.bg-white');
      expect(whiteDisc).toBeInTheDocument();
    });

    it('should display correct color labels', () => {
      render(<MoveHistory moves={sampleMoves} />);

      const blackLabels = screen.getAllByText('黒');
      const whiteLabels = screen.getAllByText('白');

      expect(blackLabels.length).toBeGreaterThan(0);
      expect(whiteLabels.length).toBeGreaterThan(0);
    });
  });
});
