/**
 * PromptBuilder ユニットテスト
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10
 */

import { describe, it, expect } from 'vitest';
import {
  formatBoard,
  formatMoveHistory,
  buildCommentaryPrompt,
  getCommentarySystemPrompt,
} from '../prompt-builder.js';
import { createInitialBoard } from '../../../lib/othello/index.js';
import type { MoveEntity } from '../../../lib/dynamodb/types.js';

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

  it('ヘッダー行と8データ行で構成される', () => {
    const board = createInitialBoard();
    const result = formatBoard(board);
    const lines = result.split('\n');

    expect(lines).toHaveLength(9);
    expect(lines[0]).toBe('  0 1 2 3 4 5 6 7');
  });
});

describe('getCommentarySystemPrompt', () => {
  it('オセロの解説者としての役割を含む', () => {
    const prompt = getCommentarySystemPrompt();

    expect(prompt).toContain('オセロ');
    expect(prompt).toContain('解説');
  });

  it('初心者向けの説明を要求する', () => {
    const prompt = getCommentarySystemPrompt();

    expect(prompt).toContain('初心者');
  });
});

describe('formatMoveHistory', () => {
  it('手履歴を正しいフォーマットで変換する', () => {
    const moves: MoveEntity[] = [
      {
        PK: 'GAME#g1',
        SK: 'MOVE#1',
        entityType: 'MOVE',
        gameId: 'g1',
        turnNumber: 1,
        side: 'BLACK',
        position: '2,3',
        playedBy: 'COLLECTIVE',
        candidateId: 'c1',
      },
      {
        PK: 'GAME#g1',
        SK: 'MOVE#2',
        entityType: 'MOVE',
        gameId: 'g1',
        turnNumber: 2,
        side: 'WHITE',
        position: '4,5',
        playedBy: 'AI',
        candidateId: 'c2',
      },
    ];

    const result = formatMoveHistory(moves);

    expect(result).toContain('ターン1');
    expect(result).toContain('黒（●）');
    expect(result).toContain('集合知');
    expect(result).toContain('2,3');
    expect(result).toContain('ターン2');
    expect(result).toContain('白（○）');
    expect(result).toContain('AI');
    expect(result).toContain('4,5');
  });

  it('手履歴が空の場合はメッセージを返す', () => {
    const result = formatMoveHistory([]);

    expect(result).toContain('まだ手が打たれていません');
  });
});

describe('buildCommentaryPrompt', () => {
  it('盤面グリッド、石数、手番、AI/集合知側、500文字制限、JSON形式、戦略分析、形勢判断を含む', () => {
    const board = createInitialBoard();
    const moves: MoveEntity[] = [
      {
        PK: 'GAME#g1',
        SK: 'MOVE#1',
        entityType: 'MOVE',
        gameId: 'g1',
        turnNumber: 1,
        side: 'BLACK',
        position: '2,3',
        playedBy: 'COLLECTIVE',
        candidateId: 'c1',
      },
    ];
    const discCount = { black: 4, white: 1 };

    const result = buildCommentaryPrompt(board, moves, discCount, 'WHITE', 'WHITE');

    // グリッド表現を含む
    expect(result).toContain('  0 1 2 3 4 5 6 7');
    expect(result).toContain('3 . . . ○ ● . . .');

    // 石数を含む
    expect(result).toContain('4');
    expect(result).toContain('1');

    // 手番情報を含む
    expect(result).toContain('WHITE');

    // AI側と集合知側を含む
    expect(result).toContain('AI側');
    expect(result).toContain('集合知側');

    // 500文字制限を含む
    expect(result).toContain('500');

    // JSON形式の要求を含む
    expect(result).toContain('JSON');

    // 直近の手の戦略的意味の分析を要求
    expect(result).toContain('戦略');

    // 形勢判断を要求
    expect(result).toContain('形勢');

    // 手履歴を含む
    expect(result).toContain('ターン1');
    expect(result).toContain('2,3');
  });
});
