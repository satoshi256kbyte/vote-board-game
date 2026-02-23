'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { useLogin } from '@/lib/hooks/use-login';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FormErrors {
  email?: string;
  password?: string;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading, error: apiError } = useLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!email.trim()) {
      newErrors.email = 'メールアドレスを入力してください';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = '有効なメールアドレスを入力してください';
    }

    if (!password) {
      newErrors.password = 'パスワードを入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const success = await login(email, password);
    if (success) {
      const redirect = searchParams.get('redirect');
      router.push(redirect || '/');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6" noValidate>
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
            disabled={isLoading}
            placeholder="メールアドレス"
            aria-label="メールアドレス"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
            className={errors.email ? 'border-red-500' : ''}
          />
          {errors.email && (
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
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              placeholder="パスワード"
              aria-label="パスワード"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
              className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              disabled={isLoading}
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
          {errors.password && (
            <p id="password-error" className="mt-1 text-sm text-red-600" role="alert">
              {errors.password}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm">
          <Link href="/password-reset" className="font-medium text-blue-600 hover:text-blue-500">
            パスワードをお忘れですか？
          </Link>
        </div>
      </div>

      <div>
        <Button type="submit" disabled={isLoading} aria-disabled={isLoading} className="w-full">
          {isLoading ? 'ログイン中...' : 'ログイン'}
        </Button>
      </div>

      <div className="text-center text-sm">
        <span className="text-gray-600">アカウントをお持ちでない方</span>{' '}
        <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
          新規登録
        </Link>
      </div>
    </form>
  );
}
