import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/contexts/auth-context';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

export const metadata: Metadata = {
  title: '投票対局',
  description: 'AI vs 集合知で次の一手を決める投票型ボードゲーム',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="flex flex-col min-h-screen">
        <AuthProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
