/**
 * Not Found Page for Game Detail
 *
 * Displays a 404 error message when a game is not found.
 * This page is shown when notFound() is called in the game detail page.
 *
 * Requirements: Task 2.5 - 404 Error Handling
 */

import Link from 'next/link';

export default function GameNotFound() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">対局が見つかりません</h1>
        <p className="text-gray-600 mb-8">
          指定された対局は存在しないか、削除された可能性があります。
        </p>
        <Link
          href="/"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          対局一覧に戻る
        </Link>
      </div>
    </main>
  );
}
