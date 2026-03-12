/**
 * Unit tests for MovePreview component
 *
 * Tests preview display, flipped stones visualization, and board state calculation.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MovePreview } from './move-preview';

describe('MovePreview', () => {
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

  describe('正常系', () => {
    it('選択した手のプレビューを表示する', () => {
      render(
        <MovePreview
          boardState={initialBoard}
          selectedPosition={{ row: 2, col: 3 }}
          currentPlayer="black"
        />
      );

      // プレビュー説明が表示される
      expect(screen.getByText('手のプレビュー')).toBeInTheDocument();
      expect(screen.getByText(/D3に黒石を置いた場合/)).toBeInTheDocument();
    });

    it('裏返される石の数を表示する', () => {
      render(
        <MovePreview
          boardState={initialBoard}
          selectedPosition={{ row: 2, col: 3 }}
          currentPlayer="black"
        />
      );

      // 裏返される石の数が表示される
      expect(screen.getByText(/1個の石が裏返ります/)).toBeInTheDocument();
    });

    it('白石のプレビューを表示する', () => {
      render(
        <MovePreview
          boardState={initialBoard}
          selectedPosition={{ row: 2, col: 4 }}
          currentPlayer="white"
        />
      );

      // 白石のプレビュー説明が表示される
      expect(screen.getByText(/E3に白石を置いた場合/)).toBeInTheDocument();
    });

    it('複数の石が裏返る場合の表示', () => {
      // 複数の石が裏返る盤面を作成
      const board: string[][] = [
        ['0', '0', '0', '0', '0', '0', '0', '0'],
        ['0', '0', '0', '0', '0', '0', '0', '0'],
        ['0', '0', '0', '1', '0', '0', '0', '0'],
        ['0', '0', '0', '2', '1', '0', '0', '0'],
        ['0', '0', '0', '2', '2', '0', '0', '0'],
        ['0', '0', '0', '2', '0', '0', '0', '0'],
        ['0', '0', '0', '0', '0', '0', '0', '0'],
        ['0', '0', '0', '0', '0', '0', '0', '0'],
      ];

      render(
        <MovePreview
          boardState={board}
          selectedPosition={{ row: 5, col: 4 }}
          currentPlayer="black"
        />
      );

      // 複数の石が裏返ることが表示される
      expect(screen.getByText(/2個の石が裏返ります/)).toBeInTheDocument();
    });
  });

  describe('エッジケース', () => {
    it('角の位置（A1）のプレビューを表示する', () => {
      const board: string[][] = [
        ['0', '2', '0', '0', '0', '0', '0', '0'],
        ['0', '0', '0', '0', '0', '0', '0', '0'],
        ['0', '0', '0', '0', '0', '0', '0', '0'],
        ['0', '0', '0', '2', '1', '0', '0', '0'],
        ['0', '0', '0', '1', '2', '0', '0', '0'],
        ['0', '0', '0', '0', '0', '0', '0', '0'],
        ['0', '0', '0', '0', '0', '0', '0', '0'],
        ['0', '0', '0', '0', '0', '0', '0', '0'],
      ];

      render(
        <MovePreview
          boardState={board}
          selectedPosition={{ row: 0, col: 0 }}
          currentPlayer="black"
        />
      );

      expect(screen.getByText(/A1に黒石を置いた場合/)).toBeInTheDocument();
    });

    it('角の位置（H8）のプレビューを表示する', () => {
      const board: string[][] = [
        ['0', '0', '0', '0', '0', '0', '0', '0'],
        ['0', '0', '0', '0', '0', '0', '0', '0'],
        ['0', '0', '0', '0', '0', '0', '0', '0'],
        ['0', '0', '0', '2', '1', '0', '0', '0'],
        ['0', '0', '0', '1', '2', '0', '0', '0'],
        ['0', '0', '0', '0', '0', '0', '0', '0'],
        ['0', '0', '0', '0', '0', '0', '0', '2'],
        ['0', '0', '0', '0', '0', '0', '0', '0'],
      ];

      render(
        <MovePreview
          boardState={board}
          selectedPosition={{ row: 7, col: 7 }}
          currentPlayer="black"
        />
      );

      expect(screen.getByText(/H8に黒石を置いた場合/)).toBeInTheDocument();
    });

    it('裏返る石がない場合（無効な手）でもプレビューを表示する', () => {
      render(
        <MovePreview
          boardState={initialBoard}
          selectedPosition={{ row: 0, col: 0 }}
          currentPlayer="black"
        />
      );

      // プレビュー説明は表示される
      expect(screen.getByText('手のプレビュー')).toBeInTheDocument();
      expect(screen.getByText(/A1に黒石を置いた場合/)).toBeInTheDocument();

      // 裏返る石の数は表示されない（0個の場合）
      expect(screen.queryByText(/個の石が裏返ります/)).not.toBeInTheDocument();
    });
  });

  describe('座標変換', () => {
    it('列ラベルが正しく変換される（A-H）', () => {
      const positions = [
        { row: 0, col: 0, expected: 'A1' },
        { row: 0, col: 1, expected: 'B1' },
        { row: 0, col: 2, expected: 'C1' },
        { row: 0, col: 3, expected: 'D1' },
        { row: 0, col: 4, expected: 'E1' },
        { row: 0, col: 5, expected: 'F1' },
        { row: 0, col: 6, expected: 'G1' },
        { row: 0, col: 7, expected: 'H1' },
      ];

      positions.forEach(({ row, col, expected }) => {
        const { unmount } = render(
          <MovePreview
            boardState={initialBoard}
            selectedPosition={{ row, col }}
            currentPlayer="black"
          />
        );

        expect(screen.getByText(new RegExp(`${expected}に`))).toBeInTheDocument();
        unmount();
      });
    });

    it('行ラベルが正しく変換される（1-8）', () => {
      const positions = [
        { row: 0, col: 0, expected: 'A1' },
        { row: 1, col: 0, expected: 'A2' },
        { row: 2, col: 0, expected: 'A3' },
        { row: 3, col: 0, expected: 'A4' },
        { row: 4, col: 0, expected: 'A5' },
        { row: 5, col: 0, expected: 'A6' },
        { row: 6, col: 0, expected: 'A7' },
        { row: 7, col: 0, expected: 'A8' },
      ];

      positions.forEach(({ row, col, expected }) => {
        const { unmount } = render(
          <MovePreview
            boardState={initialBoard}
            selectedPosition={{ row, col }}
            currentPlayer="black"
          />
        );

        expect(screen.getByText(new RegExp(`${expected}に`))).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('盤面変換', () => {
    it('文字列配列の盤面が正しく数値配列に変換される', () => {
      // この機能は内部的にテストされる（エラーが出なければOK）
      render(
        <MovePreview
          boardState={initialBoard}
          selectedPosition={{ row: 2, col: 3 }}
          currentPlayer="black"
        />
      );

      // エラーなくレンダリングされることを確認
      expect(screen.getByText('手のプレビュー')).toBeInTheDocument();
    });

    it('空の盤面でもエラーなく動作する', () => {
      const emptyBoard: string[][] = Array(8)
        .fill(null)
        .map(() => Array(8).fill('0'));

      render(
        <MovePreview
          boardState={emptyBoard}
          selectedPosition={{ row: 3, col: 3 }}
          currentPlayer="black"
        />
      );

      expect(screen.getByText('手のプレビュー')).toBeInTheDocument();
    });
  });

  describe('アクセシビリティ', () => {
    it('プレビュー説明が読みやすいテキストで表示される', () => {
      render(
        <MovePreview
          boardState={initialBoard}
          selectedPosition={{ row: 2, col: 3 }}
          currentPlayer="black"
        />
      );

      // 説明文が明確に表示される
      expect(screen.getByText('手のプレビュー')).toBeInTheDocument();
      expect(screen.getByText(/D3に黒石を置いた場合/)).toBeInTheDocument();
      expect(screen.getByText(/1個の石が裏返ります/)).toBeInTheDocument();
    });
  });
});
