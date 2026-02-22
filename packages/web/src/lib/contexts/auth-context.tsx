'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { getAccessToken } from '@/lib/services/storage-service';

interface User {
  userId: string;
  email: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // 初期化時にトークンをチェック
    const token = getAccessToken();
    if (token) {
      // トークンが存在する場合、ユーザー情報を復元
      // 実際の実装では、トークンからユーザー情報をデコードするか、
      // 別途ローカルストレージに保存したユーザー情報を取得
    }
  }, []);

  const isAuthenticated = !!user && !!getAccessToken();

  return (
    <AuthContext.Provider value={{ user, setUser, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}
