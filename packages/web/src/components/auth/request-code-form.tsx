'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RequestCodeFormProps {
  onCodeSent: (email: string) => void;
}

export function RequestCodeForm({ onCodeSent }: RequestCodeFormProps) {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ email?: string }>({});
  const [touched, setTouched] = useState({ email: false });
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const validateEmail = (value: string): string | undefined => {
    if (!value.trim()) {
      return 'メールアドレスを入力してください';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return '有効なメールアドレスを入力してください';
    }
    return undefined;
  };

  const handleEmailBlur = () => {
    setTouched({ email: true });
    const error = validateEmail(email);
    setErrors({ email: error });
  };

  const validateForm = (): boolean => {
    const emailError = validateEmail(email);
    setErrors({ email: emailError });
    setTouched({ email: true });
    return !emailError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // TODO: Implement API call in next task
    // For now, just simulate the flow
    setIsLoading(true);
    setApiError(null);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      onCodeSent(email);
    }, 1000);
  };

  const isSubmitDisabled = isLoading || !!errors.email;

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6" noValidate>
      <div className="space-y-2">
        <p className="text-sm text-gray-600">
          登録されているメールアドレスを入力してください。パスワードリセット用の確認コードを送信します。
        </p>
      </div>

      {apiError && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

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
            disabled={isLoading}
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
      </div>

      <div>
        <Button
          type="submit"
          disabled={isSubmitDisabled}
          aria-disabled={isSubmitDisabled}
          className="w-full"
        >
          {isLoading ? '送信中...' : '確認コードを送信'}
        </Button>
      </div>

      <div className="text-center text-sm">
        <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
          ログイン画面に戻る
        </Link>
      </div>
    </form>
  );
}
