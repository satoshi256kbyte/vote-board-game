/**
 * OGP Utility Functions Property-Based Tests
 *
 * Feature: share-ogp-feature
 *
 * Property 2: 石数カウントの正確性
 * Property 3: SNS シェア URL の構築
 * Property 4: メタデータタイトルのフォーマット
 * Property 5: メタデータ説明文の生成
 * Property 6: OGP 画像 URL の構築
 * Property 7: Cache-Control ヘッダーの正当性
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import {
  countDiscs,
  buildShareUrlForX,
  buildShareUrlForLine,
  formatGameTitle,
  formatCandidateTitle,
  formatGameDescription,
  truncateDescription,
  buildOgpImageUrl,
  getCacheControlHeader,
} from './ogp-utils';

/**
 * Property 2: 石数カウントの正確性
 *
 * 任意の 8x8 盤面に対して countDiscs の結果が配列内の実際の出現回数と一致することを検証
 *
 * **Validates: Requirements 1.5**
 */
describe('Feature: share-ogp-feature, Property 2: 石数カウントの正確性', () => {
  it('should count discs matching actual occurrences in any 8x8 board', () => {
    fc.assert(
      fc.property(
        fc.array(fc.array(fc.integer({ min: 0, max: 2 }), { minLength: 8, maxLength: 8 }), {
          minLength: 8,
          maxLength: 8,
        }),
        (board) => {
          const result = countDiscs(board);

          // Manually count occurrences
          let expectedBlack = 0;
          let expectedWhite = 0;
          for (const row of board) {
            for (const cell of row) {
              if (cell === 1) expectedBlack++;
              if (cell === 2) expectedWhite++;
            }
          }

          expect(result.black).toBe(expectedBlack);
          expect(result.white).toBe(expectedWhite);
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });
});

/**
 * Property 3: SNS シェア URL の構築
 *
 * 任意のタイトル・URL 文字列に対して buildShareUrlForX が twitter.com/intent/tweet を含み、
 * buildShareUrlForLine が social-plugins.line.me/lineit/share を含むことを検証
 *
 * **Validates: Requirements 3.1, 3.2**
 */
describe('Feature: share-ogp-feature, Property 3: SNS シェア URL の構築', () => {
  it('should build X share URL containing twitter.com/intent/tweet for any title and url', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (title, url) => {
        const result = buildShareUrlForX(title, url);
        expect(result).toContain('twitter.com/intent/tweet');
        expect(result).toContain('text=');
        expect(result).toContain('url=');
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('should build LINE share URL containing social-plugins.line.me/lineit/share for any url', () => {
    fc.assert(
      fc.property(fc.string(), (url) => {
        const result = buildShareUrlForLine(url);
        expect(result).toContain('social-plugins.line.me/lineit/share');
        expect(result).toContain('url=');
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });
});

/**
 * Property 4: メタデータタイトルのフォーマット
 *
 * 任意の正の整数とポジション文字列に対して、タイトル生成関数が正しいフォーマットに従うことを検証
 *
 * **Validates: Requirements 1.4, 2.2, 4.1, 5.1, 6.1**
 */
describe('Feature: share-ogp-feature, Property 4: メタデータタイトルのフォーマット', () => {
  it('should format game title as "オセロ対局 - ターン{n}" for any positive integer', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1 }), (turn) => {
        const result = formatGameTitle(turn);
        expect(result).toBe(`オセロ対局 - ターン${turn}`);
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('should format candidate title as "次の一手候補: {position}" for any string', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (position) => {
        const result = formatCandidateTitle(position);
        expect(result).toBe(`次の一手候補: ${position}`);
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });
});

/**
 * Property 5: メタデータ説明文の生成
 *
 * 任意のステータスと説明文に対して、説明文生成関数が正しい値を返し、
 * 切り詰めが 100 文字以内であることを検証
 *
 * **Validates: Requirements 4.2, 5.2, 6.2**
 */
describe('Feature: share-ogp-feature, Property 5: メタデータ説明文の生成', () => {
  it('should return correct description for any game status', () => {
    fc.assert(
      fc.property(fc.constantFrom('ACTIVE' as const, 'FINISHED' as const), (status) => {
        const result = formatGameDescription(status);
        if (status === 'ACTIVE') {
          expect(result).toBe('AI vs 集合知の対局が進行中です');
        } else {
          expect(result).toBe('対局が終了しました');
        }
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('should truncate description to at most 100 characters for any text', () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const result = truncateDescription(text);
        if (text.length <= 100) {
          expect(result).toBe(text);
        } else {
          expect(result.length).toBe(103); // 100 chars + '...'
          expect(result).toBe(text.slice(0, 100) + '...');
        }
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });
});

/**
 * Property 6: OGP 画像 URL の構築
 *
 * 任意の gameId, turnNumber, candidateId に対して、buildOgpImageUrl が正しいパスを含む URL を返すことを検証
 *
 * **Validates: Requirements 4.3, 5.3, 6.3**
 */
describe('Feature: share-ogp-feature, Property 6: OGP 画像 URL の構築', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://example.com');
  });

  it('should build OGP image URL containing the correct path for any gameId', () => {
    fc.assert(
      fc.property(fc.uuid(), (gameId) => {
        const result = buildOgpImageUrl(`/api/og/game/${gameId}`);
        expect(result).toContain(`/api/og/game/${gameId}`);
        expect(result).toMatch(/^https?:\/\//);
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('should build OGP image URL containing the correct path for any gameId and turnNumber', () => {
    fc.assert(
      fc.property(fc.uuid(), fc.integer({ min: 1 }), (gameId, turnNumber) => {
        const result = buildOgpImageUrl(`/api/og/game/${gameId}/turn/${turnNumber}`);
        expect(result).toContain(`/api/og/game/${gameId}/turn/${turnNumber}`);
        expect(result).toMatch(/^https?:\/\//);
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('should build OGP image URL containing the correct path for any candidateId', () => {
    fc.assert(
      fc.property(fc.uuid(), (candidateId) => {
        const result = buildOgpImageUrl(`/api/og/candidate/${candidateId}`);
        expect(result).toContain(`/api/og/candidate/${candidateId}`);
        expect(result).toMatch(/^https?:\/\//);
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });
});

/**
 * Property 7: Cache-Control ヘッダーの正当性
 *
 * 任意のステータスに対して、getCacheControlHeader が正しい max-age 値を返すことを検証
 *
 * **Validates: Requirements 7.2, 7.3, 7.4**
 */
describe('Feature: share-ogp-feature, Property 7: Cache-Control ヘッダーの正当性', () => {
  it('should return correct Cache-Control header for any status', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('ACTIVE' as const, 'FINISHED' as const, 'TURN' as const),
        (status) => {
          const result = getCacheControlHeader(status);
          if (status === 'ACTIVE') {
            expect(result).toContain('max-age=3600');
            expect(result).toContain('s-maxage=3600');
          } else {
            // FINISHED and TURN both get 24-hour cache
            expect(result).toContain('max-age=86400');
            expect(result).toContain('s-maxage=86400');
          }
          expect(result).toContain('public');
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });
});
