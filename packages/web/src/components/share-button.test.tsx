/**
 * Tests for Share Button Component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShareButton } from './share-button';

describe('ShareButton', () => {
  const mockShare = vi.fn();
  const mockWriteText = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock navigator.share
    Object.defineProperty(navigator, 'share', {
      writable: true,
      value: mockShare,
    });

    // Mock navigator.clipboard
    Object.defineProperty(navigator, 'clipboard', {
      writable: true,
      value: {
        writeText: mockWriteText,
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render share button', () => {
    render(<ShareButton title="Test" text="Test text" />);

    expect(screen.getByRole('button', { name: 'シェア' })).toBeInTheDocument();
    expect(screen.getByText('シェア')).toBeInTheDocument();
  });

  it('should call Web Share API when available', async () => {
    mockShare.mockResolvedValue(undefined);

    render(<ShareButton title="Test Title" text="Test text" url="https://example.com" />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockShare).toHaveBeenCalledWith({
        title: 'Test Title',
        text: 'Test text',
        url: 'https://example.com',
      });
    });
  });

  it('should fallback to clipboard when Web Share API is not available', async () => {
    // Remove Web Share API
    Object.defineProperty(navigator, 'share', {
      writable: true,
      value: undefined,
    });

    mockWriteText.mockResolvedValue(undefined);

    render(<ShareButton title="Test" text="Test text" url="https://example.com" />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith('https://example.com');
    });
  });

  it('should show success message after copying', async () => {
    Object.defineProperty(navigator, 'share', {
      writable: true,
      value: undefined,
    });

    mockWriteText.mockResolvedValue(undefined);

    render(<ShareButton title="Test" text="Test text" url="https://example.com" />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('コピーしました')).toBeInTheDocument();
    });
  });

  it('should fallback to clipboard when share is cancelled', async () => {
    const abortError = new Error('User cancelled');
    abortError.name = 'AbortError';
    mockShare.mockRejectedValue(abortError);

    render(<ShareButton title="Test" text="Test text" url="https://example.com" />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockShare).toHaveBeenCalled();
    });

    // Should not call clipboard when user cancels
    expect(mockWriteText).not.toHaveBeenCalled();
  });

  it('should fallback to clipboard when share fails', async () => {
    mockShare.mockRejectedValue(new Error('Share failed'));
    mockWriteText.mockResolvedValue(undefined);

    render(<ShareButton title="Test" text="Test text" url="https://example.com" />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith('https://example.com');
    });
  });

  it('should show error message when clipboard fails', async () => {
    Object.defineProperty(navigator, 'share', {
      writable: true,
      value: undefined,
    });

    mockWriteText.mockRejectedValue(new Error('Clipboard failed'));

    render(<ShareButton title="Test" text="Test text" url="https://example.com" />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('リンクのコピーに失敗しました')).toBeInTheDocument();
    });
  });

  it('should render with primary variant by default', () => {
    render(<ShareButton title="Test" text="Test text" />);

    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-blue-600');
  });

  it('should render with secondary variant', () => {
    render(<ShareButton title="Test" text="Test text" variant="secondary" />);

    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-white');
    expect(button.className).toContain('border');
  });

  it('should render with different sizes', () => {
    const { rerender } = render(<ShareButton title="Test" text="Test text" size="sm" />);
    let button = screen.getByRole('button');
    expect(button.className).toContain('px-3');

    rerender(<ShareButton title="Test" text="Test text" size="md" />);
    button = screen.getByRole('button');
    expect(button.className).toContain('px-4');

    rerender(<ShareButton title="Test" text="Test text" size="lg" />);
    button = screen.getByRole('button');
    expect(button.className).toContain('px-6');
  });
});
