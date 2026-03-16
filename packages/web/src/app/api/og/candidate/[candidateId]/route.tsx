/**
 * OGP Image Generation for Candidate Detail
 *
 * Generates dynamic OGP images for candidate detail pages.
 * Fetches game and candidate data from backend API and renders
 * the board with the candidate's move position highlighted.
 *
 * Requirements: 1.2, 1.3, 1.4, 1.5, 1.6
 */

import { ImageResponse } from '@vercel/og';
import { renderOgpBoard } from '@/lib/ogp/ogp-board-renderer';
import { countDiscs, formatCandidateTitle } from '@/lib/ogp/ogp-utils';

export const runtime = 'edge';

/**
 * Parse position string (e.g., "2,3") to row and col numbers
 */
function parsePosition(position: string): { row: number; col: number } | null {
  const parts = position.split(',');
  if (parts.length !== 2) return null;
  const row = parseInt(parts[0], 10);
  const col = parseInt(parts[1], 10);
  if (isNaN(row) || isNaN(col) || row < 0 || row > 7 || col < 0 || col > 7) return null;
  return { row, col };
}

/**
 * Convert row,col position to display format (e.g., "2,3" -> "D3")
 * Column: 0-7 -> A-H, Row: 0-7 -> 1-8
 */
function positionToDisplay(position: string): string {
  const parsed = parsePosition(position);
  if (!parsed) return position;
  const colLetter = String.fromCharCode('A'.charCodeAt(0) + parsed.col);
  const rowNumber = parsed.row + 1;
  return `${colLetter}${rowNumber}`;
}

/**
 * Apply a move to the board and return the resulting board state.
 * For OGP purposes, we simply place the disc at the position.
 * The actual game logic (flipping) is handled by the backend.
 */
function applyMoveToBoard(
  board: number[][],
  row: number,
  col: number,
  currentPlayer: number
): number[][] {
  const newBoard = board.map((r) => [...r]);
  newBoard[row][col] = currentPlayer;
  return newBoard;
}

interface GameData {
  gameId: string;
  currentTurn: number;
  status: 'ACTIVE' | 'FINISHED';
  boardState: { board: number[][] };
}

interface CandidateData {
  candidateId: string;
  position: string;
  description: string;
  voteCount: number;
}

/**
 * Fetch candidate data by searching across all games
 */
async function fetchCandidateData(candidateId: string): Promise<{
  game: GameData;
  candidate: CandidateData;
} | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      console.error('[OGP Candidate] NEXT_PUBLIC_API_URL is not defined');
      return null;
    }

    // Fetch all games
    const gamesResponse = await fetch(`${apiUrl}/api/games`, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!gamesResponse.ok) {
      console.error(`[OGP Candidate] Failed to fetch games: ${gamesResponse.status}`);
      return null;
    }

    const gamesData = await gamesResponse.json();
    const games: GameData[] = gamesData.games || [];

    // Search for the candidate across all games
    for (const game of games) {
      const candidatesResponse = await fetch(
        `${apiUrl}/api/games/${game.gameId}/turns/${game.currentTurn}/candidates`,
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (!candidatesResponse.ok) continue;

      const candidatesData = await candidatesResponse.json();
      const candidates: CandidateData[] = candidatesData.candidates || [];
      const found = candidates.find((c) => c.candidateId === candidateId);

      if (found) {
        return { game, candidate: found };
      }
    }

    console.error(`[OGP Candidate] Candidate ${candidateId} not found in any game`);
    return null;
  } catch (error) {
    console.error('[OGP Candidate] Failed to fetch candidate data:', error);
    return null;
  }
}

/**
 * Render fallback image when candidate data is unavailable
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
 * GET /api/og/candidate/[candidateId]
 *
 * Generates OGP image for a candidate with actual board rendering
 * and highlighted move position.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  try {
    const { candidateId } = await params;

    const data = await fetchCandidateData(candidateId);

    if (!data) {
      return renderFallbackImage();
    }

    const { game, candidate } = data;
    const board = game.boardState.board;
    const parsed = parsePosition(candidate.position);

    // Determine current player (1=black, 2=white) based on turn
    // In Othello, black goes first (turn 0 = black)
    const currentPlayer = game.currentTurn % 2 === 0 ? 1 : 2;

    // Apply the candidate move to the board for display
    const displayBoard = parsed
      ? applyMoveToBoard(board, parsed.row, parsed.col, currentPlayer)
      : board;

    const { black, white } = countDiscs(displayBoard);
    const displayPosition = positionToDisplay(candidate.position);
    const title = formatCandidateTitle(displayPosition);

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

        {/* Board with highlighted cell */}
        {renderOgpBoard({
          boardState: displayBoard,
          highlightedCell: parsed ?? undefined,
        })}

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

    return imageResponse;
  } catch (error) {
    console.error('Error generating OGP image for candidate:', error);
    return renderFallbackImage();
  }
}
