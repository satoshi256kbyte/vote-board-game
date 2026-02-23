'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';

interface AuthRedirectProps {
  children: React.ReactNode;
}

export function AuthRedirect({ children }: AuthRedirectProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div role="status" aria-label="読み込み中">
        <span>読み込み中...</span>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
