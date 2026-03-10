/**
 * VoteButton Property-Based Tests
 *
 * Property 1: 認証必須
 * **Validates: Requirements 1.1, 1.2, 1.3**
 *
 * Property 6: ローディング状態の表示
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 13.1, 13.2, 13.3**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import fc from 'fast-check';
import { VoteButton } from './vote-button';
import * as votesApi from '@/lib/api/votes';

// Mock the API module
vi.mock('@/lib/api/votes', () => ({
  createVote: vi.fn(),
  changeVote: vi.fn(),
}));

describe('Feature: 25-vote-button-status-display, Property 1: 認証必須', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
  });

  it('should always disable button when isAuthenticated is false for any props', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.nat({ max: 100 }),
        fc.boolean(),
        fc.boolean(),
        fc.nat({ max: 10000 }),
        (candidateId, gameId, turnNumber, isVoted, hasVotedOther, voteCount) => {
          // Skip if isVoted is true (different component is rendered)
          if (isVoted) {
            return true;
          }

          const mockOnVoteSuccess = vi.fn();

          // Render with isAuthenticated=false
          const { container } = render(
            <VoteButton
              candidateId={candidateId}
              gameId={gameId}
              turnNumber={turnNumber}
              isVoted={isVoted}
              hasVotedOther={hasVotedOther}
              isAuthenticated={false}
              onVoteSuccess={mockOnVoteSuccess}
              voteCount={voteCount}
              currentCandidatePosition="C4"
              newCandidatePosition="D5"
            />
          );

          // Requirement 1.1: Button must be disabled when unauthenticated
          const button = container.querySelector('[data-testid="vote-button"]');
          expect(button).toBeTruthy();
          expect(button?.hasAttribute('disabled')).toBe(true);

          // Requirement 1.2: Tooltip wrapper must exist
          const tooltipTrigger = container.querySelector('[data-state]');
          expect(tooltipTrigger).toBeTruthy();

          // Requirement 1.3: Button must have accessible aria-label
          expect(button?.getAttribute('aria-label')).toBe('ログインして投票');

          // Button text should be "投票する"
          expect(button?.textContent).toBe('投票する');

          return true;
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  it('should never trigger vote action when unauthenticated button is clicked', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.nat({ max: 100 }),
        fc.nat({ max: 10000 }),
        (candidateId, gameId, turnNumber, voteCount) => {
          const mockOnVoteSuccess = vi.fn();
          vi.mocked(votesApi.createVote).mockClear();

          const { container } = render(
            <VoteButton
              candidateId={candidateId}
              gameId={gameId}
              turnNumber={turnNumber}
              isVoted={false}
              hasVotedOther={false}
              isAuthenticated={false}
              onVoteSuccess={mockOnVoteSuccess}
              voteCount={voteCount}
            />
          );

          const button = container.querySelector('[data-testid="vote-button"]') as HTMLElement;

          // Try to click the disabled button
          fireEvent.click(button);

          // Requirement 1.3: No vote action should be triggered
          expect(votesApi.createVote).not.toHaveBeenCalled();
          expect(mockOnVoteSuccess).not.toHaveBeenCalled();

          return true;
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });

  it('should always wrap button in tooltip provider when unauthenticated', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.nat({ max: 100 }),
        fc.nat({ max: 10000 }),
        (candidateId, gameId, turnNumber, voteCount) => {
          const { container } = render(
            <VoteButton
              candidateId={candidateId}
              gameId={gameId}
              turnNumber={turnNumber}
              isVoted={false}
              hasVotedOther={false}
              isAuthenticated={false}
              onVoteSuccess={vi.fn()}
              voteCount={voteCount}
            />
          );

          // Requirement 1.2: Button must be wrapped in tooltip trigger
          const inlineBlockWrapper = container.querySelector('.inline-block');
          expect(inlineBlockWrapper).toBeTruthy();

          // Tooltip trigger should have data-state attribute
          const tooltipTrigger = container.querySelector('[data-state]');
          expect(tooltipTrigger).toBeTruthy();

          return true;
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });
});

describe('Feature: 25-vote-button-status-display, Property 6: ローディング状態の表示', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
  });

  it('should always disable button during vote processing for any props', () => {
    fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.nat({ max: 100 }),
        fc.nat({ max: 10000 }),
        async (candidateId, gameId, turnNumber, voteCount) => {
          // Mock API to delay response
          vi.mocked(votesApi.createVote).mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 50))
          );

          const { container } = render(
            <VoteButton
              candidateId={candidateId}
              gameId={gameId}
              turnNumber={turnNumber}
              isVoted={false}
              hasVotedOther={false}
              isAuthenticated={true}
              onVoteSuccess={vi.fn()}
              voteCount={voteCount}
            />
          );

          const button = container.querySelector('[data-testid="vote-button"]') as HTMLElement;

          // Click the button to start vote processing
          fireEvent.click(button);

          // Requirement 6.1: Button must be disabled during processing
          expect(button.hasAttribute('disabled')).toBe(true);

          // Requirement 6.2: Button must display "投票中..." text
          expect(button.textContent).toBe('投票中...');

          // Wait for the API call to complete
          await waitFor(() => {
            expect(button.textContent).toBe('投票する');
          });

          return true;
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('should always disable change button during vote change processing', () => {
    fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.nat({ max: 100 }),
        fc.nat({ max: 10000 }),
        async (candidateId, gameId, turnNumber, voteCount) => {
          // Mock API to delay response
          vi.mocked(votesApi.changeVote).mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 50))
          );

          const { container } = render(
            <VoteButton
              candidateId={candidateId}
              gameId={gameId}
              turnNumber={turnNumber}
              isVoted={false}
              hasVotedOther={true}
              isAuthenticated={true}
              onVoteSuccess={vi.fn()}
              voteCount={voteCount}
              currentCandidatePosition="C4"
              newCandidatePosition="D5"
            />
          );

          const changeButton = container.querySelector(
            '[data-testid="vote-change-button"]'
          ) as HTMLElement;

          // Click the change button to open dialog
          fireEvent.click(changeButton);

          // Wait for dialog to open and find confirm button
          await waitFor(() => {
            const confirmButton = container.querySelector('[data-testid="confirm-button"]');
            expect(confirmButton).toBeTruthy();
          });

          // Click confirm button in dialog
          const confirmButton = container.querySelector(
            '[data-testid="confirm-button"]'
          ) as HTMLElement;
          fireEvent.click(confirmButton);

          // Wait a bit for state to update
          await new Promise((resolve) => setTimeout(resolve, 10));

          // Requirement 6.1: Button must be disabled during processing
          expect(changeButton.hasAttribute('disabled')).toBe(true);

          // Requirement 6.3: Button must display "変更中..." text
          expect(changeButton.textContent).toBe('変更中...');

          // Wait for the API call to complete
          await waitFor(() => {
            expect(changeButton.textContent).toBe('投票を変更');
          });

          return true;
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('should always prevent duplicate submissions during loading', () => {
    fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.nat({ max: 100 }),
        fc.nat({ max: 10000 }),
        async (candidateId, gameId, turnNumber, voteCount) => {
          let callCount = 0;
          vi.mocked(votesApi.createVote).mockImplementation(() => {
            callCount++;
            return new Promise((resolve) => setTimeout(resolve, 100));
          });

          const { container } = render(
            <VoteButton
              candidateId={candidateId}
              gameId={gameId}
              turnNumber={turnNumber}
              isVoted={false}
              hasVotedOther={false}
              isAuthenticated={true}
              onVoteSuccess={vi.fn()}
              voteCount={voteCount}
            />
          );

          const button = container.querySelector('[data-testid="vote-button"]') as HTMLElement;

          // Try to click multiple times
          fireEvent.click(button);
          fireEvent.click(button);
          fireEvent.click(button);

          // Requirement 6.4, 13.2: Only one API call should be made
          await waitFor(() => {
            expect(callCount).toBe(1);
          });

          // Requirement 13.1: Button should be disabled during processing
          expect(button.hasAttribute('disabled')).toBe(true);

          return true;
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('should always re-enable button after vote completes (success or failure)', () => {
    fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.nat({ max: 100 }),
        fc.nat({ max: 10000 }),
        fc.boolean(),
        async (candidateId, gameId, turnNumber, voteCount, shouldSucceed) => {
          // Mock API to succeed or fail
          if (shouldSucceed) {
            vi.mocked(votesApi.createVote).mockResolvedValue();
          } else {
            vi.mocked(votesApi.createVote).mockRejectedValue(new Error('API Error'));
          }

          const { container } = render(
            <VoteButton
              candidateId={candidateId}
              gameId={gameId}
              turnNumber={turnNumber}
              isVoted={false}
              hasVotedOther={false}
              isAuthenticated={true}
              onVoteSuccess={vi.fn()}
              voteCount={voteCount}
            />
          );

          const button = container.querySelector('[data-testid="vote-button"]') as HTMLElement;

          // Click the button
          fireEvent.click(button);

          // Wait for API call to complete
          await waitFor(() => {
            // Requirement 13.3: Button should be re-enabled after completion
            expect(button.hasAttribute('disabled')).toBe(false);
          });

          // Button should show normal text (not loading)
          expect(button.textContent).toBe('投票する');

          return true;
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('should always show loading text during processing for any button state', () => {
    fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.nat({ max: 100 }),
        fc.nat({ max: 10000 }),
        fc.boolean(),
        async (candidateId, gameId, turnNumber, voteCount, hasVotedOther) => {
          const apiMock = hasVotedOther ? votesApi.changeVote : votesApi.createVote;
          vi.mocked(apiMock).mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 50))
          );

          const { container } = render(
            <VoteButton
              candidateId={candidateId}
              gameId={gameId}
              turnNumber={turnNumber}
              isVoted={false}
              hasVotedOther={hasVotedOther}
              isAuthenticated={true}
              onVoteSuccess={vi.fn()}
              voteCount={voteCount}
              currentCandidatePosition="C4"
              newCandidatePosition="D5"
            />
          );

          const buttonTestId = hasVotedOther ? 'vote-change-button' : 'vote-button';
          const button = container.querySelector(`[data-testid="${buttonTestId}"]`) as HTMLElement;

          // Click the button
          fireEvent.click(button);

          if (hasVotedOther) {
            // For vote change, need to confirm dialog
            await waitFor(() => {
              const confirmButton = container.querySelector('[data-testid="confirm-button"]');
              expect(confirmButton).toBeTruthy();
            });

            const confirmButton = container.querySelector(
              '[data-testid="confirm-button"]'
            ) as HTMLElement;
            fireEvent.click(confirmButton);

            await new Promise((resolve) => setTimeout(resolve, 10));
          }

          // Requirement 6.2, 6.3: Loading text must be displayed
          const expectedText = hasVotedOther ? '変更中...' : '投票中...';
          expect(button.textContent).toBe(expectedText);

          // Wait for completion
          await waitFor(() => {
            const normalText = hasVotedOther ? '投票を変更' : '投票する';
            expect(button.textContent).toBe(normalText);
          });

          return true;
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });
});
