import React from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { ProfileEditForm } from '@/components/profile/profile-edit-form';

export default function ProfileEditPage() {
  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-8">プロフィール編集</h1>
        <ProfileEditForm />
      </div>
    </ProtectedRoute>
  );
}
