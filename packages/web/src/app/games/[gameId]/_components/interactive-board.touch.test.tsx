import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InteractiveBoard } from './interactive-board';

describe('InteractiveBoard - Touch Device Support', () => {
  const mockOnCellClick = vi.fn();

  // 初期盤面（中央に黒白が配置された状態）
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

  beforeEach(() => {
    mockOnCellClick.mockClear();
  });

  describe('タッチイベントのサポート', () => {
    it('タッチイベントで合法手のセルを選択できる', () => {
      const { container } = render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      // 合法手のセル（例: 2,3）を取得
      const cells = container.querySelectorAll('[role="gridcell"]');
      const targetCell = cells[19]; // row 2, col 3

      // タッチイベントをシミュレート
      const touchEndEvent = new TouchEvent('touchend', {
        bubbles: true,
        cancelable: true,
      });

      targetCell.dispatchEvent(touchEndEvent);

      // onCellClickが呼ばれることを確認
      expect(mockOnCellClick).toHaveBeenCalledWith(2, 3);
    });

    it('タッチイベントで非合法手のセルをタップしてもonCellClickが呼ばれない', () => {
      const { container } = render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      // 非合法手のセル（例: 0,0）を取得
      const cells = container.querySelectorAll('[role="gridcell"]');
      const targetCell = cells[0]; // row 0, col 0

      // タッチイベントをシミュレート
      const touchEndEvent = new TouchEvent('touchend', {
        bubbles: true,
        cancelable: true,
      });

      targetCell.dispatchEvent(touchEndEvent);

      // onCellClickが呼ばれないことを確認
      expect(mockOnCellClick).not.toHaveBeenCalled();
    });

    it('無効化されている場合、タッチイベントでセルを選択できない', () => {
      const { container } = render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
          disabled={true}
        />
      );

      // 合法手のセル（例: 2,3）を取得
      const cells = container.querySelectorAll('[role="gridcell"]');
      const targetCell = cells[19]; // row 2, col 3

      // タッチイベントをシミュレート
      const touchEndEvent = new TouchEvent('touchend', {
        bubbles: true,
        cancelable: true,
      });

      targetCell.dispatchEvent(touchEndEvent);

      // onCellClickが呼ばれないことを確認
      expect(mockOnCellClick).not.toHaveBeenCalled();
    });

    it('ダブルタップズームを防止するためpreventDefaultが呼ばれる', () => {
      const { container } = render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      const board = container.querySelector('[role="grid"]');
      expect(board).toBeTruthy();

      // touchstartイベントをシミュレート
      const touchStartEvent = new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
      });

      const preventDefaultSpy = vi.spyOn(touchStartEvent, 'preventDefault');
      board!.dispatchEvent(touchStartEvent);

      // preventDefaultが呼ばれることを確認
      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('スワイプジェスチャーを無効化するためtouchActionがnoneに設定されている', () => {
      const { container } = render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      const board = container.querySelector('[role="grid"]') as HTMLElement;
      expect(board).toBeTruthy();

      // touchActionがnoneに設定されていることを確認
      expect(board.style.touchAction).toBe('none');
    });

    it('セルのtouchActionがnoneに設定されている', () => {
      const { container } = render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      const cells = container.querySelectorAll('[role="gridcell"]');
      const firstCell = cells[0];

      // touchActionがnoneに設定されていることを確認
      expect((firstCell as HTMLElement).style.touchAction).toBe('none');
    });
  });

  describe('タッチターゲットサイズ', () => {
    it('デフォルトのセルサイズが最小44pxのタッチターゲットサイズを満たす', () => {
      const { container } = render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      const cells = container.querySelectorAll('[role="gridcell"]');
      const firstCell = cells[0] as HTMLElement;

      // minWidthとminHeightが44px以上であることを確認
      const minWidth = parseInt(firstCell.style.minWidth, 10);
      const minHeight = parseInt(firstCell.style.minHeight, 10);

      expect(minWidth).toBeGreaterThanOrEqual(44);
      expect(minHeight).toBeGreaterThanOrEqual(44);
    });

    it('カスタムセルサイズでも最小44pxのタッチターゲットサイズを満たす', () => {
      const { container } = render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
          cellSize={30} // 30pxのセルサイズを指定
        />
      );

      const cells = container.querySelectorAll('[role="gridcell"]');
      const firstCell = cells[0] as HTMLElement;

      // minWidthとminHeightが44px以上であることを確認
      const minWidth = parseInt(firstCell.style.minWidth, 10);
      const minHeight = parseInt(firstCell.style.minHeight, 10);

      expect(minWidth).toBeGreaterThanOrEqual(44);
      expect(minHeight).toBeGreaterThanOrEqual(44);
    });

    it('すべてのセルが同じタッチターゲットサイズを持つ', () => {
      const { container } = render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      const cells = container.querySelectorAll('[role="gridcell"]');

      // すべてのセルのminWidthとminHeightを取得
      const sizes = Array.from(cells).map((cell) => {
        const htmlCell = cell as HTMLElement;
        return {
          minWidth: parseInt(htmlCell.style.minWidth, 10),
          minHeight: parseInt(htmlCell.style.minHeight, 10),
        };
      });

      // すべてのセルが同じサイズであることを確認
      const firstSize = sizes[0];
      sizes.forEach((size) => {
        expect(size.minWidth).toBe(firstSize.minWidth);
        expect(size.minHeight).toBe(firstSize.minHeight);
      });
    });
  });

  describe('タップ時の視覚的フィードバック', () => {
    it('タップ時にactive状態のスタイルが適用される', () => {
      const { container } = render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      const cells = container.querySelectorAll('[role="gridcell"]');
      const firstCell = cells[0] as HTMLElement;

      // active状態のクラスが含まれていることを確認
      expect(firstCell.className).toContain('active:bg-green-500');
    });

    it('選択されたセルにハイライトが表示される', () => {
      const { container } = render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={{ row: 2, col: 3 }}
          onCellClick={mockOnCellClick}
        />
      );

      const cells = container.querySelectorAll('[role="gridcell"]');
      const selectedCell = cells[19]; // row 2, col 3

      // 選択ハイライトが表示されていることを確認
      const highlight = selectedCell.querySelector('.border-blue-500');
      expect(highlight).toBeTruthy();
    });

    it('選択されたセルにaria-selected属性が設定される', () => {
      const { container } = render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={{ row: 2, col: 3 }}
          onCellClick={mockOnCellClick}
        />
      );

      const cells = container.querySelectorAll('[role="gridcell"]');
      const selectedCell = cells[19]; // row 2, col 3

      // aria-selected属性が設定されていることを確認
      expect(selectedCell.getAttribute('aria-selected')).toBe('true');
    });
  });

  describe('無効化状態でのタッチ動作', () => {
    it('無効化されている場合、セルにcursor-not-allowedクラスが適用される', () => {
      const { container } = render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
          disabled={true}
        />
      );

      const cells = container.querySelectorAll('[role="gridcell"]');
      const firstCell = cells[0] as HTMLElement;

      // cursor-not-allowedクラスが含まれていることを確認
      expect(firstCell.className).toContain('cursor-not-allowed');
    });

    it('無効化されている場合、セルに透明度が適用される', () => {
      const { container } = render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
          disabled={true}
        />
      );

      const cells = container.querySelectorAll('[role="gridcell"]');
      const firstCell = cells[0] as HTMLElement;

      // opacity-50クラスが含まれていることを確認
      expect(firstCell.className).toContain('opacity-50');
    });

    it('無効化されている場合、盤面のtabIndexが-1に設定される', () => {
      const { container } = render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
          disabled={true}
        />
      );

      const board = container.querySelector('[role="grid"]');
      expect(board).toBeTruthy();

      // tabIndexが-1に設定されていることを確認
      expect(board!.getAttribute('tabIndex')).toBe('-1');
    });
  });

  describe('合法手インジケーターの視認性', () => {
    it('合法手のセルにValidMoveIndicatorが表示される', () => {
      const { container } = render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      // 合法手のセル（例: 2,3）を取得
      const cells = container.querySelectorAll('[role="gridcell"]');
      const legalMoveCell = cells[19]; // row 2, col 3

      // ValidMoveIndicatorが表示されていることを確認
      // ValidMoveIndicatorは緑色の円として表示される
      const indicator = legalMoveCell.querySelector('.bg-green-200');
      expect(indicator).toBeTruthy();
    });

    it('非合法手のセルにValidMoveIndicatorが表示されない', () => {
      const { container } = render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      // 非合法手のセル（例: 0,0）を取得
      const cells = container.querySelectorAll('[role="gridcell"]');
      const illegalMoveCell = cells[0]; // row 0, col 0

      // ValidMoveIndicatorが表示されていないことを確認
      const indicator = illegalMoveCell.querySelector('.bg-green-200');
      expect(indicator).toBeNull();
    });

    it('石が置かれているセルにValidMoveIndicatorが表示されない', () => {
      const { container } = render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      // 石が置かれているセル（例: 3,3 - white）を取得
      const cells = container.querySelectorAll('[role="gridcell"]');
      const occupiedCell = cells[27]; // row 3, col 3

      // ValidMoveIndicatorが表示されていないことを確認
      const indicator = occupiedCell.querySelector('.bg-green-200');
      expect(indicator).toBeNull();
    });
  });

  describe('エラーメッセージの表示', () => {
    it('非合法手をタップした場合、エラーメッセージが表示される', () => {
      const { container } = render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      // 非合法手のセル（例: 0,0）を取得
      const cells = container.querySelectorAll('[role="gridcell"]');
      const targetCell = cells[0] as HTMLElement; // row 0, col 0

      // クリックイベントをシミュレート
      fireEvent.click(targetCell);

      // エラーメッセージが表示されることを確認
      const errorMessage = screen.queryByRole('alert');
      expect(errorMessage).toBeTruthy();
      expect(errorMessage?.textContent).toBe('この位置には石を置けません');
    });

    it('合法手をタップした場合、エラーメッセージが表示されない', () => {
      const { container } = render(
        <InteractiveBoard
          boardState={initialBoardState}
          currentPlayer="black"
          selectedPosition={null}
          onCellClick={mockOnCellClick}
        />
      );

      // 合法手のセル（例: 2,3）を取得
      const cells = container.querySelectorAll('[role="gridcell"]');
      const targetCell = cells[19] as HTMLElement; // row 2, col 3

      // クリックイベントをシミュレート
      fireEvent.click(targetCell);

      // エラーメッセージが表示されないことを確認
      const errorMessage = screen.queryByRole('alert');
      expect(errorMessage).toBeNull();
    });
  });
});
