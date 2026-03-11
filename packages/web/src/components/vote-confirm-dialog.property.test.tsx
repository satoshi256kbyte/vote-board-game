import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import { VoteConfirmDialog } from './vote-confirm-dialog';

/**
 * Property-Based Test for VoteConfirmDialog
 *
 * Feature: 25-vote-button-status-display
 * Property 4: 投票変更の確認ダイアログ
 *
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
 *
 * This test verifies that:
 * - When isOpen is true, the dialog is always displayed
 * - The dialog always shows current and new candidate positions
 * - Confirm button always calls onConfirm
 * - Cancel button always calls onCancel
 * - ESC key always calls onCancel
 */
describe('VoteConfirmDialog - Property Tests', () => {
  it('Property 4: 投票変更の確認ダイアログ - dialog is always displayed when isOpen is true', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[A-H][1-8]$/), // currentCandidatePosition (valid board position)
        fc.stringMatching(/^[A-H][1-8]$/), // newCandidatePosition (valid board position)
        (currentPosition, newPosition) => {
          cleanup();

          const onConfirm = vi.fn();
          const onCancel = vi.fn();

          render(
            <VoteConfirmDialog
              isOpen={true}
              onConfirm={onConfirm}
              onCancel={onCancel}
              currentCandidatePosition={currentPosition}
              newCandidatePosition={newPosition}
            />
          );

          // Dialog should always be displayed when isOpen is true
          const dialog = screen.queryByRole('dialog');
          expect(dialog).toBeInTheDocument();

          // Dialog should always show the title
          expect(screen.getByText('投票を変更しますか?')).toBeInTheDocument();

          // Dialog should always show current and new positions
          // Use getAllByText when positions might be the same
          const positions = screen.getAllByText(currentPosition);
          expect(positions.length).toBeGreaterThanOrEqual(1);

          if (currentPosition !== newPosition) {
            expect(screen.getByText(newPosition)).toBeInTheDocument();
          }
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('Property 4: 投票変更の確認ダイアログ - confirm button always calls onConfirm', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[A-H][1-8]$/),
        fc.stringMatching(/^[A-H][1-8]$/),
        (currentPosition, newPosition) => {
          cleanup();

          const onConfirm = vi.fn();
          const onCancel = vi.fn();

          render(
            <VoteConfirmDialog
              isOpen={true}
              onConfirm={onConfirm}
              onCancel={onCancel}
              currentCandidatePosition={currentPosition}
              newCandidatePosition={newPosition}
            />
          );

          const confirmButton = screen.getByTestId('confirm-button');
          fireEvent.click(confirmButton);

          // onConfirm should always be called exactly once
          expect(onConfirm).toHaveBeenCalledTimes(1);
          expect(onCancel).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('Property 4: 投票変更の確認ダイアログ - cancel button always calls onCancel', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[A-H][1-8]$/),
        fc.stringMatching(/^[A-H][1-8]$/),
        (currentPosition, newPosition) => {
          cleanup();

          const onConfirm = vi.fn();
          const onCancel = vi.fn();

          render(
            <VoteConfirmDialog
              isOpen={true}
              onConfirm={onConfirm}
              onCancel={onCancel}
              currentCandidatePosition={currentPosition}
              newCandidatePosition={newPosition}
            />
          );

          const cancelButton = screen.getByTestId('cancel-button');
          fireEvent.click(cancelButton);

          // onCancel should always be called exactly once
          expect(onCancel).toHaveBeenCalledTimes(1);
          expect(onConfirm).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('Property 4: 投票変更の確認ダイアログ - ESC key always calls onCancel', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[A-H][1-8]$/),
        fc.stringMatching(/^[A-H][1-8]$/),
        (currentPosition, newPosition) => {
          cleanup();

          const onConfirm = vi.fn();
          const onCancel = vi.fn();

          render(
            <VoteConfirmDialog
              isOpen={true}
              onConfirm={onConfirm}
              onCancel={onCancel}
              currentCandidatePosition={currentPosition}
              newCandidatePosition={newPosition}
            />
          );

          const dialog = screen.getByRole('dialog');
          fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });

          // onCancel should always be called when ESC is pressed
          expect(onCancel).toHaveBeenCalled();
          expect(onConfirm).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('Property 4: 投票変更の確認ダイアログ - dialog is never displayed when isOpen is false', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[A-H][1-8]$/),
        fc.stringMatching(/^[A-H][1-8]$/),
        (currentPosition, newPosition) => {
          cleanup();

          const onConfirm = vi.fn();
          const onCancel = vi.fn();

          render(
            <VoteConfirmDialog
              isOpen={false}
              onConfirm={onConfirm}
              onCancel={onCancel}
              currentCandidatePosition={currentPosition}
              newCandidatePosition={newPosition}
            />
          );

          // Dialog should never be displayed when isOpen is false
          const dialog = screen.queryByRole('dialog');
          expect(dialog).not.toBeInTheDocument();
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });
});
