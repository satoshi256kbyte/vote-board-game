import { describe, it, expect } from 'vitest';
import {
  parseAIMoveResponse,
  normalizePosition,
  truncateDescription,
  formatAIMoveResponse,
} from '../response-parser.js';
import type { Position } from '../../../lib/othello/index.js';

const legalMoves: Position[] = [
  { row: 2, col: 3 },
  { row: 3, col: 2 },
  { row: 4, col: 5 },
  { row: 5, col: 4 },
];

describe('response-parser', () => {
  describe('normalizePosition', () => {
    it('有効な "row,col" を正規化する', () => {
      expect(normalizePosition('3,4')).toBe('3,4');
    });

    it('スペース付きを正規化する', () => {
      expect(normalizePosition(' 3 , 4 ')).toBe('3,4');
    });

    it('範囲外の値はnullを返す', () => {
      expect(normalizePosition('8,0')).toBeNull();
      expect(normalizePosition('-1,3')).toBeNull();
    });

    it('不正な形式はnullを返す', () => {
      expect(normalizePosition('abc')).toBeNull();
      expect(normalizePosition('3,4,5')).toBeNull();
    });
  });

  describe('truncateDescription', () => {
    it('200文字以内はそのまま返す', () => {
      const desc = 'テスト説明';
      expect(truncateDescription(desc)).toBe(desc);
    });

    it('200文字超過は切り詰める', () => {
      const desc = 'あ'.repeat(250);
      const result = truncateDescription(desc);
      expect(result.length).toBe(200);
    });
  });

  describe('parseAIMoveResponse', () => {
    it('有効なJSONをパースする', () => {
      const response = JSON.stringify({ position: '2,3', description: '角を狙う手です' });
      const result = parseAIMoveResponse(response, legalMoves);

      expect(result.success).toBe(true);
      expect(result.position).toBe('2,3');
      expect(result.description).toBe('角を狙う手です');
    });

    it('不正なJSONはエラーを返す', () => {
      const result = parseAIMoveResponse('not json', legalMoves);

      expect(result.success).toBe(false);
      expect(result.error).toContain('JSON parse failed');
    });

    it('マークダウンコードブロック付きJSONをパースする', () => {
      const response = '```json\n{"position": "3,2", "description": "テスト"}\n```';
      const result = parseAIMoveResponse(response, legalMoves);

      expect(result.success).toBe(true);
      expect(result.position).toBe('3,2');
    });

    it('不正なpositionはエラーを返す', () => {
      const response = JSON.stringify({ position: '9,9', description: 'テスト' });
      const result = parseAIMoveResponse(response, legalMoves);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid position');
    });

    it('合法手に含まれないpositionはエラーを返す', () => {
      const response = JSON.stringify({ position: '0,0', description: 'テスト' });
      const result = parseAIMoveResponse(response, legalMoves);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not a legal move');
    });

    it('description超過は200文字に切り詰める', () => {
      const longDesc = 'あ'.repeat(300);
      const response = JSON.stringify({ position: '2,3', description: longDesc });
      const result = parseAIMoveResponse(response, legalMoves);

      expect(result.success).toBe(true);
      expect(result.description!.length).toBe(200);
    });

    it('positionが文字列でない場合はエラーを返す', () => {
      const response = JSON.stringify({ position: 23, description: 'テスト' });
      const result = parseAIMoveResponse(response, legalMoves);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not a string');
    });
  });

  describe('formatAIMoveResponse', () => {
    it('position と description をJSON文字列にフォーマットする', () => {
      const result = formatAIMoveResponse('2,3', 'テスト');
      const parsed = JSON.parse(result);

      expect(parsed.position).toBe('2,3');
      expect(parsed.description).toBe('テスト');
    });
  });
});
