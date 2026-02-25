import React from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { ProfileView } from '@/components/profile/profile-view';

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-8">プロフィール</h1>
        <ProfileView />
      </div>
    </ProtectedRoute>
  );
}
