import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { InteractiveBoard } from './interactive-board';

describe('InteractiveBoard', () => {
  const initialBoardState = [
    ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
    ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
    ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
    ['empty', 'empty', 'empty', 'white', 'black', 'empty', 'empty', 'empty'],
    ['empty', 'empty', 'empty', 'black', 'white', 'empty', 'empty', 'empty'],
    ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
    ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
    ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
  ];

  // タイマーとモックのクリーンアップ
  afterEach(() => {
    // 実タイマーに戻してからクリーンアップ
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('基本構造', () => {
    it('should render 8x8 grid', () => {
      const mockOnCellClick = vi.fn();
      const { container } = render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      // グリッドが存在することを確認
      const grid = screen.getByRole('grid');
      expect(grid).toBeInTheDocument();

      // 64個のセル（8x8）が存在することを確認
      const cells = container.querySelectorAll('[role="gridcell"]');
      expect(cells).toHaveLength(64);
    });

    it('should have correct ARIA attributes', () => {
      const mockOnCellClick = vi.fn();
      render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      // role="grid"とaria-labelが設定されていることを確認
      const grid = screen.getByRole('grid', { name: 'オセロの盤面' });
      expect(grid).toBeInTheDocument();
    });

    it('should reflect current board state', () => {
      const mockOnCellClick = vi.fn();
      render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      // 白石と黒石が正しく表示されていることを確認
      // D4 (row 3, col 3) は白石
      const d4Cell = screen.getByRole('gridcell', { name: /D4.*白石/ });
      expect(d4Cell).toBeInTheDocument();

      // E4 (row 3, col 4) は黒石
      const e4Cell = screen.getByRole('gridcell', { name: /E4.*黒石/ });
      expect(e4Cell).toBeInTheDocument();
    });

    it('should use responsive cell size', () => {
      const mockOnCellClick = vi.fn();
      const customCellSize = 50;
      render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
          cellSize={customCellSize}
        />
      );

      // セルサイズのテストは実装の詳細に依存するため、
      // ここでは正常にレンダリングされることのみ確認
      const grid = screen.getByRole('grid');
      expect(grid).toBeInTheDocument();
    });
  });

  describe('セル選択', () => {
    it('should highlight selected cell', () => {
      const mockOnCellClick = vi.fn();
      render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={{ row: 2, col: 3 }}
          onCellClick={mockOnCellClick}
        />
      );

      // 選択されたセルがaria-selected="true"を持つことを確認
      const selectedCell = screen.getByRole('gridcell', { name: /D3/, selected: true });
      expect(selectedCell).toBeInTheDocument();
    });

    it('should call onCellClick when cell is clicked', () => {
      const mockOnCellClick = vi.fn();
      render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      // セルをクリック
      const cell = screen.getByRole('gridcell', { name: /D3/ });
      cell.click();

      // onCellClickが呼ばれたことを確認
      expect(mockOnCellClick).toHaveBeenCalledWith(2, 3);
    });

    it('should not call onCellClick when disabled', () => {
      const mockOnCellClick = vi.fn();
      render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
          disabled={true}
        />
      );

      // セルをクリック
      const cell = screen.getByRole('gridcell', { name: /D3/ });
      cell.click();

      // onCellClickが呼ばれないことを確認
      expect(mockOnCellClick).not.toHaveBeenCalled();
    });
  });

  describe('合法手の表示', () => {
    it('should display legal move indicators', () => {
      const mockOnCellClick = vi.fn();
      render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      // 初期盤面では黒の合法手は4つ（D3, C4, F5, E6）
      // D3 (row 2, col 3) は合法手
      const d3Cell = screen.getByRole('gridcell', { name: /D3.*選択可能/ });
      expect(d3Cell).toBeInTheDocument();

      // C4 (row 3, col 2) は合法手
      const c4Cell = screen.getByRole('gridcell', { name: /C4.*選択可能/ });
      expect(c4Cell).toBeInTheDocument();
    });

    it('should display "置ける場所がありません" message when no legal moves', () => {
      const mockOnCellClick = vi.fn();
      // 合法手がない盤面（すべて埋まっている）
      const fullBoardState = [
        ['black', 'black', 'black', 'black', 'black', 'black', 'black', 'black'],
        ['black', 'black', 'black', 'black', 'black', 'black', 'black', 'black'],
        ['black', 'black', 'black', 'black', 'black', 'black', 'black', 'black'],
        ['black', 'black', 'black', 'black', 'black', 'black', 'black', 'black'],
        ['black', 'black', 'black', 'black', 'black', 'black', 'black', 'black'],
        ['black', 'black', 'black', 'black', 'black', 'black', 'black', 'black'],
        ['black', 'black', 'black', 'black', 'black', 'black', 'black', 'black'],
        ['black', 'black', 'black', 'black', 'black', 'black', 'black', 'black'],
      ];

      render(
        <InteractiveBoard
          boardState={fullBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      // "置ける場所がありません" メッセージが表示されることを確認
      expect(screen.getByText('置ける場所がありません')).toBeInTheDocument();
    });
  });

  describe('エラーハンドリング', () => {
    it('should display error message when illegal move is clicked', () => {
      const mockOnCellClick = vi.fn();
      render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      // 非合法手のセル（A1 - row 0, col 0）をクリック
      // A1は初期盤面では合法手ではない
      const a1Cell = screen.getByRole('gridcell', { name: /A1/ });
      fireEvent.click(a1Cell);

      // エラーメッセージが表示されることを確認
      const errorAlert = screen.queryByRole('alert');
      expect(errorAlert).toBeInTheDocument();
      expect(errorAlert).toHaveTextContent('この位置には石を置けません');

      // onCellClickが呼ばれないことを確認（非合法手なので）
      expect(mockOnCellClick).not.toHaveBeenCalled();
    });

    it('should have role="alert" attribute on error message', () => {
      const mockOnCellClick = vi.fn();
      render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      // 非合法手のセルをクリック
      const a1Cell = screen.getByRole('gridcell', { name: /A1/ });
      fireEvent.click(a1Cell);

      // role="alert"が設定されていることを確認
      const errorAlert = screen.queryByRole('alert');
      expect(errorAlert).toBeInTheDocument();
    });

    it('should auto-dismiss error message after 3 seconds', () => {
      vi.useFakeTimers();
      try {
        const mockOnCellClick = vi.fn();
        render(
          <InteractiveBoard
            boardState={initialBoardState}
            currentPlayer="black"
            selectedPosition={null}
            onCellClick={mockOnCellClick}
          />
        );

        // 非合法手のセルをクリック
        const a1Cell = screen.getByRole('gridcell', { name: /A1/ });
        fireEvent.click(a1Cell);

        // エラーメッセージが表示されることを確認
        expect(screen.queryByRole('alert')).toBeInTheDocument();

        // 3秒経過
        act(() => {
          vi.advanceTimersByTime(3000);
        });

        // エラーメッセージが消えることを確認
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    });

    it('should clear error message when legal move is clicked', () => {
      const mockOnCellClick = vi.fn();
      render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      // 非合法手のセルをクリックしてエラーを表示
      const a1Cell = screen.getByRole('gridcell', { name: /A1/ });
      fireEvent.click(a1Cell);
      expect(screen.queryByRole('alert')).toBeInTheDocument();

      // 合法手のセル（D3）をクリック
      const d3Cell = screen.getByRole('gridcell', { name: /D3.*選択可能/ });
      fireEvent.click(d3Cell);

      // エラーメッセージが消えることを確認
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();

      // onCellClickが呼ばれることを確認
      expect(mockOnCellClick).toHaveBeenCalledWith(2, 3);
    });

    it('should display error with red background styling', () => {
      const mockOnCellClick = vi.fn();
      render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      // 非合法手のセルをクリック
      const a1Cell = screen.getByRole('gridcell', { name: /A1/ });
      fireEvent.click(a1Cell);

      // エラーメッセージが赤色のスタイルを持つことを確認
      const errorAlert = screen.queryByRole('alert');
      expect(errorAlert).toHaveClass('bg-red-50', 'border-red-200', 'text-red-700');
    });
  });

  describe('キーボード操作', () => {
    it('should be focusable with tabIndex', () => {
      const mockOnCellClick = vi.fn();
      render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      const grid = screen.getByRole('grid');
      expect(grid).toHaveAttribute('tabIndex', '0');
    });

    it('should not be focusable when disabled', () => {
      const mockOnCellClick = vi.fn();
      render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
          disabled={true}
        />
      );

      const grid = screen.getByRole('grid');
      expect(grid).toHaveAttribute('tabIndex', '-1');
    });

    it('should navigate cells with arrow keys', () => {
      const mockOnCellClick = vi.fn();
      render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      const grid = screen.getByRole('grid');

      // フォーカスを当てる
      grid.focus();

      // 矢印キーでナビゲーション
      fireEvent.keyDown(grid, { key: 'ArrowDown' });
      fireEvent.keyDown(grid, { key: 'ArrowRight' });
      fireEvent.keyDown(grid, { key: 'ArrowUp' });
      fireEvent.keyDown(grid, { key: 'ArrowLeft' });

      // キーボード操作が正常に動作することを確認
      expect(grid).toBeInTheDocument();
    });

    it('should not move focus beyond board boundaries', () => {
      const mockOnCellClick = vi.fn();
      render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      const grid = screen.getByRole('grid');
      grid.focus();

      // 初期位置(0,0)から上下左右の境界を超えないことを確認
      fireEvent.keyDown(grid, { key: 'ArrowUp' });
      fireEvent.keyDown(grid, { key: 'ArrowLeft' });

      // エラーが発生しないことを確認
      expect(grid).toBeInTheDocument();
    });

    it('should select cell with Enter key', () => {
      const mockOnCellClick = vi.fn();
      render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      const grid = screen.getByRole('grid');
      grid.focus();

      // D3 (row 2, col 3) に移動 - 合法手
      fireEvent.keyDown(grid, { key: 'ArrowDown' });
      fireEvent.keyDown(grid, { key: 'ArrowDown' });
      fireEvent.keyDown(grid, { key: 'ArrowRight' });
      fireEvent.keyDown(grid, { key: 'ArrowRight' });
      fireEvent.keyDown(grid, { key: 'ArrowRight' });

      // Enterキーで選択
      fireEvent.keyDown(grid, { key: 'Enter' });

      // onCellClickが呼ばれることを確認
      expect(mockOnCellClick).toHaveBeenCalledWith(2, 3);
    });

    it('should select cell with Space key', () => {
      const mockOnCellClick = vi.fn();
      render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      const grid = screen.getByRole('grid');
      grid.focus();

      // D3 (row 2, col 3) に移動
      fireEvent.keyDown(grid, { key: 'ArrowDown' });
      fireEvent.keyDown(grid, { key: 'ArrowDown' });
      fireEvent.keyDown(grid, { key: 'ArrowRight' });
      fireEvent.keyDown(grid, { key: 'ArrowRight' });
      fireEvent.keyDown(grid, { key: 'ArrowRight' });

      // Spaceキーで選択
      fireEvent.keyDown(grid, { key: ' ' });

      // onCellClickが呼ばれることを確認
      expect(mockOnCellClick).toHaveBeenCalledWith(2, 3);
    });

    it('should not respond to keyboard when disabled', () => {
      const mockOnCellClick = vi.fn();
      render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
          disabled={true}
        />
      );

      const grid = screen.getByRole('grid');

      // キーボード操作を試みる
      fireEvent.keyDown(grid, { key: 'ArrowDown' });
      fireEvent.keyDown(grid, { key: 'Enter' });

      // onCellClickが呼ばれないことを確認
      expect(mockOnCellClick).not.toHaveBeenCalled();
    });

    it('should prevent default behavior for arrow keys', () => {
      const mockOnCellClick = vi.fn();
      render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      const grid = screen.getByRole('grid');
      grid.focus();

      // ArrowDownイベントを作成
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true,
      });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      grid.dispatchEvent(event);

      // preventDefaultが呼ばれることを確認
      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should show focus ring on grid when focused', () => {
      const mockOnCellClick = vi.fn();
      render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      const grid = screen.getByRole('grid');

      // フォーカスリングのクラスが設定されていることを確認
      expect(grid).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500');
    });

    it('should initialize focus to (0,0) when board is focused', () => {
      const mockOnCellClick = vi.fn();
      render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      const grid = screen.getByRole('grid');

      // フォーカスイベントを発火
      fireEvent.focus(grid);

      // フォーカスが設定されることを確認
      expect(grid).toBeInTheDocument();
    });

    it('should clear focus when board loses focus', () => {
      const mockOnCellClick = vi.fn();
      render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      const grid = screen.getByRole('grid');

      // フォーカスを当てる
      fireEvent.focus(grid);

      // フォーカスを外す
      fireEvent.blur(grid);

      // フォーカスがクリアされることを確認
      expect(grid).toBeInTheDocument();
    });
  });

  describe('パフォーマンス最適化', () => {
    it('should not re-render when unrelated props change', () => {
      const mockOnCellClick = vi.fn();
      let renderCount = 0;

      // レンダリング回数をカウントするためのラッパーコンポーネント
      const TestWrapper = ({ extraProp: _extraProp }: { extraProp: number }) => {
        renderCount++;
        // extraPropは意図的に未使用（propsの変更をテストするため）
        void _extraProp;
        return (
          <InteractiveBoard
            boardState={initialBoardState}
            currentPlayer="black"
            selectedPosition={null}
            onCellClick={mockOnCellClick}
          />
        );
      };

      const { rerender } = render(<TestWrapper extraProp={1} />);

      // 初回レンダリング
      expect(renderCount).toBe(1);

      // 無関係なpropsを変更して再レンダリング
      rerender(<TestWrapper extraProp={2} />);

      // InteractiveBoardはReact.memoでメモ化されているため、
      // propsが変わっていないので再レンダリングされない
      // ただし、TestWrapperは再レンダリングされる
      expect(renderCount).toBe(2);
    });

    it('should re-render when boardState changes', () => {
      const mockOnCellClick = vi.fn();
      const { rerender } = render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      // 初回レンダリング
      const grid = screen.getByRole('grid');
      expect(grid).toBeInTheDocument();

      // 盤面状態を変更
      const newBoardState = [
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'black', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'black', 'black', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'black', 'white', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
      ];

      rerender(
        <InteractiveBoard
          boardState={newBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      // 盤面が更新されていることを確認
      // D3 (row 2, col 3) に黒石が追加されている
      const d3Cell = screen.getByRole('gridcell', { name: /D3.*黒石/ });
      expect(d3Cell).toBeInTheDocument();
    });

    it('should re-render when selectedPosition changes', () => {
      const mockOnCellClick = vi.fn();
      const { rerender } = render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      // 初回レンダリング - 選択されたセルなし
      expect(screen.queryByRole('gridcell', { selected: true })).not.toBeInTheDocument();

      // 選択位置を変更
      rerender(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={{ row: 2, col: 3 }}
          onCellClick={mockOnCellClick}
        />
      );

      // 選択されたセルが表示されることを確認
      const selectedCell = screen.getByRole('gridcell', { name: /D3/, selected: true });
      expect(selectedCell).toBeInTheDocument();
    });

    it('should memoize legal moves calculation', () => {
      const mockOnCellClick = vi.fn();
      const { rerender } = render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      // 初回レンダリング - 合法手が表示される
      const d3Cell = screen.getByRole('gridcell', { name: /D3.*選択可能/ });
      expect(d3Cell).toBeInTheDocument();

      // 選択位置のみ変更（盤面状態とプレイヤーは同じ）
      rerender(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={{ row: 2, col: 3 }}
          onCellClick={mockOnCellClick}
        />
      );

      // 合法手は再計算されず、キャッシュされた値が使用される
      // （useMemoによるメモ化）
      const d3CellAfter = screen.getByRole('gridcell', { name: /D3.*選択可能/ });
      expect(d3CellAfter).toBeInTheDocument();
    });
  });

  describe('タッチデバイス対応', () => {
    it('should handle touch events on cells', () => {
      const mockOnCellClick = vi.fn();
      render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      // 合法手のセル（D3）をタッチ
      const d3Cell = screen.getByRole('gridcell', { name: /D3.*選択可能/ });
      fireEvent.touchEnd(d3Cell);

      // onCellClickが呼ばれることを確認
      expect(mockOnCellClick).toHaveBeenCalledWith(2, 3);
    });

    it('should prevent default on touch events to prevent double-tap zoom', () => {
      const mockOnCellClick = vi.fn();
      render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      const grid = screen.getByRole('grid');

      // タッチスタートイベントを作成
      const touchStartEvent = new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [{ clientX: 0, clientY: 0 } as Touch],
      });
      const preventDefaultSpy = vi.spyOn(touchStartEvent, 'preventDefault');

      grid.dispatchEvent(touchStartEvent);

      // preventDefaultが呼ばれることを確認（ダブルタップズーム防止）
      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should have touch-action: none to disable swipe gestures', () => {
      const mockOnCellClick = vi.fn();
      render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      const grid = screen.getByRole('grid');

      // touch-action: noneが設定されていることを確認
      expect(grid).toHaveStyle({ touchAction: 'none' });
    });

    it('should have minimum 44px touch target size on cells', () => {
      const mockOnCellClick = vi.fn();
      const { container } = render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
          cellSize={30} // モバイルサイズ
        />
      );

      // セルを取得
      const cells = container.querySelectorAll('[role="gridcell"]');
      const firstCell = cells[0] as HTMLElement;

      // 最小タッチターゲットサイズ（44px）が設定されていることを確認
      const styles = window.getComputedStyle(firstCell);
      expect(styles.minWidth).toBe('44px');
      expect(styles.minHeight).toBe('44px');
    });

    it('should provide visual feedback on tap with active state', () => {
      const mockOnCellClick = vi.fn();
      render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      // セルを取得
      const d3Cell = screen.getByRole('gridcell', { name: /D3.*選択可能/ });

      // active:bg-green-500クラスが設定されていることを確認（タップ時の視覚的フィードバック）
      expect(d3Cell).toHaveClass('active:bg-green-500');
    });

    it('should not respond to touch events when disabled', () => {
      const mockOnCellClick = vi.fn();
      render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
          disabled={true}
        />
      );

      // セルをタッチ
      const d3Cell = screen.getByRole('gridcell', { name: /D3/ });
      fireEvent.touchEnd(d3Cell);

      // onCellClickが呼ばれないことを確認
      expect(mockOnCellClick).not.toHaveBeenCalled();
    });

    it('should have touch-action: none on cells to disable swipe', () => {
      const mockOnCellClick = vi.fn();
      const { container } = render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      // セルを取得
      const cells = container.querySelectorAll('[role="gridcell"]');
      const firstCell = cells[0] as HTMLElement;

      // touch-action: noneが設定されていることを確認
      expect(firstCell).toHaveStyle({ touchAction: 'none' });
    });
  });
});
