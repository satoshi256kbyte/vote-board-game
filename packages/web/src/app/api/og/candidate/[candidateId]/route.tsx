/**
 * OGP Image Generation for Candidate Detail
 *
 * Generates dynamic OGP images for candidate detail pages.
 * Requirements: Task 19
 */

import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

/**
 * GET /api/og/candidate/[candidateId]
 *
 * Generates OGP image for a candidate
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  try {
    const { candidateId } = await params;
    const { searchParams } = new URL(request.url);

    // Get candidate data from query params (passed from metadata)
    const position = searchParams.get('position') || 'D3';
    const voteCount = searchParams.get('votes') || '0';
    const description = searchParams.get('desc') || '';
    const username = searchParams.get('user') || 'Anonymous';

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
          次の一手候補
        </div>

        {/* Position */}
        <div
          style={{
            display: 'flex',
            fontSize: 64,
            fontWeight: 'bold',
            color: '#059669',
            marginBottom: '30px',
          }}
        >
          {position}
        </div>

        {/* Board Placeholder */}
        <div
          style={{
            display: 'flex',
            width: '350px',
            height: '350px',
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
              fontSize: 20,
              color: '#fff',
              fontWeight: 'bold',
            }}
          >
            Candidate: {candidateId.substring(0, 8)}...
          </div>
        </div>

        {/* Description */}
        {description && (
          <div
            style={{
              display: 'flex',
              fontSize: 20,
              color: '#374151',
              maxWidth: '800px',
              textAlign: 'center',
              marginBottom: '20px',
            }}
          >
            {description.substring(0, 100)}
            {description.length > 100 ? '...' : ''}
          </div>
        )}

        {/* Vote Count and Username */}
        <div
          style={{
            display: 'flex',
            gap: '30px',
            fontSize: 24,
            color: '#6b7280',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>👍</span>
            <span>{voteCount} 票</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>👤</span>
            <span>{username}</span>
          </div>
        </div>
      </div>,
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('Error generating OGP image for candidate:', error);
    return new Response('Failed to generate image', { status: 500 });
  }
}
