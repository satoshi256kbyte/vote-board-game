'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut } from 'lucide-react';

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="bg-blue-50 border-b border-blue-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-xl font-bold text-gray-900">投票ボドゲ</span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                {/* Create Game Button */}
                <Link href="/games/new">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">対局作成</Button>
                </Link>

                {/* Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-blue-600 text-blue-600 hover:bg-blue-50"
                    >
                      <User className="h-4 w-4 mr-2" />
                      {user?.username || 'プロフィール'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="cursor-pointer">
                        <User className="h-4 w-4 mr-2" />
                        プロフィール
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                      <LogOut className="h-4 w-4 mr-2" />
                      ログアウト
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                {/* Login Button */}
                <Link href="/login">
                  <Button
                    variant="outline"
                    className="border-blue-600 text-blue-600 hover:bg-blue-50"
                  >
                    ログイン
                  </Button>
                </Link>

                {/* Register Button */}
                <Link href="/register">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">登録</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
