/**
 * API client for game commentary
 *
 * Provides functions to fetch AI-generated commentary for games.
 */

import { ApiError } from './client';

/**
 * Commentary data type
 */
export interface Commentary {
  turnNumber: number;
  content: string;
  generatedBy: string;
  createdAt: string;
}

/**
 * API response type for commentary endpoint
 */
interface CommentaryApiResponse {
  commentaries: Array<{
    turnNumber: number;
    content: string;
    generatedBy: string;
    createdAt: string;
  }>;
}

/**
 * Get the API base URL from environment variables
 */
function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;

  if (!url || url.trim() === '') {
    if (process.env.NODE_ENV === 'development') {
      return 'http://localhost:3001';
    }

    const errorMsg =
      'NEXT_PUBLIC_API_URL is not defined. Please ensure the environment variable is set correctly.';
    console.error('[getApiBaseUrl] Error:', errorMsg);
    throw new Error(errorMsg);
  }

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
 * Fetch commentaries for a specific game
 *
 * @param gameId - The game ID (UUID v4)
 * @returns Promise with array of commentaries
 *
 * @throws {ApiError} When an error other than 404 occurs
 *
 * @example
 * ```typescript
 * const commentaries = await getCommentaries('123e4567-e89b-12d3-a456-426614174000');
 * commentaries.forEach(c => {
 *   console.log(`Turn ${c.turnNumber}: ${c.content}`);
 * });
 * ```
 */
export async function getCommentaries(gameId: string): Promise<Commentary[]> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/games/${gameId}/commentary`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (response.status === 404) {
      return [];
    }

    const data = await handleResponse<CommentaryApiResponse>(response);
    return data.commentaries;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error instanceof Error ? error.message : '解説の取得に失敗しました', 0);
  }
}
