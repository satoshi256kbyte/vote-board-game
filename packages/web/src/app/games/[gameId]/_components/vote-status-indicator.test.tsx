import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VoteStatusIndicator } from './vote-status-indicator';

describe('VoteStatusIndicator', () => {
  it('should render with "投票済み" label', () => {
    render(<VoteStatusIndicator />);

    expect(screen.getByText('投票済み')).toBeInTheDocument();
  });

  it('should have green background styling', () => {
    const { container } = render(<VoteStatusIndicator />);
    const indicator = container.firstChild as HTMLElement;

    expect(indicator).toHaveClass('bg-green-100');
    expect(indicator).toHaveClass('text-green-800');
  });

  it('should have checkmark icon', () => {
    const { container } = render(<VoteStatusIndicator />);
    const svg = container.querySelector('svg');

    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('should have accessible aria-label', () => {
    const { container } = render(<VoteStatusIndicator />);
    const indicator = container.firstChild as HTMLElement;

    expect(indicator).toHaveAttribute('role', 'status');
    expect(indicator).toHaveAttribute('aria-label', '投票済み');
  });

  it('should accept custom className', () => {
    const { container } = render(<VoteStatusIndicator className="custom-class" />);
    const indicator = container.firstChild as HTMLElement;

    expect(indicator).toHaveClass('custom-class');
  });

  it('should have rounded badge style', () => {
    const { container } = render(<VoteStatusIndicator />);
    const indicator = container.firstChild as HTMLElement;

    expect(indicator).toHaveClass('rounded-full');
    expect(indicator).toHaveClass('px-3');
    expect(indicator).toHaveClass('py-1.5');
  });

  it('should be readable by screen readers', () => {
    render(<VoteStatusIndicator />);

    // The component should have role="status" which makes it a live region
    const indicator = screen.getByRole('status');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveAccessibleName('投票済み');
  });
});
