'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/auth/login-form';
import { getAccessToken } from '@/lib/services/storage-service';

export default function LoginPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // 認証済みユーザーのリダイレクト
    const token = getAccessToken();
    if (token) {
      router.push('/');
    } else {
      setIsChecking(false);
    }
  }, [router]);

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
          <p className="mt-2 text-sm text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold tracking-tight text-gray-900">ログイン</h1>
          <p className="mt-2 text-center text-sm text-gray-600">投票対局へようこそ</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
