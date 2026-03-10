/**
 * Validation schema for candidate submission form
 *
 * Defines Zod schema for validating candidate form data.
 * Requirements: 16.1, 16.2, 16.3
 */

import { z } from 'zod';

/**
 * Candidate form validation schema
 *
 * Validates:
 * - position: "row,col" format where row and col are 0-7
 * - description: 1-200 characters
 */
export const candidateFormSchema = z.object({
  position: z.string().regex(/^[0-7],[0-7]$/, '有効な位置を選択してください'),
  description: z
    .string()
    .min(1, '説明文を入力してください')
    .max(200, '説明文は200文字以内で入力してください'),
});

/**
 * Type inferred from the validation schema
 */
export type CandidateFormData = z.infer<typeof candidateFormSchema>;
