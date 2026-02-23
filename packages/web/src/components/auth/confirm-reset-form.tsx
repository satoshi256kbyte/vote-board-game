'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { usePasswordReset } from '@/lib/hooks/use-password-reset';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ConfirmResetFormProps {
  email: string;
}

interface FormErrors {
  confirmationCode?: string;
  newPassword?: string;
  passwordConfirmation?: string;
}

export function ConfirmResetForm({ email }: ConfirmResetFormProps) {
  const router = useRouter();
  const {
    confirmReset,
    resendCode,
    isLoading,
    error: apiError,
    successMessage,
  } = usePasswordReset();

  const [confirmationCode, setConfirmationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState({
    confirmationCode: false,
    newPassword: false,
    passwordConfirmation: false,
  });
  const [isResending, setIsResending] = useState(false);

  // Redirect to login after 3 seconds when password reset succeeds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        router.push('/login');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, router]);

  const validateConfirmationCode = (value: string): string | undefined => {
    if (!value.trim()) {
      return '確認コードを入力してください';
    }
    if (!/^\d{6}$/.test(value)) {
      return '確認コードは6桁の数字である必要があります';
    }
    return undefined;
  };

  const validateNewPassword = (value: string): string | undefined => {
    if (!value) {
      return '新しいパスワードを入力してください';
    }
    if (value.length < 8) {
      return 'パスワードは8文字以上である必要があります';
    }
    if (!/[A-Z]/.test(value)) {
      return 'パスワードには大文字を含める必要があります';
    }
    if (!/[a-z]/.test(value)) {
      return 'パスワードには小文字を含める必要があります';
    }
    if (!/[0-9]/.test(value)) {
      return 'パスワードには数字を含める必要があります';
    }
    return undefined;
  };

  const validatePasswordConfirmation = (value: string): string | undefined => {
    if (value !== newPassword) {
      return 'パスワードが一致しません';
    }
    return undefined;
  };

  const handleConfirmationCodeBlur = () => {
    setTouched({ ...touched, confirmationCode: true });
    const error = validateConfirmationCode(confirmationCode);
    setErrors({ ...errors, confirmationCode: error });
  };

  const handleNewPasswordBlur = () => {
    setTouched({ ...touched, newPassword: true });
    const error = validateNewPassword(newPassword);
    setErrors({ ...errors, newPassword: error });
  };

  const handlePasswordConfirmationBlur = () => {
    setTouched({ ...touched, passwordConfirmation: true });
    const error = validatePasswordConfirmation(passwordConfirmation);
    setErrors({ ...errors, passwordConfirmation: error });
  };

  const validateForm = (): boolean => {
    const codeError = validateConfirmationCode(confirmationCode);
    const passwordError = validateNewPassword(newPassword);
    const confirmationError = validatePasswordConfirmation(passwordConfirmation);

    setErrors({
      confirmationCode: codeError,
      newPassword: passwordError,
      passwordConfirmation: confirmationError,
    });

    setTouched({
      confirmationCode: true,
      newPassword: true,
      passwordConfirmation: true,
    });

    return !codeError && !passwordError && !confirmationError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    await confirmReset(email, confirmationCode, newPassword);
  };

  const handleResendCode = async () => {
    setIsResending(true);
    await resendCode(email);
    setIsResending(false);
  };

  const hasErrors = !!(
    errors.confirmationCode ||
    errors.newPassword ||
    errors.passwordConfirmation
  );
  const isSubmitDisabled = isLoading || hasErrors;

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6" noValidate>
      {successMessage && (
        <Alert className="bg-green-50 border-green-200" role="alert">
          <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
        </Alert>
      )}

      {apiError && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="confirmation-code" className="sr-only">
            確認コード
          </label>
          <Input
            id="confirmation-code"
            name="confirmation-code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            required
            value={confirmationCode}
            onChange={(e) => setConfirmationCode(e.target.value.replace(/\D/g, ''))}
            onBlur={handleConfirmationCodeBlur}
            disabled={isLoading}
            placeholder="6桁の確認コード"
            aria-label="確認コード"
            aria-invalid={!!(touched.confirmationCode && errors.confirmationCode)}
            aria-describedby={
              touched.confirmationCode && errors.confirmationCode
                ? 'confirmation-code-error'
                : undefined
            }
            className={touched.confirmationCode && errors.confirmationCode ? 'border-red-500' : ''}
          />
          {touched.confirmationCode && errors.confirmationCode && (
            <p id="confirmation-code-error" className="mt-1 text-sm text-red-600" role="alert">
              {errors.confirmationCode}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="new-password" className="sr-only">
            新しいパスワード
          </label>
          <div className="relative">
            <Input
              id="new-password"
              name="new-password"
              type={showNewPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onBlur={handleNewPasswordBlur}
              disabled={isLoading}
              placeholder="新しいパスワード"
              aria-label="新しいパスワード"
              aria-invalid={!!(touched.newPassword && errors.newPassword)}
              aria-describedby={
                touched.newPassword && errors.newPassword ? 'new-password-error' : undefined
              }
              className={
                touched.newPassword && errors.newPassword ? 'border-red-500 pr-10' : 'pr-10'
              }
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              disabled={isLoading}
              className="absolute inset-y-0 right-0 flex items-center pr-3"
              aria-label={showNewPassword ? 'パスワードを非表示' : 'パスワードを表示'}
            >
              {showNewPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
          {touched.newPassword && errors.newPassword && (
            <p id="new-password-error" className="mt-1 text-sm text-red-600" role="alert">
              {errors.newPassword}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">8文字以上、大文字・小文字・数字を含む</p>
        </div>

        <div>
          <label htmlFor="password-confirmation" className="sr-only">
            新しいパスワード確認
          </label>
          <div className="relative">
            <Input
              id="password-confirmation"
              name="password-confirmation"
              type={showPasswordConfirmation ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              onBlur={handlePasswordConfirmationBlur}
              disabled={isLoading}
              placeholder="新しいパスワード(確認)"
              aria-label="新しいパスワード確認"
              aria-invalid={!!(touched.passwordConfirmation && errors.passwordConfirmation)}
              aria-describedby={
                touched.passwordConfirmation && errors.passwordConfirmation
                  ? 'password-confirmation-error'
                  : undefined
              }
              className={
                touched.passwordConfirmation && errors.passwordConfirmation
                  ? 'border-red-500 pr-10'
                  : 'pr-10'
              }
            />
            <button
              type="button"
              onClick={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
              disabled={isLoading}
              className="absolute inset-y-0 right-0 flex items-center pr-3"
              aria-label={
                showPasswordConfirmation ? 'パスワード確認を非表示' : 'パスワード確認を表示'
              }
            >
              {showPasswordConfirmation ? (
                <EyeOff className="h-5 w-5 text-gray-400" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
          {touched.passwordConfirmation && errors.passwordConfirmation && (
            <p id="password-confirmation-error" className="mt-1 text-sm text-red-600" role="alert">
              {errors.passwordConfirmation}
            </p>
          )}
        </div>
      </div>

      <div>
        <Button
          type="submit"
          disabled={isSubmitDisabled}
          aria-disabled={isSubmitDisabled}
          className="w-full"
        >
          {isLoading ? 'リセット中...' : 'パスワードをリセット'}
        </Button>
      </div>

      <div className="text-center text-sm">
        <button
          type="button"
          onClick={handleResendCode}
          disabled={isResending || isLoading}
          className="font-medium text-blue-600 hover:text-blue-500 disabled:text-gray-400"
        >
          {isResending ? '送信中...' : '確認コードを再送信'}
        </button>
      </div>
    </form>
  );
}
