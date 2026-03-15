import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AICandidateBadge } from './ai-candidate-badge';

describe('AICandidateBadge', () => {
  it('"AI生成" テキストを表示する', () => {
    render(<AICandidateBadge />);
    expect(screen.getByText('AI生成')).toBeInTheDocument();
  });

  it('紫色スタイリング（bg-purple-100, text-purple-800）が適用されている', () => {
    render(<AICandidateBadge />);
    const badge = screen.getByText('AI生成');
    expect(badge).toHaveClass('bg-purple-100');
    expect(badge).toHaveClass('text-purple-800');
  });

  it('aria-label 属性が設定されている', () => {
    render(<AICandidateBadge />);
    const badge = screen.getByLabelText('AI が生成した候補');
    expect(badge).toBeInTheDocument();
  });

  it('span タグでレンダリングされる', () => {
    render(<AICandidateBadge />);
    const badge = screen.getByText('AI生成');
    expect(badge.tagName).toBe('SPAN');
  });
});
