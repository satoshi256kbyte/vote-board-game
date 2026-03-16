/**
 * Tests for Share Button Component
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { ShareButton } from './share-button';

// Mock ogp-utils
vi.mock('@/lib/ogp/ogp-utils', () => ({
  buildShareUrlForX: (title: string, url: string) =>
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
  buildShareUrlForLine: (url: string) =>
    `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`,
}));

describe('ShareButton', () => {
  const mockOpen = vi.fn();
  const mockWriteText = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window.open
    vi.stubGlobal('open', mockOpen);

    // Mock navigator.clipboard
    Object.defineProperty(navigator, 'clipboard', {
      writable: true,
      configurable: true,
      value: { writeText: mockWriteText },
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('should render 3 share buttons (X, LINE, link copy)', () => {
    render(<ShareButton title="Test" text="Test text" />);

    expect(screen.getByRole('button', { name: 'Xでシェア' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'LINEでシェア' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'リンクをコピー' })).toBeInTheDocument();
  });

  it('should open X share URL in new window when X button is clicked', () => {
    render(<ShareButton title="Test Title" text="Test text" url="https://example.com" />);

    fireEvent.click(screen.getByRole('button', { name: 'Xでシェア' }));

    expect(mockOpen).toHaveBeenCalledWith(
      expect.stringContaining('twitter.com/intent/tweet'),
      '_blank',
      'noopener,noreferrer'
    );
    expect(mockOpen).toHaveBeenCalledWith(
      expect.stringContaining('https%3A%2F%2Fexample.com'),
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('should open LINE share URL in new window when LINE button is clicked', () => {
    render(<ShareButton title="Test Title" text="Test text" url="https://example.com" />);

    fireEvent.click(screen.getByRole('button', { name: 'LINEでシェア' }));

    expect(mockOpen).toHaveBeenCalledWith(
      expect.stringContaining('social-plugins.line.me/lineit/share'),
      '_blank',
      'noopener,noreferrer'
    );
    expect(mockOpen).toHaveBeenCalledWith(
      expect.stringContaining('https%3A%2F%2Fexample.com'),
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('should copy URL and show success message', async () => {
    mockWriteText.mockResolvedValue(undefined);

    render(<ShareButton title="Test" text="Test text" url="https://example.com" />);

    fireEvent.click(screen.getByRole('button', { name: 'リンクをコピー' }));

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith('https://example.com');
    });

    expect(screen.getByText('コピーしました')).toBeInTheDocument();
  });

  it('should show error message when clipboard API is not available', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      writable: true,
      configurable: true,
      value: undefined,
    });

    render(<ShareButton title="Test" text="Test text" url="https://example.com" />);

    fireEvent.click(screen.getByRole('button', { name: 'リンクをコピー' }));

    await waitFor(() => {
      expect(screen.getByText('リンクのコピーに失敗しました')).toBeInTheDocument();
    });
  });

  it('should show error message when clipboard write fails', async () => {
    mockWriteText.mockRejectedValue(new Error('Clipboard failed'));

    render(<ShareButton title="Test" text="Test text" url="https://example.com" />);

    fireEvent.click(screen.getByRole('button', { name: 'リンクをコピー' }));

    await waitFor(() => {
      expect(screen.getByText('リンクのコピーに失敗しました')).toBeInTheDocument();
    });
  });

  it('should have aria-label attributes on all buttons', () => {
    render(<ShareButton title="Test" text="Test text" />);

    expect(screen.getByLabelText('Xでシェア')).toBeInTheDocument();
    expect(screen.getByLabelText('LINEでシェア')).toBeInTheDocument();
    expect(screen.getByLabelText('リンクをコピー')).toBeInTheDocument();
  });

  it('should display icon and label text on each button', () => {
    render(<ShareButton title="Test" text="Test text" />);

    expect(screen.getByText('X')).toBeInTheDocument();
    expect(screen.getByText('LINE')).toBeInTheDocument();
    expect(screen.getByText('リンクコピー')).toBeInTheDocument();
  });
});
