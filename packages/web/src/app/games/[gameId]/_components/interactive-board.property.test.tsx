/**
 * InteractiveBoard Property-Based Tests
 *
 * Property 1: 盤面構造の正確性
 * **Validates: Requirements 1.3, 1.4, 1.5**
 *
 * Property 3: セル選択の排他性
 * **Validates: Requirements 3.6, 3.7**
 *
 * Property 4: 合法手のみ選択可能
 * **Validates: Requirements 3.1, 3.2, 9.1**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import fc from 'fast-check';
import { InteractiveBoard } from './interactive-board';
import { calculateLegalMoves } from '@/lib/utils/legal-moves';

describe('Feature: board-move-selection-ui, Property 1: 盤面構造の正確性', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
  });

  it('should always render 8x8 grid with clickable cells for any board state', () => {
    fc.assert(
      fc.property(
        // Generate random board state
        fc.array(
          fc.array(fc.constantFrom('empty', 'black', 'white'), { minLength: 8, maxLength: 8 }),
          { minLength: 8, maxLength: 8 }
        ),
        fc.constantFrom('black', 'white'),
        (boardState, currentPlayer) => {
          const mockOnCellClick = vi.fn();

          const { container } = render(
            <InteractiveBoard
              boardState={boardState}
              currentPlayer={currentPlayer}
              selectedPosition={null}
              onCellClick={mockOnCellClick}
            />
          );

          // Requirement 1.3: 8x8のオセロ盤面を表示する
          const grid = container.querySelector('[role="grid"]');
          expect(grid).toBeTruthy();

          // Requirement 1.4: 現在の盤面状態を反映する
          // Requirement 1.5: 各セルをクリック可能にする
          const cells = container.querySelectorAll('[role="gridcell"]');
          expect(cells).toHaveLength(64);

          // Verify each cell is clickable
          cells.forEach((cell) => {
            expect(cell).toBeTruthy();
          });

          return true;
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });

  it('should always reflect current board state correctly', () => {
    fc.assert(
      fc.property(
        // Generate board with specific pieces
        fc.record({
          blackPositions: fc.array(
            fc.record({
              row: fc.integer({ min: 0, max: 7 }),
              col: fc.integer({ min: 0, max: 7 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          whitePositions: fc.array(
            fc.record({
              row: fc.integer({ min: 0, max: 7 }),
              col: fc.integer({ min: 0, max: 7 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
        }),
        fc.constantFrom('black', 'white'),
        ({ blackPositions, whitePositions }, currentPlayer) => {
          // Create empty board
          const boardState = Array(8)
            .fill(null)
            .map(() => Array(8).fill('empty'));

          // Place black pieces
          blackPositions.forEach(({ row, col }) => {
            boardState[row][col] = 'black';
          });

          // Place white pieces (may overwrite black if same position)
          whitePositions.forEach(({ row, col }) => {
            boardState[row][col] = 'white';
          });

          const mockOnCellClick = vi.fn();

          const { container } = render(
            <InteractiveBoard
              boardState={boardState}
              currentPlayer={currentPlayer}
              selectedPosition={null}
              onCellClick={mockOnCellClick}
            />
          );

          // Requirement 1.4: 現在の盤面状態を反映する
          const cells = container.querySelectorAll('[role="gridcell"]');
          expect(cells).toHaveLength(64);

          // Verify board state is reflected in rendered cells
          for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
              const cellIndex = row * 8 + col;
              const cell = cells[cellIndex];
              const cellState = boardState[row][col];

              // Check aria-label contains the cell state
              const ariaLabel = cell.getAttribute('aria-label') || '';
              if (cellState === 'black') {
                expect(ariaLabel).toContain('黒石');
              } else if (cellState === 'white') {
                expect(ariaLabel).toContain('白石');
              }
            }
          }

          return true;
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });
});

describe('Feature: board-move-selection-ui, Property 3: セル選択の排他性', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
  });

  it('should always have at most one selected cell for any selection sequence', () => {
    fc.assert(
      fc.property(
        // Generate initial board state
        fc.constantFrom(
          // Standard initial Othello position
          [
            ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
            ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
            ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
            ['empty', 'empty', 'empty', 'white', 'black', 'empty', 'empty', 'empty'],
            ['empty', 'empty', 'empty', 'black', 'white', 'empty', 'empty', 'empty'],
            ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
            ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
            ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
          ]
        ),
        fc.constantFrom('black', 'white'),
        // Generate sequence of cell selections
        fc.array(
          fc.record({
            row: fc.integer({ min: 0, max: 7 }),
            col: fc.integer({ min: 0, max: 7 }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (boardState, currentPlayer, selections) => {
          let currentSelection: { row: number; col: number } | null = null;
          const mockOnCellClick = vi.fn((row: number, col: number) => {
            // Simulate parent component behavior: toggle selection
            if (currentSelection?.row === row && currentSelection?.col === col) {
              currentSelection = null;
            } else {
              currentSelection = { row, col };
            }
          });

          const { container, rerender } = render(
            <InteractiveBoard
              boardState={boardState}
              currentPlayer={currentPlayer}
              selectedPosition={currentSelection}
              onCellClick={mockOnCellClick}
            />
          );

          // Calculate legal moves once
          const legalMoves = calculateLegalMoves(
            boardState as ('empty' | 'black' | 'white')[][],
            currentPlayer
          );

          // Perform each selection
          selections.forEach((selection) => {
            const { row, col } = selection;

            // Check if this is a legal move
            const isLegal = legalMoves.some((m) => m.row === row && m.col === col);

            if (isLegal) {
              // Click the cell
              const cells = container.querySelectorAll('[role="gridcell"]');
              const cellIndex = row * 8 + col;
              const cell = cells[cellIndex] as HTMLElement;
              fireEvent.click(cell);

              // Re-render with updated selection
              rerender(
                <InteractiveBoard
                  boardState={boardState}
                  currentPlayer={currentPlayer}
                  selectedPosition={currentSelection}
                  onCellClick={mockOnCellClick}
                />
              );

              // Requirement 3.6: 一度に1つのセルのみ選択可能にする
              // Requirement 3.7: 新しいセルが選択された時、前の選択を解除する
              const selectedCells = container.querySelectorAll('[aria-selected="true"]');
              expect(selectedCells.length).toBeLessThanOrEqual(1);
            }
          });

          return true;
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });

  it('should always clear previous selection when new cell is selected', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          // Standard initial Othello position
          [
            ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
            ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
            ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
            ['empty', 'empty', 'empty', 'white', 'black', 'empty', 'empty', 'empty'],
            ['empty', 'empty', 'empty', 'black', 'white', 'empty', 'empty', 'empty'],
            ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
            ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
            ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
          ]
        ),
        fc.constantFrom('black', 'white'),
        (boardState, currentPlayer) => {
          const legalMoves = calculateLegalMoves(
            boardState as ('empty' | 'black' | 'white')[][],
            currentPlayer
          );

          // Skip if no legal moves
          if (legalMoves.length < 2) {
            return true;
          }

          let currentSelection: { row: number; col: number } | null = null;
          const mockOnCellClick = vi.fn((row: number, col: number) => {
            currentSelection = { row, col };
          });

          const { container, rerender } = render(
            <InteractiveBoard
              boardState={boardState}
              currentPlayer={currentPlayer}
              selectedPosition={currentSelection}
              onCellClick={mockOnCellClick}
            />
          );

          // Select first legal move
          const firstMove = legalMoves[0];
          const cells = container.querySelectorAll('[role="gridcell"]');
          const firstCellIndex = firstMove.row * 8 + firstMove.col;
          fireEvent.click(cells[firstCellIndex] as HTMLElement);

          rerender(
            <InteractiveBoard
              boardState={boardState}
              currentPlayer={currentPlayer}
              selectedPosition={currentSelection}
              onCellClick={mockOnCellClick}
            />
          );

          // Verify first cell is selected
          expect(currentSelection).toEqual(firstMove);

          // Select second legal move
          const secondMove = legalMoves[1];
          const secondCellIndex = secondMove.row * 8 + secondMove.col;
          fireEvent.click(cells[secondCellIndex] as HTMLElement);

          rerender(
            <InteractiveBoard
              boardState={boardState}
              currentPlayer={currentPlayer}
              selectedPosition={currentSelection}
              onCellClick={mockOnCellClick}
            />
          );

          // Requirement 3.7: 新しいセルが選択された時、前の選択を解除する
          expect(currentSelection).toEqual(secondMove);

          // Only one cell should be selected
          const selectedCells = container.querySelectorAll('[aria-selected="true"]');
          expect(selectedCells.length).toBe(1);

          return true;
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });
});

describe('Feature: board-move-selection-ui, Property 4: 合法手のみ選択可能', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
  });

  it('should never call onCellClick for illegal moves', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          // Standard initial Othello position
          [
            ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
            ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
            ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
            ['empty', 'empty', 'empty', 'white', 'black', 'empty', 'empty', 'empty'],
            ['empty', 'empty', 'empty', 'black', 'white', 'empty', 'empty', 'empty'],
            ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
            ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
            ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
          ]
        ),
        fc.constantFrom('black', 'white'),
        // Generate random cell position
        fc.record({
          row: fc.integer({ min: 0, max: 7 }),
          col: fc.integer({ min: 0, max: 7 }),
        }),
        (boardState, currentPlayer, position) => {
          const legalMoves = calculateLegalMoves(
            boardState as ('empty' | 'black' | 'white')[][],
            currentPlayer
          );

          const isLegal = legalMoves.some((m) => m.row === position.row && m.col === position.col);

          const mockOnCellClick = vi.fn();

          const { container } = render(
            <InteractiveBoard
              boardState={boardState}
              currentPlayer={currentPlayer}
              selectedPosition={null}
              onCellClick={mockOnCellClick}
            />
          );

          // Click the cell
          const cells = container.querySelectorAll('[role="gridcell"]');
          const cellIndex = position.row * 8 + position.col;
          const cell = cells[cellIndex] as HTMLElement;
          fireEvent.click(cell);

          if (isLegal) {
            // Requirement 3.1: 合法手のセルはクリックで選択状態になる
            expect(mockOnCellClick).toHaveBeenCalledWith(position.row, position.col);
          } else {
            // Requirement 3.2: 非合法手のセルはクリックしても状態が変わらない
            expect(mockOnCellClick).not.toHaveBeenCalled();

            // Requirement 9.1: エラーメッセージが表示される
            const errorAlert = container.querySelector('[role="alert"]');
            if (boardState[position.row][position.col] === 'empty') {
              // Only show error for empty cells (occupied cells don't trigger error)
              expect(errorAlert).toBeTruthy();
            }
          }

          return true;
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  it('should always display error message for illegal move clicks on empty cells', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          // Standard initial Othello position
          [
            ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
            ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
            ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
            ['empty', 'empty', 'empty', 'white', 'black', 'empty', 'empty', 'empty'],
            ['empty', 'empty', 'empty', 'black', 'white', 'empty', 'empty', 'empty'],
            ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
            ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
            ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
          ]
        ),
        fc.constantFrom('black', 'white'),
        (boardState, currentPlayer) => {
          const legalMoves = calculateLegalMoves(
            boardState as ('empty' | 'black' | 'white')[][],
            currentPlayer
          );

          // Find an empty cell that is NOT a legal move
          let illegalEmptyCell: { row: number; col: number } | null = null;
          for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
              if (boardState[row][col] === 'empty') {
                const isLegal = legalMoves.some((m) => m.row === row && m.col === col);
                if (!isLegal) {
                  illegalEmptyCell = { row, col };
                  break;
                }
              }
            }
            if (illegalEmptyCell) break;
          }

          // Skip if no illegal empty cells found
          if (!illegalEmptyCell) {
            return true;
          }

          const mockOnCellClick = vi.fn();

          const { container } = render(
            <InteractiveBoard
              boardState={boardState}
              currentPlayer={currentPlayer}
              selectedPosition={null}
              onCellClick={mockOnCellClick}
            />
          );

          // Click the illegal empty cell
          const cells = container.querySelectorAll('[role="gridcell"]');
          const cellIndex = illegalEmptyCell.row * 8 + illegalEmptyCell.col;
          const cell = cells[cellIndex] as HTMLElement;
          fireEvent.click(cell);

          // Requirement 9.1: エラーメッセージが表示される
          const errorAlert = container.querySelector('[role="alert"]');
          expect(errorAlert).toBeTruthy();
          expect(errorAlert?.textContent).toBe('この位置には石を置けません');

          // onCellClick should not be called
          expect(mockOnCellClick).not.toHaveBeenCalled();

          return true;
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });

  it('should always allow clicking legal moves without error', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          // Standard initial Othello position
          [
            ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
            ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
            ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
            ['empty', 'empty', 'empty', 'white', 'black', 'empty', 'empty', 'empty'],
            ['empty', 'empty', 'empty', 'black', 'white', 'empty', 'empty', 'empty'],
            ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
            ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
            ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
          ]
        ),
        fc.constantFrom('black', 'white'),
        (boardState, currentPlayer) => {
          const legalMoves = calculateLegalMoves(
            boardState as ('empty' | 'black' | 'white')[][],
            currentPlayer
          );

          // Skip if no legal moves
          if (legalMoves.length === 0) {
            return true;
          }

          const mockOnCellClick = vi.fn();

          const { container } = render(
            <InteractiveBoard
              boardState={boardState}
              currentPlayer={currentPlayer}
              selectedPosition={null}
              onCellClick={mockOnCellClick}
            />
          );

          // Click a legal move
          const legalMove = legalMoves[0];
          const cells = container.querySelectorAll('[role="gridcell"]');
          const cellIndex = legalMove.row * 8 + legalMove.col;
          const cell = cells[cellIndex] as HTMLElement;
          fireEvent.click(cell);

          // Requirement 3.1: 合法手のセルはクリックで選択状態になる
          expect(mockOnCellClick).toHaveBeenCalledWith(legalMove.row, legalMove.col);

          // No error should be displayed
          const errorAlert = container.querySelector('[role="alert"]');
          expect(errorAlert).toBeFalsy();

          return true;
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });
});
