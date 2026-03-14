/**
 * PromptBuilder ユニットテスト
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 */

import { describe, it, expect } from 'vitest';
import { formatBoard, buildPrompt, getSystemPrompt } from '../prompt-builder.js';
import { createInitialBoard, CellState } from '../../../lib/othello/index.js';
import type { Board, Position } from '../../../lib/othello/index.js';

describe('formatBoard', () => {
  it('初期盤面を正しいグリッド文字列に変換する', () => {
    const board = createInitialBoard();
    const result = formatBoard(board);

    const expected = [
      '  0 1 2 3 4 5 6 7',
      '0 . . . . . . . .',
      '1 . . . . . . . .',
      '2 . . . . . . . .',
      '3 . . . ○ ● . . .',
      '4 . . . ● ○ . . .',
      '5 . . . . . . . .',
      '6 . . . . . . . .',
      '7 . . . . . . . .',
    ].join('\n');

    expect(result).toBe(expected);
  });

  it('空の盤面をすべてドットで表示する', () => {
    const board: Board = Array.from({ length: 8 }, () =>
      Array.from({ length: 8 }, () => CellState.Empty)
    );
    const result = formatBoard(board);

    const lines = result.split('\n');
    // ヘッダー行 + 8データ行
    expect(lines).toHaveLength(9);
    expect(lines[0]).toBe('  0 1 2 3 4 5 6 7');
    // 各データ行はすべてドット
    for (let i = 1; i <= 8; i++) {
      expect(lines[i]).toBe(`${i - 1} . . . . . . . .`);
    }
  });
});

describe('getSystemPrompt', () => {
  it('オセロの専門家としての役割を含む', () => {
    const prompt = getSystemPrompt();

    expect(prompt).toContain('オセロ');
    expect(prompt).toContain('専門家');
  });
});

describe('buildPrompt', () => {
  it('盤面グリッド、合法手、手番、候補数3、200文字制限、JSON形式を含む', () => {
    const board = createInitialBoard();
    const legalMoves: Position[] = [
      { row: 2, col: 3 },
      { row: 3, col: 2 },
      { row: 4, col: 5 },
      { row: 5, col: 4 },
    ];
    const result = buildPrompt(board, legalMoves, 'BLACK');

    // グリッド表現を含む
    expect(result).toContain('  0 1 2 3 4 5 6 7');
    expect(result).toContain('3 . . . ○ ● . . .');

    // 合法手を含む
    expect(result).toContain('2,3');
    expect(result).toContain('3,2');
    expect(result).toContain('4,5');
    expect(result).toContain('5,4');

    // 手番情報を含む
    expect(result).toContain('BLACK');

    // 候補数3を含む
    expect(result).toContain('3');

    // 200文字制限を含む
    expect(result).toContain('200');

    // JSON形式の要求を含む
    expect(result).toContain('JSON');
  });
});
