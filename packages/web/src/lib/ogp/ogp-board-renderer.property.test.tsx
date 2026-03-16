/**
 * OGP Board Renderer Property-Based Tests
 *
 * Feature: share-ogp-feature, Property 1: 盤面描画の正当性
 *
 * 任意の有効な 8x8 盤面（各セル 0-2）に対して、renderOgpBoard の JSX 構造が
 * 正しい要素を含むことを検証する。
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 2.1**
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import fc from 'fast-check';
import { renderOgpBoard } from './ogp-board-renderer';

// JSDOM converts hex colors to rgb() format
const BLACK_BG = 'rgb(0, 0, 0)';
const WHITE_BG = 'rgb(255, 255, 255)';
const GREEN_BG = 'rgb(16, 185, 129)';
const YELLOW_BG = 'rgb(253, 224, 71)';
const WHITE_BORDER = '2px solid rgb(209, 213, 219)';

describe('Feature: share-ogp-feature, Property 1: 盤面描画の正当性', () => {
  afterEach(() => {
    cleanup();
  });

  it('should render correct disc elements for any valid 8x8 board', () => {
    fc.assert(
      fc.property(
        fc.array(fc.array(fc.integer({ min: 0, max: 2 }), { minLength: 8, maxLength: 8 }), {
          minLength: 8,
          maxLength: 8,
        }),
        (boardState) => {
          const jsx = renderOgpBoard({ boardState });
          const { container } = render(jsx);

          // Count expected discs from boardState
          let expectedBlack = 0;
          let expectedWhite = 0;
          for (const row of boardState) {
            for (const cell of row) {
              if (cell === 1) expectedBlack++;
              if (cell === 2) expectedWhite++;
            }
          }

          const allDivs = container.querySelectorAll('div');
          let blackCount = 0;
          let whiteCount = 0;

          for (const div of allDivs) {
            const style = div.style;
            if (style.borderRadius === '50%') {
              // Requirement 1.3: Black discs have black background
              if (style.backgroundColor === BLACK_BG) {
                blackCount++;
              }
              // Requirement 1.3: White discs have white background with gray border
              if (style.backgroundColor === WHITE_BG) {
                expect(style.border).toBe(WHITE_BORDER);
                whiteCount++;
              }
            }
          }

          // Requirement 1.1, 2.1: Correct number of discs rendered
          expect(blackCount).toBe(expectedBlack);
          expect(whiteCount).toBe(expectedWhite);

          // Verify 64 cells are rendered (8x8 grid)
          let cellCount = 0;
          for (const div of allDivs) {
            if (div.style.alignItems === 'center' && div.style.justifyContent === 'center') {
              cellCount++;
            }
          }
          expect(cellCount).toBe(64);

          cleanup();
          return true;
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('should apply yellow background to highlighted cell for any valid board', () => {
    fc.assert(
      fc.property(
        fc.array(fc.array(fc.integer({ min: 0, max: 2 }), { minLength: 8, maxLength: 8 }), {
          minLength: 8,
          maxLength: 8,
        }),
        fc.integer({ min: 0, max: 7 }),
        fc.integer({ min: 0, max: 7 }),
        (boardState, highlightRow, highlightCol) => {
          const jsx = renderOgpBoard({
            boardState,
            highlightedCell: { row: highlightRow, col: highlightCol },
          });
          const { container } = render(jsx);

          // Requirement 1.2: Highlighted cell should have yellow background
          const allDivs = container.querySelectorAll('div');
          let yellowCount = 0;
          let greenCount = 0;

          for (const div of allDivs) {
            const bg = div.style.backgroundColor;
            if (bg === YELLOW_BG) yellowCount++;
            if (bg === GREEN_BG) greenCount++;
          }

          // Exactly one cell should have yellow background
          expect(yellowCount).toBe(1);
          // Remaining 63 cells should have green background
          expect(greenCount).toBe(63);

          cleanup();
          return true;
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('should render all cells with green background when no highlight is specified', () => {
    fc.assert(
      fc.property(
        fc.array(fc.array(fc.integer({ min: 0, max: 2 }), { minLength: 8, maxLength: 8 }), {
          minLength: 8,
          maxLength: 8,
        }),
        (boardState) => {
          const jsx = renderOgpBoard({ boardState });
          const { container } = render(jsx);

          // All 64 cells should have green background, none yellow
          const allDivs = container.querySelectorAll('div');
          let yellowCount = 0;
          let greenCount = 0;

          for (const div of allDivs) {
            const bg = div.style.backgroundColor;
            if (bg === YELLOW_BG) yellowCount++;
            if (bg === GREEN_BG) greenCount++;
          }

          expect(yellowCount).toBe(0);
          expect(greenCount).toBe(64);

          cleanup();
          return true;
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });
});
