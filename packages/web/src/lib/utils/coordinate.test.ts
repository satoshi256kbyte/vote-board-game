import { describe, it, expect } from 'vitest';
import { parseCoordinate, serializeCoordinate, type Position } from './coordinate';

describe('parseCoordinate', () => {
  describe('正常系: 有効な座標のパース', () => {
    it('should parse "0,0" to { row: 0, col: 0 }', () => {
      const result = parseCoordinate('0,0');
      expect(result).toEqual({ row: 0, col: 0 });
    });

    it('should parse "7,7" to { row: 7, col: 7 }', () => {
      const result = parseCoordinate('7,7');
      expect(result).toEqual({ row: 7, col: 7 });
    });

    it('should parse "2,3" to { row: 2, col: 3 }', () => {
      const result = parseCoordinate('2,3');
      expect(result).toEqual({ row: 2, col: 3 });
    });

    it('should parse "4,5" to { row: 4, col: 5 }', () => {
      const result = parseCoordinate('4,5');
      expect(result).toEqual({ row: 4, col: 5 });
    });

    it('should parse "1,6" to { row: 1, col: 6 }', () => {
      const result = parseCoordinate('1,6');
      expect(result).toEqual({ row: 1, col: 6 });
    });
  });

  describe('エッジケース: 境界値', () => {
    it('should parse "0,0" (minimum boundary)', () => {
      const result = parseCoordinate('0,0');
      expect(result).toEqual({ row: 0, col: 0 });
    });

    it('should parse "7,7" (maximum boundary)', () => {
      const result = parseCoordinate('7,7');
      expect(result).toEqual({ row: 7, col: 7 });
    });

    it('should parse "0,7" (mixed boundaries)', () => {
      const result = parseCoordinate('0,7');
      expect(result).toEqual({ row: 0, col: 7 });
    });

    it('should parse "7,0" (mixed boundaries)', () => {
      const result = parseCoordinate('7,0');
      expect(result).toEqual({ row: 7, col: 0 });
    });
  });

  describe('エラーケース: 無効な形式', () => {
    it('should return null for empty string', () => {
      const result = parseCoordinate('');
      expect(result).toBeNull();
    });

    it('should return null for single number', () => {
      const result = parseCoordinate('3');
      expect(result).toBeNull();
    });

    it('should return null for missing comma', () => {
      const result = parseCoordinate('23');
      expect(result).toBeNull();
    });

    it('should return null for space-separated values', () => {
      const result = parseCoordinate('2 3');
      expect(result).toBeNull();
    });

    it('should return null for letters', () => {
      const result = parseCoordinate('a,b');
      expect(result).toBeNull();
    });

    it('should return null for mixed letters and numbers', () => {
      const result = parseCoordinate('2,b');
      expect(result).toBeNull();
    });

    it('should return null for extra comma', () => {
      const result = parseCoordinate('2,3,4');
      expect(result).toBeNull();
    });

    it('should return null for negative numbers', () => {
      const result = parseCoordinate('-1,3');
      expect(result).toBeNull();
    });

    it('should return null for decimal numbers', () => {
      const result = parseCoordinate('2.5,3');
      expect(result).toBeNull();
    });

    it('should return null for coordinates with spaces', () => {
      const result = parseCoordinate('2, 3');
      expect(result).toBeNull();
    });

    it('should return null for coordinates with leading zeros', () => {
      const result = parseCoordinate('02,03');
      expect(result).toBeNull();
    });
  });

  describe('エラーケース: 範囲外の値', () => {
    it('should return null for row > 7', () => {
      const result = parseCoordinate('8,3');
      expect(result).toBeNull();
    });

    it('should return null for col > 7', () => {
      const result = parseCoordinate('3,8');
      expect(result).toBeNull();
    });

    it('should return null for both row and col > 7', () => {
      const result = parseCoordinate('8,8');
      expect(result).toBeNull();
    });

    it('should return null for row = 9', () => {
      const result = parseCoordinate('9,3');
      expect(result).toBeNull();
    });

    it('should return null for col = 10', () => {
      const result = parseCoordinate('3,10');
      expect(result).toBeNull();
    });
  });
});

describe('serializeCoordinate', () => {
  describe('正常系: 有効な座標のシリアライズ', () => {
    it('should serialize { row: 0, col: 0 } to "0,0"', () => {
      const result = serializeCoordinate({ row: 0, col: 0 });
      expect(result).toBe('0,0');
    });

    it('should serialize { row: 7, col: 7 } to "7,7"', () => {
      const result = serializeCoordinate({ row: 7, col: 7 });
      expect(result).toBe('7,7');
    });

    it('should serialize { row: 2, col: 3 } to "2,3"', () => {
      const result = serializeCoordinate({ row: 2, col: 3 });
      expect(result).toBe('2,3');
    });

    it('should serialize { row: 4, col: 5 } to "4,5"', () => {
      const result = serializeCoordinate({ row: 4, col: 5 });
      expect(result).toBe('4,5');
    });

    it('should serialize { row: 1, col: 6 } to "1,6"', () => {
      const result = serializeCoordinate({ row: 1, col: 6 });
      expect(result).toBe('1,6');
    });
  });

  describe('エッジケース: 境界値', () => {
    it('should serialize { row: 0, col: 0 } (minimum boundary)', () => {
      const result = serializeCoordinate({ row: 0, col: 0 });
      expect(result).toBe('0,0');
    });

    it('should serialize { row: 7, col: 7 } (maximum boundary)', () => {
      const result = serializeCoordinate({ row: 7, col: 7 });
      expect(result).toBe('7,7');
    });

    it('should serialize { row: 0, col: 7 } (mixed boundaries)', () => {
      const result = serializeCoordinate({ row: 0, col: 7 });
      expect(result).toBe('0,7');
    });

    it('should serialize { row: 7, col: 0 } (mixed boundaries)', () => {
      const result = serializeCoordinate({ row: 7, col: 0 });
      expect(result).toBe('7,0');
    });
  });

  describe('エラーケース: 範囲外の値', () => {
    it('should throw error for row < 0', () => {
      expect(() => serializeCoordinate({ row: -1, col: 3 })).toThrow('座標が範囲外です');
    });

    it('should throw error for col < 0', () => {
      expect(() => serializeCoordinate({ row: 3, col: -1 })).toThrow('座標が範囲外です');
    });

    it('should throw error for row > 7', () => {
      expect(() => serializeCoordinate({ row: 8, col: 3 })).toThrow('座標が範囲外です');
    });

    it('should throw error for col > 7', () => {
      expect(() => serializeCoordinate({ row: 3, col: 8 })).toThrow('座標が範囲外です');
    });

    it('should throw error for both row and col < 0', () => {
      expect(() => serializeCoordinate({ row: -1, col: -1 })).toThrow('座標が範囲外です');
    });

    it('should throw error for both row and col > 7', () => {
      expect(() => serializeCoordinate({ row: 8, col: 8 })).toThrow('座標が範囲外です');
    });

    it('should throw error with specific values in message', () => {
      expect(() => serializeCoordinate({ row: 10, col: 15 })).toThrow('row=10, col=15');
    });
  });
});

describe('ラウンドトリップ: パース→シリアライズ→パース', () => {
  it('should return original value for "0,0"', () => {
    const original = '0,0';
    const parsed = parseCoordinate(original);
    expect(parsed).not.toBeNull();
    const serialized = serializeCoordinate(parsed!);
    const reparsed = parseCoordinate(serialized);
    expect(reparsed).toEqual(parsed);
    expect(serialized).toBe(original);
  });

  it('should return original value for "7,7"', () => {
    const original = '7,7';
    const parsed = parseCoordinate(original);
    expect(parsed).not.toBeNull();
    const serialized = serializeCoordinate(parsed!);
    const reparsed = parseCoordinate(serialized);
    expect(reparsed).toEqual(parsed);
    expect(serialized).toBe(original);
  });

  it('should return original value for "2,3"', () => {
    const original = '2,3';
    const parsed = parseCoordinate(original);
    expect(parsed).not.toBeNull();
    const serialized = serializeCoordinate(parsed!);
    const reparsed = parseCoordinate(serialized);
    expect(reparsed).toEqual(parsed);
    expect(serialized).toBe(original);
  });

  it('should return original value for "4,5"', () => {
    const original = '4,5';
    const parsed = parseCoordinate(original);
    expect(parsed).not.toBeNull();
    const serialized = serializeCoordinate(parsed!);
    const reparsed = parseCoordinate(serialized);
    expect(reparsed).toEqual(parsed);
    expect(serialized).toBe(original);
  });

  it('should return original value for all valid coordinates', () => {
    for (let row = 0; row <= 7; row++) {
      for (let col = 0; col <= 7; col++) {
        const original = `${row},${col}`;
        const parsed = parseCoordinate(original);
        expect(parsed).not.toBeNull();
        const serialized = serializeCoordinate(parsed!);
        const reparsed = parseCoordinate(serialized);
        expect(reparsed).toEqual(parsed);
        expect(serialized).toBe(original);
      }
    }
  });
});

describe('シリアライズ→パース→シリアライズ', () => {
  it('should return original value for { row: 0, col: 0 }', () => {
    const original: Position = { row: 0, col: 0 };
    const serialized = serializeCoordinate(original);
    const parsed = parseCoordinate(serialized);
    expect(parsed).not.toBeNull();
    const reserialized = serializeCoordinate(parsed!);
    expect(parsed).toEqual(original);
    expect(reserialized).toBe(serialized);
  });

  it('should return original value for { row: 7, col: 7 }', () => {
    const original: Position = { row: 7, col: 7 };
    const serialized = serializeCoordinate(original);
    const parsed = parseCoordinate(serialized);
    expect(parsed).not.toBeNull();
    const reserialized = serializeCoordinate(parsed!);
    expect(parsed).toEqual(original);
    expect(reserialized).toBe(serialized);
  });

  it('should return original value for { row: 2, col: 3 }', () => {
    const original: Position = { row: 2, col: 3 };
    const serialized = serializeCoordinate(original);
    const parsed = parseCoordinate(serialized);
    expect(parsed).not.toBeNull();
    const reserialized = serializeCoordinate(parsed!);
    expect(parsed).toEqual(original);
    expect(reserialized).toBe(serialized);
  });

  it('should return original value for all valid positions', () => {
    for (let row = 0; row <= 7; row++) {
      for (let col = 0; col <= 7; col++) {
        const original: Position = { row, col };
        const serialized = serializeCoordinate(original);
        const parsed = parseCoordinate(serialized);
        expect(parsed).not.toBeNull();
        const reserialized = serializeCoordinate(parsed!);
        expect(parsed).toEqual(original);
        expect(reserialized).toBe(serialized);
      }
    }
  });
});
