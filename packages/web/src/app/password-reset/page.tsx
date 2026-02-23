'use client';

import React, { useState, useEffect } from 'react';
import { RequestCodeForm } from '@/components/auth/request-code-form';
import { ConfirmResetForm } from '@/components/auth/confirm-reset-form';

type Step = 'request' | 'confirm';

export default function PasswordResetPage() {
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');

  // ページ離脱時にフォームデータをクリア
  useEffect(() => {
    return () => {
      setEmail('');
    };
  }, []);

  const handleCodeSent = (sentEmail: string) => {
    setEmail(sentEmail);
    setStep('confirm');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold tracking-tight text-gray-900">
            パスワードリセット
          </h1>
        </div>
        {step === 'request' ? (
          <RequestCodeForm onCodeSent={handleCodeSent} />
        ) : (
          <ConfirmResetForm email={email} />
        )}
      </div>
    </div>
  );
}
