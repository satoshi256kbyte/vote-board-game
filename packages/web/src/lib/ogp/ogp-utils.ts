/**
 * OGP Utility Functions
 *
 * Utility functions for OGP image generation, metadata formatting,
 * SNS share URL construction, and cache control.
 *
 * Requirements: 1.4, 1.5, 2.2, 3.1, 3.2, 4.1, 4.2, 5.1, 5.2, 6.1, 6.2, 7.2, 7.3, 7.4
 */

/**
 * Count black and white discs on the board.
 * Value 1 = black, value 2 = white.
 *
 * Validates: Requirements 1.5
 */
export function countDiscs(board: number[][]): { black: number; white: number } {
  let black = 0;
  let white = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell === 1) black++;
      else if (cell === 2) white++;
    }
  }
  return { black, white };
}

/**
 * Format game title with current turn number.
 *
 * Validates: Requirements 1.4, 2.2, 4.1, 5.1
 */
export function formatGameTitle(currentTurn: number): string {
  return `オセロ対局 - ターン${currentTurn}`;
}

/**
 * Format candidate title with position.
 *
 * Validates: Requirements 6.1
 */
export function formatCandidateTitle(position: string): string {
  return `次の一手候補: ${position}`;
}

/**
 * Format game description based on status.
 *
 * Validates: Requirements 4.2, 5.2
 */
export function formatGameDescription(status: 'ACTIVE' | 'FINISHED'): string {
  return status === 'ACTIVE' ? 'AI vs 集合知の対局が進行中です' : '対局が終了しました';
}

/**
 * Truncate description text to a maximum length (default 100 characters).
 * Appends '...' if truncated.
 *
 * Validates: Requirements 6.2
 */
export function truncateDescription(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + '...';
}

/**
 * Build OGP image URL using NEXT_PUBLIC_APP_URL as base.
 *
 * Validates: Requirements 4.3, 5.3, 6.3
 */
export function buildOgpImageUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return new URL(path, baseUrl).toString();
}

/**
 * Build X (Twitter) share URL with title and URL parameters.
 *
 * Validates: Requirements 3.1
 */
export function buildShareUrlForX(title: string, url: string): string {
  const params = new URLSearchParams({
    text: title,
    url,
  });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

/**
 * Build LINE share URL with URL parameter.
 *
 * Validates: Requirements 3.2
 */
export function buildShareUrlForLine(url: string): string {
  const params = new URLSearchParams({
    url,
  });
  return `https://social-plugins.line.me/lineit/share?${params.toString()}`;
}

/**
 * Get Cache-Control header value based on status.
 * - ACTIVE: 1 hour cache
 * - FINISHED: 24 hour cache
 * - TURN: 24 hour cache (past boards don't change)
 *
 * Validates: Requirements 7.2, 7.3, 7.4
 */
export function getCacheControlHeader(status: 'ACTIVE' | 'FINISHED' | 'TURN'): string {
  if (status === 'ACTIVE') {
    return 'public, max-age=3600, s-maxage=3600';
  }
  return 'public, max-age=86400, s-maxage=86400';
}
