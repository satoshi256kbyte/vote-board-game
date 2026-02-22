import { describe, it, expect } from 'vitest';
import { maskEmail, maskPassword } from './mask.js';

describe('maskEmail', () => {
  describe('正常なメールアドレスのマスキング', () => {
    it('標準的なメールアドレスをマスクする', () => {
      const result = maskEmail('user@example.com');
      expect(result).toBe('u***@example.com');
    });

    it('長いローカルパートを持つメールアドレスをマスクする', () => {
      const result = maskEmail('verylongusername@example.com');
      expect(result).toBe('v***@example.com');
    });

    it('1文字のローカルパートを持つメールアドレスをマスクする', () => {
      const result = maskEmail('a@example.com');
      expect(result).toBe('***@example.com');
    });

    it('複数のドットを含むドメインを持つメールアドレスをマスクする', () => {
      const result = maskEmail('user@mail.example.co.jp');
      expect(result).toBe('u***@mail.example.co.jp');
    });

    it('数字を含むローカルパートを持つメールアドレスをマスクする', () => {
      const result = maskEmail('user123@example.com');
      expect(result).toBe('u***@example.com');
    });

    it('特殊文字を含むローカルパートを持つメールアドレスをマスクする', () => {
      const result = maskEmail('user.name+tag@example.com');
      expect(result).toBe('u***@example.com');
    });
  });

  describe('エッジケースの処理', () => {
    it('@記号がない文字列の場合は***を返す', () => {
      const result = maskEmail('notanemail');
      expect(result).toBe('***');
    });

    it('空のローカルパートの場合は***@domainを返す', () => {
      const result = maskEmail('@example.com');
      expect(result).toBe('***@example.com');
    });

    it('空のドメインの場合は***を返す', () => {
      const result = maskEmail('user@');
      expect(result).toBe('***');
    });

    it('空文字列の場合は***を返す', () => {
      const result = maskEmail('');
      expect(result).toBe('***');
    });
  });
});

describe('maskPassword', () => {
  it('常に固定文字列を返す', () => {
    const result = maskPassword();
    expect(result).toBe('********');
  });

  it('複数回呼び出しても同じ結果を返す', () => {
    const result1 = maskPassword();
    const result2 = maskPassword();
    expect(result1).toBe(result2);
    expect(result1).toBe('********');
  });
});
