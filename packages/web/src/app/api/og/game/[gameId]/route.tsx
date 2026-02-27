/**
 * OGP Image Generation for Game Detail
 *
 * Generates dynamic OGP images for game detail pages.
 * Requirements: Task 19
 */

import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

/**
 * GET /api/og/game/[gameId]
 *
 * Generates OGP image for a game
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const { searchParams } = new URL(request.url);

    // Get game data from query params (passed from metadata)
    const turn = searchParams.get('turn') || '1';
    const blackCount = searchParams.get('black') || '2';
    const whiteCount = searchParams.get('white') || '2';
    const status = searchParams.get('status') || 'ACTIVE';

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
        {/* Title */}
        <div
          style={{
            display: 'flex',
            fontSize: 48,
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: '20px',
          }}
        >
          投票ボードゲーム
        </div>

        {/* Game Info */}
        <div
          style={{
            display: 'flex',
            fontSize: 32,
            color: '#374151',
            marginBottom: '40px',
          }}
        >
          オセロ - ターン {turn}
        </div>

        {/* Board Placeholder */}
        <div
          style={{
            display: 'flex',
            width: '400px',
            height: '400px',
            backgroundColor: '#10b981',
            border: '4px solid #000',
            borderRadius: '8px',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '30px',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 24,
              color: '#fff',
              fontWeight: 'bold',
            }}
          >
            Game ID: {gameId.substring(0, 8)}...
          </div>
        </div>

        {/* Disc Counts */}
        <div
          style={{
            display: 'flex',
            gap: '40px',
            fontSize: 28,
            color: '#374151',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                backgroundColor: '#000',
              }}
            />
            <span>{blackCount}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                backgroundColor: '#fff',
                border: '2px solid #d1d5db',
              }}
            />
            <span>{whiteCount}</span>
          </div>
        </div>

        {/* Status */}
        {status === 'FINISHED' && (
          <div
            style={{
              display: 'flex',
              marginTop: '20px',
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
  } catch (error) {
    console.error('Error generating OGP image for game:', error);
    return new Response('Failed to generate image', { status: 500 });
  }
}
