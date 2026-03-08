/**
 * Vote API Routes
 *
 * 投票管理のためのRESTful APIエンドポイント群
 * - GET /games/:gameId/turns/:turnNumber/votes/me - 投票状況取得
 * - POST /games/:gameId/turns/:turnNumber/votes - 投票作成
 * - PUT /games/:gameId/turns/:turnNumber/votes/me - 投票変更
 * - POST / - 投票（レガシー、/api/votes にマウント）
 * - GET /my - 自分の投票取得（レガシー、/api/votes にマウント）
 *
 * Requirements: 1.1, 1.2, 1.3, 2.1-2.5, 8.1, 8.2, 9.1, 9.2, 10.1, 10.2
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Context } from 'hono';
import {
  VoteService,
  CandidateNotFoundError,
  VotingClosedError,
  AlreadyVotedError,
  NotVotedError,
  SameCandidateError,
  VoteNotFoundError,
} from '../services/vote.js';
import { GameNotFoundError, TurnNotFoundError } from '../services/candidate.js';
import { VoteRepository } from '../lib/dynamodb/repositories/vote.js';
import { CandidateRepository } from '../lib/dynamodb/repositories/candidate.js';
import { GameRepository } from '../lib/dynamodb/repositories/game.js';
import { docClient, TABLE_NAME } from '../lib/dynamodb/index.js';
import {
  postVoteBodySchema,
  postVoteParamSchema,
  putVoteBodySchema,
  putVoteParamSchema,
  getVoteParamSchema,
} from '../schemas/vote.js';
import type { AuthVariables } from '../lib/auth/types.js';

// バリデーションエラーハンドラー
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

/**
 * 投票ルーターを作成
 * GET /games/:gameId/turns/:turnNumber/votes/me - 投票状況取得
 * POST /games/:gameId/turns/:turnNumber/votes - 投票作成
 * PUT /games/:gameId/turns/:turnNumber/votes/me - 投票変更
 * /api にマウントされることを想定
 * @param voteService VoteServiceインスタンス（テスト時にモックを注入可能）
 */
export function createGameVotesRouter(
  voteService?: VoteService
): Hono<{ Variables: AuthVariables }> {
  const router = new Hono<{ Variables: AuthVariables }>();

  const service =
    voteService ||
    new VoteService(
      new VoteRepository(docClient, TABLE_NAME),
      new CandidateRepository(docClient, TABLE_NAME),
      new GameRepository()
    );

  // GET /games/:gameId/turns/:turnNumber/votes/me - 投票状況取得
  router.get(
    '/games/:gameId/turns/:turnNumber/votes/me',
    zValidator('param', getVoteParamSchema, validationErrorHandler),
    async (c) => {
      const { gameId, turnNumber } = c.req.valid('param');
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

      try {
        const result = await service.getMyVote(gameId, turnNumber, userId);
        return c.json(result, 200);
      } catch (error) {
        if (error instanceof VoteNotFoundError) {
          return c.json({ error: 'NOT_FOUND', message: 'Vote not found' }, 404);
        }

        console.error('Failed to get vote', {
          error: error instanceof Error ? error.message : 'Unknown error',
          gameId: c.req.param('gameId'),
          turnNumber: c.req.param('turnNumber'),
          timestamp: new Date().toISOString(),
        });

        return c.json({ error: 'INTERNAL_ERROR', message: 'Failed to get vote' }, 500);
      }
    }
  );

  // POST /games/:gameId/turns/:turnNumber/votes - 投票作成
  router.post(
    '/games/:gameId/turns/:turnNumber/votes',
    zValidator('param', postVoteParamSchema, validationErrorHandler),
    zValidator('json', postVoteBodySchema, validationErrorHandler),
    async (c) => {
      try {
        const { gameId, turnNumber } = c.req.valid('param');
        const { candidateId } = c.req.valid('json');
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

        const result = await service.createVote(gameId, turnNumber, candidateId, userId);

        return c.json(result, 201);
      } catch (error) {
        if (error instanceof GameNotFoundError) {
          return c.json({ error: 'NOT_FOUND', message: 'Game not found' }, 404);
        }

        if (error instanceof TurnNotFoundError) {
          return c.json({ error: 'NOT_FOUND', message: 'Turn not found' }, 404);
        }

        if (error instanceof CandidateNotFoundError) {
          return c.json({ error: 'NOT_FOUND', message: 'Candidate not found' }, 404);
        }

        if (error instanceof VotingClosedError) {
          return c.json({ error: 'VOTING_CLOSED', message: 'Voting period has ended' }, 400);
        }

        if (error instanceof AlreadyVotedError) {
          return c.json({ error: 'ALREADY_VOTED', message: 'Already voted in this turn' }, 409);
        }

        console.error('Failed to create vote', {
          error: error instanceof Error ? error.message : 'Unknown error',
          gameId: c.req.param('gameId'),
          turnNumber: c.req.param('turnNumber'),
          timestamp: new Date().toISOString(),
        });

        return c.json({ error: 'INTERNAL_ERROR', message: 'Failed to create vote' }, 500);
      }
    }
  );

  // PUT /games/:gameId/turns/:turnNumber/votes/me - 投票変更
  router.put(
    '/games/:gameId/turns/:turnNumber/votes/me',
    zValidator('param', putVoteParamSchema, validationErrorHandler),
    zValidator('json', putVoteBodySchema, validationErrorHandler),
    async (c) => {
      try {
        const { gameId, turnNumber } = c.req.valid('param');
        const { candidateId } = c.req.valid('json');
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

        const result = await service.changeVote(gameId, turnNumber, candidateId, userId);

        return c.json(result, 200);
      } catch (error) {
        if (error instanceof GameNotFoundError) {
          return c.json({ error: 'NOT_FOUND', message: 'Game not found' }, 404);
        }

        if (error instanceof TurnNotFoundError) {
          return c.json({ error: 'NOT_FOUND', message: 'Turn not found' }, 404);
        }

        if (error instanceof CandidateNotFoundError) {
          return c.json({ error: 'NOT_FOUND', message: 'Candidate not found' }, 404);
        }

        if (error instanceof VotingClosedError) {
          return c.json({ error: 'VOTING_CLOSED', message: 'Voting period has ended' }, 400);
        }

        if (error instanceof NotVotedError) {
          return c.json({ error: 'NOT_VOTED', message: 'Not voted yet in this turn' }, 409);
        }

        if (error instanceof SameCandidateError) {
          return c.json(
            { error: 'SAME_CANDIDATE', message: 'Already voting for this candidate' },
            400
          );
        }

        console.error('Failed to change vote', {
          error: error instanceof Error ? error.message : 'Unknown error',
          gameId: c.req.param('gameId'),
          turnNumber: c.req.param('turnNumber'),
          timestamp: new Date().toISOString(),
        });

        return c.json({ error: 'INTERNAL_ERROR', message: 'Failed to change vote' }, 500);
      }
    }
  );

  return router;
}

/**
 * レガシー投票ルーター（/api/votes にマウント）
 */
const legacyCreateVoteSchema = z.object({
  gameId: z.string(),
  candidateId: z.string(),
});

const votesRouter = new Hono();

// POST /api/votes - 投票（レガシー）
votesRouter.post('/', zValidator('json', legacyCreateVoteSchema), async (c) => {
  const data = c.req.valid('json');

  // TODO: DynamoDB に保存
  return c.json(
    {
      voteId: 'vote-1',
      ...data,
      createdAt: new Date().toISOString(),
    },
    201
  );
});

// GET /api/votes/my?gameId=xxx - 自分の投票取得
votesRouter.get('/my', async (c) => {
  const gameId = c.req.query('gameId');

  if (!gameId) {
    return c.json({ error: 'gameId is required' }, 400);
  }

  // TODO: DynamoDB から取得
  return c.json({ vote: null });
});

// デフォルトエクスポート（本番環境用）
export const gameVotesRouter = createGameVotesRouter();

export { votesRouter };
