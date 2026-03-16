/**
 * Game Detail Layout
 *
 * Provides generateMetadata for the game detail page.
 * Since the page.tsx is a Client Component ('use client'),
 * metadata generation is placed in layout.tsx to enable server-side metadata.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

import type { Metadata } from 'next';
import { formatGameTitle, formatGameDescription, buildOgpImageUrl } from '@/lib/ogp/ogp-utils';

interface GameLayoutProps {
  children: React.ReactNode;
  params: Promise<{ gameId: string }>;
}

/**
 * Fetch game data from backend API for metadata generation.
 */
async function fetchGameForMetadata(gameId: string): Promise<{
  currentTurn: number;
  status: 'ACTIVE' | 'FINISHED';
} | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      console.error('[GameLayout] NEXT_PUBLIC_API_URL is not defined');
      return null;
    }

    const response = await fetch(`${apiUrl}/api/games/${gameId}`, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.error(`[GameLayout] API returned ${response.status} for game ${gameId}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[GameLayout] Failed to fetch game data:', error);
    return null;
  }
}

/**
 * Generate metadata for the game detail page.
 * Fetches game data from backend API and sets OGP/Twitter Card meta tags.
 */
export async function generateMetadata({ params }: GameLayoutProps): Promise<Metadata> {
  const { gameId } = await params;

  const gameData = await fetchGameForMetadata(gameId);

  if (!gameData) {
    return {
      title: '対局詳細 - 投票対局',
    };
  }

  const title = formatGameTitle(gameData.currentTurn);
  const description = formatGameDescription(gameData.status);
  const ogImageUrl = buildOgpImageUrl(`/api/og/game/${gameId}`);

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

export default function GameLayout({ children }: GameLayoutProps) {
  return <>{children}</>;
}
