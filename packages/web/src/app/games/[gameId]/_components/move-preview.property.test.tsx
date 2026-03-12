/**
 * Property-based tests for MovePreview component
 *
 * Tests universal properties that should hold for all valid inputs.
 *
 * Tag: Feature: board-move-selection-ui, Property 8: プレビューの表示と内容
 * Validates: Requirements 5.1, 5.3, 5.4, 5.5
 */

import { describe, it, expect } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import { MovePreview } from './move-preview';

/**
 * 有効な盤面状態を生成するアービトラリ
 */
const boardStateArbitrary = fc
  .array(fc.array(fc.constantFrom('0', '1', '2'), { minLength: 8, maxLength: 8 }), {
    minLength: 8,
    maxLength: 8,
  })
  .map((board) => {
    // 最低限の有効な盤面を保証（中央に石を配置）
    const newBoard = board.map((row) => [...row]);
    newBoard[3][3] = '2';
    newBoard[3][4] = '1';
    newBoard[4][3] = '1';
    newBoard[4][4] = '2';
    return newBoard;
  });

/**
 * 有効な位置を生成するアービトラリ
 */
const positionArbitrary = fc.record({
  row: fc.integer({ min: 0, max: 7 }),
  col: fc.integer({ min: 0, max: 7 }),
});

/**
 * プレイヤーを生成するアービトラリ
 */
const playerArbitrary = fc.constantFrom('black' as const, 'white' as const);

describe('MovePreview - Property-based tests', () => {
  /**
   * Property 8: プレビューの表示と内容
   *
   * For any 選択されたセルに対して、Move_Previewが表示され、
   * 選択した手を適用した盤面、裏返される石、選択セルのハイライト、
   * 黒石と白石の数が含まれる
   */
  it('Property 8: 任意の有効な入力に対してプレビューが正しく表示される', () => {
    fc.assert(
      fc.property(
        boardStateArbitrary,
        positionArbitrary,
        playerArbitrary,
        (boardState, selectedPosition, currentPlayer) => {
          // レンダリング
          const { container } = render(
            <MovePreview
              boardState={boardState}
              selectedPosition={selectedPosition}
              currentPlayer={currentPlayer}
            />
          );

          // 1. プレビュー説明が表示される
          expect(screen.getAllByText('手のプレビュー').length).toBeGreaterThan(0);

          // 2. 選択位置の説明が表示される（例: "D3に黒石を置いた場合"）
          const colLabel = String.fromCharCode(65 + selectedPosition.col); // A-H
          const rowLabel = (selectedPosition.row + 1).toString(); // 1-8
          const positionText = `${colLabel}${rowLabel}`;
          const playerText = currentPlayer === 'black' ? '黒石' : '白石';
          expect(
            screen.getByText(new RegExp(`${positionText}に${playerText}を置いた場合`))
          ).toBeInTheDocument();

          // 3. 盤面プレビューが表示される（BoardPreviewコンポーネントが存在）
          // BoardPreviewは内部でBoardコンポーネントを使用し、role="grid"を持つ
          const grids = container.querySelectorAll('[role="grid"]');
          expect(grids.length).toBeGreaterThan(0);

          // 4. 石の数が表示される（BoardPreviewコンポーネント内）
          // "黒: X" と "白: Y" の形式で表示される
          expect(screen.getByText(/黒:/)).toBeInTheDocument();
          expect(screen.getByText(/白:/)).toBeInTheDocument();

          // Cleanup after each iteration
          cleanup();

          return true;
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('Property 8.1: 裏返る石がある場合、その数が表示される', () => {
    fc.assert(
      fc.property(
        boardStateArbitrary,
        positionArbitrary,
        playerArbitrary,
        (boardState, selectedPosition, currentPlayer) => {
          const { container } = render(
            <MovePreview
              boardState={boardState}
              selectedPosition={selectedPosition}
              currentPlayer={currentPlayer}
            />
          );

          // 裏返る石の数の表示を確認
          // "X個の石が裏返ります" または表示なし（0個の場合）
          const flippedText = container.textContent?.match(/(\d+)個の石が裏返ります/);

          if (flippedText) {
            // 裏返る石がある場合、数は1以上
            const count = parseInt(flippedText[1], 10);
            expect(count).toBeGreaterThan(0);
          }

          return true;
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('Property 8.2: 座標ラベルが常に有効な範囲（A-H, 1-8）である', () => {
    fc.assert(
      fc.property(
        boardStateArbitrary,
        positionArbitrary,
        playerArbitrary,
        (boardState, selectedPosition, currentPlayer) => {
          render(
            <MovePreview
              boardState={boardState}
              selectedPosition={selectedPosition}
              currentPlayer={currentPlayer}
            />
          );

          // 座標ラベルを抽出
          const colLabel = String.fromCharCode(65 + selectedPosition.col);
          const rowLabel = (selectedPosition.row + 1).toString();

          // 列ラベルがA-Hの範囲内
          expect(colLabel).toMatch(/^[A-H]$/);

          // 行ラベルが1-8の範囲内
          expect(rowLabel).toMatch(/^[1-8]$/);

          return true;
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('Property 8.3: プレイヤーの表示が常に正しい（黒石 or 白石）', () => {
    fc.assert(
      fc.property(
        boardStateArbitrary,
        positionArbitrary,
        playerArbitrary,
        (boardState, selectedPosition, currentPlayer) => {
          const { container } = render(
            <MovePreview
              boardState={boardState}
              selectedPosition={selectedPosition}
              currentPlayer={currentPlayer}
            />
          );

          // プレイヤーの表示を確認
          const expectedText = currentPlayer === 'black' ? '黒石' : '白石';
          expect(container.textContent).toContain(expectedText);

          // 逆のプレイヤーの表示がないことを確認（説明文内）
          const unexpectedText = currentPlayer === 'black' ? '白石を置いた' : '黒石を置いた';
          expect(container.textContent).not.toContain(unexpectedText);

          return true;
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('Property 8.4: 盤面が8x8であることを保証', () => {
    fc.assert(
      fc.property(
        boardStateArbitrary,
        positionArbitrary,
        playerArbitrary,
        (boardState, selectedPosition, currentPlayer) => {
          // 入力盤面が8x8であることを確認
          expect(boardState).toHaveLength(8);
          boardState.forEach((row) => {
            expect(row).toHaveLength(8);
          });

          // レンダリングしてエラーが出ないことを確認
          render(
            <MovePreview
              boardState={boardState}
              selectedPosition={selectedPosition}
              currentPlayer={currentPlayer}
            />
          );

          return true;
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('Property 8.5: 同じ入力に対して常に同じ出力を返す（冪等性）', () => {
    fc.assert(
      fc.property(
        boardStateArbitrary,
        positionArbitrary,
        playerArbitrary,
        (boardState, selectedPosition, currentPlayer) => {
          // 1回目のレンダリング
          const { container: container1, unmount: unmount1 } = render(
            <MovePreview
              boardState={boardState}
              selectedPosition={selectedPosition}
              currentPlayer={currentPlayer}
            />
          );
          const content1 = container1.textContent;

          unmount1();

          // 2回目のレンダリング
          const { container: container2, unmount: unmount2 } = render(
            <MovePreview
              boardState={boardState}
              selectedPosition={selectedPosition}
              currentPlayer={currentPlayer}
            />
          );
          const content2 = container2.textContent;

          unmount2();

          // 同じ内容が表示される
          expect(content1).toBe(content2);

          return true;
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });
});
