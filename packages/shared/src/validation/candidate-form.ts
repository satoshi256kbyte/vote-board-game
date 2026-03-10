import { z } from 'zod';

/**
 * Validation schema for candidate submission form
 *
 * Requirements:
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
 * Type inferred from candidateFormSchema
 */
export type CandidateFormData = z.infer<typeof candidateFormSchema>;
