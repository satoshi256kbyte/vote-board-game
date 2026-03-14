/**
 * ResponseParser ユニットテスト
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8
 */

import { describe, it, expect } from 'vitest';
import { parseAIResponse, normalizePosition, truncateDescription } from '../response-parser.js';
import type { Position } from '../../../lib/othello/index.js';

const legalMoves: Position[] = [
  { row: 2, col: 3 },
  { row: 3, col: 2 },
  { row: 4, col: 5 },
  { row: 5, col: 4 },
];

describe('parseAIResponse', () => {
  it('正常系: 有効なJSONと有効な候補を正しくパースする', () => {
    const response = JSON.stringify({
      candidates: [
        { position: '2,3', description: '角を狙う一手' },
        { position: '3,2', description: '中央を制圧する手' },
      ],
    });

    const result = parseAIResponse(response, legalMoves);

    expect(result.candidates).toHaveLength(2);
    expect(result.candidates[0]).toEqual({
      position: '2,3',
      description: '角を狙う一手',
    });
    expect(result.candidates[1]).toEqual({
      position: '3,2',
      description: '中央を制圧する手',
    });
    expect(result.errors).toHaveLength(0);
  });

  it('不正JSON: パース失敗時に空の候補とエラーを返す', () => {
    const result = parseAIResponse('this is not json', legalMoves);

    expect(result.candidates).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('JSON parse failed');
  });

  it('空配列: candidates が空配列の場合、空の候補を返す', () => {
    const response = JSON.stringify({ candidates: [] });

    const result = parseAIResponse(response, legalMoves);

    expect(result.candidates).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('不正position除外: 合法手に含まれないpositionの候補を除外しエラーを記録する', () => {
    const response = JSON.stringify({
      candidates: [
        { position: '2,3', description: '有効な手' },
        { position: '0,0', description: '不正な手' },
        { position: '4,5', description: 'もう一つの有効な手' },
      ],
    });

    const result = parseAIResponse(response, legalMoves);

    expect(result.candidates).toHaveLength(2);
    expect(result.candidates[0].position).toBe('2,3');
    expect(result.candidates[1].position).toBe('4,5');
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.includes('not a legal move'))).toBe(true);
  });

  it('マークダウンコードブロック: ```json で囲まれたJSONを正しくパースする', () => {
    const response = '```json\n{"candidates": [{"position": "2,3", "description": "テスト"}]}\n```';

    const result = parseAIResponse(response, legalMoves);

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toEqual({
      position: '2,3',
      description: 'テスト',
    });
    expect(result.errors).toHaveLength(0);
  });

  it('description切り詰め: 200文字を超えるdescriptionを200文字に切り詰める', () => {
    const longDescription = 'あ'.repeat(250);
    const response = JSON.stringify({
      candidates: [{ position: '2,3', description: longDescription }],
    });

    const result = parseAIResponse(response, legalMoves);

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].description).toHaveLength(200);
  });

  it('candidates配列なし: candidatesフィールドがないJSONでエラーを返す', () => {
    const response = JSON.stringify({ moves: [] });

    const result = parseAIResponse(response, legalMoves);

    expect(result.candidates).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('candidates');
  });
});

describe('normalizePosition', () => {
  it('正常系: "2,3" をそのまま返す', () => {
    expect(normalizePosition('2,3')).toBe('2,3');
  });

  it('範囲外: "8,0" は null を返す', () => {
    expect(normalizePosition('8,0')).toBeNull();
  });

  it('不正形式: "abc" は null を返す', () => {
    expect(normalizePosition('abc')).toBeNull();
  });
});

describe('truncateDescription', () => {
  it('200文字以内: そのまま返す', () => {
    const text = 'これは短い説明文です';
    expect(truncateDescription(text)).toBe(text);
  });

  it('200文字超過: 200文字に切り詰める', () => {
    const text = 'あ'.repeat(250);
    const result = truncateDescription(text);

    expect(result).toHaveLength(200);
    expect(result).toBe('あ'.repeat(200));
  });
});
