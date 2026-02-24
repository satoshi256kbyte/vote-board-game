import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(3).max(20),
  email: z.string().email(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;

/**
 * DynamoDB User Entity
 * Represents a user profile in the DynamoDB table using Single Table Design
 */
export interface UserEntity {
  /** Partition Key: USER#{userId} */
  PK: string;
  /** Sort Key: USER#{userId} */
  SK: string;
  /** User ID (UUID) */
  userId: string;
  /** User email address */
  email: string;
  /** Username (1-50 characters) */
  username: string;
  /** Icon image URL (optional, HTTPS URL) */
  iconUrl?: string;
  /** Creation timestamp (ISO 8601 format) */
  createdAt: string;
  /** Last update timestamp (ISO 8601 format) */
  updatedAt: string;
  /** Entity type identifier */
  entityType: 'USER';
}
