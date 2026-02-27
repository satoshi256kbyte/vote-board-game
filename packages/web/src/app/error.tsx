/**
 * Global Error Boundary
 */

'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console for debugging
    console.error('Global error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <main className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md mx-auto px-4 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">エラーが発生しました</h1>
            <p className="text-gray-600 mb-8">
              予期しないエラーが発生しました。ページを再読み込みしてください。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={reset}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                再試行
              </button>
              <Link
                href="/"
                className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                ホームに戻る
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
