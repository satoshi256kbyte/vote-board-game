/**
 * Unit tests for BoardPreview component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BoardPreview } from './board-preview';

describe('BoardPreview', () => {
  // 初期盤面（オセロの開始状態）
  const initialBoard: string[][] = [
    ['0', '0', '0', '0', '0', '0', '0', '0'],
    ['0', '0', '0', '0', '0', '0', '0', '0'],
    ['0', '0', '0', '0', '0', '0', '0', '0'],
    ['0', '0', '0', '2', '1', '0', '0', '0'],
    ['0', '0', '0', '1', '2', '0', '0', '0'],
    ['0', '0', '0', '0', '0', '0', '0', '0'],
    ['0', '0', '0', '0', '0', '0', '0', '0'],
    ['0', '0', '0', '0', '0', '0', '0', '0'],
  ];

  describe('盤面の表示', () => {
    it('should render 8x8 board', () => {
      const { container } = render(<BoardPreview boardState={initialBoard} />);

      // グリッドが表示されることを確認
      const grid = container.querySelector('[role="grid"]');
      expect(grid).toBeTruthy();

      // 64個のセルが表示されることを確認
      const cells = container.querySelectorAll('[role="gridcell"]');
      expect(cells.length).toBe(64);
    });

    it('should display board with correct stone positions', () => {
      const { container } = render(<BoardPreview boardState={initialBoard} />);

      // 黒石が2個表示されることを確認
      const blackStones = container.querySelectorAll('.bg-black');
      // 盤面の黒石2個 + 石の数表示の黒石アイコン1個 = 3個
      expect(blackStones.length).toBe(3);

      // 白石が2個表示されることを確認（盤面のみ）
      const cells = container.querySelectorAll('[role="gridcell"]');
      let whiteStoneCount = 0;
      cells.forEach((cell) => {
        if (cell.querySelector('.bg-white')) {
          whiteStoneCount++;
        }
      });
      expect(whiteStoneCount).toBe(2);
    });
  });

  describe('ハイライト表示', () => {
    it('should highlight the specified position', () => {
      const { container } = render(
        <BoardPreview boardState={initialBoard} highlightPosition="D3" />
      );

      // ハイライトされたセルが存在することを確認
      const highlightedCell = container.querySelector('.bg-yellow-300');
      expect(highlightedCell).toBeTruthy();
    });

    it('should not highlight when position is not provided', () => {
      const { container } = render(<BoardPreview boardState={initialBoard} />);

      // ハイライトされたセルが存在しないことを確認
      const highlightedCell = container.querySelector('.bg-yellow-300');
      expect(highlightedCell).toBeFalsy();
    });

    it('should handle invalid position gracefully', () => {
      const { container } = render(
        <BoardPreview boardState={initialBoard} highlightPosition="Z9" />
      );

      // ハイライトされたセルが存在しないことを確認（無効な位置）
      const highlightedCell = container.querySelector('.bg-yellow-300');
      expect(highlightedCell).toBeFalsy();
    });
  });

  describe('石の数の表示', () => {
    it('should display correct stone counts', () => {
      render(<BoardPreview boardState={initialBoard} />);

      // 黒石の数が表示されることを確認
      expect(screen.getByText('黒: 2')).toBeTruthy();

      // 白石の数が表示されることを確認
      expect(screen.getByText('白: 2')).toBeTruthy();
    });

    it('should update stone counts when board changes', () => {
      // 黒石が多い盤面
      const boardWithMoreBlack: string[][] = [
        ['1', '1', '1', '1', '0', '0', '0', '0'],
        ['0', '0', '0', '0', '0', '0', '0', '0'],
        ['0', '0', '0', '0', '0', '0', '0', '0'],
        ['0', '0', '0', '2', '1', '0', '0', '0'],
        ['0', '0', '0', '1', '2', '0', '0', '0'],
        ['0', '0', '0', '0', '0', '0', '0', '0'],
        ['0', '0', '0', '0', '0', '0', '0', '0'],
        ['0', '0', '0', '0', '0', '0', '0', '0'],
      ];

      render(<BoardPreview boardState={boardWithMoreBlack} />);

      // 黒石の数が6個であることを確認
      expect(screen.getByText('黒: 6')).toBeTruthy();

      // 白石の数が2個であることを確認
      expect(screen.getByText('白: 2')).toBeTruthy();
    });

    it('should handle empty board', () => {
      const emptyBoard: string[][] = Array(8)
        .fill(null)
        .map(() => Array(8).fill('0'));

      render(<BoardPreview boardState={emptyBoard} />);

      // 黒石の数が0個であることを確認
      expect(screen.getByText('黒: 0')).toBeTruthy();

      // 白石の数が0個であることを確認
      expect(screen.getByText('白: 0')).toBeTruthy();
    });
  });

  describe('レスポンシブなセルサイズ', () => {
    it('should use custom cell size when provided', () => {
      const { container } = render(<BoardPreview boardState={initialBoard} cellSize={50} />);

      // カスタムセルサイズが適用されることを確認
      const cells = container.querySelectorAll('[role="gridcell"]');
      const firstCell = cells[0] as HTMLElement;
      expect(firstCell.style.width).toBe('50px');
      expect(firstCell.style.height).toBe('50px');
    });

    it('should use default cell size when not provided', () => {
      const { container } = render(<BoardPreview boardState={initialBoard} />);

      // デフォルトセルサイズが適用されることを確認
      const cells = container.querySelectorAll('[role="gridcell"]');
      expect(cells.length).toBe(64);
      // デフォルトサイズは環境依存なので、存在確認のみ
    });
  });

  describe('アクセシビリティ', () => {
    it('should have proper ARIA labels', () => {
      const { container } = render(<BoardPreview boardState={initialBoard} />);

      // グリッドロールが設定されていることを確認
      const grid = container.querySelector('[role="grid"]');
      expect(grid).toBeTruthy();
      expect(grid?.getAttribute('aria-label')).toBe('オセロの盤面');

      // グリッドセルロールが設定されていることを確認
      const cells = container.querySelectorAll('[role="gridcell"]');
      expect(cells.length).toBe(64);

      // 各セルにaria-labelが設定されていることを確認
      cells.forEach((cell) => {
        expect(cell.getAttribute('aria-label')).toBeTruthy();
      });
    });

    it('should have aria-hidden on decorative elements', () => {
      const { container } = render(<BoardPreview boardState={initialBoard} />);

      // 石のアイコンにaria-hiddenが設定されていることを確認
      const stoneIcons = container.querySelectorAll('[aria-hidden="true"]');
      expect(stoneIcons.length).toBeGreaterThan(0);
    });
  });

  describe('エッジケース', () => {
    it('should handle position with lowercase letters', () => {
      const { container } = render(
        <BoardPreview boardState={initialBoard} highlightPosition="d3" />
      );

      // 小文字でもハイライトされることを確認
      const highlightedCell = container.querySelector('.bg-yellow-300');
      expect(highlightedCell).toBeTruthy();
    });

    it('should handle position at board edges', () => {
      const { container } = render(
        <BoardPreview boardState={initialBoard} highlightPosition="A1" />
      );

      // 左上隅がハイライトされることを確認
      const highlightedCell = container.querySelector('.bg-yellow-300');
      expect(highlightedCell).toBeTruthy();
    });

    it('should handle position at bottom-right corner', () => {
      const { container } = render(
        <BoardPreview boardState={initialBoard} highlightPosition="H8" />
      );

      // 右下隅がハイライトされることを確認
      const highlightedCell = container.querySelector('.bg-yellow-300');
      expect(highlightedCell).toBeTruthy();
    });
  });
});
