import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

describe('ProfileEditForm - Save and Cancel Functionality', () => {
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
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Save Functionality', () => {
    it('should update profile without image upload when only username changes', async () => {
      const mockUpdateProfile = vi.fn().mockResolvedValue(true);
      const mockUploadImage = vi.fn();

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
        uploadImage: mockUploadImage,
        retry: vi.fn(),
        isLoading: false,
        error: null,
      });

      render(<ProfileEditForm />);

      const usernameInput = screen.getByLabelText('ユーザー名');

      // ユーザー名を変更
      fireEvent.change(usernameInput, { target: { value: 'NewUsername' } });

      // useEffectが実行されるのを待つ
      await waitFor(() => {
        expect(usernameInput).toHaveValue('NewUsername');
      });

      const saveButton = screen.getByRole('button', { name: /保存/ });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUploadImage).not.toHaveBeenCalled();
        expect(mockUpdateProfile).toHaveBeenCalledWith({
          username: 'NewUsername',
          iconUrl: mockProfile.iconUrl,
        });
      });
    });

    it('should upload image and update profile when image is selected', async () => {
      const mockUpdateProfile = vi.fn().mockResolvedValue(true);
      const mockUploadImage = vi.fn().mockResolvedValue({
        iconUrl: 'https://example.com/new-icon.png',
      });

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
        uploadImage: mockUploadImage,
        retry: vi.fn(),
        isLoading: false,
        error: null,
      });

      render(<ProfileEditForm />);

      const fileInput = document.getElementById('icon-upload') as HTMLInputElement;

      // 画像を選択
      const validFile = new File(['content'], 'valid.png', { type: 'image/png' });
      fireEvent.change(fileInput, { target: { files: [validFile] } });

      // useEffectが実行されるのを待つ
      await waitFor(() => {
        expect(fileInput.files?.[0]).toBe(validFile);
      });

      const saveButton = screen.getByRole('button', { name: /保存/ });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUploadImage).toHaveBeenCalledWith(validFile);
        expect(mockUpdateProfile).toHaveBeenCalledWith({
          username: mockProfile.username,
          iconUrl: 'https://example.com/new-icon.png',
        });
      });
    });

    it('should show success message and redirect after successful update', async () => {
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

      // ユーザー名を変更
      fireEvent.change(usernameInput, { target: { value: 'NewUsername' } });

      // useEffectが実行されるのを待つ
      await waitFor(() => {
        expect(usernameInput).toHaveValue('NewUsername');
      });

      const saveButton = screen.getByRole('button', { name: /保存/ });
      fireEvent.click(saveButton);

      // 成功メッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('プロフィールを更新しました')).toBeInTheDocument();
      });

      // 1秒後にリダイレクトされることを確認
      vi.advanceTimersByTime(1000);
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/profile');
      });
    });

    it('should not update profile when image upload fails', async () => {
      const mockUpdateProfile = vi.fn();
      const mockUploadImage = vi.fn().mockResolvedValue(null);

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
        uploadImage: mockUploadImage,
        retry: vi.fn(),
        isLoading: false,
        error: null,
      });

      render(<ProfileEditForm />);

      const fileInput = document.getElementById('icon-upload') as HTMLInputElement;

      // 画像を選択
      const validFile = new File(['content'], 'valid.png', { type: 'image/png' });
      fireEvent.change(fileInput, { target: { files: [validFile] } });

      // useEffectが実行されるのを待つ
      await waitFor(() => {
        expect(fileInput.files?.[0]).toBe(validFile);
      });

      const saveButton = screen.getByRole('button', { name: /保存/ });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUploadImage).toHaveBeenCalledWith(validFile);
        // アップロードが失敗したのでupdateProfileは呼ばれない
        expect(mockUpdateProfile).not.toHaveBeenCalled();
      });
    });

    it('should disable save button and form during submission', async () => {
      const mockUpdateProfile = vi
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(true), 1000)));

      vi.spyOn(useProfileModule, 'useProfile').mockReturnValue({
        profile: mockProfile,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      vi.spyOn(useProfileUpdateModule, 'useProfileUpdate').mockReturnValue({
        updateProfile: mockUpdateProfile,
        isLoading: true,
        error: null,
      });

      vi.spyOn(useImageUploadModule, 'useImageUpload').mockReturnValue({
        uploadImage: vi.fn(),
        retry: vi.fn(),
        isLoading: false,
        error: null,
      });

      render(<ProfileEditForm />);

      const saveButton = screen.getByRole('button', { name: /保存中/ });
      const usernameInput = screen.getByLabelText('ユーザー名');

      // ボタンが無効化されていることを確認
      expect(saveButton).toBeDisabled();
      // フォームが無効化されていることを確認
      expect(usernameInput).toBeDisabled();
    });
  });

  describe('Cancel Functionality', () => {
    it('should redirect to profile page when cancel is clicked without changes', async () => {
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

      const cancelButton = screen.getByRole('button', { name: /キャンセル/ });
      fireEvent.click(cancelButton);

      // 確認ダイアログが表示されないことを確認
      expect(
        screen.queryByText('変更内容が保存されていません。破棄してもよろしいですか？')
      ).not.toBeInTheDocument();

      // 直接リダイレクトされることを確認
      expect(mockPush).toHaveBeenCalledWith('/profile');
    });

    it('should show confirmation dialog when cancel is clicked with unsaved changes', async () => {
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

      // ユーザー名を変更
      fireEvent.change(usernameInput, { target: { value: 'NewUsername' } });

      // useEffectが実行されるのを待つ
      await waitFor(() => {
        expect(usernameInput).toHaveValue('NewUsername');
      });

      const cancelButton = screen.getByRole('button', { name: /キャンセル/ });

      // キャンセルボタンをクリック
      fireEvent.click(cancelButton);

      // 確認ダイアログが表示されることを確認
      await waitFor(() => {
        expect(
          screen.getByText('変更内容が保存されていません。破棄してもよろしいですか？')
        ).toBeInTheDocument();
      });
    });

    it('should redirect when "はい" is clicked in confirmation dialog', async () => {
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

      // ユーザー名を変更
      fireEvent.change(usernameInput, { target: { value: 'NewUsername' } });

      // useEffectが実行されるのを待つ
      await waitFor(() => {
        expect(usernameInput).toHaveValue('NewUsername');
      });

      const cancelButton = screen.getByRole('button', { name: /キャンセル/ });

      // キャンセルボタンをクリック
      fireEvent.click(cancelButton);

      // 確認ダイアログの「はい」ボタンをクリック
      const confirmButton = await screen.findByRole('button', { name: 'はい' });
      fireEvent.click(confirmButton);

      // リダイレクトされることを確認
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/profile');
      });
    });

    it('should stay on page when "いいえ" is clicked in confirmation dialog', async () => {
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

      // ユーザー名を変更
      fireEvent.change(usernameInput, { target: { value: 'NewUsername' } });

      // useEffectが実行されるのを待つ
      await waitFor(() => {
        expect(usernameInput).toHaveValue('NewUsername');
      });

      const cancelButton = screen.getByRole('button', { name: /キャンセル/ });

      // キャンセルボタンをクリック
      fireEvent.click(cancelButton);

      // 確認ダイアログの「いいえ」ボタンをクリック
      const noButton = await screen.findByRole('button', { name: 'いいえ' });
      fireEvent.click(noButton);

      // ダイアログが閉じられることを確認
      await waitFor(() => {
        expect(
          screen.queryByText('変更内容が保存されていません。破棄してもよろしいですか？')
        ).not.toBeInTheDocument();
      });

      // リダイレクトされないことを確認
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
