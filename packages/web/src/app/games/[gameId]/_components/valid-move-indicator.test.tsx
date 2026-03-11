import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ValidMoveIndicator } from './valid-move-indicator';

describe('ValidMoveIndicator', () => {
  describe('表示', () => {
    it('薄い緑色の円を表示する', () => {
      const { container } = render(<ValidMoveIndicator isHovered={false} cellSize={40} />);

      const circle = container.querySelector('.bg-green-200');
      expect(circle).toBeInTheDocument();
      expect(circle).toHaveClass('rounded-full');
    });

    it('セルサイズの40%のサイズで表示される', () => {
      const cellSize = 40;
      const { container } = render(<ValidMoveIndicator isHovered={false} cellSize={cellSize} />);

      const circle = container.querySelector('.rounded-full');
      expect(circle).toHaveStyle({
        width: '16px', // 40 * 0.4
        height: '16px',
      });
    });

    it('モバイルサイズでも正しく表示される', () => {
      const cellSize = 30;
      const { container } = render(<ValidMoveIndicator isHovered={false} cellSize={cellSize} />);

      const circle = container.querySelector('.rounded-full');
      expect(circle).toHaveStyle({
        width: '12px', // 30 * 0.4
        height: '12px',
      });
    });
  });

  describe('ホバー効果', () => {
    it('ホバー時に濃い緑色に変化する', () => {
      const { container } = render(<ValidMoveIndicator isHovered={true} cellSize={40} />);

      const circle = container.querySelector('.bg-green-400');
      expect(circle).toBeInTheDocument();
      expect(circle).not.toHaveClass('bg-green-200');
    });

    it('ホバーしていない時は薄い緑色を表示する', () => {
      const { container } = render(<ValidMoveIndicator isHovered={false} cellSize={40} />);

      const circle = container.querySelector('.bg-green-200');
      expect(circle).toBeInTheDocument();
      expect(circle).not.toHaveClass('bg-green-400');
    });
  });

  describe('アニメーション', () => {
    it('transition-colorsクラスを持つ', () => {
      const { container } = render(<ValidMoveIndicator isHovered={false} cellSize={40} />);

      const circle = container.querySelector('.rounded-full');
      expect(circle).toHaveClass('transition-colors');
    });

    it('duration-200クラスを持つ', () => {
      const { container } = render(<ValidMoveIndicator isHovered={false} cellSize={40} />);

      const circle = container.querySelector('.rounded-full');
      expect(circle).toHaveClass('duration-200');
    });

    it('motion-reduce:transition-noneクラスを持つ', () => {
      const { container } = render(<ValidMoveIndicator isHovered={false} cellSize={40} />);

      const circle = container.querySelector('.rounded-full');
      expect(circle).toHaveClass('motion-reduce:transition-none');
    });
  });

  describe('アクセシビリティ', () => {
    it('aria-hidden="true"を持つ', () => {
      const { container } = render(<ValidMoveIndicator isHovered={false} cellSize={40} />);

      const wrapper = container.querySelector('[aria-hidden="true"]');
      expect(wrapper).toBeInTheDocument();
    });

    it('pointer-events-noneを持つ', () => {
      const { container } = render(<ValidMoveIndicator isHovered={false} cellSize={40} />);

      const wrapper = container.querySelector('.pointer-events-none');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('レイアウト', () => {
    it('absolute positioningを使用する', () => {
      const { container } = render(<ValidMoveIndicator isHovered={false} cellSize={40} />);

      const wrapper = container.querySelector('.absolute');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper).toHaveClass('inset-0');
    });

    it('flexboxで中央配置する', () => {
      const { container } = render(<ValidMoveIndicator isHovered={false} cellSize={40} />);

      const wrapper = container.querySelector('.flex');
      expect(wrapper).toHaveClass('items-center');
      expect(wrapper).toHaveClass('justify-center');
    });
  });
});
