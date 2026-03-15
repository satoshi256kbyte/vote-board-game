/**
 * ResponseParser ユニットテスト
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */

import { describe, it, expect } from 'vitest';
import { parseCommentaryResponse, truncateContent } from '../response-parser.js';

describe('parseCommentaryResponse', () => {
  it('正常系: 有効なJSONのcontentフィールドを正しくパースする', () => {
    const response = JSON.stringify({
      content: 'この対局では黒が中央を制圧し、優勢を築いています。',
    });

    const result = parseCommentaryResponse(response);

    expect(result.commentary).not.toBeNull();
    expect(result.commentary!.content).toBe('この対局では黒が中央を制圧し、優勢を築いています。');
    expect(result.error).toBeUndefined();
  });

  it('不正JSON: パース失敗時にプレーンテキストをcontentとして返す', () => {
    const plainText = 'これはJSON形式ではない解説文です。';

    const result = parseCommentaryResponse(plainText);

    expect(result.commentary).not.toBeNull();
    expect(result.commentary!.content).toBe(plainText);
    expect(result.error).toBeUndefined();
  });

  it('空content: contentが空文字の場合、nullとエラーを返す', () => {
    const response = JSON.stringify({ content: '' });

    const result = parseCommentaryResponse(response);

    expect(result.commentary).toBeNull();
    expect(result.error).toBeDefined();
    expect(result.error).toContain('empty');
  });

  it('空文字列: 入力が空文字列の場合、nullとエラーを返す', () => {
    const result = parseCommentaryResponse('');

    expect(result.commentary).toBeNull();
    expect(result.error).toBeDefined();
  });

  it('500文字超過: contentが500文字を超える場合、500文字に切り詰める', () => {
    const longContent = 'あ'.repeat(600);
    const response = JSON.stringify({ content: longContent });

    const result = parseCommentaryResponse(response);

    expect(result.commentary).not.toBeNull();
    expect(result.commentary!.content).toHaveLength(500);
    expect(result.commentary!.content).toBe('あ'.repeat(500));
  });

  it('マークダウンコードブロック: ```json で囲まれたJSONを正しくパースする', () => {
    const response = '```json\n{"content": "コードブロック内の解説文です。"}\n```';

    const result = parseCommentaryResponse(response);

    expect(result.commentary).not.toBeNull();
    expect(result.commentary!.content).toBe('コードブロック内の解説文です。');
    expect(result.error).toBeUndefined();
  });

  it('マークダウンコードブロック（言語指定なし）: ``` で囲まれたJSONを正しくパースする', () => {
    const response = '```\n{"content": "言語指定なしのコードブロック"}\n```';

    const result = parseCommentaryResponse(response);

    expect(result.commentary).not.toBeNull();
    expect(result.commentary!.content).toBe('言語指定なしのコードブロック');
  });

  it('contentフィールドなし: JSONだがcontentがない場合、JSON文字列をプレーンテキストとして扱う', () => {
    const response = JSON.stringify({ text: '別のフィールド名' });

    const result = parseCommentaryResponse(response);

    expect(result.commentary).not.toBeNull();
    // contentフィールドがないため、strippedText全体がcontentになる
    expect(result.commentary!.content).toBe(response);
  });
});

describe('truncateContent', () => {
  it('500文字以内: そのまま返す', () => {
    const text = 'これは短い解説文です。';
    expect(truncateContent(text)).toBe(text);
  });

  it('ちょうど500文字: そのまま返す', () => {
    const text = 'あ'.repeat(500);
    expect(truncateContent(text)).toBe(text);
    expect(truncateContent(text)).toHaveLength(500);
  });

  it('500文字超過: 500文字に切り詰める', () => {
    const text = 'あ'.repeat(600);
    const result = truncateContent(text);

    expect(result).toHaveLength(500);
    expect(result).toBe('あ'.repeat(500));
  });

  it('カスタムmaxLength: 指定した文字数で切り詰める', () => {
    const text = 'あ'.repeat(100);
    const result = truncateContent(text, 50);

    expect(result).toHaveLength(50);
    expect(result).toBe('あ'.repeat(50));
  });
});
