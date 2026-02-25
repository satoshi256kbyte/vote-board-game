import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

describe('ProfileEditForm - Validation', () => {
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

  describe('Username Validation', () => {
    it('should show error when username is empty', async () => {
      vi.spyOn(useProfileModule, 'useProfile').mockReturnValue({
        profile: mockProfile,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      vi.spyOn(useProfileUpdateModule, 'useProfileUpdate').mockReturnValue({
        updateProfile: vi.fn(),
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

      // ユーザー名を空にする
      fireEvent.change(usernameInput, { target: { value: '' } });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('ユーザー名を入力してください')).toBeInTheDocument();
      });
    });

    it('should show error when username exceeds 50 characters', async () => {
      vi.spyOn(useProfileModule, 'useProfile').mockReturnValue({
        profile: mockProfile,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      vi.spyOn(useProfileUpdateModule, 'useProfileUpdate').mockReturnValue({
        updateProfile: vi.fn(),
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

      // 51文字のユーザー名を入力
      const longUsername = 'a'.repeat(51);
      fireEvent.change(usernameInput, { target: { value: longUsername } });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('ユーザー名は50文字以内で入力してください')).toBeInTheDocument();
      });
    });

    it('should not call API when validation fails', async () => {
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

      // ユーザー名を空にする
      fireEvent.change(usernameInput, { target: { value: '' } });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('ユーザー名を入力してください')).toBeInTheDocument();
      });

      // APIが呼ばれていないことを確認
      expect(mockUpdateProfile).not.toHaveBeenCalled();
    });
  });

  describe('Image File Validation', () => {
    it('should show error when file size exceeds 5MB', async () => {
      vi.spyOn(useProfileModule, 'useProfile').mockReturnValue({
        profile: mockProfile,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      vi.spyOn(useProfileUpdateModule, 'useProfileUpdate').mockReturnValue({
        updateProfile: vi.fn(),
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

      const fileInput = document.getElementById('icon-upload') as HTMLInputElement;

      // 6MBのファイルを作成
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.png', {
        type: 'image/png',
      });

      fireEvent.change(fileInput, { target: { files: [largeFile] } });

      await waitFor(() => {
        expect(screen.getByText('画像サイズは5MB以下にしてください')).toBeInTheDocument();
      });
    });

    it('should show error when file format is not supported', async () => {
      vi.spyOn(useProfileModule, 'useProfile').mockReturnValue({
        profile: mockProfile,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      vi.spyOn(useProfileUpdateModule, 'useProfileUpdate').mockReturnValue({
        updateProfile: vi.fn(),
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

      const fileInput = document.getElementById('icon-upload') as HTMLInputElement;

      // サポートされていない形式のファイルを作成
      const unsupportedFile = new File(['content'], 'file.pdf', {
        type: 'application/pdf',
      });

      fireEvent.change(fileInput, { target: { files: [unsupportedFile] } });

      await waitFor(() => {
        expect(screen.getByText('PNG、JPEG、GIF形式の画像を選択してください')).toBeInTheDocument();
      });
    });

    it('should accept valid image file (PNG)', async () => {
      vi.spyOn(useProfileModule, 'useProfile').mockReturnValue({
        profile: mockProfile,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      vi.spyOn(useProfileUpdateModule, 'useProfileUpdate').mockReturnValue({
        updateProfile: vi.fn(),
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

      const fileInput = document.getElementById('icon-upload') as HTMLInputElement;

      // 有効なPNGファイルを作成（1MB）
      const validFile = new File(['x'.repeat(1024 * 1024)], 'valid.png', {
        type: 'image/png',
      });

      fireEvent.change(fileInput, { target: { files: [validFile] } });

      await waitFor(() => {
        // エラーメッセージが表示されないことを確認
        expect(screen.queryByText('画像サイズは5MB以下にしてください')).not.toBeInTheDocument();
        expect(
          screen.queryByText('PNG、JPEG、GIF形式の画像を選択してください')
        ).not.toBeInTheDocument();
      });
    });

    it('should accept valid image file (JPEG)', async () => {
      vi.spyOn(useProfileModule, 'useProfile').mockReturnValue({
        profile: mockProfile,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      vi.spyOn(useProfileUpdateModule, 'useProfileUpdate').mockReturnValue({
        updateProfile: vi.fn(),
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

      const fileInput = document.getElementById('icon-upload') as HTMLInputElement;

      // 有効なJPEGファイルを作成
      const validFile = new File(['content'], 'valid.jpg', {
        type: 'image/jpeg',
      });

      fireEvent.change(fileInput, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(screen.queryByText('画像サイズは5MB以下にしてください')).not.toBeInTheDocument();
        expect(
          screen.queryByText('PNG、JPEG、GIF形式の画像を選択してください')
        ).not.toBeInTheDocument();
      });
    });

    it('should accept valid image file (GIF)', async () => {
      vi.spyOn(useProfileModule, 'useProfile').mockReturnValue({
        profile: mockProfile,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      vi.spyOn(useProfileUpdateModule, 'useProfileUpdate').mockReturnValue({
        updateProfile: vi.fn(),
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

      const fileInput = document.getElementById('icon-upload') as HTMLInputElement;

      // 有効なGIFファイルを作成
      const validFile = new File(['content'], 'valid.gif', {
        type: 'image/gif',
      });

      fireEvent.change(fileInput, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(screen.queryByText('画像サイズは5MB以下にしてください')).not.toBeInTheDocument();
        expect(
          screen.queryByText('PNG、JPEG、GIF形式の画像を選択してください')
        ).not.toBeInTheDocument();
      });
    });
  });
});
