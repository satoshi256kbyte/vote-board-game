/**
 * API client for voting operations
 *
 * Provides functions to create and change votes for move candidates.
 * Implements error handling for authentication, validation, and business logic errors.
 */

import { ApiError } from './client';
import { storageService } from '@/lib/services/storage-service';

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
 * Create a vote for a move candidate
 *
 * @param gameId - The game ID (UUID v4)
 * @param turnNumber - The turn number (non-negative integer)
 * @param candidateId - The candidate ID (UUID v4)
 * @returns Promise that resolves when vote is created
 *
 * @throws {ApiError} When authentication fails (401), already voted (409), voting closed (400), or other errors occur
 *
 * @example
 * ```typescript
 * try {
 *   await createVote('123e4567-e89b-12d3-a456-426614174000', 5, '987fcdeb-51a2-43f1-b456-426614174111');
 *   console.log('投票が完了しました');
 * } catch (error) {
 *   if (error instanceof ApiError) {
 *     if (error.statusCode === 401) {
 *       console.error('認証が必要です。ログインしてください。');
 *     } else if (error.statusCode === 409) {
 *       console.error('既に投票済みです');
 *     } else if (error.statusCode === 400 && error.errorCode === 'VOTING_CLOSED') {
 *       console.error('投票期間が終了しています');
 *     }
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
    throw new ApiError('認証が必要です。ログインしてください。', 401);
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
      // Handle specific error cases
      if (response.status === 401) {
        throw new ApiError('認証が必要です。ログインしてください。', 401);
      }

      if (response.status === 409) {
        throw new ApiError('既に投票済みです', 409, 'ALREADY_VOTED');
      }

      if (response.status === 400) {
        let errorData: { error?: string; message?: string };
        try {
          errorData = await response.json();
          if (errorData.error === 'VOTING_CLOSED') {
            throw new ApiError('投票期間が終了しています', 400, 'VOTING_CLOSED');
          }
          throw new ApiError(errorData.message || '投票に失敗しました', 400, errorData.error);
        } catch (parseError) {
          if (parseError instanceof ApiError) {
            throw parseError;
          }
          throw new ApiError('投票に失敗しました', 400);
        }
      }

      if (response.status === 500) {
        throw new ApiError('投票に失敗しました。もう一度お試しください。', 500);
      }

      // Generic error for other status codes
      throw new ApiError('投票に失敗しました。もう一度お試しください。', response.status);
    }

    // Success - no response body expected for 201 Created
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network error or other unexpected errors
    throw new ApiError('ネットワークエラーが発生しました', 0);
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
 * @throws {ApiError} When authentication fails (401), not voted yet (409), same candidate (400), voting closed (400), or other errors occur
 *
 * @example
 * ```typescript
 * try {
 *   await changeVote('123e4567-e89b-12d3-a456-426614174000', 5, '987fcdeb-51a2-43f1-b456-426614174222');
 *   console.log('投票を変更しました');
 * } catch (error) {
 *   if (error instanceof ApiError) {
 *     if (error.statusCode === 401) {
 *       console.error('認証が必要です。ログインしてください。');
 *     } else if (error.statusCode === 409 && error.errorCode === 'NOT_VOTED') {
 *       console.error('まだ投票していません');
 *     } else if (error.statusCode === 400 && error.errorCode === 'SAME_CANDIDATE') {
 *       console.error('既にこの候補に投票しています');
 *     }
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
    throw new ApiError('認証が必要です。ログインしてください。', 401);
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
      // Handle specific error cases
      if (response.status === 401) {
        throw new ApiError('認証が必要です。ログインしてください。', 401);
      }

      if (response.status === 409) {
        let errorData: { error?: string; message?: string };
        try {
          errorData = await response.json();
          if (errorData.error === 'NOT_VOTED') {
            throw new ApiError('まだ投票していません', 409, 'NOT_VOTED');
          }
          throw new ApiError(errorData.message || '投票の変更に失敗しました', 409, errorData.error);
        } catch (parseError) {
          if (parseError instanceof ApiError) {
            throw parseError;
          }
          throw new ApiError('投票の変更に失敗しました', 409);
        }
      }

      if (response.status === 400) {
        let errorData: { error?: string; message?: string };
        try {
          errorData = await response.json();
          if (errorData.error === 'SAME_CANDIDATE') {
            throw new ApiError('既にこの候補に投票しています', 400, 'SAME_CANDIDATE');
          }
          if (errorData.error === 'VOTING_CLOSED') {
            throw new ApiError('投票期間が終了しています', 400, 'VOTING_CLOSED');
          }
          throw new ApiError(errorData.message || '投票の変更に失敗しました', 400, errorData.error);
        } catch (parseError) {
          if (parseError instanceof ApiError) {
            throw parseError;
          }
          throw new ApiError('投票の変更に失敗しました', 400);
        }
      }

      if (response.status === 500) {
        throw new ApiError('投票に失敗しました。もう一度お試しください。', 500);
      }

      // Generic error for other status codes
      throw new ApiError('投票の変更に失敗しました。もう一度お試しください。', response.status);
    }

    // Success - no response body expected for 200 OK
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network error or other unexpected errors
    throw new ApiError('ネットワークエラーが発生しました', 0);
  }
}
