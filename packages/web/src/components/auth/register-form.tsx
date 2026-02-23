'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Form submission will be implemented in task 4.4
  };

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
            placeholder="メールアドレス"
            aria-label="メールアドレス"
          />
        </div>

        <div>
          <label htmlFor="password" className="sr-only">
            パスワード
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワード（8文字以上）"
            aria-label="パスワード"
          />
        </div>

        <div>
          <label htmlFor="password-confirmation" className="sr-only">
            パスワード確認
          </label>
          <Input
            id="password-confirmation"
            name="password-confirmation"
            type="password"
            autoComplete="new-password"
            required
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            placeholder="パスワード確認"
            aria-label="パスワード確認"
          />
        </div>
      </div>

      <div>
        <Button type="submit" className="w-full">
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
