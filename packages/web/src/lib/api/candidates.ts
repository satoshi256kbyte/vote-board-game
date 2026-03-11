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
 * Raw candidate response from the API
 * (GET /api/games/:gameId/turns/:turnNumber/candidates)
 */
interface CandidateApiResponse {
  candidateId: string;
  position: string;
  description: string;
  voteCount: number;
  createdBy: string;
  status: string;
  votingDeadline: string;
  createdAt: string;
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
 * Create candidate response interface
 * Response structure from POST /api/games/:gameId/turns/:turnNumber/candidates
 */
export interface CreateCandidateResponse {
  candidateId: string;
  gameId: string;
  turnNumber: number;
  position: string;
  description: string;
  voteCount: number;
  createdBy: string;
  status: 'VOTING';
  votingDeadline: string;
  createdAt: string;
}

/**
 * Map a raw API candidate response to the frontend Candidate type
 */
function mapCandidate(
  c: CandidateApiResponse,
  gameId: string,
  turnNumber: number
): Candidate {
  return {
    id: c.candidateId,
    gameId,
    turnNumber,
    position: c.position,
    description: c.description,
    // The API does not return boardState; components must handle an empty array gracefully
    boardState: [],
    voteCount: c.voteCount,
    postedBy: c.createdBy,
    postedByUsername: c.createdBy.startsWith('USER#')
      ? c.createdBy.replace('USER#', '')
      : 'AI',
    status: c.status === 'VOTING' ? 'active' : 'closed',
    deadline: c.votingDeadline,
    createdAt: c.createdAt,
    source: c.createdBy === 'AI' ? 'ai' : 'user',
  };
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

    const data = await handleResponse<{ candidates: CandidateApiResponse[] }>(response);
    return data.candidates.map((c) => mapCandidate(c, gameId, turnNumber));
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
        // 404 can mean either game not found or user hasn't voted yet.
        // The API returns { error: 'NOT_FOUND', message: 'Vote not found' } for no vote.
        // We also handle the legacy Japanese message for backward compatibility.
        let errorData: { error?: string; message?: string };
        try {
          errorData = await response.json();
          if (
            errorData.message?.includes('投票が見つかりません') ||
            errorData.message?.includes('Vote not found') ||
            errorData.error === 'NOT_FOUND'
          ) {
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

/**
 * Create a new move candidate
 *
 * @param gameId - The game ID (UUID v4)
 * @param turnNumber - The turn number (non-negative integer)
 * @param position - The position in "row,col" format (e.g., "2,3")
 * @param description - The description (1-200 characters)
 * @returns Promise with created candidate response
 *
 * @throws {ApiError} When authentication fails (401), validation fails (400), conflict occurs (409), or other errors occur
 *
 * @example
 * ```typescript
 * try {
 *   const candidate = await createCandidate(
 *     '123e4567-e89b-12d3-a456-426614174000',
 *     5,
 *     '2,3',
 *     'この手で中央を制圧できます'
 *   );
 *   console.log(`候補を投稿しました: ${candidate.candidateId}`);
 * } catch (error) {
 *   if (error instanceof ApiError) {
 *     if (error.statusCode === 401) {
 *       console.error('認証が必要です');
 *     } else if (error.statusCode === 409) {
 *       console.error('この位置の候補は既に存在します');
 *     } else if (error.statusCode === 400 && error.code === 'INVALID_MOVE') {
 *       console.error('この位置には石を置けません');
 *     } else if (error.statusCode === 400 && error.code === 'VOTING_CLOSED') {
 *       console.error('投票期間が終了しています');
 *     }
 *   }
 * }
 * ```
 */
export async function createCandidate(
  gameId: string,
  turnNumber: number,
  position: string,
  description: string
): Promise<CreateCandidateResponse> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/games/${gameId}/turns/${turnNumber}/candidates`;

  // Get authentication token
  const token = getAuthToken();
  if (!token) {
    throw new ApiError('認証が必要です', 401);
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        position,
        description,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new ApiError('認証が必要です', 401);
      }
      if (response.status === 409) {
        throw new ApiError('この位置の候補は既に存在します', 409, 'CONFLICT');
      }
      if (response.status === 400) {
        let errorData: { error?: string; message?: string };
        try {
          errorData = await response.json();
          throw new ApiError(errorData.message || '候補の投稿に失敗しました', 400, errorData.error);
        } catch (parseError) {
          if (parseError instanceof ApiError) {
            throw parseError;
          }
          throw new ApiError('候補の投稿に失敗しました', 400);
        }
      }
      throw new ApiError('候補の投稿に失敗しました', response.status);
    }

    return await handleResponse<CreateCandidateResponse>(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error instanceof Error ? error.message : '候補の投稿に失敗しました', 0);
  }
}

/**
 * Create a vote for a move candidate
 *
 * @param gameId - The game ID (UUID v4)
 * @param turnNumber - The turn number (non-negative integer)
 * @param candidateId - The candidate ID (UUID v4)
 * @returns Promise that resolves when vote is created
 *
 * @throws {ApiError} When authentication fails (401), validation fails (400), or other errors occur
 *
 * @example
 * ```typescript
 * try {
 *   await createVote('123e4567-e89b-12d3-a456-426614174000', 5, '987fcdeb-51a2-43f1-b456-426614174111');
 *   console.log('投票が完了しました');
 * } catch (error) {
 *   if (error instanceof ApiError && error.statusCode === 401) {
 *     console.error('認証が必要です');
 *     // Redirect to login
 *   } else {
 *     console.error('投票に失敗しました');
 *   }
 * }
 * ```
 */
export async function createVote(
  gameId: string,
  turnNumber: number,
  candidateId: string
): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/games/${gameId}/turns/${turnNumber}/votes`;

  // Get authentication token
  const token = getAuthToken();
  if (!token) {
    throw new ApiError('認証が必要です', 401);
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        candidateId,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new ApiError('認証が必要です', 401);
      }
      if (response.status === 400) {
        let errorData: { error?: string; message?: string };
        try {
          errorData = await response.json();
          throw new ApiError(errorData.message || '投票に失敗しました', 400);
        } catch (parseError) {
          if (parseError instanceof ApiError) {
            throw parseError;
          }
          throw new ApiError('投票に失敗しました', 400);
        }
      }
      if (response.status === 409) {
        let errorData: { error?: string; message?: string };
        try {
          errorData = await response.json();
          throw new ApiError(errorData.message || '投票に失敗しました', 409);
        } catch (parseError) {
          if (parseError instanceof ApiError) {
            throw parseError;
          }
          throw new ApiError('投票に失敗しました', 409);
        }
      }
      throw new ApiError('投票に失敗しました', response.status);
    }

    // Success - no response body expected for 201 Created
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error instanceof Error ? error.message : '投票に失敗しました', 0);
  }
}

/**
 * Change vote to a different move candidate
 *
 * @param gameId - The game ID (UUID v4)
 * @param turnNumber - The turn number (non-negative integer)
 * @param candidateId - The new candidate ID to vote for (UUID v4)
 * @returns Promise that resolves when vote is changed
 *
 * @throws {ApiError} When authentication fails (401), validation fails (400), or other errors occur
 *
 * @example
 * ```typescript
 * try {
 *   await changeVote('123e4567-e89b-12d3-a456-426614174000', 5, '987fcdeb-51a2-43f1-b456-426614174222');
 *   console.log('投票を変更しました');
 * } catch (error) {
 *   if (error instanceof ApiError && error.statusCode === 401) {
 *     console.error('認証が必要です');
 *     // Redirect to login
 *   } else {
 *     console.error('投票の変更に失敗しました');
 *   }
 * }
 * ```
 */
export async function changeVote(
  gameId: string,
  turnNumber: number,
  candidateId: string
): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/games/${gameId}/turns/${turnNumber}/votes/me`;

  // Get authentication token
  const token = getAuthToken();
  if (!token) {
    throw new ApiError('認証が必要です', 401);
  }

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        candidateId,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new ApiError('認証が必要です', 401);
      }
      if (response.status === 400) {
        let errorData: { error?: string; message?: string };
        try {
          errorData = await response.json();
          throw new ApiError(errorData.message || '投票の変更に失敗しました', 400);
        } catch (parseError) {
          if (parseError instanceof ApiError) {
            throw parseError;
          }
          throw new ApiError('投票の変更に失敗しました', 400);
        }
      }
      throw new ApiError('投票の変更に失敗しました', response.status);
    }

    // Success - no response body expected for 200 OK
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error instanceof Error ? error.message : '投票の変更に失敗しました', 0);
  }
}
