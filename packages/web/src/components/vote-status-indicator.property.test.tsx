/**
 * VoteStatusIndicator Property-Based Tests
 *
 * Property 2: 投票済みインジケーター表示
 * **Validates: Requirements 2.1, 2.2, 2.3**
 *
 * For any vote count, when isVoted is true, the indicator is always displayed.
 * When isVoted is false, nothing is displayed.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import fc from 'fast-check';
import { VoteStatusIndicator } from './vote-status-indicator';

describe('Feature: 25-vote-button-status-display, Property 2: 投票済みインジケーター表示', () => {
  afterEach(() => {
    cleanup();
  });

  it('should always display indicator when isVoted is true for any vote count', () => {
    fc.assert(
      fc.property(fc.nat({ max: 10000 }), (voteCount) => {
        // Render with isVoted=true
        const { container } = render(<VoteStatusIndicator voteCount={voteCount} isVoted={true} />);

        // Requirement 2.1: Indicator must be displayed when voted
        const indicator = container.querySelector('[data-testid="vote-status-indicator"]');
        expect(indicator).toBeTruthy();

        // Requirement 2.2: Must show checkmark icon and "投票済み" text
        const statusText = container.textContent;
        expect(statusText).toContain('投票済み');

        // Requirement 2.3: Must show the current vote count
        expect(statusText).toContain(`${voteCount}票`);

        // Verify role="status" for accessibility
        expect(indicator?.getAttribute('role')).toBe('status');

        // Verify aria-label includes vote count
        expect(indicator?.getAttribute('aria-label')).toBe(`投票済み、投票数: ${voteCount}`);
      }),
      { numRuns: 20, endOnFailure: true }
    );
  });

  it('should never display indicator when isVoted is false for any vote count', () => {
    fc.assert(
      fc.property(fc.nat({ max: 10000 }), (voteCount) => {
        // Render with isVoted=false
        const { container } = render(<VoteStatusIndicator voteCount={voteCount} isVoted={false} />);

        // Requirement: Nothing should be displayed when not voted
        expect(container.firstChild).toBeNull();

        // Verify no indicator element exists
        const indicator = container.querySelector('[data-testid="vote-status-indicator"]');
        expect(indicator).toBeFalsy();

        // Verify no text is rendered
        expect(container.textContent).toBe('');
      }),
      { numRuns: 20, endOnFailure: true }
    );
  });

  it('should always display correct vote count format for any number', () => {
    fc.assert(
      fc.property(fc.nat({ max: 10000 }), (voteCount) => {
        const { container } = render(<VoteStatusIndicator voteCount={voteCount} isVoted={true} />);

        // Vote count should be displayed in the format "(N票)"
        const voteCountText = `(${voteCount}票)`;
        expect(container.textContent).toContain(voteCountText);

        // Verify the vote count element exists
        const voteCountElement = Array.from(container.querySelectorAll('span')).find((el) =>
          el.textContent?.includes(`(${voteCount}票)`)
        );
        expect(voteCountElement).toBeTruthy();

        // Check if the element has the green color class
        if (voteCountElement) {
          const hasGreenColor = voteCountElement.className.includes('text-green-600');
          expect(hasGreenColor).toBe(true);
        }
      }),
      { numRuns: 20, endOnFailure: true }
    );
  });

  it('should always have required accessibility attributes when displayed', () => {
    fc.assert(
      fc.property(fc.nat({ max: 10000 }), (voteCount) => {
        const { container } = render(<VoteStatusIndicator voteCount={voteCount} isVoted={true} />);

        const indicator = container.querySelector('[data-testid="vote-status-indicator"]');

        // Must have role="status" for screen readers
        expect(indicator?.getAttribute('role')).toBe('status');

        // Must have aria-label with vote count information
        const ariaLabel = indicator?.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel).toContain('投票済み');
        expect(ariaLabel).toContain(`${voteCount}`);

        // Icon must be hidden from screen readers
        const icon = container.querySelector('svg');
        expect(icon?.getAttribute('aria-hidden')).toBe('true');
      }),
      { numRuns: 20, endOnFailure: true }
    );
  });

  it('should always apply consistent styling when displayed', () => {
    fc.assert(
      fc.property(fc.nat({ max: 10000 }), (voteCount) => {
        const { container } = render(<VoteStatusIndicator voteCount={voteCount} isVoted={true} />);

        const indicator = container.firstChild as HTMLElement;

        // Must have base styling classes
        expect(indicator.classList.contains('flex')).toBe(true);
        expect(indicator.classList.contains('items-center')).toBe(true);
        expect(indicator.classList.contains('gap-2')).toBe(true);
        expect(indicator.classList.contains('rounded-md')).toBe(true);
        expect(indicator.classList.contains('bg-green-50')).toBe(true);
        expect(indicator.classList.contains('text-green-700')).toBe(true);
        expect(indicator.classList.contains('px-3')).toBe(true);
        expect(indicator.classList.contains('py-2')).toBe(true);
        expect(indicator.classList.contains('text-sm')).toBe(true);
        expect(indicator.classList.contains('font-medium')).toBe(true);
      }),
      { numRuns: 20, endOnFailure: true }
    );
  });

  it('should preserve custom className when provided', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 10000 }),
        fc.constantFrom('custom-class', 'test-class', 'my-style'),
        (voteCount, customClass) => {
          const { container } = render(
            <VoteStatusIndicator voteCount={voteCount} isVoted={true} className={customClass} />
          );

          const indicator = container.firstChild as HTMLElement;

          // Custom class should be applied
          expect(indicator.className).toContain(customClass);

          // Base classes should still be present
          expect(indicator.classList.contains('bg-green-50')).toBe(true);
          expect(indicator.classList.contains('text-green-700')).toBe(true);
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });
});
