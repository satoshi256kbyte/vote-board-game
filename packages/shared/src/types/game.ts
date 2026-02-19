import { z } from 'zod';

export const GameTypeSchema = z.enum(['othello', 'chess', 'go', 'shogi']);
export type GameType = z.infer<typeof GameTypeSchema>;

export const GameModeSchema = z.enum(['ai-vs-collective', 'collective-vs-collective']);
export type GameMode = z.infer<typeof GameModeSchema>;

export const GameStatusSchema = z.enum(['active', 'finished']);
export type GameStatus = z.infer<typeof GameStatusSchema>;

export const GameSchema = z.object({
  id: z.string().uuid(),
  type: GameTypeSchema,
  mode: GameModeSchema,
  status: GameStatusSchema,
  currentTurn: z.number().int().min(0),
  boardState: z.string(),
  aiSide: z.enum(['black', 'white']).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  finishedAt: z.string().datetime().optional(),
  winner: z.enum(['black', 'white', 'draw']).optional(),
});

export type Game = z.infer<typeof GameSchema>;
