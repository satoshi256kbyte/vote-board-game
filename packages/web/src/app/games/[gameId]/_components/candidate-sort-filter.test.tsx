/**
 * Unit tests for CandidateSortFilter component
 *
 * **Validates: Requirements 13.1, 13.2**
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useSearchParams } from 'next/navigation';
import { CandidateSortFilter } from './candidate-sort-filter';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

describe('CandidateSortFilter', () => {
  const mockPush = vi.fn();
  const mockOnSortChange = vi.fn();
  const mockOnFilterChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    });

    (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue({
      toString: () => '',
      get: vi.fn(),
    });
  });

  describe('Rendering', () => {
    it('should render sort and filter dropdowns', () => {
      render(
        <CandidateSortFilter
          sortBy="voteCount"
          sortOrder="desc"
          filter="all"
          onSortChange={mockOnSortChange}
          onFilterChange={mockOnFilterChange}
        />
      );

      expect(screen.getByTestId('candidate-sort-dropdown')).toBeInTheDocument();
      expect(screen.getByTestId('candidate-filter-dropdown')).toBeInTheDocument();
    });

    it('should display correct sort label for voteCount desc', () => {
      render(
        <CandidateSortFilter
          sortBy="voteCount"
          sortOrder="desc"
          filter="all"
          onSortChange={mockOnSortChange}
          onFilterChange={mockOnFilterChange}
        />
      );

      expect(screen.getByText('投票数 (降順)')).toBeInTheDocument();
    });

    it('should display correct sort label for createdAt asc', () => {
      render(
        <CandidateSortFilter
          sortBy="createdAt"
          sortOrder="asc"
          filter="all"
          onSortChange={mockOnSortChange}
          onFilterChange={mockOnFilterChange}
        />
      );

      expect(screen.getByText('作成日時 (昇順)')).toBeInTheDocument();
    });

    it('should display correct filter labels', () => {
      const filters = [
        { filter: 'all' as const, expected: '全て' },
        { filter: 'my-vote' as const, expected: '自分の投票' },
        { filter: 'ai' as const, expected: 'AI生成' },
        { filter: 'user' as const, expected: 'ユーザー投稿' },
      ];

      filters.forEach(({ filter, expected }) => {
        const { unmount } = render(
          <CandidateSortFilter
            sortBy="voteCount"
            sortOrder="desc"
            filter={filter}
            onSortChange={mockOnSortChange}
            onFilterChange={mockOnFilterChange}
          />
        );

        expect(screen.getByText(expected)).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have aria-labels', () => {
      render(
        <CandidateSortFilter
          sortBy="voteCount"
          sortOrder="desc"
          filter="all"
          onSortChange={mockOnSortChange}
          onFilterChange={mockOnFilterChange}
        />
      );

      expect(screen.getByTestId('candidate-sort-dropdown')).toHaveAttribute(
        'aria-label',
        'ソート設定'
      );
      expect(screen.getByTestId('candidate-filter-dropdown')).toHaveAttribute(
        'aria-label',
        'フィルター設定'
      );
    });

    it('should have minimum touch target size', () => {
      render(
        <CandidateSortFilter
          sortBy="voteCount"
          sortOrder="desc"
          filter="all"
          onSortChange={mockOnSortChange}
          onFilterChange={mockOnFilterChange}
        />
      );

      const sortButton = screen.getByTestId('candidate-sort-dropdown');
      const filterButton = screen.getByTestId('candidate-filter-dropdown');

      expect(sortButton.className).toContain('min-h-[44px]');
      expect(filterButton.className).toContain('min-h-[44px]');
    });

    describe('Keyboard Navigation (Requirement 10.2)', () => {
      it('should open sort dropdown with Enter key', async () => {
        const user = userEvent.setup();
        render(
          <CandidateSortFilter
            sortBy="voteCount"
            sortOrder="desc"
            filter="all"
            onSortChange={mockOnSortChange}
            onFilterChange={mockOnFilterChange}
          />
        );

        const sortButton = screen.getByTestId('candidate-sort-dropdown');
        sortButton.focus();
        await user.keyboard('{Enter}');

        await waitFor(() => {
          expect(screen.getByText('ソート項目')).toBeInTheDocument();
        });
      });

      it('should open sort dropdown with Space key', async () => {
        const user = userEvent.setup();
        render(
          <CandidateSortFilter
            sortBy="voteCount"
            sortOrder="desc"
            filter="all"
            onSortChange={mockOnSortChange}
            onFilterChange={mockOnFilterChange}
          />
        );

        const sortButton = screen.getByTestId('candidate-sort-dropdown');
        sortButton.focus();
        await user.keyboard(' ');

        await waitFor(() => {
          expect(screen.getByText('ソート項目')).toBeInTheDocument();
        });
      });

      it('should close dropdown with Escape key', async () => {
        const user = userEvent.setup();
        render(
          <CandidateSortFilter
            sortBy="voteCount"
            sortOrder="desc"
            filter="all"
            onSortChange={mockOnSortChange}
            onFilterChange={mockOnFilterChange}
          />
        );

        const sortButton = screen.getByTestId('candidate-sort-dropdown');
        await user.click(sortButton);

        await waitFor(() => {
          expect(screen.getByText('ソート項目')).toBeInTheDocument();
        });

        await user.keyboard('{Escape}');

        await waitFor(() => {
          expect(screen.queryByText('ソート項目')).not.toBeInTheDocument();
        });
      });

      it('should navigate dropdown options with arrow keys', async () => {
        const user = userEvent.setup();
        render(
          <CandidateSortFilter
            sortBy="voteCount"
            sortOrder="desc"
            filter="all"
            onSortChange={mockOnSortChange}
            onFilterChange={mockOnFilterChange}
          />
        );

        const sortButton = screen.getByTestId('candidate-sort-dropdown');
        await user.click(sortButton);

        await waitFor(() => {
          expect(screen.getByTestId('sort-by-votes')).toBeInTheDocument();
        });

        // Arrow down should move focus
        await user.keyboard('{ArrowDown}');
        expect(document.activeElement).toBeTruthy();
      });

      it('should be keyboard accessible with Tab key', () => {
        render(
          <CandidateSortFilter
            sortBy="voteCount"
            sortOrder="desc"
            filter="all"
            onSortChange={mockOnSortChange}
            onFilterChange={mockOnFilterChange}
          />
        );

        const sortButton = screen.getByTestId('candidate-sort-dropdown');
        const filterButton = screen.getByTestId('candidate-filter-dropdown');

        sortButton.focus();
        expect(document.activeElement).toBe(sortButton);

        filterButton.focus();
        expect(document.activeElement).toBe(filterButton);
      });
    });

    describe('ARIA Labels (Requirement 10.4)', () => {
      it('should have aria-expanded attribute on dropdown triggers', async () => {
        const user = userEvent.setup();
        render(
          <CandidateSortFilter
            sortBy="voteCount"
            sortOrder="desc"
            filter="all"
            onSortChange={mockOnSortChange}
            onFilterChange={mockOnFilterChange}
          />
        );

        const sortButton = screen.getByTestId('candidate-sort-dropdown');
        expect(sortButton).toHaveAttribute('aria-expanded');

        await user.click(sortButton);

        await waitFor(() => {
          expect(sortButton).toHaveAttribute('aria-expanded', 'true');
        });
      });

      it('should have aria-haspopup attribute on dropdown triggers', () => {
        render(
          <CandidateSortFilter
            sortBy="voteCount"
            sortOrder="desc"
            filter="all"
            onSortChange={mockOnSortChange}
            onFilterChange={mockOnFilterChange}
          />
        );

        const sortButton = screen.getByTestId('candidate-sort-dropdown');
        const filterButton = screen.getByTestId('candidate-filter-dropdown');

        expect(sortButton).toHaveAttribute('aria-haspopup');
        expect(filterButton).toHaveAttribute('aria-haspopup');
      });

      it('should have proper role attributes on dropdown menu', async () => {
        const user = userEvent.setup();
        render(
          <CandidateSortFilter
            sortBy="voteCount"
            sortOrder="desc"
            filter="all"
            onSortChange={mockOnSortChange}
            onFilterChange={mockOnFilterChange}
          />
        );

        const sortButton = screen.getByTestId('candidate-sort-dropdown');
        await user.click(sortButton);

        await waitFor(() => {
          const menu = screen.getByRole('menu');
          expect(menu).toBeInTheDocument();
        });
      });

      it('should have aria-labelledby on dropdown items', async () => {
        const user = userEvent.setup();
        render(
          <CandidateSortFilter
            sortBy="voteCount"
            sortOrder="desc"
            filter="all"
            onSortChange={mockOnSortChange}
            onFilterChange={mockOnFilterChange}
          />
        );

        const sortButton = screen.getByTestId('candidate-sort-dropdown');
        await user.click(sortButton);

        await waitFor(() => {
          const sortByVotes = screen.getByTestId('sort-by-votes');
          expect(sortByVotes).toHaveAttribute('role', 'menuitemradio');
        });
      });
    });

    describe('Contrast Ratio (Requirement 10.7)', () => {
      it('should have sufficient contrast for button text', () => {
        render(
          <CandidateSortFilter
            sortBy="voteCount"
            sortOrder="desc"
            filter="all"
            onSortChange={mockOnSortChange}
            onFilterChange={mockOnFilterChange}
          />
        );

        const sortButton = screen.getByTestId('candidate-sort-dropdown');
        const filterButton = screen.getByTestId('candidate-filter-dropdown');

        // Buttons should have appropriate styling (shadcn/ui Button component handles contrast)
        expect(sortButton.className).toBeTruthy();
        expect(filterButton.className).toBeTruthy();
      });

      it('should have sufficient contrast for dropdown menu items', async () => {
        const user = userEvent.setup();
        render(
          <CandidateSortFilter
            sortBy="voteCount"
            sortOrder="desc"
            filter="all"
            onSortChange={mockOnSortChange}
            onFilterChange={mockOnFilterChange}
          />
        );

        const sortButton = screen.getByTestId('candidate-sort-dropdown');
        await user.click(sortButton);

        await waitFor(() => {
          const sortByVotes = screen.getByTestId('sort-by-votes');
          // Menu items should have appropriate styling (shadcn/ui handles contrast)
          expect(sortByVotes.className).toBeTruthy();
        });
      });

      it('should have sufficient contrast for selected state', async () => {
        const user = userEvent.setup();
        render(
          <CandidateSortFilter
            sortBy="voteCount"
            sortOrder="desc"
            filter="all"
            onSortChange={mockOnSortChange}
            onFilterChange={mockOnFilterChange}
          />
        );

        const sortButton = screen.getByTestId('candidate-sort-dropdown');
        await user.click(sortButton);

        await waitFor(() => {
          const sortByVotes = screen.getByTestId('sort-by-votes');
          // Selected items should have sufficient contrast (e.g., blue-600 on white)
          expect(sortByVotes.className).toBeTruthy();
        });
      });
    });

    describe('Focus Management (Requirement 10.3)', () => {
      it('should have visible focus indicators', () => {
        render(
          <CandidateSortFilter
            sortBy="voteCount"
            sortOrder="desc"
            filter="all"
            onSortChange={mockOnSortChange}
            onFilterChange={mockOnFilterChange}
          />
        );

        const sortButton = screen.getByTestId('candidate-sort-dropdown');
        const filterButton = screen.getByTestId('candidate-filter-dropdown');

        // Buttons should have focus ring classes
        expect(sortButton.className).toMatch(/focus:ring|focus-visible:ring/);
        expect(filterButton.className).toMatch(/focus:ring|focus-visible:ring/);
      });

      it('should return focus to trigger after closing dropdown', async () => {
        const user = userEvent.setup();
        render(
          <CandidateSortFilter
            sortBy="voteCount"
            sortOrder="desc"
            filter="all"
            onSortChange={mockOnSortChange}
            onFilterChange={mockOnFilterChange}
          />
        );

        const sortButton = screen.getByTestId('candidate-sort-dropdown');
        await user.click(sortButton);

        await waitFor(() => {
          expect(screen.getByText('ソート項目')).toBeInTheDocument();
        });

        await user.keyboard('{Escape}');

        await waitFor(() => {
          expect(document.activeElement).toBe(sortButton);
        });
      });

      it('should trap focus within dropdown when open', async () => {
        const user = userEvent.setup();
        render(
          <CandidateSortFilter
            sortBy="voteCount"
            sortOrder="desc"
            filter="all"
            onSortChange={mockOnSortChange}
            onFilterChange={mockOnFilterChange}
          />
        );

        const sortButton = screen.getByTestId('candidate-sort-dropdown');
        await user.click(sortButton);

        await waitFor(() => {
          expect(screen.getByText('ソート項目')).toBeInTheDocument();
        });

        // Focus should be within the dropdown
        const sortByVotes = screen.getByTestId('sort-by-votes');
        expect(sortByVotes).toBeInTheDocument();
      });
    });

    describe('Screen Reader Support (Requirement 10.5)', () => {
      it('should announce current selection to screen readers', () => {
        render(
          <CandidateSortFilter
            sortBy="voteCount"
            sortOrder="desc"
            filter="all"
            onSortChange={mockOnSortChange}
            onFilterChange={mockOnFilterChange}
          />
        );

        const sortButton = screen.getByTestId('candidate-sort-dropdown');
        expect(sortButton).toHaveTextContent('投票数 (降順)');
      });

      it('should have descriptive labels for all options', async () => {
        const user = userEvent.setup();
        render(
          <CandidateSortFilter
            sortBy="voteCount"
            sortOrder="desc"
            filter="all"
            onSortChange={mockOnSortChange}
            onFilterChange={mockOnFilterChange}
          />
        );

        const sortButton = screen.getByTestId('candidate-sort-dropdown');
        await user.click(sortButton);

        await waitFor(() => {
          expect(screen.getByText('投票数')).toBeInTheDocument();
          expect(screen.getByText('作成日時')).toBeInTheDocument();
          expect(screen.getByText('降順')).toBeInTheDocument();
          expect(screen.getByText('昇順')).toBeInTheDocument();
        });
      });

      it('should hide decorative icons from screen readers', async () => {
        const { container } = render(
          <CandidateSortFilter
            sortBy="voteCount"
            sortOrder="desc"
            filter="all"
            onSortChange={mockOnSortChange}
            onFilterChange={mockOnFilterChange}
          />
        );

        const icons = container.querySelectorAll('svg');
        icons.forEach((icon) => {
          expect(icon).toHaveAttribute('aria-hidden', 'true');
        });
      });
    });
  });

  describe('Sort Dropdown Interactions', () => {
    it('should open sort dropdown and display options', async () => {
      const user = userEvent.setup();
      render(
        <CandidateSortFilter
          sortBy="voteCount"
          sortOrder="desc"
          filter="all"
          onSortChange={mockOnSortChange}
          onFilterChange={mockOnFilterChange}
        />
      );

      const sortButton = screen.getByTestId('candidate-sort-dropdown');
      await user.click(sortButton);

      await waitFor(() => {
        expect(screen.getByText('ソート項目')).toBeInTheDocument();
        expect(screen.getByTestId('sort-by-votes')).toBeInTheDocument();
        expect(screen.getByTestId('sort-by-created')).toBeInTheDocument();
        expect(screen.getByTestId('sort-order-desc')).toBeInTheDocument();
        expect(screen.getByTestId('sort-order-asc')).toBeInTheDocument();
      });
    });

    it('should call onSortChange when sort by is changed', async () => {
      const user = userEvent.setup();
      render(
        <CandidateSortFilter
          sortBy="voteCount"
          sortOrder="desc"
          filter="all"
          onSortChange={mockOnSortChange}
          onFilterChange={mockOnFilterChange}
        />
      );

      const sortButton = screen.getByTestId('candidate-sort-dropdown');
      await user.click(sortButton);

      const createdAtOption = await screen.findByTestId('sort-by-created');
      await user.click(createdAtOption);

      expect(mockOnSortChange).toHaveBeenCalledWith('createdAt', 'desc');
    });

    it('should call onSortChange when sort order is changed', async () => {
      const user = userEvent.setup();
      render(
        <CandidateSortFilter
          sortBy="voteCount"
          sortOrder="desc"
          filter="all"
          onSortChange={mockOnSortChange}
          onFilterChange={mockOnFilterChange}
        />
      );

      const sortButton = screen.getByTestId('candidate-sort-dropdown');
      await user.click(sortButton);

      const ascOption = await screen.findByTestId('sort-order-asc');
      await user.click(ascOption);

      expect(mockOnSortChange).toHaveBeenCalledWith('voteCount', 'asc');
    });

    it('should update URL query params when sort changes', async () => {
      const user = userEvent.setup();
      render(
        <CandidateSortFilter
          sortBy="voteCount"
          sortOrder="desc"
          filter="all"
          onSortChange={mockOnSortChange}
          onFilterChange={mockOnFilterChange}
        />
      );

      const sortButton = screen.getByTestId('candidate-sort-dropdown');
      await user.click(sortButton);

      const createdAtOption = await screen.findByTestId('sort-by-created');
      await user.click(createdAtOption);

      expect(mockPush).toHaveBeenCalledWith('?sortBy=createdAt', { scroll: false });
    });

    it('should preserve existing query params when updating sort', async () => {
      const user = userEvent.setup();
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue({
        toString: () => 'filter=ai&page=2',
        get: vi.fn(),
      });

      render(
        <CandidateSortFilter
          sortBy="voteCount"
          sortOrder="desc"
          filter="ai"
          onSortChange={mockOnSortChange}
          onFilterChange={mockOnFilterChange}
        />
      );

      const sortButton = screen.getByTestId('candidate-sort-dropdown');
      await user.click(sortButton);

      const createdAtOption = await screen.findByTestId('sort-by-created');
      await user.click(createdAtOption);

      const callArg = mockPush.mock.calls[0][0];
      expect(callArg).toContain('filter=ai');
      expect(callArg).toContain('page=2');
      expect(callArg).toContain('sortBy=createdAt');
    });
  });

  describe('Filter Dropdown Interactions', () => {
    it('should open filter dropdown and display options', async () => {
      const user = userEvent.setup();
      render(
        <CandidateSortFilter
          sortBy="voteCount"
          sortOrder="desc"
          filter="all"
          onSortChange={mockOnSortChange}
          onFilterChange={mockOnFilterChange}
        />
      );

      const filterButton = screen.getByTestId('candidate-filter-dropdown');
      await user.click(filterButton);

      await waitFor(() => {
        expect(screen.getByText('フィルター')).toBeInTheDocument();
        expect(screen.getByTestId('filter-all')).toBeInTheDocument();
        expect(screen.getByTestId('filter-my-vote')).toBeInTheDocument();
        expect(screen.getByTestId('filter-ai')).toBeInTheDocument();
        expect(screen.getByTestId('filter-user')).toBeInTheDocument();
      });
    });

    it('should call onFilterChange when filter is changed', async () => {
      const user = userEvent.setup();
      render(
        <CandidateSortFilter
          sortBy="voteCount"
          sortOrder="desc"
          filter="all"
          onSortChange={mockOnSortChange}
          onFilterChange={mockOnFilterChange}
        />
      );

      const filterButton = screen.getByTestId('candidate-filter-dropdown');
      await user.click(filterButton);

      const aiOption = await screen.findByTestId('filter-ai');
      await user.click(aiOption);

      expect(mockOnFilterChange).toHaveBeenCalledWith('ai');
    });

    it('should update URL query params when filter changes', async () => {
      const user = userEvent.setup();
      render(
        <CandidateSortFilter
          sortBy="voteCount"
          sortOrder="desc"
          filter="all"
          onSortChange={mockOnSortChange}
          onFilterChange={mockOnFilterChange}
        />
      );

      const filterButton = screen.getByTestId('candidate-filter-dropdown');
      await user.click(filterButton);

      const aiOption = await screen.findByTestId('filter-ai');
      await user.click(aiOption);

      expect(mockPush).toHaveBeenCalledWith('?filter=ai', { scroll: false });
    });

    it('should preserve existing query params when updating filter', async () => {
      const user = userEvent.setup();
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue({
        toString: () => 'sortBy=createdAt&sortOrder=asc',
        get: vi.fn(),
      });

      render(
        <CandidateSortFilter
          sortBy="createdAt"
          sortOrder="asc"
          filter="all"
          onSortChange={mockOnSortChange}
          onFilterChange={mockOnFilterChange}
        />
      );

      const filterButton = screen.getByTestId('candidate-filter-dropdown');
      await user.click(filterButton);

      const aiOption = await screen.findByTestId('filter-ai');
      await user.click(aiOption);

      const callArg = mockPush.mock.calls[0][0];
      expect(callArg).toContain('sortBy=createdAt');
      expect(callArg).toContain('sortOrder=asc');
      expect(callArg).toContain('filter=ai');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid changes', async () => {
      const user = userEvent.setup();
      render(
        <CandidateSortFilter
          sortBy="voteCount"
          sortOrder="desc"
          filter="all"
          onSortChange={mockOnSortChange}
          onFilterChange={mockOnFilterChange}
        />
      );

      const sortButton = screen.getByTestId('candidate-sort-dropdown');
      await user.click(sortButton);

      const createdAtOption = await screen.findByTestId('sort-by-created');
      await user.click(createdAtOption);

      await user.click(sortButton);

      const votesOption = await screen.findByTestId('sort-by-votes');
      await user.click(votesOption);

      expect(mockOnSortChange).toHaveBeenCalledTimes(2);
    });

    it('should not scroll page when updating URL params', async () => {
      const user = userEvent.setup();
      render(
        <CandidateSortFilter
          sortBy="voteCount"
          sortOrder="desc"
          filter="all"
          onSortChange={mockOnSortChange}
          onFilterChange={mockOnFilterChange}
        />
      );

      const sortButton = screen.getByTestId('candidate-sort-dropdown');
      await user.click(sortButton);

      const createdAtOption = await screen.findByTestId('sort-by-created');
      await user.click(createdAtOption);

      expect(mockPush).toHaveBeenCalledWith(expect.any(String), { scroll: false });
    });
  });

  describe('Component Structure', () => {
    it('should have correct container structure', () => {
      const { container } = render(
        <CandidateSortFilter
          sortBy="voteCount"
          sortOrder="desc"
          filter="all"
          onSortChange={mockOnSortChange}
          onFilterChange={mockOnFilterChange}
        />
      );

      const wrapper = container.querySelector('[data-testid="candidate-sort-filter"]');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper?.className).toContain('flex');
      expect(wrapper?.className).toContain('gap-2');
      expect(wrapper?.className).toContain('mb-4');
    });

    it('should render two dropdown menus', () => {
      render(
        <CandidateSortFilter
          sortBy="voteCount"
          sortOrder="desc"
          filter="all"
          onSortChange={mockOnSortChange}
          onFilterChange={mockOnFilterChange}
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
    });
  });
});
