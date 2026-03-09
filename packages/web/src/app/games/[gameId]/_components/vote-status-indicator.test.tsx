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

  describe('Accessibility (Requirement 13.6)', () => {
    describe('ARIA Labels (Requirement 10.4)', () => {
      it('should have role="status" for live region', () => {
        const { container } = render(<VoteStatusIndicator />);
        const indicator = container.firstChild as HTMLElement;

        expect(indicator).toHaveAttribute('role', 'status');
      });

      it('should have aria-label for screen readers', () => {
        const { container } = render(<VoteStatusIndicator />);
        const indicator = container.firstChild as HTMLElement;

        expect(indicator).toHaveAttribute('aria-label', '投票済み');
      });

      it('should have aria-live="polite" for announcements', () => {
        const { container } = render(<VoteStatusIndicator />);
        const indicator = container.firstChild as HTMLElement;

        // Note: aria-live may not be set if role="status" is used (role="status" implies aria-live="polite")
        const hasAriaLive = indicator.hasAttribute('aria-live');
        const hasStatusRole = indicator.getAttribute('role') === 'status';

        expect(hasStatusRole || hasAriaLive).toBe(true);
      });

      it('should hide decorative icon from screen readers', () => {
        const { container } = render(<VoteStatusIndicator />);
        const icon = container.querySelector('svg');

        expect(icon).toHaveAttribute('aria-hidden', 'true');
      });
    });

    describe('Contrast Ratio (Requirement 10.7)', () => {
      it('should have sufficient contrast ratio (4.5:1 minimum)', () => {
        const { container } = render(<VoteStatusIndicator />);
        const indicator = container.firstChild as HTMLElement;

        // green-800 on green-100 provides sufficient contrast (>4.5:1)
        expect(indicator).toHaveClass('text-green-800');
        expect(indicator).toHaveClass('bg-green-100');
      });

      it('should maintain contrast in different states', () => {
        const { container } = render(<VoteStatusIndicator className="hover:bg-green-200" />);
        const indicator = container.firstChild as HTMLElement;

        // Even with hover state, contrast should be maintained
        expect(indicator.className).toContain('text-green-800');
      });
    });

    describe('Screen Reader Support (Requirement 10.5)', () => {
      it('should be announced to screen readers', () => {
        render(<VoteStatusIndicator />);

        const indicator = screen.getByRole('status');
        expect(indicator).toHaveAccessibleName('投票済み');
      });

      it('should have visible text content', () => {
        render(<VoteStatusIndicator />);

        expect(screen.getByText('投票済み')).toBeVisible();
      });

      it('should not rely solely on color to convey information', () => {
        const { container } = render(<VoteStatusIndicator />);

        // Should have both icon and text
        const icon = container.querySelector('svg');
        const texts = screen.getAllByText('投票済み');

        expect(icon).toBeInTheDocument();
        expect(texts.length).toBeGreaterThan(0);
      });
    });

    describe('Semantic HTML (Requirement 10.1)', () => {
      it('should use semantic element with role', () => {
        const { container } = render(<VoteStatusIndicator />);
        const indicator = container.firstChild as HTMLElement;

        // Should use either span or div with role="status"
        expect(['SPAN', 'DIV']).toContain(indicator.tagName);
        expect(indicator).toHaveAttribute('role', 'status');
      });

      it('should have proper structure with icon and text', () => {
        const { container } = render(<VoteStatusIndicator />);
        const indicator = container.firstChild as HTMLElement;

        const icon = indicator.querySelector('svg');
        const text = indicator.textContent;

        expect(icon).toBeInTheDocument();
        expect(text).toContain('投票済み');
      });
    });

    describe('Visual Design', () => {
      it('should have proper spacing and padding', () => {
        const { container } = render(<VoteStatusIndicator />);
        const indicator = container.firstChild as HTMLElement;

        expect(indicator).toHaveClass('px-3');
        expect(indicator).toHaveClass('py-1.5');
      });

      it('should have rounded corners', () => {
        const { container } = render(<VoteStatusIndicator />);
        const indicator = container.firstChild as HTMLElement;

        expect(indicator).toHaveClass('rounded-full');
      });

      it('should have inline-flex layout', () => {
        const { container } = render(<VoteStatusIndicator />);
        const indicator = container.firstChild as HTMLElement;

        expect(indicator).toHaveClass('inline-flex');
        expect(indicator).toHaveClass('items-center');
        // Gap can be gap-1, gap-1.5, gap-2, etc.
        expect(indicator.className).toMatch(/gap-/);
      });

      it('should have appropriate font size', () => {
        const { container } = render(<VoteStatusIndicator />);
        const indicator = container.firstChild as HTMLElement;

        expect(indicator).toHaveClass('text-sm');
      });
    });

    describe('Responsive Design', () => {
      it('should maintain readability on mobile', () => {
        const { container } = render(<VoteStatusIndicator />);
        const indicator = container.firstChild as HTMLElement;

        // Should have minimum touch target size considerations
        expect(indicator).toHaveClass('py-1.5');
        expect(indicator).toHaveClass('px-3');
      });

      it('should scale icon appropriately', () => {
        const { container } = render(<VoteStatusIndicator />);
        const icon = container.querySelector('svg');

        // Icon should have appropriate size
        expect(icon).toHaveClass('h-4');
        expect(icon).toHaveClass('w-4');
      });
    });
  });
});
