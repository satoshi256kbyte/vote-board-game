import { describe, it, expect, afterEach } from 'vitest';
import {
  countDiscs,
  formatGameTitle,
  formatCandidateTitle,
  formatGameDescription,
  truncateDescription,
  buildOgpImageUrl,
  buildShareUrlForX,
  buildShareUrlForLine,
  getCacheControlHeader,
} from './ogp-utils';

describe('countDiscs', () => {
  it('should count black and white discs on initial board', () => {
    const board = [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 2, 1, 0, 0, 0],
      [0, 0, 0, 1, 2, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ];
    expect(countDiscs(board)).toEqual({ black: 2, white: 2 });
  });

  it('should return zero for empty board', () => {
    const board = Array.from({ length: 8 }, () => Array(8).fill(0));
    expect(countDiscs(board)).toEqual({ black: 0, white: 0 });
  });

  it('should count all black discs', () => {
    const board = Array.from({ length: 8 }, () => Array(8).fill(1));
    expect(countDiscs(board)).toEqual({ black: 64, white: 0 });
  });
});

describe('formatGameTitle', () => {
  it('should format title with turn number', () => {
    expect(formatGameTitle(5)).toBe('オセロ対局 - ターン5');
  });

  it('should format title with turn 1', () => {
    expect(formatGameTitle(1)).toBe('オセロ対局 - ターン1');
  });
});

describe('formatCandidateTitle', () => {
  it('should format candidate title with position', () => {
    expect(formatCandidateTitle('D3')).toBe('次の一手候補: D3');
  });
});

describe('formatGameDescription', () => {
  it('should return active description for ACTIVE status', () => {
    expect(formatGameDescription('ACTIVE')).toBe('AI vs 集合知の対局が進行中です');
  });

  it('should return finished description for FINISHED status', () => {
    expect(formatGameDescription('FINISHED')).toBe('対局が終了しました');
  });
});

describe('truncateDescription', () => {
  it('should not truncate short text', () => {
    expect(truncateDescription('短いテキスト')).toBe('短いテキスト');
  });

  it('should truncate text exceeding max length', () => {
    const longText = 'あ'.repeat(150);
    const result = truncateDescription(longText);
    expect(result).toBe('あ'.repeat(100) + '...');
  });

  it('should use custom max length', () => {
    const text = 'abcdefghij';
    expect(truncateDescription(text, 5)).toBe('abcde...');
  });

  it('should not truncate text at exact max length', () => {
    const text = 'あ'.repeat(100);
    expect(truncateDescription(text)).toBe(text);
  });
});

describe('buildOgpImageUrl', () => {
  const originalEnv = process.env.NEXT_PUBLIC_APP_URL;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_APP_URL = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_APP_URL;
    }
  });

  it('should build URL with NEXT_PUBLIC_APP_URL', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';
    expect(buildOgpImageUrl('/api/og/game/123')).toBe('https://example.com/api/og/game/123');
  });

  it('should fallback to localhost when env is not set', () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(buildOgpImageUrl('/api/og/game/123')).toBe('http://localhost:3000/api/og/game/123');
  });
});

describe('buildShareUrlForX', () => {
  it('should build X share URL with encoded parameters', () => {
    const url = buildShareUrlForX('テスト', 'https://example.com/game/1');
    expect(url).toContain('https://twitter.com/intent/tweet');
    expect(url).toContain('text=');
    expect(url).toContain('url=');
    const parsed = new URL(url);
    expect(parsed.searchParams.get('text')).toBe('テスト');
    expect(parsed.searchParams.get('url')).toBe('https://example.com/game/1');
  });
});

describe('buildShareUrlForLine', () => {
  it('should build LINE share URL with encoded URL parameter', () => {
    const url = buildShareUrlForLine('https://example.com/game/1');
    expect(url).toContain('https://social-plugins.line.me/lineit/share');
    const parsed = new URL(url);
    expect(parsed.searchParams.get('url')).toBe('https://example.com/game/1');
  });
});

describe('getCacheControlHeader', () => {
  it('should return 1 hour cache for ACTIVE', () => {
    expect(getCacheControlHeader('ACTIVE')).toBe('public, max-age=3600, s-maxage=3600');
  });

  it('should return 24 hour cache for FINISHED', () => {
    expect(getCacheControlHeader('FINISHED')).toBe('public, max-age=86400, s-maxage=86400');
  });

  it('should return 24 hour cache for TURN', () => {
    expect(getCacheControlHeader('TURN')).toBe('public, max-age=86400, s-maxage=86400');
  });
});
