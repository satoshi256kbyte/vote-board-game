import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { BoardCell } from './board-cell';

describe('BoardCell', () => {
  const defaultProps = {
    row: 0,
    col: 0,
    state: 'empty' as const,
    isLegalMove: false,
    isSelected: false,
    isHovered: false,
    isFocused: false,
    onClick: vi.fn(),
    onMouseEnter: vi.fn(),
    onMouseLeave: vi.fn(),
    cellSize: 40,
    disabled: false,
  };

  describe('セルの表示', () => {
    it('空のセルを表示する', () => {
      const { container } = render(<BoardCell {...defaultProps} />);
      const cell = container.querySelector('[role="gridcell"]');
      expect(cell).toBeInTheDocument();
      expect(cell).toHaveAttribute('aria-label', 'A1, 空');
    });

    it('黒石を表示する', () => {
      const { container } = render(<BoardCell {...defaultProps} state="black" />);
      const cell = container.querySelector('[role="gridcell"]');
      expect(cell).toHaveAttribute('aria-label', 'A1, 黒石');

      // 黒石の円が表示されている
      const blackDisc = container.querySelector('.bg-black');
      expect(blackDisc).toBeInTheDocument();
    });

    it('白石を表示する', () => {
      const { container } = render(<BoardCell {...defaultProps} state="white" />);
      const cell = container.querySelector('[role="gridcell"]');
      expect(cell).toHaveAttribute('aria-label', 'A1, 白石');

      // 白石の円が表示されている
      const whiteDisc = container.querySelector('.bg-white');
      expect(whiteDisc).toBeInTheDocument();
    });
  });

  describe('合法手インジケーター', () => {
    it('合法手のセルにインジケーターを表示する', () => {
      const { container } = render(<BoardCell {...defaultProps} isLegalMove={true} />);
      // ValidMoveIndicatorコンポーネントが存在することを確認
      const indicator = container.querySelector('.bg-green-200');
      expect(indicator).toBeInTheDocument();
    });

    it('非合法手のセルにはインジケーターを表示しない', () => {
      const { container } = render(<BoardCell {...defaultProps} isLegalMove={false} />);
      const indicator = container.querySelector('.bg-green-200');
      expect(indicator).not.toBeInTheDocument();
    });
  });

  describe('選択ハイライト', () => {
    it('選択されたセルにハイライトを表示する', () => {
      const { container } = render(<BoardCell {...defaultProps} isSelected={true} />);
      const highlight = container.querySelector('.border-blue-500');
      expect(highlight).toBeInTheDocument();

      const cell = container.querySelector('[role="gridcell"]');
      expect(cell).toHaveAttribute('aria-selected', 'true');
    });

    it('選択されていないセルにはハイライトを表示しない', () => {
      const { container } = render(<BoardCell {...defaultProps} isSelected={false} />);
      const highlight = container.querySelector('.border-blue-500');
      expect(highlight).not.toBeInTheDocument();

      const cell = container.querySelector('[role="gridcell"]');
      expect(cell).toHaveAttribute('aria-selected', 'false');
    });
  });

  describe('クリックイベント', () => {
    it('クリック時にonClickが呼ばれる', () => {
      const onClick = vi.fn();
      const { container } = render(<BoardCell {...defaultProps} onClick={onClick} />);
      const cell = container.querySelector('[role="gridcell"]');

      if (cell) {
        fireEvent.click(cell);
      }

      expect(onClick).toHaveBeenCalledWith(0, 0);
    });

    it('disabled時はonClickが呼ばれない', () => {
      const onClick = vi.fn();
      const { container } = render(
        <BoardCell {...defaultProps} onClick={onClick} disabled={true} />
      );
      const cell = container.querySelector('[role="gridcell"]');

      if (cell) {
        fireEvent.click(cell);
      }

      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('ホバー効果', () => {
    it('マウスエンター時にonMouseEnterが呼ばれる', () => {
      const onMouseEnter = vi.fn();
      const { container } = render(<BoardCell {...defaultProps} onMouseEnter={onMouseEnter} />);
      const cell = container.querySelector('[role="gridcell"]');

      if (cell) {
        fireEvent.mouseEnter(cell);
      }

      expect(onMouseEnter).toHaveBeenCalledWith(0, 0);
    });

    it('マウスリーブ時にonMouseLeaveが呼ばれる', () => {
      const onMouseLeave = vi.fn();
      const { container } = render(<BoardCell {...defaultProps} onMouseLeave={onMouseLeave} />);
      const cell = container.querySelector('[role="gridcell"]');

      if (cell) {
        fireEvent.mouseLeave(cell);
      }

      expect(onMouseLeave).toHaveBeenCalled();
    });

    it('disabled時はonMouseEnterが呼ばれない', () => {
      const onMouseEnter = vi.fn();
      const { container } = render(
        <BoardCell {...defaultProps} onMouseEnter={onMouseEnter} disabled={true} />
      );
      const cell = container.querySelector('[role="gridcell"]');

      if (cell) {
        fireEvent.mouseEnter(cell);
      }

      expect(onMouseEnter).not.toHaveBeenCalled();
    });
  });

  describe('ARIA属性', () => {
    it('role="gridcell"を持つ', () => {
      const { container } = render(<BoardCell {...defaultProps} />);
      const cell = container.querySelector('[role="gridcell"]');
      expect(cell).toBeInTheDocument();
    });

    it('座標をaria-labelに含む', () => {
      const { container } = render(<BoardCell {...defaultProps} row={2} col={3} />);
      const cell = container.querySelector('[role="gridcell"]');
      expect(cell).toHaveAttribute('aria-label', expect.stringContaining('D3'));
    });

    it('合法手の場合、aria-labelに"選択可能"を含む', () => {
      const { container } = render(<BoardCell {...defaultProps} isLegalMove={true} />);
      const cell = container.querySelector('[role="gridcell"]');
      expect(cell).toHaveAttribute('aria-label', expect.stringContaining('選択可能'));
    });
  });

  describe('キーボードフォーカスインジケーター', () => {
    it('フォーカスされたセルにフォーカスインジケーターを表示する', () => {
      const { container } = render(<BoardCell {...defaultProps} isFocused={true} />);
      const focusIndicator = container.querySelector('.ring-2.ring-blue-500');
      expect(focusIndicator).toBeInTheDocument();
    });

    it('フォーカスされていないセルにはフォーカスインジケーターを表示しない', () => {
      const { container } = render(<BoardCell {...defaultProps} isFocused={false} />);
      const focusIndicator = container.querySelector('.ring-2.ring-blue-500');
      expect(focusIndicator).not.toBeInTheDocument();
    });

    it('選択されたセルにはフォーカスインジケーターを表示しない（選択ハイライトが優先）', () => {
      const { container } = render(
        <BoardCell {...defaultProps} isFocused={true} isSelected={true} />
      );
      // 選択ハイライトは表示される
      const selectionHighlight = container.querySelector('.border-blue-500');
      expect(selectionHighlight).toBeInTheDocument();

      // フォーカスインジケーターは表示されない（選択が優先）
      const focusIndicator = container.querySelector('.ring-2.ring-blue-500');
      expect(focusIndicator).not.toBeInTheDocument();
    });
  });
});
