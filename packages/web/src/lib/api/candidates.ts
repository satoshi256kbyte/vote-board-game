/**
 * API client for move candidates
 *
 * Provides functions to fetch and manage move candidates for games.
 */

import { ApiError } from './client';
import { storageService } from '@/lib/services/storage-service';

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
 * Vote status interface matching the design specification
 */
export interface VoteStatus {
  gameId: string;
  turnNumber: number;
  userId: string;
  candidateId: string;
  createdAt: string;
  updatedAt: string;
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

/**
 * Get authentication token from storage
 * Returns null if no token is available (e.g., user not logged in)
 */
function getAuthToken(): string | null {
  try {
    return storageService.getAccessToken();
  } catch (error) {
    console.warn('[getAuthToken] Failed to retrieve token:', error);
    return null;
  }
}

/**
 * Fetch vote status for the authenticated user
 *
 * @param gameId - The game ID (UUID v4)
 * @param turnNumber - The turn number (non-negative integer)
 * @returns Promise with vote status or null if user hasn't voted
 *
 * @throws {ApiError} When authentication fails (401), game is not found (404), or other errors occur
 *
 * @example
 * ```typescript
 * try {
 *   const voteStatus = await getVoteStatus('123e4567-e89b-12d3-a456-426614174000', 5);
 *   if (voteStatus) {
 *     console.log(`Voted for candidate: ${voteStatus.candidateId}`);
 *   } else {
 *     console.log('User has not voted yet');
 *   }
 * } catch (error) {
 *   if (error instanceof ApiError && error.statusCode === 401) {
 *     console.error('認証が必要です');
 *     // Redirect to login
 *   }
 * }
 * ```
 */
export async function getVoteStatus(
  gameId: string,
  turnNumber: number
): Promise<VoteStatus | null> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/games/${gameId}/turns/${turnNumber}/votes/me`;

  // Get authentication token
  const token = getAuthToken();
  if (!token) {
    throw new ApiError('認証が必要です', 401);
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store', // Always fetch fresh data
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new ApiError('認証が必要です', 401);
      }
      if (response.status === 404) {
        // 404 can mean either game not found or user hasn't voted yet
        // Check the error message to distinguish
        let errorData: { error?: string; message?: string };
        try {
          errorData = await response.json();
          if (errorData.message?.includes('投票が見つかりません')) {
            // User hasn't voted yet - return null
            return null;
          }
        } catch {
          // If we can't parse the error, assume it's a not found error
          return null;
        }
        throw new ApiError('対局が見つかりません', 404);
      }
      throw new ApiError('投票状況の取得に失敗しました', response.status);
    }

    const data = await handleResponse<VoteStatus>(response);
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error instanceof Error ? error.message : '投票状況の取得に失敗しました', 0);
  }
}
