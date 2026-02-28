import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RegistrationPage } from './registration-page';
import type { Page } from '@playwright/test';

describe('RegistrationPage', () => {
  let mockPage: Page;
  let registrationPage: RegistrationPage;

  beforeEach(() => {
    mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      waitForLoadState: vi.fn().mockResolvedValue(undefined),
      waitForURL: vi.fn().mockResolvedValue(undefined),
      url: vi.fn().mockReturnValue('http://localhost:3000/login'),
      getByTestId: vi.fn().mockReturnValue({
        fill: vi.fn().mockResolvedValue(undefined),
        click: vi.fn().mockResolvedValue(undefined),
      }),
    } as unknown as Page;

    registrationPage = new RegistrationPage(mockPage);
  });

  describe('goto', () => {
    it('should navigate to registration page', async () => {
      await registrationPage.goto();

      expect(mockPage.goto).toHaveBeenCalledWith('/register');
      expect(mockPage.waitForLoadState).toHaveBeenCalledWith('networkidle');
    });
  });

  describe('fillEmail', () => {
    it('should fill email input', async () => {
      const mockElement = {
        fill: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

      await registrationPage.fillEmail('test@example.com');

      expect(mockPage.getByTestId).toHaveBeenCalledWith('registration-email-input');
      expect(mockElement.fill).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('fillPassword', () => {
    it('should fill password input', async () => {
      const mockElement = {
        fill: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

      await registrationPage.fillPassword('password123');

      expect(mockPage.getByTestId).toHaveBeenCalledWith('registration-password-input');
      expect(mockElement.fill).toHaveBeenCalledWith('password123');
    });
  });

  describe('fillConfirmPassword', () => {
    it('should fill confirm password input', async () => {
      const mockElement = {
        fill: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

      await registrationPage.fillConfirmPassword('password123');

      expect(mockPage.getByTestId).toHaveBeenCalledWith('registration-confirm-password-input');
      expect(mockElement.fill).toHaveBeenCalledWith('password123');
    });
  });

  describe('clickSubmit', () => {
    it('should click submit button', async () => {
      const mockElement = {
        click: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

      await registrationPage.clickSubmit();

      expect(mockPage.getByTestId).toHaveBeenCalledWith('registration-submit-button');
      expect(mockElement.click).toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('should fill all fields and submit', async () => {
      const mockElement = {
        fill: vi.fn().mockResolvedValue(undefined),
        click: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

      await registrationPage.register('test@example.com', 'password123');

      expect(mockPage.getByTestId).toHaveBeenCalledWith('registration-email-input');
      expect(mockPage.getByTestId).toHaveBeenCalledWith('registration-password-input');
      expect(mockPage.getByTestId).toHaveBeenCalledWith('registration-confirm-password-input');
      expect(mockPage.getByTestId).toHaveBeenCalledWith('registration-submit-button');
    });
  });

  describe('expectRedirectToLogin', () => {
    it('should verify redirect to login page', async () => {
      vi.mocked(mockPage.url).mockReturnValue('http://localhost:3000/login');

      await registrationPage.expectRedirectToLogin();

      expect(mockPage.waitForURL).toHaveBeenCalledWith('/login', {
        timeout: 10000,
      });
    });
  });
});
