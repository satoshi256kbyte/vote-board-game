import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TagChip } from './tag-chip';

describe('TagChip', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.clearAllMocks();
  });

  describe('ゲーム種類タグのスタイル', () => {
    it('should render gameType tag with indigo background styles', () => {
      render(<TagChip label="オセロ" type="gameType" />);

      const chip = screen.getByTestId('tag-chip-オセロ');
      expect(chip).toHaveClass('bg-indigo-100');
      expect(chip).toHaveClass('text-indigo-800');
      expect(chip).toHaveTextContent('オセロ');
    });
  });

  describe('カスタムタグのスタイル', () => {
    it('should render custom tag with outline styles', () => {
      render(<TagChip label="テスト" type="custom" />);

      const chip = screen.getByTestId('tag-chip-テスト');
      expect(chip).toHaveClass('border');
      expect(chip).toHaveClass('text-gray-700');
      expect(chip).toHaveTextContent('テスト');
    });
  });

  describe('onClick コールバック', () => {
    it('should call onClick when chip is clicked', () => {
      const handleClick = vi.fn();
      render(<TagChip label="オセロ" type="gameType" onClick={handleClick} />);

      const chip = screen.getByTestId('tag-chip-オセロ');
      fireEvent.click(chip);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('onRemove コールバック', () => {
    it('should call onRemove when × button is clicked', () => {
      const handleRemove = vi.fn();
      render(<TagChip label="オセロ" type="gameType" onRemove={handleRemove} />);

      const removeButton = screen.getByRole('button', { name: 'オセロを削除' });
      fireEvent.click(removeButton);

      expect(handleRemove).toHaveBeenCalledTimes(1);
    });

    it('should only show × button when onRemove is provided', () => {
      const { rerender } = render(<TagChip label="オセロ" type="gameType" />);

      expect(screen.queryByRole('button', { name: 'オセロを削除' })).not.toBeInTheDocument();

      rerender(<TagChip label="オセロ" type="gameType" onRemove={vi.fn()} />);

      expect(screen.getByRole('button', { name: 'オセロを削除' })).toBeInTheDocument();
    });
  });

  describe('ARIA 属性', () => {
    it('should set role="option" on the chip', () => {
      render(<TagChip label="オセロ" type="gameType" />);

      const chip = screen.getByRole('option');
      expect(chip).toBeInTheDocument();
    });

    it('should set aria-selected=true when onRemove is provided', () => {
      render(<TagChip label="オセロ" type="gameType" onRemove={vi.fn()} />);

      const chip = screen.getByRole('option');
      expect(chip).toHaveAttribute('aria-selected', 'true');
    });

    it('should set aria-selected=false when onRemove is not provided', () => {
      render(<TagChip label="オセロ" type="gameType" />);

      const chip = screen.getByRole('option');
      expect(chip).toHaveAttribute('aria-selected', 'false');
    });

    it('should set appropriate aria-label on remove button', () => {
      render(<TagChip label="テスト" type="custom" onRemove={vi.fn()} />);

      const removeButton = screen.getByRole('button', { name: 'テストを削除' });
      expect(removeButton).toHaveAttribute('aria-label', 'テストを削除');
    });
  });

  describe('イベント伝播', () => {
    it('should not propagate click event when × button is clicked', () => {
      const handleClick = vi.fn();
      const handleRemove = vi.fn();
      render(
        <TagChip label="オセロ" type="gameType" onClick={handleClick} onRemove={handleRemove} />
      );

      const removeButton = screen.getByRole('button', { name: 'オセロを削除' });
      fireEvent.click(removeButton);

      expect(handleRemove).toHaveBeenCalledTimes(1);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });
});
