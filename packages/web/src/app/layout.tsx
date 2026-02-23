import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/contexts/auth-context';

export const metadata: Metadata = {
  title: '投票ボードゲーム',
  description: 'AI vs 集合知で次の一手を決める投票型ボードゲーム',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
