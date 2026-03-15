/**
 * CommentarySection Property-Based Tests
 *
 * Feature: ai-content-display
 * Properties 4-7: 対局解説セクションのプロパティベーステスト
 *
 * **Validates: Requirements 4.2, 4.4, 4.5, 5.1, 5.3, 5.4, 5.5, 5.8**
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import fc from 'fast-check';
import { CommentarySection } from './commentary-section';
import type { Commentary } from '@/lib/api/commentary';

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.clearAllMocks();
});

/**
 * Arbitrary generator for a single Commentary with a given turnNumber.
 * Content uses alphanumeric strings to avoid whitespace normalization issues in DOM queries.
 */
const commentaryWithTurnArb = (turnNumber: number): fc.Arbitrary<Commentary> =>
  fc.record({
    turnNumber: fc.constant(turnNumber),
    content: fc.stringMatching(/^[a-zA-Z0-9]{3,30}$/),
    generatedBy: fc.constantFrom('AI', 'SYSTEM'),
    createdAt: fc
      .integer({ min: 1704067200000, max: 1767225599000 })
      .map((ts) => new Date(ts).toISOString()),
  });

/**
 * Arbitrary generator for a non-empty commentary array with unique, ascending turnNumbers.
 */
const commentaryListArb = (minLength = 1, maxLength = 8): fc.Arbitrary<Commentary[]> =>
  fc.set(fc.integer({ min: 1, max: 100 }), { minLength, maxLength }).chain((turnNumbers) => {
    const sorted = [...turnNumbers].sort((a, b) => a - b);
    return fc.tuple(...sorted.map((tn) => commentaryWithTurnArb(tn))) as fc.Arbitrary<Commentary[]>;
  });

const defaultProps = {
  isLoading: false,
  error: null,
  gameStatus: 'ACTIVE' as const,
  currentTurn: 1,
};

describe('Feature: ai-content-display, Property 4: 選択されたターンの解説が正しく表示される', () => {
  /**
   * **Validates: Requirements 4.2, 4.4, 4.5**
   *
   * For any non-empty commentary array and valid turn index,
   * CommentarySection displays the selected turn's content and createdAt.
   */
  it('任意の非空解説配列において、選択されたターンの content と createdAt が表示される', () => {
    fc.assert(
      fc.property(commentaryListArb(2, 6), (commentaries) => {
        cleanup();
        const { container } = render(
          <CommentarySection {...defaultProps} commentaries={commentaries} />
        );

        const lastCommentary = commentaries[commentaries.length - 1];

        // content が表示されている
        expect(screen.getByText(lastCommentary.content)).toBeTruthy();

        // article 要素内に createdAt がフォーマットされて表示されている
        const article = container.querySelector('article');
        expect(article).toBeTruthy();
        const paragraphs = article!.querySelectorAll('p');
        expect(paragraphs.length).toBe(2);
        // 2番目の p 要素が日時表示
        expect(paragraphs[1].textContent).toBeTruthy();

        // Navigate to a previous turn and verify its content
        fireEvent.click(screen.getByText('前のターン'));
        const prevCommentary = commentaries[commentaries.length - 2];
        expect(screen.getByText(prevCommentary.content)).toBeTruthy();
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });
});

describe('Feature: ai-content-display, Property 5: ターンナビゲーションは正しく解説を切り替える', () => {
  /**
   * **Validates: Requirements 5.3, 5.4, 5.5**
   *
   * For any array with 2+ commentaries, clicking "前のターン" shows the previous turn's
   * commentary, and clicking "次のターン" shows the next turn's commentary.
   * The displayed turn number is always correct.
   */
  it('「前のターン」で前のターンの解説が表示され、「次のターン」で次のターンの解説が表示される', () => {
    fc.assert(
      fc.property(commentaryListArb(3, 6), (commentaries) => {
        cleanup();
        render(<CommentarySection {...defaultProps} commentaries={commentaries} />);

        const lastIdx = commentaries.length - 1;

        // Default: latest turn is shown
        expect(screen.getByText(commentaries[lastIdx].content)).toBeTruthy();
        expect(screen.getByText(`ターン ${commentaries[lastIdx].turnNumber}`)).toBeTruthy();

        // Click 前のターン → shows previous turn
        fireEvent.click(screen.getByText('前のターン'));
        expect(screen.getByText(commentaries[lastIdx - 1].content)).toBeTruthy();
        expect(screen.getByText(`ターン ${commentaries[lastIdx - 1].turnNumber}`)).toBeTruthy();

        // Click 次のターン → back to latest turn
        fireEvent.click(screen.getByText('次のターン'));
        expect(screen.getByText(commentaries[lastIdx].content)).toBeTruthy();
        expect(screen.getByText(`ターン ${commentaries[lastIdx].turnNumber}`)).toBeTruthy();
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });
});

describe('Feature: ai-content-display, Property 6: 複数ターンの解説がある場合にターン選択 UI が表示される', () => {
  /**
   * **Validates: Requirements 5.1**
   *
   * For any array with 2+ commentaries, the turn selection UI is displayed.
   * For 1 or fewer, it's not displayed.
   */
  it('2件以上の解説でターン選択 UI が表示され、1件以下では非表示', () => {
    // Case: 2+ commentaries → navigation visible
    fc.assert(
      fc.property(commentaryListArb(2, 6), (commentaries) => {
        cleanup();
        render(<CommentarySection {...defaultProps} commentaries={commentaries} />);

        expect(screen.getByText('前のターン')).toBeTruthy();
        expect(screen.getByText('次のターン')).toBeTruthy();
      }),
      { numRuns: 10, endOnFailure: true }
    );

    // Case: 1 commentary → navigation hidden
    fc.assert(
      fc.property(commentaryListArb(1, 1), (commentaries) => {
        cleanup();
        render(<CommentarySection {...defaultProps} commentaries={commentaries} />);

        expect(screen.queryByText('前のターン')).toBeNull();
        expect(screen.queryByText('次のターン')).toBeNull();
      }),
      { numRuns: 10, endOnFailure: true }
    );

    // Case: 0 commentaries → navigation hidden
    cleanup();
    render(<CommentarySection {...defaultProps} commentaries={[]} />);
    expect(screen.queryByText('前のターン')).toBeNull();
    expect(screen.queryByText('次のターン')).toBeNull();
  });
});

describe('Feature: ai-content-display, Property 7: デフォルトで最新ターンの解説が表示される', () => {
  /**
   * **Validates: Requirements 5.8**
   *
   * For any non-empty commentary array, the initial display shows the commentary
   * with the highest turnNumber (last element in the sorted array).
   */
  it('任意の非空解説配列において、初期表示は turnNumber が最大の解説である', () => {
    fc.assert(
      fc.property(commentaryListArb(1, 8), (commentaries) => {
        cleanup();
        render(<CommentarySection {...defaultProps} commentaries={commentaries} />);

        const latestCommentary = commentaries[commentaries.length - 1];

        // Latest turn's content is displayed
        expect(screen.getByText(latestCommentary.content)).toBeTruthy();

        // If multiple commentaries, turn number label is shown
        if (commentaries.length >= 2) {
          expect(screen.getByText(`ターン ${latestCommentary.turnNumber}`)).toBeTruthy();
        }
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });
});
