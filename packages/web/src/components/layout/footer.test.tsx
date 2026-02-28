import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from './footer';

describe('Footer', () => {
  it('should render copyright text with current year', () => {
    render(<Footer />);
    const currentYear = new Date().getFullYear();
    expect(screen.getByText(`© ${currentYear} 投票ボドゲ`)).toBeInTheDocument();
  });
});
