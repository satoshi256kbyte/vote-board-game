/**
 * OGP Image Generation for Specific Turn
 *
 * Generates dynamic OGP images for specific turn pages.
 * Fetches turn data from backend API and renders the board state at that turn.
 *
 * Requirements: 2.1, 2.2, 2.3, 7.4
 */

import { ImageResponse } from '@vercel/og';
import { renderOgpBoard } from '@/lib/ogp/ogp-board-renderer';
import { countDiscs, formatGameTitle, getCacheControlHeader } from '@/lib/ogp/ogp-utils';

export const runtime = 'edge';

/**
 * Fetch turn data from backend API
 */
async function fetchTurnData(
  gameId: string,
  turnNumber: string
): Promise<{
  gameId: string;
  turnNumber: number;
  boardState: { board: number[][] };
  currentPlayer: 'BLACK' | 'WHITE';
} | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      console.error('[OGP Turn] NEXT_PUBLIC_API_URL is not defined');
      return null;
    }

    const response = await fetch(`${apiUrl}/api/games/${gameId}/turns/${turnNumber}`, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.error(
        `[OGP Turn] API returned ${response.status} for game ${gameId} turn ${turnNumber}`
      );
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[OGP Turn] Failed to fetch turn data:', error);
    return null;
  }
}

/**
 * Render fallback image when turn data is unavailable
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
 * GET /api/og/game/[gameId]/turn/[turnNumber]
 *
 * Generates OGP image for a specific turn with actual board rendering.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ gameId: string; turnNumber: string }> }
) {
  try {
    const { gameId, turnNumber } = await params;

    const turnData = await fetchTurnData(gameId, turnNumber);

    if (!turnData) {
      return renderFallbackImage();
    }

    const board = turnData.boardState.board;
    const { black, white } = countDiscs(board);
    const title = formatGameTitle(turnData.turnNumber);
    const cacheControl = getCacheControlHeader('TURN');

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
      </div>,
      {
        width: 1200,
        height: 630,
      }
    );

    imageResponse.headers.set('Cache-Control', cacheControl);

    return imageResponse;
  } catch (error) {
    console.error('Error generating OGP image for turn:', error);
    return renderFallbackImage();
  }
}
