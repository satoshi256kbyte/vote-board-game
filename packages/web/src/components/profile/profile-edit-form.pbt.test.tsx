/**
 * Property-Based Tests for ProfileEditForm Username Validation
 *
 * **Validates: Requirements 4.1, 4.2, 4.3**
 *
 * These tests use fast-check to verify username validation properties
 * across a wide range of inputs.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import { ProfileEditForm } from './profile-edit-form';
import * as useProfileModule from '@/lib/hooks/use-profile';
import * as useProfileUpdateModule from '@/lib/hooks/use-profile-update';
import * as useImageUploadModule from '@/lib/hooks/use-image-upload';

// Next.js router mock
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Next.js Image mock
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

describe('ProfileEditForm - Property-Based Tests for Username Validation', () => {
  const mockProfile = {
    userId: 'user-1',
    email: 'test@example.com',
    username: 'TestUser',
    iconUrl: 'https://example.com/icon.png',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.clearAllMocks();
  });

  /**
   * Property: Empty username validation
   * **Validates: Requirement 4.1**
   *
   * For any string that is empty or contains only whitespace,
   * the form should display the error message "ユーザー名を入力してください"
   * and should not call the API.
   */
  it('should reject empty or whitespace-only usernames', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(''),
          fc.constant(' '),
          fc.constant('  '),
          fc.constant('\t'),
          fc.constant('\n'),
          fc.constant('   \t  \n  ')
        ),
        (emptyUsername) => {
          const mockUpdateProfile = vi.fn();

          vi.spyOn(useProfileModule, 'useProfile').mockReturnValue({
            profile: mockProfile,
            isLoading: false,
            error: null,
            refetch: vi.fn(),
          });

          vi.spyOn(useProfileUpdateModule, 'useProfileUpdate').mockReturnValue({
            updateProfile: mockUpdateProfile,
            isLoading: false,
            error: null,
          });

          vi.spyOn(useImageUploadModule, 'useImageUpload').mockReturnValue({
            uploadImage: vi.fn(),
            retry: vi.fn(),
            isLoading: false,
            error: null,
          });

          render(<ProfileEditForm />);

          const usernameInput = screen.getByLabelText('ユーザー名');
          const saveButton = screen.getByRole('button', { name: /保存/ });

          // Set username to empty/whitespace value
          fireEvent.change(usernameInput, { target: { value: emptyUsername } });
          fireEvent.click(saveButton);

          // Verify error message is displayed
          const errorMessage = screen.queryByText('ユーザー名を入力してください');
          expect(errorMessage).toBeInTheDocument();

          // Verify API was not called
          expect(mockUpdateProfile).not.toHaveBeenCalled();

          cleanup();
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });

  /**
   * Property: Username length validation (exceeds 50 characters)
   * **Validates: Requirement 4.2**
   *
   * For any string with length > 50 characters,
   * the form should display the error message "ユーザー名は50文字以内で入力してください"
   * and should not call the API.
   */
  it('should reject usernames exceeding 50 characters', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 51, maxLength: 100 }), (longUsername) => {
        const mockUpdateProfile = vi.fn();

        vi.spyOn(useProfileModule, 'useProfile').mockReturnValue({
          profile: mockProfile,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        });

        vi.spyOn(useProfileUpdateModule, 'useProfileUpdate').mockReturnValue({
          updateProfile: mockUpdateProfile,
          isLoading: false,
          error: null,
        });

        vi.spyOn(useImageUploadModule, 'useImageUpload').mockReturnValue({
          uploadImage: vi.fn(),
          retry: vi.fn(),
          isLoading: false,
          error: null,
        });

        render(<ProfileEditForm />);

        const usernameInput = screen.getByLabelText('ユーザー名');
        const saveButton = screen.getByRole('button', { name: /保存/ });

        // Set username to long value
        fireEvent.change(usernameInput, { target: { value: longUsername } });
        fireEvent.click(saveButton);

        // Verify error message is displayed
        const errorMessage = screen.queryByText('ユーザー名は50文字以内で入力してください');
        expect(errorMessage).toBeInTheDocument();

        // Verify API was not called
        expect(mockUpdateProfile).not.toHaveBeenCalled();

        cleanup();
      }),
      { numRuns: 15, endOnFailure: true }
    );
  });

  /**
   * Property: Valid username acceptance
   * **Validates: Requirement 4.3**
   *
   * For any non-empty string with length between 1 and 50 characters,
   * the form should not display validation errors and should allow submission.
   */
  it('should accept valid usernames (1-50 characters, non-empty)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        (validUsername) => {
          const mockUpdateProfile = vi.fn().mockResolvedValue(true);

          vi.spyOn(useProfileModule, 'useProfile').mockReturnValue({
            profile: mockProfile,
            isLoading: false,
            error: null,
            refetch: vi.fn(),
          });

          vi.spyOn(useProfileUpdateModule, 'useProfileUpdate').mockReturnValue({
            updateProfile: mockUpdateProfile,
            isLoading: false,
            error: null,
          });

          vi.spyOn(useImageUploadModule, 'useImageUpload').mockReturnValue({
            uploadImage: vi.fn(),
            retry: vi.fn(),
            isLoading: false,
            error: null,
          });

          render(<ProfileEditForm />);

          const usernameInput = screen.getByLabelText('ユーザー名');
          const saveButton = screen.getByRole('button', { name: /保存/ });

          // Set username to valid value
          fireEvent.change(usernameInput, { target: { value: validUsername } });
          fireEvent.click(saveButton);

          // Verify no validation error messages are displayed
          expect(screen.queryByText('ユーザー名を入力してください')).not.toBeInTheDocument();
          expect(
            screen.queryByText('ユーザー名は50文字以内で入力してください')
          ).not.toBeInTheDocument();

          // Verify API was called with trimmed username
          expect(mockUpdateProfile).toHaveBeenCalledWith({
            username: validUsername.trim(),
            iconUrl: mockProfile.iconUrl,
          });

          cleanup();
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });

  /**
   * Property: Boundary testing for username length
   * **Validates: Requirements 4.2, 4.3**
   *
   * Tests the exact boundary at 50 characters:
   * - 50 characters should be accepted
   * - 51 characters should be rejected
   */
  it('should handle boundary cases at 50 characters correctly', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.string({ minLength: 50, maxLength: 50 }).filter((s) => s.trim().length > 0),
          fc.string({ minLength: 51, maxLength: 51 })
        ),
        ([exactly50, exactly51]) => {
          const mockUpdateProfile = vi.fn().mockResolvedValue(true);

          // Test 50 characters (should be accepted)
          vi.spyOn(useProfileModule, 'useProfile').mockReturnValue({
            profile: mockProfile,
            isLoading: false,
            error: null,
            refetch: vi.fn(),
          });

          vi.spyOn(useProfileUpdateModule, 'useProfileUpdate').mockReturnValue({
            updateProfile: mockUpdateProfile,
            isLoading: false,
            error: null,
          });

          vi.spyOn(useImageUploadModule, 'useImageUpload').mockReturnValue({
            uploadImage: vi.fn(),
            retry: vi.fn(),
            isLoading: false,
            error: null,
          });

          render(<ProfileEditForm />);
          const usernameInput1 = screen.getByLabelText('ユーザー名');
          const saveButton1 = screen.getByRole('button', { name: /保存/ });

          fireEvent.change(usernameInput1, { target: { value: exactly50 } });
          fireEvent.click(saveButton1);

          // 50 characters should be accepted
          expect(
            screen.queryByText('ユーザー名は50文字以内で入力してください')
          ).not.toBeInTheDocument();
          expect(mockUpdateProfile).toHaveBeenCalled();

          cleanup();
          mockUpdateProfile.mockClear();

          // Test 51 characters (should be rejected)
          vi.spyOn(useProfileModule, 'useProfile').mockReturnValue({
            profile: mockProfile,
            isLoading: false,
            error: null,
            refetch: vi.fn(),
          });

          vi.spyOn(useProfileUpdateModule, 'useProfileUpdate').mockReturnValue({
            updateProfile: mockUpdateProfile,
            isLoading: false,
            error: null,
          });

          vi.spyOn(useImageUploadModule, 'useImageUpload').mockReturnValue({
            uploadImage: vi.fn(),
            retry: vi.fn(),
            isLoading: false,
            error: null,
          });

          render(<ProfileEditForm />);
          const usernameInput2 = screen.getByLabelText('ユーザー名');
          const saveButton2 = screen.getByRole('button', { name: /保存/ });

          fireEvent.change(usernameInput2, { target: { value: exactly51 } });
          fireEvent.click(saveButton2);

          // 51 characters should be rejected
          expect(
            screen.queryByText('ユーザー名は50文字以内で入力してください')
          ).toBeInTheDocument();
          expect(mockUpdateProfile).not.toHaveBeenCalled();

          cleanup();
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });
});
