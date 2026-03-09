/**
 * Unit tests for CandidateListSection component
 *
 * Tests server-side data fetching, error handling, and rendering
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CandidateListSection } from './candidate-list-section';
import * as candidatesApi from '@/lib/api/candidates';
import type { Candidate, VoteStatus } from '@/lib/api/candidates';

// Mock the API module
vi.mock('@/lib/api/candidates', () => ({
  getCandidates: vi.fn(),
  getVoteStatus: vi.fn(),
}));

describe('CandidateListSection', () => {
  const mockGameId = '123e4567-e89b-12d3-a456-426614174000';
  const mockTurnNumber = 5;

  const mockCandidates: Candidate[] = [
    {
      id: 'candidate-1',
      gameId: mockGameId,
      turnNumber: mockTurnNumber,
      position: 'D3',
      description: 'この手は中央を制圧する重要な一手です',
      boardState: Array(8).fill(Array(8).fill('')),
      voteCount: 10,
      postedBy: 'user-1',
      postedByUsername: 'テストユーザー1',
      status: 'active',
      deadline: '2024-01-01T00:00:00Z',
      createdAt: '2023-12-31T12:00:00Z',
      source: 'user',
    },
    {
      id: 'candidate-2',
      gameId: mockGameId,
      turnNumber: mockTurnNumber,
      position: 'E4',
      description: 'AI推奨の手です',
      boardState: Array(8).fill(Array(8).fill('')),
      voteCount: 5,
      postedBy: 'ai',
      postedByUsername: 'AI',
      status: 'active',
      deadline: '2024-01-01T00:00:00Z',
      createdAt: '2023-12-31T12:00:00Z',
      source: 'ai',
    },
  ];

  const mockVoteStatus: VoteStatus = {
    gameId: mockGameId,
    turnNumber: mockTurnNumber,
    userId: 'user-1',
    candidateId: 'candidate-1',
    createdAt: '2023-12-31T13:00:00Z',
    updatedAt: '2023-12-31T13:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render candidates successfully when authenticated', async () => {
    vi.mocked(candidatesApi.getCandidates).mockResolvedValue(mockCandidates);
    vi.mocked(candidatesApi.getVoteStatus).mockResolvedValue(mockVoteStatus);

    const component = await CandidateListSection({
      gameId: mockGameId,
      turnNumber: mockTurnNumber,
      isAuthenticated: true,
    });

    render(component);

    // Check section title
    expect(screen.getByText('次の一手候補')).toBeInTheDocument();

    // Check candidates are displayed
    expect(screen.getByText('D3')).toBeInTheDocument();
    expect(screen.getByText('E4')).toBeInTheDocument();
    expect(screen.getByText('この手は中央を制圧する重要な一手です')).toBeInTheDocument();

    // Check vote status is displayed
    expect(screen.getByText(/投票済み/)).toBeInTheDocument();

    // Verify API calls
    expect(candidatesApi.getCandidates).toHaveBeenCalledWith(mockGameId, mockTurnNumber);
    expect(candidatesApi.getVoteStatus).toHaveBeenCalledWith(mockGameId, mockTurnNumber);
  });

  it('should render candidates without vote status when not authenticated', async () => {
    vi.mocked(candidatesApi.getCandidates).mockResolvedValue(mockCandidates);

    const component = await CandidateListSection({
      gameId: mockGameId,
      turnNumber: mockTurnNumber,
      isAuthenticated: false,
    });

    render(component);

    // Check candidates are displayed
    expect(screen.getByText('D3')).toBeInTheDocument();
    expect(screen.getByText('E4')).toBeInTheDocument();

    // Verify getCandidates was called but not getVoteStatus
    expect(candidatesApi.getCandidates).toHaveBeenCalledWith(mockGameId, mockTurnNumber);
    expect(candidatesApi.getVoteStatus).not.toHaveBeenCalled();
  });

  it('should render empty state when no candidates exist', async () => {
    vi.mocked(candidatesApi.getCandidates).mockResolvedValue([]);

    const component = await CandidateListSection({
      gameId: mockGameId,
      turnNumber: mockTurnNumber,
      isAuthenticated: false,
    });

    render(component);

    // Check empty state message
    expect(screen.getByText('まだ候補がありません')).toBeInTheDocument();
    expect(screen.getByText('最初の候補を投稿しましょう！')).toBeInTheDocument();
  });

  it('should render error state when candidates fetch fails', async () => {
    vi.mocked(candidatesApi.getCandidates).mockRejectedValue(new Error('候補の取得に失敗しました'));

    const component = await CandidateListSection({
      gameId: mockGameId,
      turnNumber: mockTurnNumber,
      isAuthenticated: false,
    });

    render(component);

    // Check error message
    expect(screen.getByText('候補の取得に失敗しました')).toBeInTheDocument();
  });

  it('should render 404 error when game is not found', async () => {
    vi.mocked(candidatesApi.getCandidates).mockRejectedValue(
      new Error('404: 対局が見つかりません')
    );

    const component = await CandidateListSection({
      gameId: mockGameId,
      turnNumber: mockTurnNumber,
      isAuthenticated: false,
    });

    render(component);

    // Check 404 error message
    expect(screen.getByText('対局が見つかりません')).toBeInTheDocument();
  });

  it('should render network error message', async () => {
    vi.mocked(candidatesApi.getCandidates).mockRejectedValue(
      new Error('network error: Failed to fetch')
    );

    const component = await CandidateListSection({
      gameId: mockGameId,
      turnNumber: mockTurnNumber,
      isAuthenticated: false,
    });

    render(component);

    // Check network error message
    expect(screen.getByText('ネットワークエラーが発生しました')).toBeInTheDocument();
  });

  it('should handle vote status fetch failure gracefully', async () => {
    vi.mocked(candidatesApi.getCandidates).mockResolvedValue(mockCandidates);
    vi.mocked(candidatesApi.getVoteStatus).mockRejectedValue(
      new Error('投票状況の取得に失敗しました')
    );

    const component = await CandidateListSection({
      gameId: mockGameId,
      turnNumber: mockTurnNumber,
      isAuthenticated: true,
    });

    render(component);

    // Should still render candidates even if vote status fails
    expect(screen.getByText('D3')).toBeInTheDocument();
    expect(screen.getByText('E4')).toBeInTheDocument();

    // Should not show vote status
    expect(screen.queryByText(/投票済み/)).not.toBeInTheDocument();
  });

  it('should display candidate metadata correctly', async () => {
    vi.mocked(candidatesApi.getCandidates).mockResolvedValue(mockCandidates);

    const component = await CandidateListSection({
      gameId: mockGameId,
      turnNumber: mockTurnNumber,
      isAuthenticated: false,
    });

    render(component);

    // Check vote counts
    expect(screen.getByText('投票数: 10')).toBeInTheDocument();
    expect(screen.getByText('投票数: 5')).toBeInTheDocument();

    // Check usernames
    expect(screen.getByText('投稿者: テストユーザー1')).toBeInTheDocument();
    expect(screen.getByText('投稿者: AI')).toBeInTheDocument();

    // Check status badges
    const statusBadges = screen.getAllByText('投票受付中');
    expect(statusBadges).toHaveLength(2);
  });

  it('should display closed status correctly', async () => {
    const closedCandidate: Candidate = {
      ...mockCandidates[0],
      status: 'closed',
    };

    vi.mocked(candidatesApi.getCandidates).mockResolvedValue([closedCandidate]);

    const component = await CandidateListSection({
      gameId: mockGameId,
      turnNumber: mockTurnNumber,
      isAuthenticated: false,
    });

    render(component);

    // Check closed status badge
    expect(screen.getByText('締切済み')).toBeInTheDocument();
  });
});
