import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { CommentarySection } from './commentary-section';
import type { Commentary } from '@/lib/api/commentary';

afterEach(() => {
  cleanup();
});

const makeCommentary = (overrides: Partial<Commentary> & { turnNumber: number }): Commentary => ({
  content: `ターン${overrides.turnNumber}の解説です`,
  generatedBy: 'AI',
  createdAt: '2024-06-01T12:00:00.000Z',
  ...overrides,
});

const defaultProps = {
  commentaries: [] as Commentary[],
  isLoading: false,
  error: null,
  gameStatus: 'ACTIVE' as const,
  currentTurn: 1,
};

describe('CommentarySection', () => {
  it('"AI解説" 見出しを表示する', () => {
    render(<CommentarySection {...defaultProps} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('AI解説');
  });

  it('ローディング時にスケルトンローダーを表示する', () => {
    render(<CommentarySection {...defaultProps} isLoading={true} />);
    expect(screen.getByTestId('commentary-skeleton')).toBeInTheDocument();
  });

  it('エラー時にエラーメッセージを表示する（role="alert"）', () => {
    render(<CommentarySection {...defaultProps} error="取得失敗" />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('解説の取得に失敗しました');
  });

  it('解説なし時に空メッセージを表示する', () => {
    render(<CommentarySection {...defaultProps} commentaries={[]} />);
    expect(screen.getByText('この対局の AI 解説はまだありません')).toBeInTheDocument();
  });

  it('青色系スタイリング（bg-blue-50, border-blue-200）が適用されている', () => {
    render(<CommentarySection {...defaultProps} />);
    const section = screen.getByRole('region');
    expect(section).toHaveClass('bg-blue-50');
    expect(section).toHaveClass('border-blue-200');
  });

  it('セマンティック HTML（section, h2）を使用する', () => {
    render(<CommentarySection {...defaultProps} />);
    const section = screen.getByRole('region');
    expect(section.tagName).toBe('SECTION');
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });

  it('解説がある場合に article 要素を使用する', () => {
    const commentaries = [makeCommentary({ turnNumber: 1 })];
    render(<CommentarySection {...defaultProps} commentaries={commentaries} />);
    expect(screen.getByRole('article')).toBeInTheDocument();
  });

  describe('ターン選択ボタンの境界条件', () => {
    const twoCommentaries = [
      makeCommentary({ turnNumber: 1, content: 'ターン1の解説' }),
      makeCommentary({ turnNumber: 2, content: 'ターン2の解説' }),
    ];

    it('最初のターンで「前のターン」ボタンが無効化される', () => {
      render(<CommentarySection {...defaultProps} commentaries={twoCommentaries} />);
      // Navigate to first turn
      fireEvent.click(screen.getByText('前のターン'));
      const prevButton = screen.getByText('前のターン');
      expect(prevButton).toBeDisabled();
      expect(prevButton).toHaveAttribute('aria-disabled', 'true');
    });

    it('最後のターンで「次のターン」ボタンが無効化される', () => {
      render(<CommentarySection {...defaultProps} commentaries={twoCommentaries} />);
      // Default is last turn
      const nextButton = screen.getByText('次のターン');
      expect(nextButton).toBeDisabled();
      expect(nextButton).toHaveAttribute('aria-disabled', 'true');
    });
  });

  it('デフォルトで最新ターンの解説を表示する', () => {
    const commentaries = [
      makeCommentary({ turnNumber: 1, content: '最初のターンの解説' }),
      makeCommentary({ turnNumber: 2, content: '最新ターンの解説' }),
    ];
    render(<CommentarySection {...defaultProps} commentaries={commentaries} />);
    expect(screen.getByText('最新ターンの解説')).toBeInTheDocument();
  });

  describe('ターンナビゲーション', () => {
    const threeCommentaries = [
      makeCommentary({ turnNumber: 1, content: 'ターン1の内容' }),
      makeCommentary({ turnNumber: 2, content: 'ターン2の内容' }),
      makeCommentary({ turnNumber: 3, content: 'ターン3の内容' }),
    ];

    it('「前のターン」ボタンで前のターンの解説を表示する', () => {
      render(<CommentarySection {...defaultProps} commentaries={threeCommentaries} />);
      // Default is turn 3
      expect(screen.getByText('ターン3の内容')).toBeInTheDocument();
      fireEvent.click(screen.getByText('前のターン'));
      expect(screen.getByText('ターン2の内容')).toBeInTheDocument();
    });

    it('「次のターン」ボタンで次のターンの解説を表示する', () => {
      render(<CommentarySection {...defaultProps} commentaries={threeCommentaries} />);
      // Navigate to turn 2 first
      fireEvent.click(screen.getByText('前のターン'));
      expect(screen.getByText('ターン2の内容')).toBeInTheDocument();
      fireEvent.click(screen.getByText('次のターン'));
      expect(screen.getByText('ターン3の内容')).toBeInTheDocument();
    });
  });

  it('1件の解説の場合はターン選択UIが非表示', () => {
    const commentaries = [makeCommentary({ turnNumber: 1 })];
    render(<CommentarySection {...defaultProps} commentaries={commentaries} />);
    expect(screen.queryByText('前のターン')).not.toBeInTheDocument();
    expect(screen.queryByText('次のターン')).not.toBeInTheDocument();
  });
});
