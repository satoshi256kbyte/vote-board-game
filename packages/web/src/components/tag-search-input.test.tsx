import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { TagSearchInput } from './tag-search-input';
import type { TagSuggestion } from '@/lib/utils/tag-utils';

const mockSuggestions: TagSuggestion[] = [
  { label: 'オセロ', value: 'OTHELLO', type: 'gameType' },
  { label: '初心者向け', value: '初心者向け', type: 'custom' },
  { label: '上級者向け', value: '上級者向け', type: 'custom' },
];

describe('TagSearchInput', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // JSDOM does not implement scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should render with placeholder "タグで検索..."', () => {
    render(
      <TagSearchInput suggestions={mockSuggestions} selectedTags={[]} onTagSelect={vi.fn()} />
    );

    const input = screen.getByPlaceholderText('タグで検索...');
    expect(input).toBeInTheDocument();
  });

  it('should show Search icon', () => {
    const { container } = render(
      <TagSearchInput suggestions={mockSuggestions} selectedTags={[]} onTagSelect={vi.fn()} />
    );

    const svgIcon = container.querySelector('svg');
    expect(svgIcon).toBeInTheDocument();
    expect(svgIcon).toHaveAttribute('aria-hidden', 'true');
  });

  it('should set role="combobox" on input', () => {
    render(
      <TagSearchInput suggestions={mockSuggestions} selectedTags={[]} onTagSelect={vi.fn()} />
    );

    const input = screen.getByRole('combobox');
    expect(input).toBeInTheDocument();
  });

  describe('aria-expanded', () => {
    it('should have aria-expanded=false initially', () => {
      render(
        <TagSearchInput suggestions={mockSuggestions} selectedTags={[]} onTagSelect={vi.fn()} />
      );

      const input = screen.getByRole('combobox');
      expect(input).toHaveAttribute('aria-expanded', 'false');
    });

    it('should set aria-expanded=true when dropdown opens on focus', () => {
      render(
        <TagSearchInput suggestions={mockSuggestions} selectedTags={[]} onTagSelect={vi.fn()} />
      );

      const input = screen.getByRole('combobox');
      fireEvent.focus(input);

      expect(input).toHaveAttribute('aria-expanded', 'true');
    });

    it('should set aria-expanded=false when dropdown closes on blur', () => {
      render(
        <TagSearchInput suggestions={mockSuggestions} selectedTags={[]} onTagSelect={vi.fn()} />
      );

      const input = screen.getByRole('combobox');
      fireEvent.focus(input);
      expect(input).toHaveAttribute('aria-expanded', 'true');

      fireEvent.blur(input);
      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(input).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('テキスト入力によるフィルタリング', () => {
    it('should filter suggestions and open dropdown when typing', () => {
      render(
        <TagSearchInput suggestions={mockSuggestions} selectedTags={[]} onTagSelect={vi.fn()} />
      );

      const input = screen.getByRole('combobox');
      fireEvent.change(input, { target: { value: 'オセロ' } });

      expect(input).toHaveAttribute('aria-expanded', 'true');
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(1);
      expect(options[0]).toHaveTextContent('オセロ');
    });

    it('should show all suggestions when input is empty and focused', () => {
      render(
        <TagSearchInput suggestions={mockSuggestions} selectedTags={[]} onTagSelect={vi.fn()} />
      );

      const input = screen.getByRole('combobox');
      fireEvent.focus(input);

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(3);
    });

    it('should filter by partial match', () => {
      render(
        <TagSearchInput suggestions={mockSuggestions} selectedTags={[]} onTagSelect={vi.fn()} />
      );

      const input = screen.getByRole('combobox');
      fireEvent.change(input, { target: { value: '向け' } });

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(2);
    });
  });

  describe('キーボード操作: ArrowDown', () => {
    it('should move highlight down with ArrowDown', () => {
      render(
        <TagSearchInput suggestions={mockSuggestions} selectedTags={[]} onTagSelect={vi.fn()} />
      );

      const input = screen.getByRole('combobox');
      fireEvent.focus(input);

      // Initially first item is highlighted (index 0)
      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('aria-selected', 'true');

      // ArrowDown moves to index 1
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      expect(options[1]).toHaveAttribute('aria-selected', 'true');
      expect(options[0]).toHaveAttribute('aria-selected', 'false');
    });

    it('should wrap around to first item when at the end', () => {
      render(
        <TagSearchInput suggestions={mockSuggestions} selectedTags={[]} onTagSelect={vi.fn()} />
      );

      const input = screen.getByRole('combobox');
      fireEvent.focus(input);

      // Move to last item
      fireEvent.keyDown(input, { key: 'ArrowDown' }); // index 1
      fireEvent.keyDown(input, { key: 'ArrowDown' }); // index 2

      const options = screen.getAllByRole('option');
      expect(options[2]).toHaveAttribute('aria-selected', 'true');

      // Wrap around to index 0
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('キーボード操作: ArrowUp', () => {
    it('should move highlight up with ArrowUp', () => {
      render(
        <TagSearchInput suggestions={mockSuggestions} selectedTags={[]} onTagSelect={vi.fn()} />
      );

      const input = screen.getByRole('combobox');
      fireEvent.focus(input);

      // Move down first
      fireEvent.keyDown(input, { key: 'ArrowDown' }); // index 1

      // ArrowUp moves back to index 0
      fireEvent.keyDown(input, { key: 'ArrowUp' });
      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('should wrap around to last item when at the beginning', () => {
      render(
        <TagSearchInput suggestions={mockSuggestions} selectedTags={[]} onTagSelect={vi.fn()} />
      );

      const input = screen.getByRole('combobox');
      fireEvent.focus(input);

      // At index 0, ArrowUp wraps to last item
      fireEvent.keyDown(input, { key: 'ArrowUp' });
      const options = screen.getAllByRole('option');
      expect(options[2]).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('キーボード操作: Enter', () => {
    it('should select highlighted item and clear input on Enter', () => {
      const handleTagSelect = vi.fn();
      render(
        <TagSearchInput
          suggestions={mockSuggestions}
          selectedTags={[]}
          onTagSelect={handleTagSelect}
        />
      );

      const input = screen.getByRole('combobox');
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: 'オ' } });

      // Press Enter to select highlighted item (index 0 = オセロ)
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(handleTagSelect).toHaveBeenCalledWith('OTHELLO');
      expect(input).toHaveValue('');
    });
  });

  describe('キーボード操作: Escape', () => {
    it('should close dropdown and clear input on Escape', () => {
      render(
        <TagSearchInput suggestions={mockSuggestions} selectedTags={[]} onTagSelect={vi.fn()} />
      );

      const input = screen.getByRole('combobox');
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: 'テスト' } });

      expect(input).toHaveAttribute('aria-expanded', 'true');

      fireEvent.keyDown(input, { key: 'Escape' });

      expect(input).toHaveAttribute('aria-expanded', 'false');
      expect(input).toHaveValue('');
    });
  });

  describe('タグ選択', () => {
    it('should call onTagSelect with correct value when tag is selected', () => {
      const handleTagSelect = vi.fn();
      render(
        <TagSearchInput
          suggestions={mockSuggestions}
          selectedTags={[]}
          onTagSelect={handleTagSelect}
        />
      );

      const input = screen.getByRole('combobox');
      fireEvent.focus(input);

      const options = screen.getAllByRole('option');
      fireEvent.click(options[0]); // Click オセロ

      expect(handleTagSelect).toHaveBeenCalledWith('OTHELLO');
    });

    it('should clear input after tag selection', () => {
      render(
        <TagSearchInput suggestions={mockSuggestions} selectedTags={[]} onTagSelect={vi.fn()} />
      );

      const input = screen.getByRole('combobox');
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: 'オセロ' } });

      const options = screen.getAllByRole('option');
      fireEvent.click(options[0]);

      expect(input).toHaveValue('');
    });
  });

  describe('選択済みタグの除外', () => {
    it('should exclude already-selected tags from dropdown', () => {
      render(
        <TagSearchInput
          suggestions={mockSuggestions}
          selectedTags={['OTHELLO']}
          onTagSelect={vi.fn()}
        />
      );

      const input = screen.getByRole('combobox');
      fireEvent.focus(input);

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(2);
      expect(screen.queryByText('オセロ')).not.toBeInTheDocument();
    });
  });

  describe('フォーカス/ブラー動作', () => {
    it('should open dropdown on focus', () => {
      render(
        <TagSearchInput suggestions={mockSuggestions} selectedTags={[]} onTagSelect={vi.fn()} />
      );

      const input = screen.getByRole('combobox');
      fireEvent.focus(input);

      expect(input).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getAllByRole('option')).toHaveLength(3);
    });

    it('should close dropdown on blur after timeout', () => {
      render(
        <TagSearchInput suggestions={mockSuggestions} selectedTags={[]} onTagSelect={vi.fn()} />
      );

      const input = screen.getByRole('combobox');
      fireEvent.focus(input);
      expect(input).toHaveAttribute('aria-expanded', 'true');

      fireEvent.blur(input);
      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(input).toHaveAttribute('aria-expanded', 'false');
    });
  });
});
