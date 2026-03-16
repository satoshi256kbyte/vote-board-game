/**
 * OGP Image Generation for Game Detail
 *
 * Generates dynamic OGP images for game detail pages.
 * Fetches game data from backend API and renders actual board state.
 *
 * Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 1.7, 7.1, 7.2, 7.3
 */

import { ImageResponse } from '@vercel/og';
import { renderOgpBoard } from '@/lib/ogp/ogp-board-renderer';
import { countDiscs, formatGameTitle, getCacheControlHeader } from '@/lib/ogp/ogp-utils';

export const runtime = 'edge';

/**
 * Fetch game data from backend API
 */
async function fetchGameData(gameId: string): Promise<{
  currentTurn: number;
  status: 'ACTIVE' | 'FINISHED';
  boardState: { board: number[][] };
} | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      console.error('[OGP Game] NEXT_PUBLIC_API_URL is not defined');
      return null;
    }

    const response = await fetch(`${apiUrl}/api/games/${gameId}`, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.error(`[OGP Game] API returned ${response.status} for game ${gameId}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[OGP Game] Failed to fetch game data:', error);
    return null;
  }
}

/**
 * Render fallback image when game data is unavailable
 */
function renderFallbackImage(): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        backgroundColor: '#f3f4f6',
        padding: '40px',
      }}
    >
      <div
        style={{
          display: 'flex',
          fontSize: 48,
          fontWeight: 'bold',
          color: '#111827',
          marginBottom: '20px',
        }}
      >
        投票対局
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: 28,
          color: '#6b7280',
        }}
      >
        データを取得できませんでした
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
    }
  );
}

/**
 * GET /api/og/game/[gameId]
 *
 * Generates OGP image for a game with actual board rendering.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ gameId: string }> }) {
  try {
    const { gameId } = await params;

    const gameData = await fetchGameData(gameId);

    if (!gameData) {
      return renderFallbackImage();
    }

    const { currentTurn, status, boardState } = gameData;
    const board = boardState.board;
    const { black, white } = countDiscs(board);
    const title = formatGameTitle(currentTurn);
    const cacheControl = getCacheControlHeader(status);

    const imageResponse = new ImageResponse(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: '#f3f4f6',
          padding: '40px',
        }}
      >
        {/* Title */}
        <div
          style={{
            display: 'flex',
            fontSize: 42,
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: '20px',
          }}
        >
          {title}
        </div>

        {/* Board */}
        {renderOgpBoard({ boardState: board })}

        {/* Disc Counts */}
        <div
          style={{
            display: 'flex',
            gap: '40px',
            fontSize: 28,
            color: '#374151',
            marginTop: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                display: 'flex',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                backgroundColor: '#000',
              }}
            />
            <span>{black}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                display: 'flex',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                backgroundColor: '#fff',
                border: '2px solid #d1d5db',
              }}
            />
            <span>{white}</span>
          </div>
        </div>

        {/* Status */}
        {status === 'FINISHED' && (
          <div
            style={{
              display: 'flex',
              marginTop: '16px',
              fontSize: 24,
              color: '#dc2626',
              fontWeight: 'bold',
            }}
          >
            対局終了
          </div>
        )}
      </div>,
      {
        width: 1200,
        height: 630,
      }
    );

    imageResponse.headers.set('Cache-Control', cacheControl);

    return imageResponse;
  } catch (error) {
    console.error('Error generating OGP image for game:', error);
    return renderFallbackImage();
  }
}
