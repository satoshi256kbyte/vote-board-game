/**
 * Type-safe API client for Game API
 *
 * Provides functions to communicate with the Game API endpoints.
 * All functions include proper error handling and TypeScript types.
 */

import type {
  Game,
  GetGamesQuery,
  GetGamesResponse,
  CreateGameRequest,
  Candidate,
  CreateCandidateRequest,
} from '@/types/game';

/**
 * API client error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode?: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
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
    throw new Error('NEXT_PUBLIC_API_URL is not defined');
  }
  return url;
}

/**
 * Handle API response and errors
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: { error?: string; message?: string; details?: Record<string, unknown> } = {};

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
 * Fetch games list
 *
 * @param query - Query parameters for filtering and pagination
 * @returns Promise with games list and optional next cursor
 *
 * @example
 * ```typescript
 * // Get active games
 * const { games, nextCursor } = await fetchGames({ status: 'ACTIVE' });
 *
 * // Get finished games with pagination
 * const result = await fetchGames({ status: 'FINISHED', limit: 10, cursor: nextCursor });
 * ```
 */
export async function fetchGames(query?: GetGamesQuery): Promise<GetGamesResponse> {
  const baseUrl = getApiBaseUrl();
  const params = new URLSearchParams();

  if (query?.status) {
    params.append('status', query.status);
  }
  if (query?.limit) {
    params.append('limit', query.limit.toString());
  }
  if (query?.cursor) {
    params.append('cursor', query.cursor);
  }

  const url = `${baseUrl}/api/games${params.toString() ? `?${params.toString()}` : ''}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<GetGamesResponse>(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'ネットワークエラーが発生しました',
      0
    );
  }
}

/**
 * Fetch a specific game by ID
 *
 * @param gameId - The game ID (UUID v4)
 * @returns Promise with game details including board state
 *
 * @throws {ApiError} When game is not found (404) or other errors occur
 *
 * @example
 * ```typescript
 * try {
 *   const game = await fetchGame('123e4567-e89b-12d3-a456-426614174000');
 *   console.log(game.boardState);
 * } catch (error) {
 *   if (error instanceof ApiError && error.statusCode === 404) {
 *     console.error('対局が見つかりません');
 *   }
 * }
 * ```
 */
export async function fetchGame(gameId: string): Promise<Game> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/games/${gameId}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<Game>(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'ネットワークエラーが発生しました',
      0
    );
  }
}

/**
 * Create a new game
 *
 * @param data - Game creation request data
 * @returns Promise with created game details
 *
 * @throws {ApiError} When validation fails (400) or other errors occur
 *
 * @example
 * ```typescript
 * try {
 *   const game = await createGame({
 *     gameType: 'OTHELLO',
 *     aiSide: 'BLACK',
 *   });
 *   console.log('Created game:', game.gameId);
 * } catch (error) {
 *   if (error instanceof ApiError && error.statusCode === 400) {
 *     console.error('バリデーションエラー:', error.details);
 *   }
 * }
 * ```
 */
export async function createGame(data: CreateGameRequest): Promise<Game> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/games`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    return handleResponse<Game>(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'ネットワークエラーが発生しました',
      0
    );
  }
}

/**
 * Fetch candidates for a specific game
 *
 * @param gameId - The game ID (UUID v4)
 * @returns Promise with array of candidates
 *
 * @example
 * ```typescript
 * const candidates = await fetchCandidates('123e4567-e89b-12d3-a456-426614174000');
 * candidates.forEach(candidate => {
 *   console.log(`${candidate.position}: ${candidate.voteCount} votes`);
 * });
 * ```
 */
export async function fetchCandidates(gameId: string): Promise<Candidate[]> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/games/${gameId}/candidates`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<Candidate[]>(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'ネットワークエラーが発生しました',
      0
    );
  }
}

/**
 * Create a new candidate for a game
 *
 * @param gameId - The game ID (UUID v4)
 * @param data - Candidate creation request data
 * @returns Promise with created candidate details
 *
 * @throws {ApiError} When validation fails (400) or game not found (404)
 *
 * @example
 * ```typescript
 * try {
 *   const candidate = await createCandidate('123e4567-e89b-12d3-a456-426614174000', {
 *     position: 'C4',
 *     description: 'この手は中央を制圧する重要な一手です。',
 *   });
 *   console.log('Created candidate:', candidate.candidateId);
 * } catch (error) {
 *   if (error instanceof ApiError && error.statusCode === 400) {
 *     console.error('不正な手です');
 *   }
 * }
 * ```
 */
export async function createCandidate(
  gameId: string,
  data: CreateCandidateRequest
): Promise<Candidate> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/games/${gameId}/candidates`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    return handleResponse<Candidate>(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'ネットワークエラーが発生しました',
      0
    );
  }
}

/**
 * Vote for a candidate
 *
 * @param gameId - The game ID (UUID v4)
 * @param candidateId - The candidate ID (UUID v4)
 * @returns Promise that resolves when vote is successful
 *
 * @throws {ApiError} When already voted (400), candidate not found (404), or other errors
 *
 * @example
 * ```typescript
 * try {
 *   await vote('123e4567-e89b-12d3-a456-426614174000', '987fcdeb-51a2-43f1-b123-456789abcdef');
 *   console.log('投票しました');
 * } catch (error) {
 *   if (error instanceof ApiError && error.statusCode === 400) {
 *     console.error('すでに投票済みです');
 *   }
 * }
 * ```
 */
export async function vote(gameId: string, candidateId: string): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/games/${gameId}/candidates/${candidateId}/vote`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    await handleResponse<void>(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'ネットワークエラーが発生しました',
      0
    );
  }
}
