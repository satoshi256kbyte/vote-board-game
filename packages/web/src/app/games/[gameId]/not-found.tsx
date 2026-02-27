/**
 * Not Found Page for Game Detail
 *
 * Displayed when a game is not found (404 error).
 */

import Link from 'next/link';

export default function GameNotFound() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">対局が見つかりません</h1>
        <p className="text-gray-600 mb-8">
          指定された対局は存在しないか、削除された可能性があります。
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          対局一覧に戻る
        </Link>
      </div>
    </main>
  );
}
