import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PasswordResetPage } from './password-reset-page';
import type { Page } from '@playwright/test';

describe('PasswordResetPage', () => {
  let mockPage: Page;
  let passwordResetPage: PasswordResetPage;

  beforeEach(() => {
    mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      waitForLoadState: vi.fn().mockResolvedValue(undefined),
      getByTestId: vi.fn(),
    } as unknown as Page;

    passwordResetPage = new PasswordResetPage(mockPage);
  });

  describe('goto', () => {
    it('should navigate to password reset page', async () => {
      await passwordResetPage.goto();

      expect(mockPage.goto).toHaveBeenCalledWith('/password-reset');
      expect(mockPage.waitForLoadState).toHaveBeenCalledWith('networkidle');
    });
  });

  describe('fillEmail', () => {
    it('should fill email input', async () => {
      const mockElement = {
        fill: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

      await passwordResetPage.fillEmail('test@example.com');

      expect(mockPage.getByTestId).toHaveBeenCalledWith('password-reset-email-input');
      expect(mockElement.fill).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('clickSubmit', () => {
    it('should click submit button', async () => {
      const mockElement = {
        click: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

      await passwordResetPage.clickSubmit();

      expect(mockPage.getByTestId).toHaveBeenCalledWith('password-reset-submit-button');
      expect(mockElement.click).toHaveBeenCalled();
    });
  });

  describe('expectConfirmationMessage', () => {
    it('should verify confirmation message is visible', async () => {
      const mockElement = {
        toBeVisible: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

      await passwordResetPage.expectConfirmationMessage();

      expect(mockPage.getByTestId).toHaveBeenCalledWith('password-reset-confirmation-message');
    });
  });

  describe('expectErrorMessage', () => {
    it('should verify error message with text', async () => {
      const mockElement = {
        toBeVisible: vi.fn().mockResolvedValue(undefined),
        toContainText: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

      await passwordResetPage.expectErrorMessage('Invalid email');

      expect(mockPage.getByTestId).toHaveBeenCalledWith('password-reset-error-message');
    });
  });

  describe('fillConfirmationCode', () => {
    it('should fill confirmation code input', async () => {
      const mockElement = {
        fill: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

      await passwordResetPage.fillConfirmationCode('123456');

      expect(mockPage.getByTestId).toHaveBeenCalledWith('password-reset-confirmation-code-input');
      expect(mockElement.fill).toHaveBeenCalledWith('123456');
    });
  });

  describe('fillNewPassword', () => {
    it('should fill new password input', async () => {
      const mockElement = {
        fill: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

      await passwordResetPage.fillNewPassword('NewPassword123!');

      expect(mockPage.getByTestId).toHaveBeenCalledWith('password-reset-new-password-input');
      expect(mockElement.fill).toHaveBeenCalledWith('NewPassword123!');
    });
  });

  describe('fillConfirmPassword', () => {
    it('should fill confirm password input', async () => {
      const mockElement = {
        fill: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

      await passwordResetPage.fillConfirmPassword('NewPassword123!');

      expect(mockPage.getByTestId).toHaveBeenCalledWith('password-reset-confirm-password-input');
      expect(mockElement.fill).toHaveBeenCalledWith('NewPassword123!');
    });
  });

  describe('clickConfirmSubmit', () => {
    it('should click confirm submit button', async () => {
      const mockElement = {
        click: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

      await passwordResetPage.clickConfirmSubmit();

      expect(mockPage.getByTestId).toHaveBeenCalledWith('password-reset-confirm-submit-button');
      expect(mockElement.click).toHaveBeenCalled();
    });
  });

  describe('submitPasswordReset', () => {
    it('should fill all fields and submit', async () => {
      const mockElement = {
        fill: vi.fn().mockResolvedValue(undefined),
        click: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

      await passwordResetPage.submitPasswordReset('test@example.com', '123456', 'NewPassword123!');

      expect(mockPage.getByTestId).toHaveBeenCalledWith('password-reset-confirmation-code-input');
      expect(mockPage.getByTestId).toHaveBeenCalledWith('password-reset-new-password-input');
      expect(mockPage.getByTestId).toHaveBeenCalledWith('password-reset-confirm-password-input');
      expect(mockPage.getByTestId).toHaveBeenCalledWith('password-reset-confirm-submit-button');
    });
  });

  describe('expectSuccessMessage', () => {
    it('should verify success message is visible', async () => {
      const mockElement = {
        toBeVisible: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

      await passwordResetPage.expectSuccessMessage();

      expect(mockPage.getByTestId).toHaveBeenCalledWith('password-reset-success-message');
    });
  });

  describe('expectRedirectToLogin', () => {
    it('should verify redirect to login page', async () => {
      const mockPageWithUrl = {
        ...mockPage,
        waitForURL: vi.fn().mockResolvedValue(undefined),
        url: vi.fn().mockReturnValue('http://localhost:3000/login'),
      };
      const page = new PasswordResetPage(mockPageWithUrl as unknown as Page);

      await page.expectRedirectToLogin();

      expect(mockPageWithUrl.waitForURL).toHaveBeenCalledWith('/login', {
        timeout: 10000,
      });
    });
  });
});
