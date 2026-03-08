/**
 * API client for move candidates
 *
 * Provides functions to fetch and manage move candidates for games.
 */

import { ApiError } from './client';

/**
 * Candidate interface matching the design specification
 */
export interface Candidate {
  id: string;
  gameId: string;
  turnNumber: number;
  position: string;
  description: string;
  boardState: string[][];
  voteCount: number;
  postedBy: string;
  postedByUsername: string;
  status: 'active' | 'closed';
  deadline: string;
  createdAt: string;
  source: 'ai' | 'user';
}

/**
 * Get the API base URL from environment variables
 */
function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;

  if (!url) {
    // Development fallback
    if (process.env.NODE_ENV === 'development') {
      return 'http://localhost:3001';
    }

    const errorMsg =
      'NEXT_PUBLIC_API_URL is not defined. Please ensure the environment variable is set correctly.';
    console.error('[getApiBaseUrl] Error:', errorMsg);
    throw new Error(errorMsg);
  }

  // Validate URL format
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    const errorMsg = `NEXT_PUBLIC_API_URL has invalid format: "${url}". URL must start with http:// or https://`;
    console.error('[getApiBaseUrl] Error:', errorMsg);
    throw new Error(errorMsg);
  }

  return url;
}

/**
 * Handle API response and errors
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: { error?: string; message?: string; details?: Record<string, unknown> };

    try {
      errorData = await response.json();
    } catch {
      // If response is not JSON, use status text
      throw new ApiError(response.statusText || 'Unknown error', response.status);
    }

    throw new ApiError(
      errorData.message || 'API request failed',
      response.status,
      errorData.error,
      errorData.details
    );
  }

  return response.json();
}

/**
 * Fetch move candidates for a specific game and turn
 *
 * @param gameId - The game ID (UUID v4)
 * @param turnNumber - The turn number (non-negative integer)
 * @returns Promise with array of candidates
 *
 * @throws {ApiError} When game is not found (404) or other errors occur
 *
 * @example
 * ```typescript
 * try {
 *   const candidates = await getCandidates('123e4567-e89b-12d3-a456-426614174000', 5);
 *   candidates.forEach(candidate => {
 *     console.log(`${candidate.position}: ${candidate.voteCount} votes`);
 *   });
 * } catch (error) {
 *   if (error instanceof ApiError && error.statusCode === 404) {
 *     console.error('対局が見つかりません');
 *   }
 * }
 * ```
 */
export async function getCandidates(gameId: string, turnNumber: number): Promise<Candidate[]> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/games/${gameId}/turns/${turnNumber}/candidates`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Always fetch fresh data
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new ApiError('対局が見つかりません', 404);
      }
      throw new ApiError('候補の取得に失敗しました', response.status);
    }

    const data = await handleResponse<{ candidates: Candidate[] }>(response);
    return data.candidates;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error instanceof Error ? error.message : '候補の取得に失敗しました', 0);
  }
}
