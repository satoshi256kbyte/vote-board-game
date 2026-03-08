/**
 * Candidate API Routes
 *
 * 候補管理のためのRESTful APIエンドポイント群
 * - GET /games/:gameId/turns/:turnNumber/candidates - 候補一覧取得
 * - POST / - 候補投稿（レガシー、/api/candidates にマウント）
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.3, 2.4, 3.3, 3.4, 5.4, 6.1, 6.2, 6.3, 6.4
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Context } from 'hono';
import {
  CandidateService,
  GameNotFoundError,
  TurnNotFoundError,
  InvalidMoveError,
  VotingClosedError,
  DuplicatePositionError,
} from '../services/candidate.js';
import { CandidateRepository } from '../lib/dynamodb/repositories/candidate.js';
import { GameRepository } from '../lib/dynamodb/repositories/game.js';
import { docClient, TABLE_NAME } from '../lib/dynamodb/index.js';
import {
  getCandidatesParamSchema,
  postCandidateParamSchema,
  postCandidateBodySchema,
} from '../schemas/candidate.js';
import type { AuthVariables } from '../lib/auth/types.js';

// バリデーションエラーハンドラー（共通）
const validationErrorHandler = (
  result: {
    success: boolean;
    error?: { issues: Array<{ path: PropertyKey[]; message: string }> };
  },
  c: Context
) => {
  if (!result.success) {
    const fields: Record<string, string> = {};
    result.error!.issues.forEach((issue) => {
      const fieldName = issue.path.map(String).join('.');
      fields[fieldName] = issue.message;
    });
    return c.json(
      {
        error: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: { fields },
      },
      400
    );
  }
};

const createCandidateSchema = z.object({
  gameId: z.string(),
  position: z.object({
    row: z.number().int().min(0).max(7),
    col: z.number().int().min(0).max(7),
  }),
  description: z.string().max(200),
});

/**
 * 候補一覧取得・候補投稿ルーターを作成
 * GET /games/:gameId/turns/:turnNumber/candidates - 候補一覧取得
 * POST /games/:gameId/turns/:turnNumber/candidates - 候補投稿
 * /api にマウントされることを想定
 * @param candidateService CandidateServiceインスタンス（テスト時にモックを注入可能）
 */
export function createGameCandidatesRouter(
  candidateService?: CandidateService
): Hono<{ Variables: AuthVariables }> {
  const router = new Hono<{ Variables: AuthVariables }>();

  const service =
    candidateService ||
    new CandidateService(new CandidateRepository(docClient, TABLE_NAME), new GameRepository());

  // GET /games/:gameId/turns/:turnNumber/candidates - 候補一覧取得
  router.get(
    '/games/:gameId/turns/:turnNumber/candidates',
    zValidator('param', getCandidatesParamSchema, validationErrorHandler),
    async (c) => {
      try {
        const { gameId, turnNumber } = c.req.valid('param');

        const result = await service.listCandidates(gameId, turnNumber);

        return c.json(result, 200);
      } catch (error) {
        if (error instanceof GameNotFoundError) {
          return c.json(
            {
              error: 'NOT_FOUND',
              message: 'Game not found',
            },
            404
          );
        }

        if (error instanceof TurnNotFoundError) {
          return c.json(
            {
              error: 'NOT_FOUND',
              message: 'Turn not found',
            },
            404
          );
        }

        console.error('Failed to retrieve candidates', {
          error: error instanceof Error ? error.message : 'Unknown error',
          gameId: c.req.param('gameId'),
          turnNumber: c.req.param('turnNumber'),
          timestamp: new Date().toISOString(),
        });

        return c.json(
          {
            error: 'INTERNAL_ERROR',
            message: 'Failed to retrieve candidates',
          },
          500
        );
      }
    }
  );

  // POST /games/:gameId/turns/:turnNumber/candidates - 候補投稿
  router.post(
    '/games/:gameId/turns/:turnNumber/candidates',
    zValidator('param', postCandidateParamSchema, validationErrorHandler),
    zValidator('json', postCandidateBodySchema, validationErrorHandler),
    async (c) => {
      try {
        const { gameId, turnNumber } = c.req.valid('param');
        const { position, description } = c.req.valid('json');
        const userId = c.get('userId');

        if (!userId) {
          return c.json(
            {
              error: 'UNAUTHORIZED',
              message: 'Authorization header is required',
            },
            401
          );
        }

        const result = await service.createCandidate(
          gameId,
          turnNumber,
          position,
          description,
          userId
        );

        return c.json(result, 201);
      } catch (error) {
        if (error instanceof GameNotFoundError) {
          return c.json(
            {
              error: 'NOT_FOUND',
              message: 'Game not found',
            },
            404
          );
        }

        if (error instanceof TurnNotFoundError) {
          return c.json(
            {
              error: 'NOT_FOUND',
              message: 'Turn not found',
            },
            404
          );
        }

        if (error instanceof InvalidMoveError) {
          return c.json(
            {
              error: 'INVALID_MOVE',
              message: error.message,
            },
            400
          );
        }

        if (error instanceof VotingClosedError) {
          return c.json(
            {
              error: 'VOTING_CLOSED',
              message: 'Voting period has ended',
            },
            400
          );
        }

        if (error instanceof DuplicatePositionError) {
          return c.json(
            {
              error: 'CONFLICT',
              message: error.message,
            },
            409
          );
        }

        console.error('Failed to create candidate', {
          error: error instanceof Error ? error.message : 'Unknown error',
          gameId: c.req.param('gameId'),
          turnNumber: c.req.param('turnNumber'),
          timestamp: new Date().toISOString(),
        });

        return c.json(
          {
            error: 'INTERNAL_ERROR',
            message: 'Failed to create candidate',
          },
          500
        );
      }
    }
  );

  return router;
}

/**
 * レガシー候補ルーター（POST /api/candidates 用）
 */
const candidatesRouter = new Hono();

// POST /api/candidates - 候補投稿
candidatesRouter.post('/', zValidator('json', createCandidateSchema), async (c) => {
  const data = c.req.valid('json');

  // TODO: DynamoDB に保存
  return c.json(
    {
      candidateId: 'candidate-1',
      ...data,
      createdAt: new Date().toISOString(),
    },
    201
  );
});

// デフォルトエクスポート（本番環境用）
export const gameCandidatesRouter = createGameCandidatesRouter();

export { candidatesRouter };
