/**
 * Turn Detail Page
 *
 * Displays the board state at a specific turn with OGP metadata.
 * Server Component that fetches turn data from the backend API.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 3.6
 */

import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Board } from '@/components/board';
import { ShareButton } from '@/components/share-button';
import { formatGameTitle, buildOgpImageUrl, countDiscs } from '@/lib/ogp/ogp-utils';
import type { BoardState } from '@/types/game';
import type { Metadata } from 'next';

interface TurnDetailPageProps {
  params: Promise<{
    gameId: string;
    turnNumber: string;
  }>;
}

/**
 * Fetch turn data from backend API.
 */
async function fetchTurnData(
  gameId: string,
  turnNumber: string
): Promise<{
  gameId: string;
  turnNumber: number;
  boardState: BoardState;
  currentPlayer: 'BLACK' | 'WHITE';
} | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      console.error('[TurnDetailPage] NEXT_PUBLIC_API_URL is not defined');
      return null;
    }

    const response = await fetch(`${apiUrl}/api/games/${gameId}/turns/${turnNumber}`, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.error(
        `[TurnDetailPage] API returned ${response.status} for game ${gameId} turn ${turnNumber}`
      );
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[TurnDetailPage] Failed to fetch turn data:', error);
    return null;
  }
}

/**
 * Generate metadata for OGP/Twitter Card.
 */
export async function generateMetadata({ params }: TurnDetailPageProps): Promise<Metadata> {
  const { gameId, turnNumber } = await params;

  const turnData = await fetchTurnData(gameId, turnNumber);

  if (!turnData) {
    return {
      title: 'ターン詳細 - 投票対局',
    };
  }

  const title = formatGameTitle(Number(turnNumber));
  const description = `ターン${turnNumber}の盤面`;
  const ogImageUrl = buildOgpImageUrl(`/api/og/game/${gameId}/turn/${turnNumber}`);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: ogImageUrl,
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
      images: [ogImageUrl],
    },
  };
}

export default async function TurnDetailPage({ params }: TurnDetailPageProps) {
  const { gameId, turnNumber } = await params;

  const turnData = await fetchTurnData(gameId, turnNumber);

  if (!turnData) {
    notFound();
  }

  const { black: blackCount, white: whiteCount } = countDiscs(turnData.boardState.board);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/games/${gameId}`}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-4 inline-block"
          >
            ← 対局詳細に戻る
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {formatGameTitle(Number(turnNumber))}
          </h1>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Board */}
          <div className="bg-gray-100 p-8">
            <div className="flex justify-center">
              <Board boardState={turnData.boardState} cellSize={40} />
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

          {/* Turn Info & Share */}
          <div className="p-8 space-y-6">
            <div>
              <p className="text-gray-700">ターン{turnNumber}の盤面</p>
            </div>

            <ShareButton
              title={formatGameTitle(Number(turnNumber))}
              text={`ターン${turnNumber}の盤面`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
