import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VoteConfirmDialog } from './vote-confirm-dialog';

describe('VoteConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    currentCandidatePosition: 'D3',
    newCandidatePosition: 'E4',
  };

  it('should render dialog when isOpen is true', () => {
    render(<VoteConfirmDialog {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('投票を変更しますか?')).toBeInTheDocument();
  });

  it('should not render dialog when isOpen is false', () => {
    render(<VoteConfirmDialog {...defaultProps} isOpen={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should display current and new candidate positions', () => {
    render(<VoteConfirmDialog {...defaultProps} />);

    expect(screen.getByText('現在の投票先:')).toBeInTheDocument();
    expect(screen.getByText('D3')).toBeInTheDocument();
    expect(screen.getByText('新しい投票先:')).toBeInTheDocument();
    expect(screen.getByText('E4')).toBeInTheDocument();
  });

  it('should call onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(<VoteConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

    const confirmButton = screen.getByTestId('confirm-button');
    fireEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<VoteConfirmDialog {...defaultProps} onCancel={onCancel} />);

    const cancelButton = screen.getByTestId('cancel-button');
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when ESC key is pressed', () => {
    const onCancel = vi.fn();
    render(<VoteConfirmDialog {...defaultProps} onCancel={onCancel} />);

    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });

    expect(onCancel).toHaveBeenCalled();
  });

  it('should have confirm and cancel buttons', () => {
    render(<VoteConfirmDialog {...defaultProps} />);

    expect(screen.getByTestId('confirm-button')).toBeInTheDocument();
    expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
  });

  it('should display dialog description', () => {
    render(<VoteConfirmDialog {...defaultProps} />);

    expect(
      screen.getByText('現在の投票を取り消して、新しい候補に投票します。')
    ).toBeInTheDocument();
  });

  it('should render with different candidate positions', () => {
    render(
      <VoteConfirmDialog
        {...defaultProps}
        currentCandidatePosition="A1"
        newCandidatePosition="H8"
      />
    );

    expect(screen.getByText('A1')).toBeInTheDocument();
    expect(screen.getByText('H8')).toBeInTheDocument();
  });
});
