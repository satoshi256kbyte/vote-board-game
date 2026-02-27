/**
 * Candidate Detail Screen
 *
 * Displays candidate details with board preview and voting functionality.
 * Server Component that fetches candidate data.
 *
 * Requirements: Task 12, Task 19 (OGP metadata)
 */

import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { fetchGame, fetchCandidates, ApiError } from '@/lib/api/client';
import { Board } from '@/components/board';
import { ShareButton } from '@/components/share-button';
import type { Metadata } from 'next';

interface CandidateDetailPageProps {
  params: Promise<{
    gameId: string;
    candidateId: string;
  }>;
}

/**
 * Generate metadata for OGP
 */
export async function generateMetadata({ params }: CandidateDetailPageProps): Promise<Metadata> {
  const { gameId, candidateId } = await params;

  try {
    const candidates = await fetchCandidates(gameId);
    const candidate = candidates.find((c) => c.candidateId === candidateId);

    if (!candidate) {
      return {
        title: '候補が見つかりません - 投票ボードゲーム',
        description: '指定された候補が見つかりませんでした。',
      };
    }

    const title = `次の一手候補: ${candidate.position}`;
    const description = candidate.description || `${candidate.username}さんの候補`;

    // Generate OGP image URL with query parameters
    const ogImageUrl = new URL(
      `/api/og/candidate/${candidateId}`,
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    );
    ogImageUrl.searchParams.set('position', candidate.position);
    ogImageUrl.searchParams.set('votes', candidate.voteCount.toString());
    ogImageUrl.searchParams.set('user', candidate.username);
    if (candidate.description) {
      ogImageUrl.searchParams.set('desc', candidate.description.substring(0, 100));
    }

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [
          {
            url: ogImageUrl.toString(),
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImageUrl.toString()],
      },
    };
  } catch {
    // Fallback metadata if fetch fails
    return {
      title: '候補詳細 - 投票ボードゲーム',
      description: '次の一手候補の詳細を見る',
    };
  }
}

export default async function CandidateDetailPage({ params }: CandidateDetailPageProps) {
  const { gameId, candidateId } = await params;
  let game;
  let candidates;

  try {
    [game, candidates] = await Promise.all([fetchGame(gameId), fetchCandidates(gameId)]);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) {
      notFound();
    }
    throw error;
  }

  // Find the specific candidate
  const candidate = candidates.find((c) => c.candidateId === candidateId);

  if (!candidate) {
    notFound();
  }

  // Calculate disc counts after candidate move
  const blackCount = candidate.resultingBoardState.board.flat().filter((cell) => cell === 1).length;
  const whiteCount = candidate.resultingBoardState.board.flat().filter((cell) => cell === 2).length;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/games/${gameId}`}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-4 inline-block"
          >
            ← 対局詳細に戻る
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">候補の詳細</h1>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Board Preview */}
          <div className="bg-gray-100 p-8">
            <div className="flex justify-center">
              <Board boardState={candidate.resultingBoardState} cellSize={40} />
            </div>

            {/* Disc Counts */}
            <div className="flex justify-center gap-8 mt-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-black" />
                <span className="text-xl font-semibold">{blackCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white border-2 border-gray-300" />
                <span className="text-xl font-semibold">{whiteCount}</span>
              </div>
            </div>
          </div>

          {/* Candidate Information */}
          <div className="p-8 space-y-6">
            {/* Move Position */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{candidate.position}</h2>
              <p className="text-sm text-gray-500">投稿者: {candidate.username}</p>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">説明</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{candidate.description}</p>
            </div>

            {/* Vote Count */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
              <span className="text-gray-700 font-medium">投票数</span>
              <span className="text-2xl font-bold text-blue-600">{candidate.voteCount}票</span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-medium"
                onClick={() => {
                  // TODO: Implement vote functionality
                  console.log('Vote for:', candidate.candidateId);
                }}
              >
                投票する
              </button>
              <ShareButton
                title={`候補: ${candidate.position}`}
                text={candidate.description}
                variant="secondary"
                size="lg"
              />
            </div>
          </div>
        </div>

        {/* Related Information */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">対局情報</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              対局ID: <span className="font-mono">{game.gameId.slice(0, 8)}</span>
            </p>
            <p>現在のターン: {game.currentTurn}</p>
            <p>ステータス: {game.status === 'ACTIVE' ? '進行中' : '終了'}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
