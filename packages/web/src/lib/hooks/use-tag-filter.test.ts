import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useTagFilter } from './use-tag-filter';
import type { GameSummary } from '@/types/game';

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.clearAllMocks();
});

const mockGames: GameSummary[] = [
  {
    gameId: 'g1',
    gameType: 'OTHELLO',
    status: 'ACTIVE',
    aiSide: 'BLACK',
    currentTurn: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    tags: ['初心者向け'],
  },
  {
    gameId: 'g2',
    gameType: 'OTHELLO',
    status: 'FINISHED',
    aiSide: 'WHITE',
    currentTurn: 10,
    winner: 'AI',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    tags: ['上級者向け'],
  },
  {
    gameId: 'g3',
    gameType: 'OTHELLO',
    status: 'ACTIVE',
    aiSide: 'BLACK',
    currentTurn: 5,
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
    tags: ['初心者向け', 'E2E'],
  },
];

describe('useTagFilter', () => {
  it('初期状態: タグ未選択で全対局が返り、候補が生成される', () => {
    const { result } = renderHook(() => useTagFilter({ games: mockGames }));

    expect(result.current.selectedTags).toEqual([]);
    expect(result.current.filteredGames).toEqual(mockGames);
    expect(result.current.resultCount).toBe(3);
    expect(result.current.suggestions.length).toBeGreaterThan(0);
  });

  it('addTag: タグを追加するとフィルタリングされる', () => {
    const { result } = renderHook(() => useTagFilter({ games: mockGames }));

    act(() => {
      result.current.addTag('初心者向け');
    });

    expect(result.current.selectedTags).toHaveLength(1);
    expect(result.current.selectedTags[0].value).toBe('初心者向け');
    // g1 と g3 が '初心者向け' タグを持つ
    expect(result.current.filteredGames).toHaveLength(2);
    expect(result.current.filteredGames.map((g) => g.gameId)).toEqual(['g1', 'g3']);
  });

  it('addTag: 重複タグは追加されない', () => {
    const { result } = renderHook(() => useTagFilter({ games: mockGames }));

    act(() => {
      result.current.addTag('初心者向け');
    });
    act(() => {
      result.current.addTag('初心者向け');
    });

    expect(result.current.selectedTags).toHaveLength(1);
  });

  it('removeTag: タグを削除するとフィルタリングが更新される', () => {
    const { result } = renderHook(() => useTagFilter({ games: mockGames }));

    act(() => {
      result.current.addTag('初心者向け');
    });
    expect(result.current.filteredGames).toHaveLength(2);

    act(() => {
      result.current.removeTag('初心者向け');
    });
    expect(result.current.selectedTags).toHaveLength(0);
    expect(result.current.filteredGames).toHaveLength(3);
  });

  it('clearTags: 全タグをクリアすると全対局が表示される', () => {
    const { result } = renderHook(() => useTagFilter({ games: mockGames }));

    act(() => {
      result.current.addTag('初心者向け');
      result.current.addTag('OTHELLO');
    });
    expect(result.current.selectedTags.length).toBeGreaterThan(0);

    act(() => {
      result.current.clearTags();
    });
    expect(result.current.selectedTags).toHaveLength(0);
    expect(result.current.filteredGames).toEqual(mockGames);
  });

  it('initialTags: 初期タグが復元される', () => {
    const { result } = renderHook(() =>
      useTagFilter({ games: mockGames, initialTags: ['オセロ'] })
    );

    expect(result.current.selectedTags).toHaveLength(1);
    expect(result.current.selectedTags[0].label).toBe('オセロ');
    expect(result.current.selectedTags[0].type).toBe('gameType');
    // 全ゲームが OTHELLO なので全件一致
    expect(result.current.filteredGames).toHaveLength(3);
  });

  it('initialTags: 存在しないタグは無視される', () => {
    const { result } = renderHook(() =>
      useTagFilter({ games: mockGames, initialTags: ['存在しないタグ'] })
    );

    expect(result.current.selectedTags).toHaveLength(0);
    expect(result.current.filteredGames).toEqual(mockGames);
  });

  it('suggestions: 選択済みタグは候補から除外される', () => {
    const { result } = renderHook(() => useTagFilter({ games: mockGames }));

    const initialSuggestionValues = result.current.suggestions.map((s) => s.value);
    expect(initialSuggestionValues).toContain('OTHELLO');

    act(() => {
      result.current.addTag('OTHELLO');
    });

    const updatedSuggestionValues = result.current.suggestions.map((s) => s.value);
    expect(updatedSuggestionValues).not.toContain('OTHELLO');
  });

  it('resultCount: filteredGames.length と一致する', () => {
    const { result } = renderHook(() => useTagFilter({ games: mockGames }));

    expect(result.current.resultCount).toBe(result.current.filteredGames.length);

    act(() => {
      result.current.addTag('初心者向け');
    });

    expect(result.current.resultCount).toBe(result.current.filteredGames.length);
    expect(result.current.resultCount).toBe(2);
  });

  it('複数タグ: AND条件で全タグに一致する対局のみ表示される', () => {
    const { result } = renderHook(() => useTagFilter({ games: mockGames }));

    // OTHELLO タグを追加 → 全ゲームが OTHELLO なので全件
    act(() => {
      result.current.addTag('OTHELLO');
    });
    expect(result.current.filteredGames).toHaveLength(3);

    // さらに '上級者向け' を追加 → g2 のみ
    act(() => {
      result.current.addTag('上級者向け');
    });
    expect(result.current.filteredGames).toHaveLength(1);
    expect(result.current.filteredGames[0].gameId).toBe('g2');
  });
});
