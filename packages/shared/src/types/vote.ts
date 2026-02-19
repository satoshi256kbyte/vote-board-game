import { z } from 'zod';

export const VoteSchema = z.object({
  id: z.string().uuid(),
  gameId: z.string().uuid(),
  candidateId: z.string().uuid(),
  userId: z.string().uuid(),
  turnNumber: z.number().int().min(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Vote = z.infer<typeof VoteSchema>;
