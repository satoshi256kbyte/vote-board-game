import { z } from 'zod';

export const CandidateSchema = z.object({
  id: z.string().uuid(),
  gameId: z.string().uuid(),
  turnNumber: z.number().int().min(0),
  position: z.string(),
  description: z.string().max(200),
  createdBy: z.enum(['ai', 'user']),
  userId: z.string().uuid().optional(),
  voteCount: z.number().int().min(0).default(0),
  createdAt: z.string().datetime(),
});

export type Candidate = z.infer<typeof CandidateSchema>;
