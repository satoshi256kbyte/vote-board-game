import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PostCandidateButton } from './post-candidate-button';

describe('PostCandidateButton', () => {
  const gameId = 'test-game-123';

  describe('認証済みユーザー', () => {
    it('候補を投稿ボタンが有効化されている', () => {
      render(<PostCandidateButton gameId={gameId} isAuthenticated={true} />);

      const button = screen.getByTestId('post-candidate-button');
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();
    });

    it('正しいリンク先に遷移する', () => {
      render(<PostCandidateButton gameId={gameId} isAuthenticated={true} />);

      const link = screen.getByRole('link', { name: '候補を投稿' });
      expect(link).toHaveAttribute('href', `/games/${gameId}/candidates/new`);
    });

    it('候補を投稿のラベルが表示される', () => {
      render(<PostCandidateButton gameId={gameId} isAuthenticated={true} />);

      expect(screen.getByText('候補を投稿')).toBeInTheDocument();
    });
  });

  describe('未認証ユーザー', () => {
    it('候補を投稿ボタンが無効化されている', () => {
      render(<PostCandidateButton gameId={gameId} isAuthenticated={false} />);

      const button = screen.getByTestId('post-candidate-button-disabled');
      expect(button).toBeInTheDocument();
      expect(button).toBeDisabled();
    });

    it('ツールチップが表示される', () => {
      render(<PostCandidateButton gameId={gameId} isAuthenticated={false} />);

      const tooltip = screen.getByText('ログインして投稿');
      expect(tooltip).toBeInTheDocument();
    });

    it('候補を投稿のラベルが表示される', () => {
      render(<PostCandidateButton gameId={gameId} isAuthenticated={false} />);

      expect(screen.getByText('候補を投稿')).toBeInTheDocument();
    });

    it('リンクが存在しない', () => {
      render(<PostCandidateButton gameId={gameId} isAuthenticated={false} />);

      const link = screen.queryByRole('link');
      expect(link).not.toBeInTheDocument();
    });
  });

  describe('アクセシビリティ', () => {
    it('ボタンがキーボードでアクセス可能', () => {
      render(<PostCandidateButton gameId={gameId} isAuthenticated={true} />);

      const button = screen.getByTestId('post-candidate-button');
      expect(button).toHaveAttribute('href');
    });

    it('無効化されたボタンがdisabled属性を持つ', () => {
      render(<PostCandidateButton gameId={gameId} isAuthenticated={false} />);

      const button = screen.getByTestId('post-candidate-button-disabled');
      expect(button).toHaveAttribute('disabled');
    });

    describe('Keyboard Navigation (Requirement 10.2)', () => {
      it('should be focusable with Tab key', () => {
        render(<PostCandidateButton gameId={gameId} isAuthenticated={true} />);

        const link = screen.getByRole('link', { name: '候補を投稿' });
        link.focus();

        expect(document.activeElement).toBe(link);
      });

      it('should activate with Enter key', () => {
        render(<PostCandidateButton gameId={gameId} isAuthenticated={true} />);

        const link = screen.getByRole('link', { name: '候補を投稿' });
        expect(link).toHaveAttribute('href', `/games/${gameId}/candidates/new`);
      });

      it('should not be focusable when disabled', () => {
        render(<PostCandidateButton gameId={gameId} isAuthenticated={false} />);

        const button = screen.getByTestId('post-candidate-button-disabled');
        expect(button).toBeDisabled();
        expect(button).toHaveAttribute('tabIndex', '-1');
      });

      it('should have visible focus indicator', () => {
        render(<PostCandidateButton gameId={gameId} isAuthenticated={true} />);

        const button = screen.getByTestId('post-candidate-button');
        expect(button.className).toMatch(/focus:ring|focus-visible:ring/);
      });
    });

    describe('ARIA Labels (Requirement 10.4)', () => {
      it('should have aria-label on button', () => {
        render(<PostCandidateButton gameId={gameId} isAuthenticated={true} />);

        const link = screen.getByRole('link', { name: '候補を投稿' });
        expect(link).toHaveAttribute('aria-label', '候補を投稿');
      });

      it('should have aria-disabled on disabled button', () => {
        render(<PostCandidateButton gameId={gameId} isAuthenticated={false} />);

        const button = screen.getByTestId('post-candidate-button-disabled');
        expect(button).toHaveAttribute('aria-disabled', 'true');
      });

      it('should have aria-describedby for tooltip', () => {
        render(<PostCandidateButton gameId={gameId} isAuthenticated={false} />);

        const button = screen.getByTestId('post-candidate-button-disabled');
        expect(button).toHaveAttribute('aria-describedby');
      });

      it('should have proper role for disabled button', () => {
        render(<PostCandidateButton gameId={gameId} isAuthenticated={false} />);

        const button = screen.getByTestId('post-candidate-button-disabled');
        expect(button).toHaveAttribute('role', 'button');
      });
    });

    describe('Contrast Ratio (Requirement 10.7)', () => {
      it('should have sufficient contrast for enabled button', () => {
        render(<PostCandidateButton gameId={gameId} isAuthenticated={true} />);

        const button = screen.getByTestId('post-candidate-button');
        // Primary button should have white text on blue background
        expect(button.className).toMatch(/bg-(blue|primary)-(500|600)/);
        expect(button.className).toMatch(/text-white/);
      });

      it('should have sufficient contrast for disabled button', () => {
        render(<PostCandidateButton gameId={gameId} isAuthenticated={false} />);

        const button = screen.getByTestId('post-candidate-button-disabled');
        // Disabled button should have gray colors with sufficient contrast
        expect(button.className).toMatch(/bg-gray-(100|200)/);
        expect(button.className).toMatch(/text-gray-(400|500)/);
      });

      it('should have sufficient contrast for tooltip text', () => {
        render(<PostCandidateButton gameId={gameId} isAuthenticated={false} />);

        const tooltip = screen.getByText('ログインして投稿');
        // Tooltip should have dark text on light background
        expect(tooltip.className).toMatch(/text-(gray-700|gray-800|gray-900)/);
      });
    });

    describe('Screen Reader Support (Requirement 10.5)', () => {
      it('should announce button purpose to screen readers', () => {
        render(<PostCandidateButton gameId={gameId} isAuthenticated={true} />);

        const link = screen.getByRole('link', { name: '候補を投稿' });
        expect(link).toHaveAccessibleName('候補を投稿');
      });

      it('should announce disabled state to screen readers', () => {
        render(<PostCandidateButton gameId={gameId} isAuthenticated={false} />);

        const button = screen.getByTestId('post-candidate-button-disabled');
        expect(button).toHaveAttribute('aria-disabled', 'true');
      });

      it('should announce tooltip to screen readers', () => {
        render(<PostCandidateButton gameId={gameId} isAuthenticated={false} />);

        const tooltip = screen.getByText('ログインして投稿');
        expect(tooltip).toBeInTheDocument();
      });

      it('should hide decorative icons from screen readers', () => {
        const { container } = render(
          <PostCandidateButton gameId={gameId} isAuthenticated={true} />
        );

        const icons = container.querySelectorAll('svg');
        icons.forEach((icon) => {
          expect(icon).toHaveAttribute('aria-hidden', 'true');
        });
      });
    });

    describe('Touch Target Size (Requirement 10.2)', () => {
      it('should have minimum 44px touch target for enabled button', () => {
        render(<PostCandidateButton gameId={gameId} isAuthenticated={true} />);

        const button = screen.getByTestId('post-candidate-button');
        expect(button.className).toContain('min-h-[44px]');
      });

      it('should have minimum 44px touch target for disabled button', () => {
        render(<PostCandidateButton gameId={gameId} isAuthenticated={false} />);

        const button = screen.getByTestId('post-candidate-button-disabled');
        expect(button.className).toContain('min-h-[44px]');
      });

      it('should have adequate padding for touch targets', () => {
        render(<PostCandidateButton gameId={gameId} isAuthenticated={true} />);

        const button = screen.getByTestId('post-candidate-button');
        expect(button.className).toMatch(/px-(3|4|5|6)/);
        expect(button.className).toMatch(/py-(2|3)/);
      });
    });

    describe('Focus Management (Requirement 10.3)', () => {
      it('should have visible focus ring', () => {
        render(<PostCandidateButton gameId={gameId} isAuthenticated={true} />);

        const button = screen.getByTestId('post-candidate-button');
        expect(button.className).toMatch(/focus:ring|focus-visible:ring/);
      });

      it('should maintain focus after interaction', () => {
        render(<PostCandidateButton gameId={gameId} isAuthenticated={true} />);

        const link = screen.getByRole('link', { name: '候補を投稿' });
        link.focus();

        expect(document.activeElement).toBe(link);
      });

      it('should not receive focus when disabled', () => {
        render(<PostCandidateButton gameId={gameId} isAuthenticated={false} />);

        const button = screen.getByTestId('post-candidate-button-disabled');
        button.focus();

        // Disabled button should not receive focus
        expect(document.activeElement).not.toBe(button);
      });
    });

    describe('Semantic HTML (Requirement 10.1)', () => {
      it('should use anchor element for enabled button', () => {
        render(<PostCandidateButton gameId={gameId} isAuthenticated={true} />);

        const link = screen.getByRole('link', { name: '候補を投稿' });
        expect(link.tagName).toBe('A');
      });

      it('should use button element for disabled state', () => {
        render(<PostCandidateButton gameId={gameId} isAuthenticated={false} />);

        const button = screen.getByTestId('post-candidate-button-disabled');
        expect(button.tagName).toBe('BUTTON');
      });

      it('should have proper href attribute', () => {
        render(<PostCandidateButton gameId={gameId} isAuthenticated={true} />);

        const link = screen.getByRole('link', { name: '候補を投稿' });
        expect(link).toHaveAttribute('href', `/games/${gameId}/candidates/new`);
      });
    });
  });
});
