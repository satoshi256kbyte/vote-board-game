/**
 * CandidateCard Property-Based Tests
 *
 * Property 2: 候補カードの必須フィールド表示
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9**
 *
 * For any candidate card, all required fields (position, board preview, description,
 * poster username, vote count, deadline, status badge, vote button, creation date)
 * must be displayed.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import fc from 'fast-check';
import { CandidateCard } from './candidate-card';
import type { Candidate } from '@/lib/api/candidates';

// Mock the child components
vi.mock('./board-preview', () => ({
  BoardPreview: ({
    boardState,
    highlightPosition,
  }: {
    boardState: string[][];
    highlightPosition: string;
  }) => (
    <div
      data-testid="board-preview"
      data-board-state={JSON.stringify(boardState)}
      data-highlight={highlightPosition}
    >
      Board Preview
    </div>
  ),
}));

vi.mock('./vote-button', () => ({
  VoteButton: ({
    candidateId,
    isAuthenticated,
  }: {
    candidateId: string;
    isAuthenticated: boolean;
  }) => (
    <button
      data-testid="vote-button"
      data-candidate-id={candidateId}
      data-authenticated={isAuthenticated}
    >
      Vote Button
    </button>
  ),
}));

vi.mock('./vote-status-indicator', () => ({
  VoteStatusIndicator: () => <div data-testid="vote-status-indicator">✓投票済み</div>,
}));

vi.mock('@/lib/utils/time-remaining', () => ({
  calculateTimeRemaining: (deadline: string) => {
    const now = new Date().getTime();
    const deadlineTime = new Date(deadline).getTime();
    const diff = deadlineTime - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (diff < 0) {
      return {
        hours: 0,
        minutes: 0,
        isExpired: true,
        displayText: '締切済み',
        colorClass: 'text-gray-500',
      };
    }

    if (hours < 1) {
      return {
        hours: 0,
        minutes: Math.floor(diff / (1000 * 60)),
        isExpired: false,
        displayText: `あと${Math.floor(diff / (1000 * 60))}分`,
        colorClass: 'text-red-500',
      };
    }

    if (hours < 24) {
      return {
        hours,
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        isExpired: false,
        displayText: `あと${hours}時間`,
        colorClass: 'text-orange-500',
      };
    }

    return {
      hours,
      minutes: 0,
      isExpired: false,
      displayText: `あと${Math.floor(hours / 24)}日`,
      colorClass: 'text-gray-700',
    };
  },
}));

/**
 * Arbitrary generator for board state (8x8 grid)
 */
function boardStateArb(): fc.Arbitrary<string[][]> {
  return fc.array(
    fc.array(fc.constantFrom('empty', 'black', 'white'), { minLength: 8, maxLength: 8 }),
    { minLength: 8, maxLength: 8 }
  );
}

/**
 * Arbitrary generator for position (A-H, 1-8)
 */
function positionArb(): fc.Arbitrary<string> {
  return fc
    .tuple(fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'), fc.integer({ min: 1, max: 8 }))
    .map(([col, row]) => `${col}${row}`);
}

/**
 * Arbitrary generator for Candidate
 */
function candidateArb(): fc.Arbitrary<Candidate> {
  return fc.record({
    id: fc.uuid(),
    gameId: fc.uuid(),
    turnNumber: fc.nat({ max: 100 }),
    position: positionArb(),
    description: fc.string({ minLength: 1, maxLength: 200 }),
    boardState: boardStateArb(),
    voteCount: fc.nat({ max: 10000 }),
    postedBy: fc.uuid(),
    postedByUsername: fc.string({ minLength: 1, maxLength: 50 }),
    status: fc.constantFrom('active' as const, 'closed' as const),
    deadline: fc
      .integer({ min: Date.now() - 86400000, max: Date.now() + 86400000 })
      .map((ts) => new Date(ts).toISOString()),
    createdAt: fc
      .integer({ min: Date.now() - 86400000 * 30, max: Date.now() })
      .map((ts) => new Date(ts).toISOString()),
    source: fc.constantFrom('ai' as const, 'user' as const),
  });
}

describe('Feature: 23-move-candidates-display, Property 2: 候補カードの必須フィールド表示', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
  });

  it('should display all required fields for any valid candidate', () => {
    fc.assert(
      fc.property(
        candidateArb(),
        fc.uuid(),
        fc.nat({ max: 100 }),
        fc.boolean(),
        (candidate, gameId, turnNumber, isAuthenticated) => {
          // Render the component
          const { container } = render(
            <CandidateCard
              candidate={candidate}
              gameId={gameId}
              turnNumber={turnNumber}
              isAuthenticated={isAuthenticated}
              currentVotedCandidateId={undefined}
              onVoteSuccess={() => {}}
            />
          );

          // Requirement 2.1: Position must be displayed
          const positionElement = container.querySelector('[data-testid="candidate-position"]');
          expect(positionElement).toBeTruthy();
          expect(positionElement?.textContent).toBe(candidate.position);

          // Requirement 2.2: Board preview must be displayed
          const boardPreview = container.querySelector('[data-testid="board-preview"]');
          expect(boardPreview).toBeTruthy();
          expect(boardPreview?.getAttribute('data-highlight')).toBe(candidate.position);

          // Requirement 2.3: Description must be displayed
          const descriptionElement = container.querySelector(
            '[data-testid="candidate-description"]'
          );
          expect(descriptionElement).toBeTruthy();
          expect(descriptionElement?.textContent).toBe(candidate.description);

          // Requirement 2.4: Poster username must be displayed
          const posterElement = container.querySelector('[data-testid="candidate-poster"]');
          expect(posterElement).toBeTruthy();
          expect(posterElement?.textContent).toBe(candidate.postedByUsername);

          // Requirement 2.5: Vote count must be displayed
          const voteCountElement = container.querySelector('[data-testid="candidate-vote-count"]');
          expect(voteCountElement).toBeTruthy();
          expect(voteCountElement?.textContent).toBe(candidate.voteCount.toString());

          // Requirement 2.6: Deadline must be displayed
          const deadlineElement = container.querySelector('[data-testid="candidate-deadline"]');
          expect(deadlineElement).toBeTruthy();
          expect(deadlineElement?.textContent).toBeTruthy();

          // Requirement 2.7: Status badge must be displayed
          const statusBadge = container.querySelector('[data-testid="status-badge"]');
          expect(statusBadge).toBeTruthy();
          const statusText = statusBadge?.textContent;
          expect(statusText === '投票受付中' || statusText === '締切済み').toBe(true);

          // Requirement 2.8: Vote button or status indicator must be displayed
          const voteButton = container.querySelector('[data-testid="vote-button"]');
          const voteStatusIndicator = container.querySelector(
            '[data-testid="vote-status-indicator"]'
          );
          expect(voteButton !== null || voteStatusIndicator !== null).toBe(true);

          // Requirement 2.9: Creation date must be displayed
          const createdAtElement = container.querySelector('[data-testid="candidate-created-at"]');
          expect(createdAtElement).toBeTruthy();
          expect(createdAtElement?.textContent).toBeTruthy();
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('should display vote status indicator when user has voted for this candidate', () => {
    fc.assert(
      fc.property(
        candidateArb(),
        fc.uuid(),
        fc.nat({ max: 100 }),
        (candidate, gameId, turnNumber) => {
          // Render with currentVotedCandidateId matching this candidate
          const { container } = render(
            <CandidateCard
              candidate={candidate}
              gameId={gameId}
              turnNumber={turnNumber}
              isAuthenticated={true}
              currentVotedCandidateId={candidate.id}
              onVoteSuccess={() => {}}
            />
          );

          // Should show vote status indicator
          const voteStatusIndicator = container.querySelector(
            '[data-testid="vote-status-indicator"]'
          );
          expect(voteStatusIndicator).toBeTruthy();

          // Should NOT show vote button
          const voteButton = container.querySelector('[data-testid="vote-button"]');
          expect(voteButton).toBeFalsy();
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('should display vote button when user has not voted for this candidate', () => {
    fc.assert(
      fc.property(
        candidateArb(),
        fc.uuid(),
        fc.nat({ max: 100 }),
        fc.boolean(),
        (candidate, gameId, turnNumber, isAuthenticated) => {
          // Render with no vote or vote for different candidate
          const { container } = render(
            <CandidateCard
              candidate={candidate}
              gameId={gameId}
              turnNumber={turnNumber}
              isAuthenticated={isAuthenticated}
              currentVotedCandidateId={undefined}
              onVoteSuccess={() => {}}
            />
          );

          // Should show vote button
          const voteButton = container.querySelector('[data-testid="vote-button"]');
          expect(voteButton).toBeTruthy();

          // Should NOT show vote status indicator
          const voteStatusIndicator = container.querySelector(
            '[data-testid="vote-status-indicator"]'
          );
          expect(voteStatusIndicator).toBeFalsy();
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('should display correct status badge based on candidate status', () => {
    fc.assert(
      fc.property(
        candidateArb(),
        fc.uuid(),
        fc.nat({ max: 100 }),
        (candidate, gameId, turnNumber) => {
          const { container } = render(
            <CandidateCard
              candidate={candidate}
              gameId={gameId}
              turnNumber={turnNumber}
              isAuthenticated={true}
              currentVotedCandidateId={undefined}
              onVoteSuccess={() => {}}
            />
          );

          const statusBadge = container.querySelector('[data-testid="status-badge"]');
          expect(statusBadge).toBeTruthy();

          const statusText = statusBadge?.textContent;

          // Check if status matches the candidate's status or deadline
          const timeRemaining = new Date(candidate.deadline).getTime() - Date.now();
          const isExpired = timeRemaining < 0;

          if (candidate.status === 'closed' || isExpired) {
            expect(statusText).toBe('締切済み');
          } else {
            expect(statusText).toBe('投票受付中');
          }
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });
});
