'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface FormErrors {
  email?: string;
  password?: string;
  passwordConfirmation?: string;
}

export function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState({
    email: false,
    password: false,
    passwordConfirmation: false,
  });

  const validateEmail = (value: string): string | undefined => {
    if (!value.trim()) {
      return undefined;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return '有効なメールアドレスを入力してください';
    }
    return undefined;
  };

  const validatePassword = (value: string): string | undefined => {
    if (!value) {
      return undefined;
    }
    if (value.length < 8) {
      return 'パスワードは8文字以上である必要があります';
    }
    return undefined;
  };

  const validatePasswordConfirmation = (value: string): string | undefined => {
    if (!value) {
      return undefined;
    }
    if (value !== password) {
      return 'パスワードが一致しません';
    }
    return undefined;
  };

  const handleEmailBlur = () => {
    setTouched({ ...touched, email: true });
    const error = validateEmail(email);
    setErrors({ ...errors, email: error });
  };

  const handlePasswordBlur = () => {
    setTouched({ ...touched, password: true });
    const error = validatePassword(password);
    setErrors({ ...errors, password: error });
    // Re-validate password confirmation if it has been touched
    if (touched.passwordConfirmation) {
      const confirmError = validatePasswordConfirmation(passwordConfirmation);
      setErrors((prev) => ({ ...prev, password: error, passwordConfirmation: confirmError }));
    }
  };

  const handlePasswordConfirmationBlur = () => {
    setTouched({ ...touched, passwordConfirmation: true });
    const error = validatePasswordConfirmation(passwordConfirmation);
    setErrors({ ...errors, passwordConfirmation: error });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Form submission will be implemented in task 4.4
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const togglePasswordConfirmationVisibility = () => {
    setShowPasswordConfirmation(!showPasswordConfirmation);
  };

  const hasErrors = !!(errors.email || errors.password || errors.passwordConfirmation);
  const isSubmitDisabled = hasErrors;

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6" noValidate>
      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="sr-only">
            メールアドレス
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={handleEmailBlur}
            placeholder="メールアドレス"
            aria-label="メールアドレス"
            aria-invalid={!!(touched.email && errors.email)}
            aria-describedby={touched.email && errors.email ? 'email-error' : undefined}
            className={touched.email && errors.email ? 'border-red-500' : ''}
          />
          {touched.email && errors.email && (
            <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
              {errors.email}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="sr-only">
            パスワード
          </label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={handlePasswordBlur}
              placeholder="パスワード（8文字以上）"
              aria-label="パスワード"
              aria-invalid={!!(touched.password && errors.password)}
              aria-describedby={touched.password && errors.password ? 'password-error' : undefined}
              className={touched.password && errors.password ? 'border-red-500 pr-10' : 'pr-10'}
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute inset-y-0 right-0 flex items-center pr-3"
              aria-label={showPassword ? 'パスワードを非表示' : 'パスワードを表示'}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
          {touched.password && errors.password && (
            <p id="password-error" className="mt-1 text-sm text-red-600" role="alert">
              {errors.password}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="password-confirmation" className="sr-only">
            パスワード確認
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
              placeholder="パスワード確認"
              aria-label="パスワード確認"
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
              onClick={togglePasswordConfirmationVisibility}
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
        <Button type="submit" disabled={isSubmitDisabled} className="w-full">
          アカウント作成
        </Button>
      </div>

      <div className="text-center text-sm">
        <span className="text-gray-600">既にアカウントをお持ちの方</span>{' '}
        <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
          ログイン
        </Link>
      </div>
    </form>
  );
}
