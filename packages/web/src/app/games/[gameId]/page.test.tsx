/**
 * Tests for Game Detail Screen
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import fc from 'fast-check';
import GameDetailPage from './page';
import * as apiClient from '@/lib/api/client';
import * as candidatesApi from '@/lib/api/candidates';
import * as commentaryApi from '@/lib/api/commentary';

// Mock dependencies
vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  useParams: vi.fn(() => ({ gameId: 'test-game-123' })),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock('@/lib/api/client', () => ({
  fetchGame: vi.fn(),
  fetchCandidates: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      public statusCode: number
    ) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

vi.mock('@/lib/api/candidates', () => ({
  getCandidates: vi.fn(),
  getVoteStatus: vi.fn(),
}));

vi.mock('@/lib/api/commentary', () => ({
  getCommentaries: vi.fn(),
}));

vi.mock('@/lib/services/storage-service', () => ({
  storageService: {
    getAccessToken: vi.fn(() => null),
  },
}));

vi.mock('@/components/board', () => ({
  Board: () => <div data-testid="board">Board Component</div>,
}));

vi.mock('@/components/move-history', () => ({
  MoveHistory: ({ moves }: { moves: unknown[] }) => (
    <div data-testid="move-history">Move History ({moves.length})</div>
  ),
}));

vi.mock('@/components/candidate-card', () => ({
  CandidateCard: ({ candidate }: { candidate: { candidateId: string } }) => (
    <div data-testid={`candidate-${candidate.candidateId}`}>Candidate Card</div>
  ),
}));

vi.mock('@/components/share-button', () => ({
  ShareButton: () => <button data-testid="share-button">シェア</button>,
}));

vi.mock('@/app/games/[gameId]/_components/candidate-list', () => ({
  CandidateList: ({
    initialCandidates,
  }: {
    initialCandidates: Array<{ id: string; position: string }>;
  }) => (
    <div data-testid="candidate-list">
      {initialCandidates.map((c) => (
        <div key={c.id} data-testid={`candidate-item-${c.id}`}>
          {c.position}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('@/app/games/[gameId]/_components/commentary-section', () => ({
  CommentarySection: ({ error }: { error: string | null }) => (
    <section data-testid="commentary-section">
      <h2>AI解説</h2>
      {error && (
        <p role="alert" data-testid="commentary-error">
          {error}
        </p>
      )}
    </section>
  ),
}));

describe('GameDetailPage', () => {
  const mockGame = {
    gameId: 'test-game-123',
    gameType: 'OTHELLO' as const,
    status: 'ACTIVE' as const,
    aiSide: 'BLACK' as const,
    currentTurn: 5,
    boardState: {
      board: [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 2, 1, 0, 0, 0],
        [0, 0, 0, 1, 2, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
      ],
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockCandidates = [
    {
      candidateId: 'candidate-1',
      gameId: 'test-game-123',
      position: 'C4',
      description: 'Good move',
      userId: 'user-1',
      username: 'player1',
      voteCount: 5,
      resultingBoardState: mockGame.boardState,
      createdAt: '2024-01-01T00:00:00Z',
    },
  ];

  it.skip('should render game details', async () => {
    vi.spyOn(apiClient, 'fetchGame').mockResolvedValue(mockGame);
    vi.spyOn(apiClient, 'fetchCandidates').mockResolvedValue(mockCandidates);

    const { container } = render(<GameDetailPage />);

    expect(container.textContent).toContain('オセロ対局');
    expect(container.textContent).toContain('ターン: 5');
    expect(container.textContent).toContain('進行中');
  });

  it.skip('should display board component', async () => {
    vi.spyOn(apiClient, 'fetchGame').mockResolvedValue(mockGame);
    vi.spyOn(apiClient, 'fetchCandidates').mockResolvedValue(mockCandidates);

    render(<GameDetailPage />);

    expect(screen.getByTestId('board')).toBeInTheDocument();
  });

  it.skip('should display disc counts', async () => {
    vi.spyOn(apiClient, 'fetchGame').mockResolvedValue(mockGame);
    vi.spyOn(apiClient, 'fetchCandidates').mockResolvedValue(mockCandidates);

    const { container } = render(<GameDetailPage />);

    // 2 black discs and 2 white discs in initial position
    expect(container.textContent).toContain('2');
  });

  it.skip('should display current player turn', async () => {
    vi.spyOn(apiClient, 'fetchGame').mockResolvedValue(mockGame);
    vi.spyOn(apiClient, 'fetchCandidates').mockResolvedValue(mockCandidates);

    const { container } = render(<GameDetailPage />);

    expect(container.textContent).toContain('現在のターン');
  });

  it.skip('should display candidates', async () => {
    vi.spyOn(apiClient, 'fetchGame').mockResolvedValue(mockGame);
    vi.spyOn(apiClient, 'fetchCandidates').mockResolvedValue(mockCandidates);

    render(<GameDetailPage />);

    expect(screen.getByTestId('candidate-candidate-1')).toBeInTheDocument();
  });

  it.skip('should show empty state when no candidates', async () => {
    vi.spyOn(apiClient, 'fetchGame').mockResolvedValue(mockGame);
    vi.spyOn(apiClient, 'fetchCandidates').mockResolvedValue([]);

    const { container } = render(<GameDetailPage />);

    expect(container.textContent).toContain('まだ候補がありません');
  });

  it.skip('should display share button', async () => {
    vi.spyOn(apiClient, 'fetchGame').mockResolvedValue(mockGame);
    vi.spyOn(apiClient, 'fetchCandidates').mockResolvedValue(mockCandidates);

    const { container } = render(<GameDetailPage />);

    expect(container.textContent).toContain('シェア');
  });

  it.skip('should display post candidate link when game is active', async () => {
    vi.spyOn(apiClient, 'fetchGame').mockResolvedValue(mockGame);
    vi.spyOn(apiClient, 'fetchCandidates').mockResolvedValue(mockCandidates);

    const { container } = render(<GameDetailPage />);

    expect(container.textContent).toContain('候補を投稿');
  });

  it.skip('should not display post candidate link when game is finished', async () => {
    const finishedGame = { ...mockGame, status: 'FINISHED' as const, winner: 'AI' as const };
    vi.spyOn(apiClient, 'fetchGame').mockResolvedValue(finishedGame);
    vi.spyOn(apiClient, 'fetchCandidates').mockResolvedValue(mockCandidates);

    const { container } = render(<GameDetailPage />);

    expect(container.textContent).not.toContain('候補を投稿');
  });

  it.skip('should display winner when game is finished', async () => {
    const finishedGame = { ...mockGame, status: 'FINISHED' as const, winner: 'AI' as const };
    vi.spyOn(apiClient, 'fetchGame').mockResolvedValue(finishedGame);
    vi.spyOn(apiClient, 'fetchCandidates').mockResolvedValue(mockCandidates);

    const { container } = render(<GameDetailPage />);

    expect(container.textContent).toContain('勝者');
    expect(container.textContent).toContain('AI');
  });

  it.skip('should display AI commentary section', async () => {
    vi.spyOn(apiClient, 'fetchGame').mockResolvedValue(mockGame);
    vi.spyOn(apiClient, 'fetchCandidates').mockResolvedValue(mockCandidates);

    const { container } = render(<GameDetailPage />);

    expect(container.textContent).toContain('AI解説');
  });
});

/**
 * Property 10: 解説取得失敗は候補一覧の表示をブロックしない
 *
 * Feature: ai-content-display, Property 10
 *
 * **Validates: Requirements 7.4**
 */
describe('Feature: ai-content-display, Property 10: 解説取得失敗は候補一覧の表示をブロックしない', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.clearAllMocks();
  });

  const mockGame = {
    gameId: 'test-game-123',
    gameType: 'OTHELLO' as const,
    status: 'ACTIVE' as const,
    aiSide: 'BLACK' as const,
    currentTurn: 5,
    boardState: {
      board: [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 2, 1, 0, 0, 0],
        [0, 0, 0, 1, 2, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
      ],
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  /**
   * Arbitrary: generate candidate data that getCandidates returns
   * (mapped Candidate type from candidates.ts)
   */
  const candidateArb = fc
    .record({
      id: fc.uuid(),
      position: fc.constantFrom('C4', 'D3', 'E6', 'F5', 'C6', 'D7'),
      description: fc.stringMatching(/^[a-zA-Z0-9]{5,20}$/),
      voteCount: fc.nat({ max: 100 }),
    })
    .map((c) => ({
      id: c.id,
      gameId: 'test-game-123',
      turnNumber: 5,
      position: c.position,
      description: c.description,
      boardState: [] as string[][],
      voteCount: c.voteCount,
      postedBy: 'USER#user1',
      postedByUsername: 'user1',
      status: 'active' as const,
      deadline: '2024-12-31T23:59:59Z',
      createdAt: '2024-01-01T00:00:00Z',
      source: 'user' as const,
    }));

  const candidateListArb = fc.array(candidateArb, { minLength: 1, maxLength: 5 });

  /**
   * Arbitrary: generate different error types for commentary API failure
   */
  const errorArb = fc.constantFrom(
    new Error('Network error'),
    new Error('Internal server error'),
    new Error('timeout'),
    new Error('ECONNREFUSED'),
    new Error('503 Service Unavailable')
  );

  it('解説 API がエラーを返しても候補一覧が正常に表示される', async () => {
    const samples = fc.sample(fc.tuple(candidateListArb, errorArb), 10);

    for (const [candidates, error] of samples) {
      vi.mocked(apiClient.fetchGame).mockResolvedValue(mockGame);
      vi.mocked(candidatesApi.getCandidates).mockResolvedValue(candidates);
      vi.mocked(commentaryApi.getCommentaries).mockRejectedValue(error);

      render(<GameDetailPage />);

      // Wait for async data loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('candidate-list')).toBeTruthy();
      });

      // Verify candidates are displayed
      expect(screen.getByTestId('candidate-list')).toBeTruthy();
      for (const candidate of candidates) {
        const item = screen.getByTestId(`candidate-item-${candidate.id}`);
        expect(item).toBeTruthy();
        expect(item.textContent).toContain(candidate.position);
      }

      // Verify commentary error is shown
      const commentaryError = screen.getByTestId('commentary-error');
      expect(commentaryError).toBeTruthy();
      expect(commentaryError.getAttribute('role')).toBe('alert');

      cleanup();
      vi.clearAllMocks();
    }
  });
});
