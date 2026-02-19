import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '投票ボードゲーム',
  description: 'AI vs 集合知で次の一手を決める投票型ボードゲーム',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
